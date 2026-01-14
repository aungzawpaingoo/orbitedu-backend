const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacher.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// === Routes ===

router.get('/me', verifyToken, teacherController.getMyProfile);

router.post('/:userId/profile', verifyToken, teacherController.createOrUpdateProfile);

router.get('/:userId/profile', verifyToken, teacherController.getProfile);

router.get('/', verifyToken, teacherController.getTeachersByRole);

router.delete('/:userId/profile', verifyToken, teacherController.deleteProfile);

module.exports = router;