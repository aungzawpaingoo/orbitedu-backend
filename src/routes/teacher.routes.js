// const express = require('express');
// const router = express.Router();
// const teacherController = require('../controllers/teacher.controller');
// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');

// // Multer storage config
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     const { organization_id, branch_id } = req.body;
//     const uploadPath = path.join(__dirname, '..', 'uploads', organization_id, branch_id);
//     fs.mkdirSync(uploadPath, { recursive: true });
//     cb(null, uploadPath);
//   },
//   filename: (req, file, cb) => {
//     const ext = path.extname(file.originalname);
//     const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
//     cb(null, uniqueName);
//   }
// });

// const upload = multer({ storage });

// // Profile routes
// router.post(
//   '/:userId/profile',
//   upload.fields([
//     { name: 'profile_photo', maxCount: 1 },
//     { name: 'attachments', maxCount: 10 }
//   ]),
//   teacherController.createOrUpdateProfile
// );

// router.get('/:userId/profile', teacherController.getProfile);

// // Route to get teachers by role query, delegated to controller
// router.get('/', teacherController.getTeachersIfQuery);

// module.exports = router;






const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacher.controller');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { organization_id, branch_id } = req.body;
    const uploadPath = path.join(__dirname, '..', 'uploads', organization_id, branch_id);
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

// Profile routes
router.post(
  '/:userId/profile',
  upload.fields([
    { name: 'profile_photo', maxCount: 1 },
    { name: 'attachments', maxCount: 20 } // increased for flexibility
  ]),
  teacherController.createOrUpdateProfile
);

router.get('/:userId/profile', teacherController.getProfile);

// List teachers by role
router.get('/', teacherController.getTeachersIfQuery);

module.exports = router;
