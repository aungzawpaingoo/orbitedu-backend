const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { upsertUserProfile, getUserProfile } = require('../controllers/userProfile.controller');
const { verifyToken } = require('../middleware/auth.middleware');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const orgId = req.user.organization_id;
    const branchId = req.user.branch_id;

    const uploadPath = path.join('uploads', String(orgId), String(branchId));
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${Date.now()}${ext}`);
  }
});

const upload = multer({ storage });

router.get('/:userId', verifyToken, getUserProfile);

router.post(
  '/:userId',
  verifyToken,
  upload.fields([
    { name: 'profile_photo', maxCount: 1 },
    { name: 'contract_file', maxCount: 1 }
  ]),
  upsertUserProfile
);

module.exports = router;
