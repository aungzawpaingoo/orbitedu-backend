// const pool = require('../config/db');

// /* ===================== GET ALL CLERKS ===================== */
// exports.getAll = async (req, res) => {
//   try {
//     const requesterOrg = req.user?.organization_id;
//     const requesterBranch = req.user?.branch_id;
//     const requesterRole = req.user?.role;

//     if (!requesterOrg) return res.status(401).json({ message: 'Unauthorized' });

//     let sql = `
//       SELECT u.*, cp.* 
//       FROM users u
//       LEFT JOIN clerk_profiles cp ON u.id = cp.user_id
//       WHERE u.organization_id = ? AND u.role = 'Clerk'
//     `;
//     const params = [requesterOrg];

//     if (requesterRole !== 'Super_Admin' && requesterBranch) {
//       sql += ` AND u.branch_id = ?`;
//       params.push(requesterBranch);
//     }

//     sql += ` ORDER BY u.name ASC, u.created_at DESC`;

//     const [rows] = await pool.promise().execute(sql, params);

//     res.json(rows.map(c => ({
//       ...c,
//       has_profile: !!(c.phone_number || c.date_of_birth)
//     })));
//   } catch (err) {
//     console.error('Error fetching clerks:', err);
//     res.status(500).json({
//       message: 'Server error',
//       error: process.env.NODE_ENV === 'development' ? err.message : undefined
//     });
//   }
// };

// /* ===================== GET CLERK BY ID ===================== */
// exports.getById = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const requesterId = req.user?.id;
//     const requesterOrg = req.user?.organization_id;
//     const requesterBranch = req.user?.branch_id;
//     const requesterRole = req.user?.role;

//     if (!id) return res.status(400).json({ message: 'Clerk ID is required' });

//     // const [targetRows] = await pool.promise().execute(
//     //   `SELECT u.*, cp.* 
//     //    FROM users u
//     //    LEFT JOIN clerk_profiles cp ON u.id = cp.user_id
//     //    WHERE u.id = ?`,
//     //   [id]
//     // );

//     // Alias columns to prevent id collision
//     const [targetRows] = await pool.promise().execute(
//       `SELECT 
//           u.id AS user_id, u.name, u.username, u.role, u.organization_id, u.branch_id, u.created_at,
//           cp.id AS profile_id, cp.date_of_birth, cp.phone_number, cp.gender
//        FROM users u
//        LEFT JOIN clerk_profiles cp ON u.id = cp.user_id
//        WHERE u.id = ?`,
//       [id]
//     );

//     if (targetRows.length === 0) return res.status(404).json({ message: 'Clerk not found' });

//     const target = targetRows[0];

//     const isSelf = requesterId === parseInt(id);
//     const isSameOrg = requesterOrg === target.organization_id;
//     const isAdmin = ['Super_Admin', 'School_Admin'].includes(requesterRole);
//     const canView = isSelf || (isAdmin && isSameOrg && (!requesterBranch || requesterBranch === target.branch_id));

//     if (!canView) return res.status(403).json({ message: 'Access denied' });

//     // res.json({ ...target, has_profile: !!(target.phone_number || target.date_of_birth) });
//      // Return user_id as id to front-end, keep profile info separate
//     res.json({
//       id: target.user_id,
//       name: target.name,
//       username: target.username,
//       role: target.role,
//       organization_id: target.organization_id,
//       branch_id: target.branch_id,
//       created_at: target.created_at,
//       date_of_birth: target.date_of_birth,
//       phone_number: target.phone_number,
//       gender: target.gender,
//       has_profile: !!(target.phone_number || target.date_of_birth)
//     });
//   } catch (err) {
//     console.error('Error fetching clerk by ID:', err);
//     res.status(500).json({
//       message: 'Server error',
//       error: process.env.NODE_ENV === 'development' ? err.message : undefined
//     });
//   }
// };

// /* ===================== CREATE OR UPDATE PROFILE ===================== */
// exports.create = exports.update = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const data = req.body;

//     if (data.date_of_birth) {
//       const d = new Date(data.date_of_birth);
//       data.date_of_birth = d.toISOString().slice(0, 10);
//     }

//     if (!id) return res.status(400).json({ message: 'Clerk ID is required' });

//     const [userCheck] = await pool.promise().execute(
//       'SELECT id FROM users WHERE id = ?',
//       [id]
//     );
//     if (userCheck.length === 0) return res.status(404).json({ message: 'User not found' });

//     const [existing] = await pool.promise().execute(
//       'SELECT * FROM clerk_profiles WHERE user_id = ?',
//       [id]
//     );

//     const columns = Object.keys(data);
//     const values = Object.values(data);

//     if (existing.length > 0) {
//       const sql = `UPDATE clerk_profiles SET ${columns.map(c => `\`${c}\` = ?`).join(',')}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`;
//       await pool.promise().execute(sql, [...values, id]);
//       return res.json({ message: 'Profile updated successfully' });
//     } else {
//       const sql = `INSERT INTO clerk_profiles (user_id, ${columns.map(c => `\`${c}\``).join(',')}, created_at) VALUES (?, ${columns.map(() => '?').join(',')}, CURRENT_TIMESTAMP)`;
//       await pool.promise().execute(sql, [id, ...values]);
//       return res.json({ message: 'Profile created successfully' });
//     }
//   } catch (err) {
//     console.error('Error creating/updating profile:', err);
//     res.status(500).json({
//       message: 'Server error',
//       error: process.env.NODE_ENV === 'development' ? err.message : undefined
//     });
//   }
// };

// /* ===================== DELETE PROFILE ===================== */
// exports.remove = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const requesterId = req.user?.id;
//     const requesterRole = req.user?.role;

//     if (!id) return res.status(400).json({ message: 'Clerk ID is required' });

//     const isSelf = requesterId === parseInt(id);
//     const isAdmin = ['Super_Admin', 'School_Admin'].includes(requesterRole);

//     if (!isSelf && !isAdmin) return res.status(403).json({ message: 'Access denied' });

//     const [result] = await pool.promise().execute(
//       'DELETE FROM clerk_profiles WHERE user_id = ?',
//       [id]
//     );

//     if (result.affectedRows === 0) return res.status(404).json({ message: 'Profile not found' });

//     res.json({ message: 'Profile deleted successfully' });
//   } catch (err) {
//     console.error('Error deleting profile:', err);
//     res.status(500).json({
//       message: 'Server error',
//       error: process.env.NODE_ENV === 'development' ? err.message : undefined
//     });
//   }
// };

// /* ===================== GET MY PROFILE ===================== */
// exports.getMe = async (req, res) => {
//   req.params.id = req.user.id;
//   return exports.getById(req, res);
// };






const pool = require('../config/db');

/* ===================== GET ALL CLERKS ===================== */
exports.getAll = async (req, res) => {
  try {
    const requesterOrg = req.user?.organization_id;
    const requesterBranch = req.user?.branch_id;
    const requesterRole = req.user?.role;

    if (!requesterOrg) return res.status(401).json({ message: 'Unauthorized' });

    // Fetch users with role = 'Clerk' dynamically from the users table
    let sql = `
      SELECT u.*, cp.* 
      FROM users u
      LEFT JOIN clerk_profiles cp ON u.id = cp.user_id
      WHERE u.organization_id = ? AND u.role = 'Clerk'
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
    const { id } = req.params;
    const requesterId = req.user?.id;
    const requesterOrg = req.user?.organization_id;
    const requesterBranch = req.user?.branch_id;
    const requesterRole = req.user?.role;

    if (!id) return res.status(400).json({ message: 'Clerk ID is required' });

    // const [targetRows] = await pool.promise().execute(
    //   `SELECT u.*, cp.* 
    //    FROM users u
    //    LEFT JOIN clerk_profiles cp ON u.id = cp.user_id
    //    WHERE u.id = ?`,
    //   [id]
    // );

    const [targetRows] = await pool.promise().execute(
      `SELECT 
      u.id AS user_id, 
      u.name, 
      u.role,
      u.branch_id, 
      u.organization_id,
      cp.* 
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
    const isAdmin = ['Super_Admin', 'School_Admin'].includes(requesterRole);
    const canView = isSelf || (isAdmin && isSameOrg && (!requesterBranch || requesterBranch === target.branch_id));

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
    const data = req.body;

    if (data.date_of_birth) {
      const d = new Date(data.date_of_birth);
      data.date_of_birth = d.toISOString().slice(0, 10);
    }

    if (!id) return res.status(400).json({ message: 'Clerk ID is required' });

    // Check if user exists
    const [userCheck] = await pool.promise().execute(
      'SELECT id FROM users WHERE id = ?',
      [id]
    );

    if (userCheck.length === 0) return res.status(404).json({ message: 'User not found' });

    // Check if profile exists
    const [existing] = await pool.promise().execute(
      'SELECT * FROM clerk_profiles WHERE user_id = ?',
      [id]
    );

    const columns = Object.keys(data);
    const values = Object.values(data);

    if (existing.length > 0) {
      // Update existing profile
      const sql = `UPDATE clerk_profiles SET ${columns.map(c => `\`${c}\` = ?`).join(',')}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`;
      await pool.promise().execute(sql, [...values, id]);
      return res.json({ message: 'Profile updated successfully' });
    } else {
      // Create new profile
      const sql = `INSERT INTO clerk_profiles (user_id, ${columns.map(c => `\`${c}\``).join(',')}, created_at) VALUES (?, ${columns.map(() => '?').join(',')}, CURRENT_TIMESTAMP)`;
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

/* ===================== GET MY PROFILE ===================== */
exports.getMe = async (req, res) => {
  console.log("req.user:", req.user); // 🔥 Add this to debug
  req.params.id = req.user.id;
  return exports.getById(req, res);
};
