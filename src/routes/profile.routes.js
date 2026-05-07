const router = require('express').Router();
const userCtrl = require('../controllers/user.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Apply authentication middleware
router.use(verifyToken);

// GET /api/profile/me - Get current logged-in user details and profile
router.get('/me', userCtrl.getMe);

module.exports = router;