const router = require('express').Router();
const ctrl = require('../controllers/clerk.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Apply authentication middleware to all routes
router.use(verifyToken);

// === Standard CRUD routes ===
router.get('/', ctrl.getAll);         // Get all clerks (filtered by Org/Branch)
router.get('/:id', ctrl.getById);     // Get clerk profile by User ID
router.post('/:id', ctrl.create);     // Create/Update clerk profile
router.put('/:id', ctrl.update);      // Update clerk profile
router.delete('/:id', ctrl.remove);   // Remove clerk profile

module.exports = router;
