// const pool = require('../config/db');
// const bcrypt = require('bcryptjs');

// const createUser = async (req, res) => {
//   const { name, username, password, role, organization_id, branch_id } = req.body;
//   const creatorRole = req.user.role;
//   const creatorOrg = req.user.organization_id;
//   const creatorBranch = req.user.branch_id;

//   const allowed = {
//     orbitEDU_Admin: ['Super_Admin'],
//     Super_Admin: ['School_Admin'],
//     School_Admin: ['Teacher', 'Clerk']
//   };

//   if (!allowed[creatorRole] || !allowed[creatorRole].includes(role)) {
//     return res.status(403).json({ message: 'You cannot create this role' });
//   }

//   try {
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // const orgId = creatorRole === 'orbitEDU_Admin' ? organization_id : creatorOrg;
//     // const branchId = creatorRole === 'School_Admin' ? creatorBranch : branch_id;

//     const orgId = creatorRole === 'orbitEDU_Admin' ? (organization_id ?? null) : (creatorOrg ?? null);
//     const branchId = creatorRole === 'School_Admin' ? (creatorBranch ?? null) : (branch_id ?? null);


//     const [result] = await pool.promise().execute(
//       `INSERT INTO users (name, username, password, role, organization_id, branch_id)
//        VALUES (?, ?, ?, ?, ?, ?)`,
//       [name, username, hashedPassword, role, orgId, branchId]
//     );

//     res.status(201).json({ message: `${role} created`, userId: result.insertId });
//   } catch (err) {
//     console.error('❌ User creation error:', err);
//     res.status(500).json({ message: 'User creation failed', error: err.message });
//   }
// };

// module.exports = { createUser };



// const pool = require('../config/db');
// const bcrypt = require('bcryptjs');

// // Helpers to auto-create org and branch
// const createOrganization = async (orgName) => {
//   const [orgResult] = await pool.promise().execute(
//     'INSERT INTO organizations (name) VALUES (?)',
//     [orgName]
//   );
//   return orgResult.insertId;
// };

// const createBranch = async (branchName, orgId) => {
//   const [branchResult] = await pool.promise().execute(
//     'INSERT INTO branches (name, organization_id) VALUES (?, ?)',
//     [branchName, orgId]
//   );
//   return branchResult.insertId;
// };

// const createUser = async (req, res) => {
//   const { name, username, password, role } = req.body;
//   const creatorRole = req.user.role;
//   const creatorOrg = req.user.organization_id;
//   const creatorBranch = req.user.branch_id;

//   const allowed = {
//     orbitEDU_Admin: ['Super_Admin'],
//     Super_Admin: ['School_Admin'],
//     School_Admin: ['Teacher', 'Clerk']
//   };

//   if (!allowed[creatorRole] || !allowed[creatorRole].includes(role)) {
//     return res.status(403).json({ message: 'You cannot create this role' });
//   }

//   try {
//     const hashedPassword = await bcrypt.hash(password, 10);

//     let orgId = null;
//     let branchId = null;

//     if (creatorRole === 'orbitEDU_Admin' && role === 'Super_Admin') {
//       const uniqueSuffix = Date.now(); // e.g., 1722007123456
//       const organizationName = `School_${uniqueSuffix}`;
//       const branchName = `Main_Branch_${uniqueSuffix}`;

//       orgId = await createOrganization(organizationName);
//       branchId = await createBranch(branchName, orgId);
//     } else {
//       orgId = creatorOrg;
//       branchId = creatorRole === 'School_Admin' ? creatorBranch : req.body.branch_id;
//     }

//     const [result] = await pool.promise().execute(
//       `INSERT INTO users (name, username, password, role, organization_id, branch_id)
//        VALUES (?, ?, ?, ?, ?, ?)`,
//       [name, username, hashedPassword, role, orgId, branchId]
//     );

//     res.status(201).json({
//       message: `${role} created`,
//       userId: result.insertId,
//       username,
//       plainPassword: password // for display in frontend
//     });
//   } catch (err) {
//     console.error('❌ User creation error:', err);
//     res.status(500).json({ message: 'User creation failed', error: err.message });
//   }
// };

// module.exports = { createUser };






// const pool = require('../config/db');
// const bcrypt = require('bcryptjs');

// const createUser = async (req, res) => {
//   const { name, username, password, role } = req.body;
//   const creatorRole = req.user.role;
//   const creatorOrg = req.user.organization_id;
//   const creatorBranch = req.user.branch_id;

//   const allowed = {
//     orbitEDU_Admin: ['Super_Admin'],
//     Super_Admin: ['School_Admin'],
//     School_Admin: ['Teacher', 'Clerk']
//   };

//   if (!allowed[creatorRole] || !allowed[creatorRole].includes(role)) {
//     return res.status(403).json({ message: 'You cannot create this role' });
//   }

//   try {
//     const hashedPassword = await bcrypt.hash(password, 10);

//     let orgId = null;
//     let branchId = null;

//     if (creatorRole === 'orbitEDU_Admin') {
//       // Auto-create organization & branch
//       const [orgResult] = await pool.promise().execute(
//         'INSERT INTO organizations (name) VALUES (?)',
//         [`${name} Org`] // you can customize this
//       );
//       orgId = orgResult.insertId;

//       const [branchResult] = await pool.promise().execute(
//         'INSERT INTO branches (name, organization_id) VALUES (?, ?)',
//         [`Main Branch`, orgId]
//       );
//       branchId = branchResult.insertId;
//     }

//     if (creatorRole === 'Super_Admin') {
//       // Inherit org_id, create new branch
//       orgId = creatorOrg;

//       const [branchResult] = await pool.promise().execute(
//         'INSERT INTO branches (name, organization_id) VALUES (?, ?)',
//         [name, orgId] // use name as branch name
//       );
//       branchId = branchResult.insertId;
//     }

//     if (creatorRole === 'School_Admin') {
//       orgId = creatorOrg;
//       branchId = creatorBranch;
//     }

//     const [result] = await pool.promise().execute(
//       `INSERT INTO users (name, username, password, role, organization_id, branch_id)
//        VALUES (?, ?, ?, ?, ?, ?)`,
//       [name, username, hashedPassword, role, orgId, branchId]
//     );

//     res.status(201).json({ message: `${role} created`, userId: result.insertId });
//   } catch (err) {
//     console.error('❌ User creation error:', err);

//     if (err.code === 'ER_DUP_ENTRY' && err.message.includes('users.username')) {
//       return res.status(400).json({ message: 'Username already exists. Please choose another.' });
//     }

//     res.status(500).json({ message: 'User creation failed', error: err.message });
//   }
// };

// module.exports = { createUser };










// const pool = require('../config/db');
// const bcrypt = require('bcryptjs');

// // ========== Create User ==========
// const createUser = async (req, res) => {
//   const { name, username, password, role } = req.body;
//   const creatorRole = req.user.role;
//   const creatorOrg = req.user.organization_id;
//   const creatorBranch = req.user.branch_id;

//   const allowed = {
//     orbitEDU_Admin: ['Super_Admin'],
//     Super_Admin: ['School_Admin'],
//     School_Admin: ['Teacher', 'Clerk']
//   };

//   if (!allowed[creatorRole] || !allowed[creatorRole].includes(role)) {
//     return res.status(403).json({ message: 'You cannot create this role' });
//   }

//   try {
//     const hashedPassword = await bcrypt.hash(password, 10);

//     let orgId = null;
//     let branchId = null;

//     if (creatorRole === 'orbitEDU_Admin') {
//       const [orgResult] = await pool.promise().execute(
//         'INSERT INTO organizations (name) VALUES (?)',
//         [`${name} Org`]
//       );
//       orgId = orgResult.insertId;

//       const [branchResult] = await pool.promise().execute(
//         'INSERT INTO branches (name, organization_id) VALUES (?, ?)',
//         ['Main Branch', orgId]
//       );
//       branchId = branchResult.insertId;
//     }

//     if (creatorRole === 'Super_Admin') {
//       orgId = creatorOrg;

//       const [branchResult] = await pool.promise().execute(
//         'INSERT INTO branches (name, organization_id) VALUES (?, ?)',
//         [name, orgId]
//       );
//       branchId = branchResult.insertId;
//     }

//     if (creatorRole === 'School_Admin') {
//       orgId = creatorOrg;
//       branchId = creatorBranch;
//     }

//     const [result] = await pool.promise().execute(
//       `INSERT INTO users (name, username, password, plain_password, role, organization_id, branch_id)
//        VALUES (?, ?, ?, ?, ?, ?, ?)`,
//       [name, username, hashedPassword, password, role, orgId, branchId]
//     );

//     res.status(201).json({
//       message: `${role} created`,
//       userId: result.insertId,
//       username,
//       password,
//       role
//     });
//   } catch (err) {
//     console.error('❌ User creation error:', err);

//     if (err.code === 'ER_DUP_ENTRY' && err.message.includes('users.username')) {
//       return res.status(400).json({ message: 'Username already exists. Please choose another.' });
//     }

//     res.status(500).json({ message: 'User creation failed', error: err.message });
//   }
// };

// // ========== Get Created Users ==========
// const getCreatedUsersByCurrentUser = async (req, res) => {
//   const { role, organization_id, branch_id } = req.user;

//   try {
//     let query = '';
//     let params = [];

//     if (role === 'orbitEDU_Admin') {
//       query = `SELECT username, plain_password, role FROM users WHERE role = 'Super_Admin'`;
//     } else if (role === 'Super_Admin') {
//       query = `SELECT username, plain_password, role FROM users WHERE organization_id = ? AND role = 'School_Admin'`;
//       params = [organization_id];
//     } else if (role === 'School_Admin') {
//       query = `SELECT username, plain_password, role FROM users WHERE branch_id = ? AND role IN ('Teacher', 'Clerk')`;
//       params = [branch_id];
//     } else {
//       return res.status(403).json({ message: 'Unauthorized' });
//     }

//     const [users] = await pool.promise().execute(query, params);
//     res.json({ users });
//   } catch (error) {
//     console.error('❌ Fetch created users error:', error);
//     res.status(500).json({ message: 'Failed to fetch created users' });
//   }
// };

// module.exports = {
//   createUser,
//   getCreatedUsersByCurrentUser
// };








// const pool = require('../config/db');
// const bcrypt = require('bcryptjs');
// const speakeasy = require('speakeasy');
// const qrcode = require('qrcode');

// // ========== Create User ==========
// const createUser = async (req, res) => {
//   const { name, username, password, role } = req.body;
//   const creatorRole = req.user.role;
//   const creatorOrg = req.user.organization_id;
//   const creatorBranch = req.user.branch_id;

//   const allowed = {
//     orbitEDU_Admin: ['Super_Admin'],
//     Super_Admin: ['School_Admin'],
//     School_Admin: ['Teacher', 'Clerk']
//   };

//   if (!allowed[creatorRole] || !allowed[creatorRole].includes(role)) {
//     return res.status(403).json({ message: 'You cannot create this role' });
//   }

//   try {
//     const hashedPassword = await bcrypt.hash(password, 10);

//     let orgId = null;
//     let branchId = null;

//     if (creatorRole === 'orbitEDU_Admin') {
//       const [orgResult] = await pool.promise().execute(
//         'INSERT INTO organizations (name) VALUES (?)',
//         [`${name} Org`]
//       );
//       orgId = orgResult.insertId;

//       const [branchResult] = await pool.promise().execute(
//         'INSERT INTO branches (name, organization_id) VALUES (?, ?)',
//         ['Main Branch', orgId]
//       );
//       branchId = branchResult.insertId;
//     }

//     if (creatorRole === 'Super_Admin') {
//       orgId = creatorOrg;

//       const [branchResult] = await pool.promise().execute(
//         'INSERT INTO branches (name, organization_id) VALUES (?, ?)',
//         [name, orgId]
//       );
//       branchId = branchResult.insertId;
//     }

//     if (creatorRole === 'School_Admin') {
//       orgId = creatorOrg;
//       branchId = creatorBranch;
//     }

//     // Generate 2FA secret for new user
//     const secret = speakeasy.generateSecret({
//       name: `orbitEDU (${username})`
//     });

//     // Insert user with 2FA secret saved, but 2FA disabled by default
//     const [result] = await pool.promise().execute(
//       `INSERT INTO users 
//        (name, username, password, plain_password, role, organization_id, branch_id, two_factor_secret, two_factor_enabled)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [name, username, hashedPassword, password, role, orgId, branchId, secret.base32, false]
//     );

//     // Generate QR code URL for frontend to display
//     const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

//     res.status(201).json({
//       message: `${role} created`,
//       userId: result.insertId,
//       username,
//       password,
//       role,
//       twoFactor: {
//         qrCodeUrl,
//         manualCode: secret.base32
//       }
//     });
//   } catch (err) {
//     console.error('❌ User creation error:', err);

//     if (err.code === 'ER_DUP_ENTRY' && err.message.includes('users.username')) {
//       return res.status(400).json({ message: 'Username already exists. Please choose another.' });
//     }

//     res.status(500).json({ message: 'User creation failed', error: err.message });
//   }
// };

// // ========== Get Created Users ==========
// const getCreatedUsersByCurrentUser = async (req, res) => {
//   const { role, organization_id, branch_id } = req.user;

//   try {
//     let query = '';
//     let params = [];

//     if (role === 'orbitEDU_Admin') {
//       query = `SELECT username, plain_password, role FROM users WHERE role = 'Super_Admin'`;
//     } else if (role === 'Super_Admin') {
//       query = `SELECT username, plain_password, role FROM users WHERE organization_id = ? AND role = 'School_Admin'`;
//       params = [organization_id];
//     } else if (role === 'School_Admin') {
//       query = `SELECT username, plain_password, role FROM users WHERE branch_id = ? AND role IN ('Teacher', 'Clerk')`;
//       params = [branch_id];
//     } else {
//       return res.status(403).json({ message: 'Unauthorized' });
//     }

//     const [users] = await pool.promise().execute(query, params);
//     res.json({ users });
//   } catch (error) {
//     console.error('❌ Fetch created users error:', error);
//     res.status(500).json({ message: 'Failed to fetch created users' });
//   }
// };

// module.exports = {
//   createUser,
//   getCreatedUsersByCurrentUser
// };









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
      const [orgResult] = await pool.promise().execute(
        'INSERT INTO organizations (name) VALUES (?)',
        [`${name} Org`]
      );
      orgId = orgResult.insertId;

      const [branchResult] = await pool.promise().execute(
        'INSERT INTO branches (name, organization_id) VALUES (?, ?)',
        ['Main Branch', orgId]
      );
      branchId = branchResult.insertId;
    }

    if (creatorRole === 'Super_Admin') {
      orgId = creatorOrg;

      const [branchResult] = await pool.promise().execute(
        'INSERT INTO branches (name, organization_id) VALUES (?, ?)',
        [name, orgId]
      );
      branchId = branchResult.insertId;
    }

    if (creatorRole === 'School_Admin') {
      orgId = creatorOrg;
      branchId = creatorBranch;
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
      query = `SELECT username, plain_password, role FROM users WHERE role = 'Super_Admin'`;
    } else if (role === 'Super_Admin') {
      query = `SELECT username, plain_password, role FROM users WHERE organization_id = ? AND role = 'School_Admin'`;
      params = [organization_id];
    } else if (role === 'School_Admin') {
      query = `SELECT username, plain_password, role FROM users WHERE branch_id = ? AND role IN ('Teacher', 'Clerk')`;
      params = [branch_id];
    } else {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const [users] = await pool.promise().execute(query, params);
    res.json({ users });
  } catch (error) {
    console.error('❌ Fetch created users error:', error);
    res.status(500).json({ message: 'Failed to fetch created users' });
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

module.exports = {
  createUser,
  getCreatedUsersByCurrentUser,
  verifyUser2FA
};