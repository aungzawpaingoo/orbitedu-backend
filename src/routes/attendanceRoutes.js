const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');

// Correctly importing the specific function from your auth.middleware.js
const { verifyToken } = require('../middleware/auth.middleware'); 

// Routes
router.post('/check-in', verifyToken, attendanceController.checkIn);
router.post('/check-out', verifyToken, attendanceController.checkOut);
router.get('/history', verifyToken, attendanceController.getMyHistory);
router.get('/all', verifyToken, attendanceController.getDailyAttendance);


module.exports = router;
