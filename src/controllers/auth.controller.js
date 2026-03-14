// const pool = repire('../config/db');
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');

// const login = async (req, res) => {
//   const { username, password } = req.body;

//   try {
//     const [users] = await pool.promise().execute(
//       'SELECT * FROM users WHERE username = ?',
//       [username]
//     );

//     const user = users[0];
//     if (!user) return res.status(401).json({ message: 'Invalid credentials' });

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

//     const token = jwt.sign(
//       {
//         id: user.id,
//         role: user.role,
//         organization_id: user.organization_id,
//         branch_id: user.branch_id
//       },
//       process.env.JWT_SECRET,
//       { expiresIn: '7d' }
//     );

//     res.status(200).json({
//       token,
//       user: {
//         id: user.id,
//         name: user.name,
//         username: user.username,
//         role: user.role,
//         organization_id: user.organization_id,
//         branch_id: user.branch_id
//       }
//     });
//   } catch (error) {
//     res.status(500).json({ message: 'Login failed', error });
//   }
// };

// module.exports = { login };


// const pool = require('../config/db');
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');

// const register = async (req, res) => {
//   res.status(403).json({ message: "Registering users directly is not allowed here." });
// };

// const login = async (req, res) => {
//   const { username, password } = req.body;

//   try {
//     const [users] = await pool.promise().execute(
//       'SELECT * FROM users WHERE username = ?',
//       [username]
//     );

//     const user = users[0];
//     if (!user) return res.status(401).json({ message: 'Invalid credentials' });

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

//     const token = jwt.sign(
//       {
//         id: user.id,
//         role: user.role,
//         organization_id: user.organization_id,
//         branch_id: user.branch_id
//       },
//       process.env.JWT_SECRET,
//       { expiresIn: '7d' }
//     );

//     res.status(200).json({
//       token,
//       user: {
//         id: user.id,
//         name: user.name,
//         username: user.username,
//         role: user.role,
//         organization_id: user.organization_id,
//         branch_id: user.branch_id
//       }
//     });
//   } catch (error) {
//     res.status(500).json({ message: 'Login failed' });
//   }
// };

// module.exports = { login, register };



const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

const register = async (req, res) => {
  res.status(403).json({ message: "Registering users directly is not allowed here." });
};

// Step 1: login username + password
const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const [users] = await pool.promise().execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    const user = users[0];
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    if (user.two_factor_enabled) {
      // 2FA enabled, prompt client for code
      return res.status(200).json({
        twoFactorRequired: true,
        message: '2FA code required',
        userId: user.id,
      });
    }

    // 2FA not enabled, return JWT token as usual
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        organization_id: user.organization_id,
        branch_id: user.branch_id
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        organization_id: user.organization_id,
        branch_id: user.branch_id
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
};

// Step 2: verify 2FA token after login if required
const verify2FA = async (req, res) => {
  const { userId, token: userToken } = req.body;

  try {
    const [users] = await pool.promise().execute(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    const user = users[0];
    if (!user) return res.status(401).json({ message: 'Invalid user' });
    if (!user.two_factor_enabled || !user.two_factor_secret) {
      return res.status(400).json({ message: '2FA not enabled for this user' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: userToken,
      window: 1
    });

    if (!verified) {
      return res.status(401).json({ message: 'Invalid 2FA token' });
    }

    // 2FA success, issue JWT token
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        organization_id: user.organization_id,
        branch_id: user.branch_id
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        organization_id: user.organization_id,
        branch_id: user.branch_id,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('2FA verify error:', error);
    res.status(500).json({ message: '2FA verification failed' });
  }
};

// Generate 2FA secret & QR code for user to scan
const generate2FASecret = async (req, res) => {
  // userId should come from req.user from verifyToken middleware
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const secret = speakeasy.generateSecret({
      name: `orbitEDU (${userId})`
    });

    // Save secret to DB but don't enable 2FA yet
    await pool.promise().execute(
      'UPDATE users SET two_factor_secret = ?, two_factor_enabled = FALSE WHERE id = ?',
      [secret.base32, userId]
    );

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    res.status(200).json({
      message: '2FA secret generated',
      qrCodeUrl,
      manualCode: secret.base32
    });
  } catch (error) {
    console.error('Generate 2FA secret error:', error);
    res.status(500).json({ message: 'Failed to generate 2FA secret' });
  }
};

// Verify 2FA token during setup and enable 2FA for user
const enable2FA = async (req, res) => {
  const userId = req.user?.id;
  const { token: userToken } = req.body;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const [users] = await pool.promise().execute(
      'SELECT two_factor_secret FROM users WHERE id = ?',
      [userId]
    );
    const user = users[0];
    if (!user || !user.two_factor_secret) {
      return res.status(400).json({ message: '2FA secret not found for user' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: userToken,
      window: 1
    });

    if (!verified) {
      return res.status(401).json({ message: 'Invalid 2FA token' });
    }

    await pool.promise().execute(
      'UPDATE users SET two_factor_enabled = TRUE WHERE id = ?',
      [userId]
    );

    res.status(200).json({ message: '2FA enabled successfully' });
  } catch (error) {
    console.error('Enable 2FA error:', error);
    res.status(500).json({ message: 'Failed to enable 2FA' });
  }
};

module.exports = { login, register, generate2FASecret, enable2FA, verify2FA };
