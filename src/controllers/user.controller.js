const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

// ========== Create User ==========
const createUser = async (req, res) => {
  const { name, username, password, role } = req.body;
  const creatorRole = req.user.role;
  const creatorOrg = req.user.organization_id;
  const creatorBranch = req.user.branch_id;

  const allowed = {
    orbitEDU_Admin: ['Super_Admin'],
    Super_Admin: ['School_Admin'],
    School_Admin: ['Teacher', 'Clerk']
  };

  if (!allowed[creatorRole] || !allowed[creatorRole].includes(role)) {
    return res.status(403).json({ message: 'You cannot create this role' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    let orgId = null;
    let branchId = null;

    if (creatorRole === 'orbitEDU_Admin') {
      // orbitEDU_Admin is GLOBAL → org must come from request
      orgId = req.body.organization_id || null;
      branchId = null;

      if (!orgId) {
        return res.status(400).json({
          message: 'organization_id is required for Super_Admin creation'
        });
      }
    }


    // if (creatorRole === 'Super_Admin') {
    //   orgId = creatorOrg;

    //   branchId = req.body.branch_id;

    //   if (!branchId) {
    //     return res.status(400).json({
    //       message: 'branch_id is required'
    //     });
    //   }

    // }

    // if (creatorRole === 'School_Admin') {
    //   orgId = creatorOrg;
    //   branchId = creatorBranch;
    // }

    if (creatorRole === 'Super_Admin') {
      orgId = creatorOrg; // organization of the Super_Admin

      // branchId is required only if creating School_Admin
      if (role === 'School_Admin') {
        branchId = req.body.branch_id; // must be provided by frontend
        if (!branchId) {
          return res.status(400).json({
            message: 'branch_id is required when creating School_Admin'
          });
        }
      } else {
        branchId = null; // Teachers/Clerks not created by Super_Admin
      }
    }

    if (creatorRole === 'School_Admin') {
      orgId = creatorOrg;
      branchId = creatorBranch;

      if (!branchId) {
        return res.status(400).json({
          message: 'branch_id is required for School_Admin users'
        });
      }
    }

    // Generate 2FA secret for new user
    const secret = speakeasy.generateSecret({
      name: `orbitEDU (${username})`
    });

    // Insert user with 2FA secret saved, but 2FA disabled by default
    const [result] = await pool.promise().execute(
      `INSERT INTO users 
       (name, username, password, plain_password, role, organization_id, branch_id, two_factor_secret, two_factor_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, username, hashedPassword, password, role, orgId, branchId, secret.base32, false]
    );

    const userId = result.insertId;

    // === Insert base profile row for Teacher or Clerk ===
    try {
      if (role === 'Teacher') {
        await pool.promise().execute(
          `INSERT INTO teacher_profiles (user_id, status, created_at) VALUES (?, 'Active', CURRENT_TIMESTAMP)`,
          [userId]
        );
      } else if (role === 'Clerk') {
        await pool.promise().execute(
          `INSERT INTO clerk_profiles (user_id, status, created_at) VALUES (?, 'Active', CURRENT_TIMESTAMP)`,
          [userId]
        );
      }
    } catch (profileErr) {
      console.error('Profile creation error:', profileErr);
    }

    // Generate QR code URL for frontend to display
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    res.status(201).json({
      message: `${role} created`,
      userId: result.insertId,
      username,
      password,
      role,
      twoFactor: {
        qrCodeUrl,
        manualCode: secret.base32
      }
    });
  } catch (err) {
    console.error('❌ User creation error:', err);

    if (err.code === 'ER_DUP_ENTRY' && err.message.includes('users.username')) {
      return res.status(400).json({ message: 'Username already exists. Please choose another.' });
    }

    res.status(500).json({ message: 'User creation failed', error: err.message });
  }
};

// ========== Get Created Users ==========
const getCreatedUsersByCurrentUser = async (req, res) => {
  const { role, organization_id, branch_id } = req.user;

  try {
    let query = '';
    let params = [];

    if (role === 'orbitEDU_Admin') {
      query = `SELECT id, name, username, role, organization_id, branch_id, created_at, two_factor_secret FROM users WHERE role = 'Super_Admin'`;
    } else if (role === 'Super_Admin') {
      query = `SELECT id, name, username, role, organization_id, branch_id, created_at, two_factor_secret FROM users WHERE organization_id = ? AND role = 'School_Admin'`;
      params = [organization_id];
    } else if (role === 'School_Admin') {
      query = `SELECT id, name, username, role, organization_id, branch_id, created_at, two_factor_secret FROM users WHERE branch_id = ? AND role IN ('Teacher', 'Clerk')`;
      params = [branch_id];
    } else {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    /**
     * if (role === 'orbitEDU_Admin') {
      query = `SELECT id, name, username, role, organization_id, branch_id, created_at, plain_password, two_factor_enabled, CASE WHEN two_factor_enabled = 0 THEN two_factor_secret ELSE NULL END AS two_factor_secret FROM users WHERE role = 'Super_Admin'`;
    } 
    else if (role === 'Super_Admin') {
      query = `SELECT id, name, username, role, organization_id, branch_id, created_at, plain_password, two_factor_enabled, CASE WHEN two_factor_enabled = 0 THEN two_factor_secret ELSE NULL END AS two_factor_secret FROM users WHERE organization_id = ? AND role = 'School_Admin'`;
      params = [organization_id];
    } 
    else if (role === 'School_Admin') {
      query = `SELECT id, name, username, role, organization_id, branch_id, created_at, plain_password, two_factor_enabled, CASE WHEN two_factor_enabled = 0 THEN two_factor_secret ELSE NULL END AS two_factor_secret FROM users WHERE branch_id = ? AND role IN ('Teacher', 'Clerk')`;
      params = [branch_id];
    } 
    else {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    */

    const [users] = await pool.promise().execute(query, params);
    //console.log('created users list', users)
    res.json({ users });
  } catch (error) {
    console.error('❌ Fetch created users error:', error);
    res.status(500).json({ message: 'Failed to fetch created users' });
  }
};

// ========== Get Users with Filters (for frontend dropdowns) ==========
const getUsers = async (req, res) => {
  try {
    const { role, branch_id, organization_id } = req.query;

    let sql = `SELECT id, name, username, role, organization_id, branch_id FROM users WHERE 1=1`;
    const params = [];

    if (role) {
      sql += ` AND role = ?`;
      params.push(role);
    }

    if (branch_id) {
      sql += ` AND branch_id = ?`;
      params.push(branch_id);
    }

    if (organization_id) {
      sql += ` AND organization_id = ?`;
      params.push(organization_id);
    }

    const [rows] = await pool.promise().query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('❌ Fetch users error:', err);
    res.status(500).json({ message: 'Failed to fetch users', error: err.message });
  }
};


// ========== Verify User 2FA ==========
const verifyUser2FA = async (req, res) => {
  const { userId } = req.params;
  const { token } = req.body;

  try {
    const [rows] = await pool.promise().execute(
      'SELECT two_factor_secret FROM users WHERE id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { two_factor_secret } = rows[0];

    const verified = speakeasy.totp.verify({
      secret: two_factor_secret,
      encoding: 'base32',
      token
    });

    if (!verified) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    await pool.promise().execute(
      'UPDATE users SET two_factor_enabled = ? WHERE id = ?',
      [true, userId]
    );

    res.json({ message: '2FA setup complete' });
  } catch (err) {
    console.error('❌ 2FA verification error:', err);
    res.status(500).json({ message: '2FA verification failed', error: err.message });
  }
};

// ========== Get Logged-in User Profile (/me) ==========
const getMe = async (req, res) => {
  try {
    const { id, role } = req.user;
    let sql = '';
    let profileTable = '';

    // Determine which profile table to join based on role
    if (role === 'Teacher') {
      profileTable = 'teacher_profiles';
    } else if (role === 'Clerk') {
      profileTable = 'clerk_profiles';
    }

    if (profileTable) {
      // Join users with their specific profile
      sql = `
        SELECT 
          u.id, u.name, u.username, u.role, u.organization_id, u.branch_id, u.created_at, u.two_factor_enabled,
          p.*
        FROM users u
        LEFT JOIN ${profileTable} p ON u.id = p.user_id
        WHERE u.id = ?
      `;
    } else {
      // For Admin roles without specific profiles
      sql = `SELECT id, name, username, role, organization_id, branch_id, created_at, two_factor_enabled FROM users WHERE id = ?`;
    }

    const [rows] = await pool.promise().execute(sql, [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });

    const user = rows[0];
    
    res.json({
      ...user,
      has_profile: profileTable ? !!(user.phone_number || user.date_of_birth) : false
    });
  } catch (err) {
    console.error('❌ getMe error:', err);
    res.status(500).json({ message: 'Failed to fetch your profile' });
  }
};

module.exports = {
  createUser,
  getCreatedUsersByCurrentUser,
  verifyUser2FA,
  getUsers,
  getMe
};