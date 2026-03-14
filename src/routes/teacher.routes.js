// const express = require('express');
// const router = express.Router();
// const teacherController = require('../controllers/teacher.controller');
// const { verifyToken } = require('../middleware/auth.middleware');

// // === Routes ===

// router.get('/me', verifyToken, teacherController.getMyProfile);

// router.post('/:userId/profile', verifyToken, teacherController.createOrUpdateProfile);

// router.get('/:userId/profile', verifyToken, teacherController.getProfile);

// router.get('/', verifyToken, teacherController.getTeachersByRole);

// router.delete('/:userId/profile', verifyToken, teacherController.deleteProfile);

// module.exports = router;



const router = require('express').Router();
const ctrl = require('../controllers/teacher.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Apply authentication middleware to all routes
router.use(verifyToken);

// === Custom routes ===
router.get('/me', ctrl.getMe);        // Get current user's teacher profile

// === Standard CRUD routes ===
router.get('/', ctrl.getAll);         // Get all teachers
router.get('/:id', ctrl.getById);     // Get teacher by ID
router.post('/:id', ctrl.create);     // Create teacher profile
router.put('/:id', ctrl.update);      // Update teacher profile
router.delete('/:id', ctrl.remove);   // Delete teacher profile



module.exports = router;
