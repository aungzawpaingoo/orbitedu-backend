const router = require('express').Router();
const ctrl = require('../controllers/userProfile.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

router.use(verifyToken);

// ===== FILE STORAGE =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const orgId = req.user.organization_id;
    const branchId = req.user.branch_id;
    const uploadPath = path.join('uploads', String(orgId), String(branchId));
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${Date.now()}${ext}`);
  },
});

const upload = multer({ storage });

/* ========= ROUTES ========= */

router.get('/', ctrl.getAll);              // optional admin use
router.get('/me', ctrl.getMyProfile);      // ✅ logged-in user's profile
router.get('/:id', ctrl.getById);

router.post(
  '/',
  upload.fields([
    { name: 'profile_photo', maxCount: 1 },
    { name: 'attachments', maxCount: 10 },
  ]),
  ctrl.create
);

router.put(
  '/:id',
  upload.fields([
    { name: 'profile_photo', maxCount: 1 },
    { name: 'attachments', maxCount: 10 },
  ]),
  ctrl.update
);

router.delete('/:id', ctrl.remove);

module.exports = router;
