const pool = require('../config/db');

/* ===================== GET ALL TEACHERS ===================== */
exports.getAll = async (req, res) => {
  try {
    const requesterOrg = req.user?.organization_id;
    const requesterBranch = req.user?.branch_id;
    const requesterRole = req.user?.role;

    if (!requesterOrg) return res.status(401).json({ message: 'Unauthorized' });

    // Fetch users with role = 'Teacher' dynamically from the users table
    let sql = `
      SELECT u.*, tp.* 
      FROM users u
      LEFT JOIN teacher_profiles tp ON u.id = tp.user_id
      WHERE u.organization_id = ? AND u.role = 'Teacher'
    `;
    const params = [requesterOrg];

    // If requester is not Super_Admin, filter by branch
    if (requesterRole !== 'Super_Admin' && requesterBranch) {
      sql += ` AND u.branch_id = ?`;
      params.push(requesterBranch);
    }

    sql += ` ORDER BY u.name ASC, u.created_at DESC`;

    const [rows] = await pool.promise().execute(sql, params);

    // Add has_profile flag dynamically
    res.json(rows.map(t => ({
      ...t,
      has_profile: !!(t.phone_number || t.date_of_birth)
    })));
  } catch (err) {
    console.error('Error fetching teachers:', err);
    res.status(500).json({
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/* ===================== GET TEACHER BY ID ===================== */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = req.user?.id;
    const requesterOrg = req.user?.organization_id;
    const requesterBranch = req.user?.branch_id;
    const requesterRole = req.user?.role;

    if (!id) return res.status(400).json({ message: 'Teacher ID is required' });

    const [targetRows] = await pool.promise().execute(
      `SELECT u.*, tp.* 
       FROM users u
       LEFT JOIN teacher_profiles tp ON u.id = tp.user_id
       WHERE u.id = ?`,
      [id]
    );


    if (targetRows.length === 0) return res.status(404).json({ message: 'Teacher not found' });

    const target = targetRows[0];

    // Permission check
    const isSelf = requesterId === parseInt(id);
    const isSameOrg = requesterOrg === target.organization_id;
    const isAdmin = ['Super_Admin', 'School_Admin'].includes(requesterRole);
    const canView = isSelf || (isAdmin && isSameOrg && (!requesterBranch || requesterBranch === target.branch_id));

    if (!canView) return res.status(403).json({ message: 'Access denied' });

    res.json({ ...target, has_profile: !!(target.phone_number || target.date_of_birth) });
  } catch (err) {
    console.error('Error fetching teacher by ID:', err);
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
    const data = req.body;

    if (data.date_of_birth) {
      const d = new Date(data.date_of_birth);
      data.date_of_birth = d.toISOString().slice(0, 10);
    }



    if (!id) return res.status(400).json({ message: 'Teacher ID is required' });

    // Check if user exists
    const [userCheck] = await pool.promise().execute(
      'SELECT id FROM users WHERE id = ?',
      [id]
    );

    if (userCheck.length === 0) return res.status(404).json({ message: 'User not found' });

    // Check if profile exists
    const [existing] = await pool.promise().execute(
      'SELECT * FROM teacher_profiles WHERE user_id = ?',
      [id]
    );

    const columns = Object.keys(data);
    const values = Object.values(data);

    if (existing.length > 0) {
      // Update existing profile
      const sql = `UPDATE teacher_profiles SET ${columns.map(c => `\`${c}\` = ?`).join(',')}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`;
      await pool.promise().execute(sql, [...values, id]);
      return res.json({ message: 'Profile updated successfully' });
    } else {
      // Create new profile
      const sql = `INSERT INTO teacher_profiles (user_id, ${columns.map(c => `\`${c}\``).join(',')}, created_at) VALUES (?, ${columns.map(() => '?').join(',')}, CURRENT_TIMESTAMP)`;
      await pool.promise().execute(sql, [id, ...values]);
      return res.json({ message: 'Profile created successfully' });
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

    if (!id) return res.status(400).json({ message: 'Teacher ID is required' });

    const isSelf = requesterId === parseInt(id);
    const isAdmin = ['Super_Admin', 'School_Admin'].includes(requesterRole);

    if (!isSelf && !isAdmin) return res.status(403).json({ message: 'Access denied' });

    const [result] = await pool.promise().execute(
      'DELETE FROM teacher_profiles WHERE user_id = ?',
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

/* ===================== GET MY PROFILE ===================== */
exports.getMe = async (req, res) => {
  console.log("req.user:", req.user); // 🔥 Add this to debug
  req.params.id = req.user.id;
  return exports.getById(req, res);
};
