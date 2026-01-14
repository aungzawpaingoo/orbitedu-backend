const express = require('express');
const router = express.Router();
const controller = require('../controllers/announcement.controller');
const { verifyToken } = require('../middleware/auth.middleware'); // 👈 FIX

router.post('/', verifyToken, controller.createAnnouncement);
router.get('/', verifyToken, controller.getAnnouncements);
router.get('/:id', verifyToken, controller.getAnnouncementById);
router.put('/:id', verifyToken, controller.updateAnnouncement);
router.delete('/:id', verifyToken, controller.deleteAnnouncement);

module.exports = router;
