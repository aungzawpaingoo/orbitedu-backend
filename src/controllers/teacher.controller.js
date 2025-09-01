const path = require('path');
const fs = require('fs');
const db = require('../config/db');

// Absolute path to uploads folder
const uploadRoot = path.join(__dirname, '..', 'uploads');

// Convert absolute path to relative for public URLs
function toRelativeUploadPath(fullPath) {
  return path.relative(uploadRoot, fullPath).replace(/\\/g, '/');
}

exports.createOrUpdateProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      date_of_birth,
      gender,
      phone_number,
      address,
      education_background,
      degree,
      organization_id,
      branch_id
    } = req.body;

    // === Profile photo ===
    const profilePhotoAbsPath = req.files?.profile_photo?.[0]?.path || null;
    const profilePhoto = profilePhotoAbsPath ? toRelativeUploadPath(profilePhotoAbsPath) : null;

    // === Attachments with labels ===
    const uploadedAttachments = req.files?.attachments || [];
    const attachments = uploadedAttachments.map((file, index) => {
      const label = req.body[`attachments[${index}][label]`] || `Attachment ${index + 1}`;
      return {
        label,
        filePath: toRelativeUploadPath(file.path)
      };
    });

    // === Check existing profile ===
    const [existing] = await db.promise().execute(
      'SELECT * FROM teacher_profiles WHERE user_id = ?',
      [userId]
    );

    if (existing.length > 0) {
      await db.promise().execute(
        `UPDATE teacher_profiles
         SET date_of_birth = ?, gender = ?, phone_number = ?, address = ?,
             education_background = ?, degree = ?, profile_photo = ?,
             attachments = ?, updated_at = NOW()
         WHERE user_id = ?`,
        [
          date_of_birth, gender, phone_number, address,
          education_background, degree, profilePhoto,
          JSON.stringify(attachments), userId
        ]
      );
      return res.json({ message: 'Profile updated' });
    } else {
      await db.promise().execute(
        `INSERT INTO teacher_profiles
         (user_id, date_of_birth, gender, phone_number, address, education_background,
          degree, profile_photo, attachments, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          userId, date_of_birth, gender, phone_number, address,
          education_background, degree, profilePhoto,
          JSON.stringify(attachments)
        ]
      );
      return res.json({ message: 'Profile created' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};



// exports.getProfile = async (req, res) => {
//   try {
//     const { userId } = req.params;

//     const [rows] = await db.promise().execute(
//       'SELECT * FROM teacher_profiles WHERE user_id = ?',
//       [userId]
//     );

//     if (rows.length === 0) {
//       return res.status(404).json({ message: 'Profile not found' });
//     }

//     res.json(rows[0]);
//   } catch (err) {
//     console.error('Error fetching teacher profile:', err);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

exports.getProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const [rows] = await db.promise().execute(
      `SELECT 
         u.id, u.name, u.username, u.role, u.organization_id, u.branch_id,
         u.two_factor_enabled, u.two_factor_secret, u.plain_password,
         tp.date_of_birth, tp.gender, tp.phone_number, tp.address,
         tp.education_background, tp.degree,
         tp.profile_photo, tp.attachments
       FROM users u
       LEFT JOIN teacher_profiles tp ON u.id = tp.user_id
       WHERE u.id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    // Parse attachments JSON string to object if needed
    const profile = rows[0];
    if (profile.attachments) {
      try {
        profile.attachments = JSON.parse(profile.attachments);
      } catch (err) {
        console.warn('Invalid JSON in attachments:', err);
        profile.attachments = [];
      }
    }

    res.json(profile);
  } catch (err) {
    console.error('Error fetching teacher profile:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.getTeachersIfQuery = async (req, res) => {
  try {
    const { role } = req.query;

    if (role === 'Teacher') {
      // const [rows] = await db.promise().execute(
      //   `SELECT 
      //      u.id, u.name, u.username, u.role, u.organization_id, u.branch_id,
      //      tp.profile_photo
      //    FROM users u
      //    LEFT JOIN teacher_profiles tp ON u.id = tp.user_id
      //    WHERE u.role = ?`,
      //   [role]

      const [rows] = await db.promise().execute(
        `SELECT 
     u.id, u.name, u.username, u.role, u.organization_id, u.branch_id,
     u.two_factor_enabled, u.two_factor_secret, u.plain_password,
     tp.date_of_birth, tp.gender, tp.phone_number, tp.address,
     tp.education_background, tp.degree,
     tp.profile_photo, tp.attachments
   FROM users u
   LEFT JOIN teacher_profiles tp ON u.id = tp.user_id
   WHERE u.role = ?`,
        [role]
      );

      return res.json({ users: rows });
    }

    res.status(400).json({ message: 'Invalid or missing role query' });
  } catch (err) {
    console.error('Error fetching teachers by role:', err);
    res.status(500).json({ message: 'Server error' });
  }
};






