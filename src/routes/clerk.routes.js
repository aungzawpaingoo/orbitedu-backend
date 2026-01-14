const express = require('express');
const router = express.Router();
const clerkController = require('../controllers/clerk.controller');
const { verifyToken } = require('../middleware/auth.middleware'); 
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// === Multer Storage Config ===
// Saves files to: uploads/ORG_ID/BRANCH_ID/filename.ext
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Attempt to get context from body, default to safe fallbacks
    // Note: If you want to force the file to go to the logged-in user's folder, 
    // you can use req.user.organization_id here if verifyToken is present.
    const { organization_id, branch_id } = req.body;
    
    // Fallback if not provided in body (though Frontend should provide them)
    // Or use req.user.organization_id if available and strictly enforcing it.
    const org = organization_id || 'common';
    const branch = branch_id || 'main';
    
    const uploadPath = path.join(__dirname, '..', 'uploads', String(org), String(branch));
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// === Routes ===

// 1. Get Logged in Clerk (Protected)
router.get('/me', verifyToken, clerkController.getMe);

// 2. Create/Update Profile (Protected)
// Uploads: Profile photo (1) + Attachments (up to 20)
router.post(
  '/:userId/profile',
  verifyToken, 
  upload.fields([
    { name: 'profile_photo', maxCount: 1 },
    { name: 'attachments', maxCount: 20 }
  ]),
  clerkController.createOrUpdateProfile
);

// 3. Get Specific Clerk Profile (Protected + Tenant Filtered)
router.get('/:userId/profile', verifyToken, clerkController.getProfile);

// 4. Get All Clerks (Protected + Tenant Filtered)
router.get('/', verifyToken, clerkController.getClerksIfQuery);

module.exports = router;