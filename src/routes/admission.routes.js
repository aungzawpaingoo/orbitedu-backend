const express = require('express');
const router = express.Router();
const admissionController = require('../controllers/admission.controller');
const auth = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/roleCheck');

// ========== PUBLIC ROUTES (No Auth Needed) ==========
// For parents filling admission form
router.post('/submit', admissionController.submitAdmissionForm);
router.get('/queue-status/:queueNumber', admissionController.checkQueueStatus);

// ========== PROTECTED ADMIN ROUTES ==========
// Dashboard - for admin only
router.get('/dashboard', auth, requireRole(['admin']), admissionController.getAdminDashboard);

// Queue management - for admin only
router.post('/call-next', auth, requireRole(['admin']), admissionController.callNextToCounter);
router.post('/complete-counter', auth, requireRole(['admin']), admissionController.markCounterCompleted);

// Admission review - for admin only
router.get('/reviews', auth, requireRole(['admin']), admissionController.getPendingReviews);
router.post('/approve', auth, requireRole(['admin']), admissionController.approveAdmission);
router.post('/reject', auth, requireRole(['admin']), admissionController.rejectAdmission);

// ========== OPTIONAL: For CEO (if needed) ==========
// CEO can view across multiple schools
router.get('/ceo-dashboard', auth, requireRole(['ceo', 'admin']), (req, res) => {
    // You can add CEO-specific dashboard here
    res.json({ message: 'CEO Dashboard' });
});

module.exports = router;