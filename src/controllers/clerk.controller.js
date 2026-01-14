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
    } = req.body;

    // === Profile photo ===
    const profilePhotoAbsPath = req.files?.profile_photo?.[0]?.path || null;
    const profilePhoto = profilePhotoAbsPath ? toRelativeUploadPath(profilePhotoAbsPath) : null;

    // === Attachments ===
    const uploadedAttachments = req.files?.attachments || [];
    const attachments = uploadedAttachments.map((file, index) => {
      const label = req.body[`attachments[${index}][label]`] || `Attachment ${index + 1}`;
      return {
        label,
        filePath: toRelativeUploadPath(file.path)
      };
    });

    // === Check existing profile in clerk_profiles ===
    const [existing] = await db.promise().execute(
      'SELECT * FROM clerk_profiles WHERE user_id = ?',
      [userId]
    );

    if (existing.length > 0) {
      await db.promise().execute(
        `UPDATE clerk_profiles
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
      return res.json({ message: 'Clerk profile updated' });
    } else {
      await db.promise().execute(
        `INSERT INTO clerk_profiles
         (user_id, date_of_birth, gender, phone_number, address, education_background,
          degree, profile_photo, attachments, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          userId, date_of_birth, gender, phone_number, address,
          education_background, degree, profilePhoto,
          JSON.stringify(attachments)
        ]
      );
      return res.json({ message: 'Clerk profile created' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    // === SECURITY: Get requester's context ===
    const requesterOrg = req.user ? req.user.organization_id : null;
    const requesterBranch = req.user ? req.user.branch_id : null;

    let query = `SELECT 
         u.id, u.name, u.username, u.role, u.organization_id, u.branch_id,
         u.two_factor_enabled, u.two_factor_secret,
         cp.date_of_birth, cp.gender, cp.phone_number, cp.address,
         cp.education_background, cp.degree,
         cp.profile_photo, cp.attachments
       FROM users u
       LEFT JOIN clerk_profiles cp ON u.id = cp.user_id
       WHERE u.id = ?`;

    const params = [userId];

    // === FILTER: Ensure we only fetch if in same Org/Branch ===
    if (requesterOrg) {
        query += ` AND u.organization_id = ?`;
        params.push(requesterOrg);
    }
    if (requesterBranch) {
       query += ` AND u.branch_id = ?`;
       params.push(requesterBranch);
    }

    const [rows] = await db.promise().execute(query, params);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Clerk profile not found or access denied' });
    }

    const profile = rows[0];
    profile.profileImage = profile.profile_photo; 

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
    console.error('Error fetching clerk profile:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getClerksIfQuery = async (req, res) => {
  try {
    const { role } = req.query;

    // === CRITICAL: Get Organization & Branch from Token ===
    const organizationId = req.user ? req.user.organization_id : null;
    const branchId = req.user ? req.user.branch_id : null;

    if (!organizationId) {
        return res.status(401).json({ message: "Unauthorized: Organization Context Missing" });
    }

    if (role === 'Clerk') {
      const [rows] = await db.promise().execute(
        `SELECT 
           u.id, u.name, u.username, u.role, u.organization_id, u.branch_id,
           cp.date_of_birth, cp.gender, cp.phone_number, cp.address,
           cp.education_background, cp.degree,
           cp.profile_photo, cp.attachments
         FROM users u
         LEFT JOIN clerk_profiles cp ON u.id = cp.user_id
         WHERE u.role = ? 
         AND u.organization_id = ? 
         AND u.branch_id = ?`, // <--- Multi-Tenant & Branch Filter
        [role, organizationId, branchId]
      );

      return res.json({ users: rows });
    }

    res.status(400).json({ message: 'Invalid or missing role query' });
  } catch (err) {
    console.error('Error fetching clerks by role:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getMe = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    req.params.userId = req.user.id;
    return exports.getProfile(req, res);
    
  } catch (error) {
    console.error("Get Me Error:", error);
    res.status(500).json({ message: "Server error fetching profile" });
  }
};