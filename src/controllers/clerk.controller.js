const pool = require('../config/db');

// Define allowed fields for Clerk Profile
const CLERK_PROFILE_FIELDS = [
  'employee_code', 'nrc_number', 'date_of_birth', 'gender', 'phone_number',
  'email', 'address', 'education_background', 'degree', 'profile_photo',
  'attachments', 'date_of_joining', 'department', 'job_title',
  'office_location', 'skills', 'assigned_responsibilities', 'status'
];

/**
 * Format specific date fields to YYYY-MM-DD for MySQL compatibility
 */
const formatDates = (data) => {
  ['date_of_birth', 'date_of_joining'].forEach(field => {
    if (data[field]) data[field] = new Date(data[field]).toISOString().slice(0, 10);
  });
};

/* ===================== GET ALL CLERKS ===================== */
exports.getAll = async (req, res) => {
  try {
    const { organization_id: requesterOrg, branch_id: requesterBranch, role: requesterRole } = req.user;

    if (!requesterOrg) return res.status(401).json({ message: 'Unauthorized' });

    // Optimized query selecting specific columns to avoid ID collisions
    let sql = `
      SELECT 
        u.id, u.name, u.username, u.role, u.organization_id, u.branch_id, u.created_at,
        cp.employee_code, cp.nrc_number, cp.date_of_birth, cp.gender, cp.phone_number, 
        cp.email, cp.address, cp.education_background, cp.degree, cp.profile_photo, 
        cp.attachments, cp.date_of_joining, cp.department, cp.job_title, 
        cp.office_location, cp.skills, cp.assigned_responsibilities, cp.status
      FROM users u
      LEFT JOIN clerk_profiles cp ON u.id = cp.user_id
      WHERE u.organization_id = ? AND u.role = 'Clerk'
    `;
    const params = [requesterOrg];

    // Permission Filter: Only orbitEDU_Admin and Super_Admin can see across branches
    if (!['orbitEDU_Admin', 'Super_Admin'].includes(requesterRole) && requesterBranch) {
      sql += ` AND u.branch_id = ?`;
      params.push(requesterBranch);
    }

    sql += ` ORDER BY u.name ASC, u.created_at DESC`;

    const [rows] = await pool.promise().execute(sql, params);

    res.json(rows.map(c => ({
      ...c,
      has_profile: !!(c.phone_number || c.date_of_birth)
    })));
  } catch (err) {
    console.error('Error fetching clerks:', err);
    res.status(500).json({
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/* ===================== GET CLERK BY ID ===================== */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params; // This is the user_id
    const { id: requesterId, organization_id: requesterOrg, branch_id: requesterBranch, role: requesterRole } = req.user;

    if (!id) return res.status(400).json({ message: 'Clerk ID is required' });

    const [targetRows] = await pool.promise().execute(
      `SELECT 
        u.id, u.name, u.username, u.role, u.organization_id, u.branch_id, u.created_at,
        cp.employee_code, cp.nrc_number, cp.date_of_birth, cp.gender, cp.phone_number, 
        cp.email, cp.address, cp.education_background, cp.degree, cp.profile_photo, 
        cp.attachments, cp.date_of_joining, cp.department, cp.job_title, 
        cp.office_location, cp.skills, cp.assigned_responsibilities, cp.status
       FROM users u
       LEFT JOIN clerk_profiles cp ON u.id = cp.user_id
       WHERE u.id = ?`,
      [id]
    );

    if (targetRows.length === 0) return res.status(404).json({ message: 'Clerk not found' });

    const target = targetRows[0];

    // Permission check
    const isSelf = requesterId === parseInt(id);
    const isSameOrg = requesterOrg === target.organization_id;
    const isAdmin = ['orbitEDU_Admin', 'Super_Admin', 'School_Admin'].includes(requesterRole);
    const canView = isSelf || (isAdmin && isSameOrg && (requesterRole === 'Super_Admin' || requesterBranch === target.branch_id));

    if (!canView) return res.status(403).json({ message: 'Access denied' });

    res.json({ ...target, has_profile: !!(target.phone_number || target.date_of_birth) });
  } catch (err) {
    console.error('Error fetching clerk by ID:', err);
    res.status(500).json({
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/* ===================== CREATE OR UPDATE PROFILE ===================== */
exports.create = exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const rawData = req.body;
    
    if (!id) return res.status(400).json({ message: 'Clerk ID is required' });

    // Sanitize input using the whitelist
    const data = {};
    CLERK_PROFILE_FIELDS.forEach(field => {
      if (rawData[field] !== undefined) {
        data[field] = rawData[field];
      }
    });

    formatDates(data);

    // Verify User exists and is a Clerk
    const [userCheck] = await pool.promise().execute(
      "SELECT id FROM users WHERE id = ? AND role = 'Clerk'",
      [id]
    );

    if (userCheck.length === 0) return res.status(404).json({ message: 'User not found' });

    // Check if profile exists (upsert logic)
    const [existing] = await pool.promise().execute(
      'SELECT * FROM clerk_profiles WHERE user_id = ?',
      [id]
    );

    // Build dynamic SQL
    const columns = Object.keys(data);
    const values = Object.values(data);
    
    if (columns.length === 0) {
      return res.status(400).json({ message: 'No valid profile fields provided for update' });
    }

    if (existing.length > 0) {
      // Update existing profile
      const sql = `UPDATE clerk_profiles SET ${columns.map(c => `\`${c}\` = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`;
      await pool.promise().execute(sql, [...values, id]);
      return res.json({ success: true, message: 'Profile updated successfully' });
    } else {
      // Create new profile
      const sql = `INSERT INTO clerk_profiles (user_id, ${columns.map(c => `\`${c}\``).join(', ')}, created_at) VALUES (?, ${columns.map(() => '?').join(', ')}, CURRENT_TIMESTAMP)`;
      await pool.promise().execute(sql, [id, ...values]);
      return res.status(201).json({ success: true, message: 'Profile created successfully' });
    }
  } catch (err) {
    console.error('Error creating/updating profile:', err);
    res.status(500).json({
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/* ===================== DELETE PROFILE ===================== */
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = req.user?.id;
    const requesterRole = req.user?.role;

    if (!id) return res.status(400).json({ message: 'Clerk ID is required' });

    const isSelf = requesterId === parseInt(id);
    const isAdmin = ['Super_Admin', 'School_Admin'].includes(requesterRole);

    if (!isSelf && !isAdmin) return res.status(403).json({ message: 'Access denied' });

    const [result] = await pool.promise().execute(
      'DELETE FROM clerk_profiles WHERE user_id = ?',
      [id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ message: 'Profile not found' });

    res.json({ message: 'Profile deleted successfully' });
  } catch (err) {
    console.error('Error deleting profile:', err);
    res.status(500).json({
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};
