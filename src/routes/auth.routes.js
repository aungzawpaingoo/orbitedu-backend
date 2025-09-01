// const express = require('express');
// const router = express.Router();
// const { login } = require('../controllers/auth.controller');

// router.post('/login', login);

// module.exports = router;


const express = require('express');
const router = express.Router();

const {
  login,
  generate2FASecret,
  enable2FA,
  verify2FA,
  register
} = require('../controllers/auth.controller');

const { verifyToken } = require('../middleware/auth.middleware');

console.log({
  login,
  generate2FASecret,
  enable2FA,
  verify2FA,
  register
});


router.post('/login', login);

// Protect 2FA setup routes - only logged-in users can generate & enable 2FA
router.post('/2fa/generate', verifyToken, generate2FASecret);
router.post('/2fa/enable', verifyToken, enable2FA);

// Verify 2FA token during login (no auth middleware here, userId from body)
router.post('/2fa/verify', verify2FA);

// Your original register route remains blocked
router.post('/register', register);

module.exports = router;
