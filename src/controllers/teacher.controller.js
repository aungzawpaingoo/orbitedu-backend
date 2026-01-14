const db = require('../config/db');

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

    // Validate required fields
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Check if user exists and belongs to requester's organization
    const [userCheck] = await db.promise().execute(
      'SELECT id, organization_id, branch_id FROM users WHERE id = ?',
      [userId]
    );

    if (userCheck.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check existing profile
    const [existing] = await db.promise().execute(
      'SELECT * FROM teacher_profiles WHERE user_id = ?',
      [userId]
    );

    // Build SQL and params dynamically to handle NULL values
    const sqlParams = [
      date_of_birth || null,
      gender || null,
      phone_number || null,
      address || null,
      education_background || null,
      degree || null,
      userId
    ];

    if (existing.length > 0) {
      // Update existing profile
      await db.promise().execute(
        `UPDATE teacher_profiles 
         SET date_of_birth = ?, gender = ?, phone_number = ?, 
             address = ?, education_background = ?, degree = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
        sqlParams
      );
      return res.json({ message: 'Profile updated successfully' });
    } else {
      // Create new profile
      await db.promise().execute(
        `INSERT INTO teacher_profiles 
         (user_id, date_of_birth, gender, phone_number, address, 
          education_background, degree, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [userId, ...sqlParams.slice(0, -1)]
      );
      return res.json({ message: 'Profile created successfully' });
    }
  } catch (err) {
    console.error('Error in createOrUpdateProfile:', err);
    res.status(500).json({ 
      message: 'Server error', 
      error: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Get requester's context for security
    const requesterId = req.user?.id;
    const requesterOrg = req.user?.organization_id;
    const requesterBranch = req.user?.branch_id;
    const requesterRole = req.user?.role;

    if (!requesterId || !requesterOrg) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Check if requester has access to this profile
    // Users can view their own profile, admins can view within their org/branch
    let accessQuery = `
      SELECT u.id, u.organization_id, u.branch_id 
      FROM users u 
      WHERE u.id = ?
    `;
    
    const [targetUser] = await db.promise().execute(accessQuery, [userId]);

    if (targetUser.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const target = targetUser[0];
    
    // Access control logic
    const isSelf = requesterId === parseInt(userId);
    const isSameOrg = requesterOrg === target.organization_id;
    const isAdmin = ['Super_Admin', 'School_Admin'].includes(requesterRole);
    const canView = isSelf || (isAdmin && isSameOrg && 
      (!requesterBranch || requesterBranch === target.branch_id));

    if (!canView) {
      return res.status(403).json({ 
        message: 'Access denied: insufficient permissions' 
      });
    }

    // Fetch profile with user info
    const [profileRows] = await db.promise().execute(
       `SELECT u.*, tp.*
       FROM users u
       LEFT JOIN teacher_profiles tp ON u.id = tp.user_id
       WHERE u.id = ?`,
      [userId]
    );

    if (profileRows.length === 0) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    // Transform response
    const profile = profileRows[0];
    
    // Add computed fields
    profile.has_profile = !!profile.date_of_birth || !!profile.phone_number;
    
    // Remove sensitive fields if not self
    if (!isSelf) {
     
    }

    res.json(profile);
  } catch (err) {
    console.error('Error in getProfile:', err);
    res.status(500).json({ 
      message: 'Server error fetching profile',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
};

exports.getTeachersByRole = async (req, res) => {
  try {
    const { role } = req.query;
    
    // Validate role parameter
    if (!role || role !== 'Teacher') {
      return res.status(400).json({ 
        message: 'Valid role parameter is required (Teacher only)' 
      });
    }

    // Get requester context
    const requesterOrg = req.user?.organization_id;
    const requesterBranch = req.user?.branch_id;
    const requesterRole = req.user?.role;

    if (!requesterOrg) {
      return res.status(401).json({ 
        message: 'Unauthorized: Organization context missing' 
      });
    }

    // Build query based on requester's role
    let query = `
       SELECT u.*, tp.*
      FROM users u
      LEFT JOIN teacher_profiles tp ON u.id = tp.user_id
      WHERE u.role = ? 
        AND u.organization_id = ?
    `;

    const params = [role, requesterOrg];

    // Branch filtering for non-super admins
    if (requesterRole !== 'Super_Admin' && requesterBranch) {
      query += ` AND u.branch_id = ?`;
      params.push(requesterBranch);
    }

    // Add ordering
    query += ` ORDER BY u.name ASC, u.created_at DESC`;

    const [teachers] = await db.promise().execute(query, params);

    res.json({
      count: teachers.length,
      teachers: teachers.map(teacher => ({
        ...teacher,
        has_profile: !!(teacher.phone_number || teacher.date_of_birth)
      }))
    });
  } catch (err) {
    console.error('Error in getTeachersByRole:', err);
    res.status(500).json({ 
      message: 'Server error fetching teachers',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
};

exports.getMyProfile = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Use the existing getProfile function but with current user's ID
    req.params = { userId: req.user.id };
    return exports.getProfile(req, res);
  } catch (err) {
    console.error('Error in getMyProfile:', err);
    res.status(500).json({ 
      message: 'Server error fetching your profile',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
};

// Additional helper function for completeness
exports.deleteProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Only allow self or admin deletion
    const isSelf = req.user?.id === parseInt(userId);
    const isAdmin = ['Super_Admin', 'School_Admin'].includes(req.user?.role);
    
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ 
        message: 'Access denied: cannot delete this profile' 
      });
    }

    const [result] = await db.promise().execute(
      'DELETE FROM teacher_profiles WHERE user_id = ?',
      [userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    res.json({ message: 'Profile deleted successfully' });
  } catch (err) {
    console.error('Error in deleteProfile:', err);
    res.status(500).json({ 
      message: 'Server error deleting profile',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
};