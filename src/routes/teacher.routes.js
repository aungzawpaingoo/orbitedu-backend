const router = require('express').Router();
const ctrl = require('../controllers/teacher.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Apply authentication middleware to all routes
router.use(verifyToken);

// === Standard CRUD routes ===
router.get('/', ctrl.getAll);         // Get all teachers (filtered by Org/Branch)
router.get('/:id', ctrl.getById);     // Get teacher profile by User ID
router.post('/:id', ctrl.create);     // Create/Update teacher profile
router.put('/:id', ctrl.update);      // Update teacher profile
router.delete('/:id', ctrl.remove);   // Remove teacher profile

module.exports = router;
