const router = require('express').Router();
const ctrl = require('../controllers/clerk.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Apply authentication middleware to all routes
router.use(verifyToken);

// === Custom routes ===
router.get('/me', ctrl.getMe);   

// === Standard CRUD routes ===
router.get('/', ctrl.getAll);         // Get all clerks
router.get('/:id', ctrl.getById);     // Get clerk by ID
router.post('/:id', ctrl.create);     // Create clerk profile
router.get('/', ctrl.getAll);         // Get all clerks (filtered by Org/Branch)
router.get('/:id', ctrl.getById);     // Get clerk profile by User ID
router.post('/:id', ctrl.create);     // Create/Update clerk profile
router.put('/:id', ctrl.update);      // Update clerk profile
router.delete('/:id', ctrl.remove);   // Delete clerk profile
router.delete('/:id', ctrl.remove);   // Remove clerk profile

     // Get current user's clerk profile

module.exports = router;
