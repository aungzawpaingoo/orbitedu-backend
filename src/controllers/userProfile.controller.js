// const pool = require('../config/db');

// const ROLE_TABLE_MAP = {
//   Teacher: 'teacher_profiles',
//   Clerk: 'clerk_profiles',
//   Parent: 'parent_profiles',
//   School_Admin: 'school_admin_profiles',
//   Super_Admin: 'super_admin_profiles',
// };

// const getProfileTable = (role) => {
//   const table = ROLE_TABLE_MAP[role];
//   if (!table) throw new Error(`No profile table for role: ${role}`);
//   return table;
// };

// /* ===================== GET ALL ===================== */
// /* Admin usage only (optional) */
// exports.getAll = async (req, res) => {
//   try {
//     const { role } = req.user;
//     const table = getProfileTable(role);

//     const [rows] = await pool.promise().query(
//       `SELECT * FROM ${table}`
//     );

//     res.json(rows);
//   } catch (err) {
//     console.error('Get all profiles error:', err);
//     res.status(500).json({ message: 'Failed to fetch profiles' });
//   }
// };

// /* ===================== GET MY PROFILE ===================== */
// exports.getMyProfile = async (req, res) => {
//   try {
//     const { id: user_id, role } = req.user;
//     const table = getProfileTable(role);

//     const [rows] = await pool.promise().query(
//       `SELECT * FROM ${table} WHERE user_id = ? LIMIT 1`,
//       [user_id]
//     );

//     res.json(rows[0] || null);
//   } catch (err) {
//     console.error('Get my profile error:', err);
//     res.status(500).json({ message: 'Failed to fetch profile' });
//   }
// };

// /* ===================== GET BY ID ===================== */
// exports.getById = async (req, res) => {
//   const { id } = req.params;

//   try {
//     const { role } = req.user;
//     const table = getProfileTable(role);

//     const [rows] = await pool.promise().query(
//       `SELECT * FROM ${table} WHERE id = ?`,
//       [id]
//     );

//     res.json(rows[0] || null);
//   } catch (err) {
//     console.error('Get profile by ID error:', err);
//     res.status(500).json({ message: 'Failed to fetch profile' });
//   }
// };

// /* ===================== CREATE ===================== */
// exports.create = async (req, res) => {
//   try {
//     const { id: user_id, role } = req.user;
//     const table = getProfileTable(role);

//     const data = { ...req.body, user_id };

//     // files
//     if (req.files?.profile_photo?.[0]) {
//       data.profile_photo = req.files.profile_photo[0].path.replace(/\\/g, '/');
//     }

//     if (req.files?.attachments) {
//       data.attachments = req.files.attachments
//         .map(f => f.path.replace(/\\/g, '/'))
//         .join(',');
//     }

//     const columns = Object.keys(data);
//     const values = Object.values(data);

//     const sql = `
//       INSERT INTO ${table}
//       (${columns.map(c => `\`${c}\``).join(',')})
//       VALUES (${columns.map(() => '?').join(',')})
//     `;

//     const [result] = await pool.promise().execute(sql, values);

//     res.json({ id: result.insertId, message: 'Profile created' });
//   } catch (err) {
//     console.error('Create profile error:', err);
//     res.status(500).json({ message: 'Failed to create profile' });
//   }
// };

// /* ===================== UPDATE ===================== */
// exports.update = async (req, res) => {
//   const { id } = req.params;

//   try {
//     const { role } = req.user;
//     const table = getProfileTable(role);

//     const data = { ...req.body };

//     // files
//     if (req.files?.profile_photo?.[0]) {
//       data.profile_photo = req.files.profile_photo[0].path.replace(/\\/g, '/');
//     }

//     if (req.files?.attachments) {
//       data.attachments = req.files.attachments
//         .map(f => f.path.replace(/\\/g, '/'))
//         .join(',');
//     }

//     const columns = Object.keys(data);
//     const values = Object.values(data);

//     const sql = `
//       UPDATE ${table}
//       SET ${columns.map(c => `\`${c}\` = ?`).join(', ')}
//       WHERE id = ?
//     `;

//     await pool.promise().execute(sql, [...values, id]);

//     res.json({ success: true, message: 'Profile updated' });
//   } catch (err) {
//     console.error('Update profile error:', err);
//     res.status(500).json({ message: 'Failed to update profile' });
//   }
// };

// /* ===================== DELETE ===================== */
// exports.remove = async (req, res) => {
//   const { id } = req.params;

//   try {
//     const { role } = req.user;
//     const table = getProfileTable(role);

//     await pool.promise().execute(
//       `DELETE FROM ${table} WHERE id = ?`,
//       [id]
//     );

//     res.json({ success: true, message: 'Profile deleted' });
//   } catch (err) {
//     console.error('Delete profile error:', err);
//     res.status(500).json({ message: 'Failed to delete profile' });
//   }
// };





const pool = require('../config/db');

const ROLE_TABLE_MAP = {
  Teacher: 'teacher_profiles',
  Clerk: 'clerk_profiles',
  Parent: 'parent_profiles',
  School_Admin: 'school_admin_profiles',
  Super_Admin: 'super_admin_profiles',
};

const getProfileTable = (role) => {
  const table = ROLE_TABLE_MAP[role];
  if (!table) throw new Error(`No profile table for role: ${role}`);
  return table;
};

/* ===================== GET ALL ===================== */
exports.getAll = async (req, res) => {
  try {
    const { role } = req.user;
    const table = getProfileTable(role);

    const [rows] = await pool.promise().query(
      `SELECT p.*, u.name, u.role, u.username
       FROM ${table} p
       JOIN users u ON u.id = p.user_id`
    );

    res.json(rows);
  } catch (err) {
    console.error('Get all profiles error:', err);
    res.status(500).json({ message: 'Failed to fetch profiles' });
  }
};

/* ===================== GET MY PROFILE ===================== */
exports.getMyProfile = async (req, res) => {
  try {
    const { id: user_id, role } = req.user;
    const table = getProfileTable(role);

    const [rows] = await pool.promise().query(
      `SELECT p.*, u.name, u.role, u.username
       FROM ${table} p
       JOIN users u ON u.id = p.user_id
       WHERE p.user_id = ?
       LIMIT 1`,
      [user_id]
    );

    res.json(rows[0] || null);
  } catch (err) {
    console.error('Get my profile error:', err);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
};

/* ===================== GET BY ID ===================== */
exports.getById = async (req, res) => {
  const { id } = req.params;

  try {
    const { role } = req.user;
    const table = getProfileTable(role);

    const [rows] = await pool.promise().query(
      `SELECT p.*, u.name, u.role, u.username
       FROM ${table} p
       JOIN users u ON u.id = p.user_id
       WHERE p.id = ?`,
      [id]
    );

    res.json(rows[0] || null);
  } catch (err) {
    console.error('Get profile by ID error:', err);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
};

/* ===================== CREATE ===================== */
exports.create = async (req, res) => {
  try {
    const { id: user_id, role } = req.user;
    const table = getProfileTable(role);

    const data = { ...req.body, user_id };

    // files
    if (req.files?.profile_photo?.[0]) {
      data.profile_photo = req.files.profile_photo[0].path.replace(/\\/g, '/');
    }

    if (req.files?.attachments) {
      data.attachments = req.files.attachments
        .map(f => f.path.replace(/\\/g, '/'))
        .join(',');
    }

    const columns = Object.keys(data);
    const values = Object.values(data);

    const sql = `
      INSERT INTO ${table}
      (${columns.map(c => `\`${c}\``).join(',')})
      VALUES (${columns.map(() => '?').join(',')})
    `;

    const [result] = await pool.promise().execute(sql, values);

    res.json({ id: result.insertId, message: 'Profile created' });
  } catch (err) {
    console.error('Create profile error:', err);
    res.status(500).json({ message: 'Failed to create profile' });
  }
};

/* ===================== UPDATE ===================== */
exports.update = async (req, res) => {
  const { id } = req.params;

  try {
    const { role } = req.user;
    const table = getProfileTable(role);

    const data = { ...req.body };

    // files
    if (req.files?.profile_photo?.[0]) {
      data.profile_photo = req.files.profile_photo[0].path.replace(/\\/g, '/');
    }

    if (req.files?.attachments) {
      data.attachments = req.files.attachments
        .map(f => f.path.replace(/\\/g, '/'))
        .join(',');
    }

    const columns = Object.keys(data);
    const values = Object.values(data);

    const sql = `
      UPDATE ${table}
      SET ${columns.map(c => `\`${c}\` = ?`).join(', ')}
      WHERE id = ?
    `;

    await pool.promise().execute(sql, [...values, id]);

    res.json({ success: true, message: 'Profile updated' });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ message: 'Failed to update profile' });
  }
};

/* ===================== DELETE ===================== */
exports.remove = async (req, res) => {
  const { id } = req.params;

  try {
    const { role } = req.user;
    const table = getProfileTable(role);

    await pool.promise().execute(
      `DELETE FROM ${table} WHERE id = ?`,
      [id]
    );

    res.json({ success: true, message: 'Profile deleted' });
  } catch (err) {
    console.error('Delete profile error:', err);
    res.status(500).json({ message: 'Failed to delete profile' });
  }
};


