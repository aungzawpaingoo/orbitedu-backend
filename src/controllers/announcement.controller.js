const pool = require('../config/db');

/**
 * CREATE announcement
 */
exports.createAnnouncement = async (req, res) => {
  const {
    title,
    description,
    impact,
    reason,
    category,        // New Field: e.g., 'Academic', 'Holiday', 'Event'
    priority,        // New Field: e.g., 'Low', 'Medium', 'High', 'Urgent'
    attachment_url,  // New Field: Link to PDF or Image
    start_date,
    end_date,
    branch_id,
    targets, // array of objects: [{ type: 'role', value: 'Teacher' }, { type: 'grade', value: 5 }]
  } = req.body;

  const user = req.user;

  if (!title || !description || !start_date || !targets?.length) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // 🔐 ROLE VALIDATION
  const allowedTargetRoles = ['Teacher', 'Clerk', 'Parent'];

  if (user.role === 'Super_Admin') {
    // Super_Admin can target School_Admin roles, or any grade/class in the organization
    for (const target of targets) {
      if (target.type === 'role' && target.value !== 'School_Admin') {
        return res.status(403).json({ message: 'Super_Admin can only target School_Admin role' });
      }
      // No specific validation for grade/class IDs for Super_Admin, assuming they are valid IDs
    }
  }

  if (user.role === 'School_Admin') {
    if (!branch_id) {
      return res.status(400).json({ message: 'branch_id is required for School_Admin' });
    } else if (branch_id !== user.branch_id) {
      // School_Admin can only create announcements for their own branch
      return res.status(403).json({ message: 'School_Admin can only create announcements for their own branch' });
    }

    // School_Admin can target Teacher, Clerk, Parent roles, or grades/classes within their branch
    for (const target of targets) {
      if (target.type === 'role' && !allowedTargetRoles.includes(target.value)) {
        return res.status(403).json({ message: `School_Admin cannot target role: ${target.value}` });
      }
      // For grade/class targets, we assume the IDs are valid within the branch.
      // More robust validation would involve checking if grade_id/class_id exists in the branch.
    }
  }

  // Prevent non-admin roles from creating announcements
  if (!['Super_Admin', 'School_Admin'].includes(user.role)) {
    return res.status(403).json({ message: 'Access denied. Only administrators can create announcements.' });
  }

  // Ensure at least one target is provided and valid
  if (!targets || targets.length === 0) {
    return res.status(400).json({ message: 'At least one target (role, grade, or class) is required.' });
  }

  // Validate target types and values
  const validTargetTypes = ['role', 'grade', 'class'];
  for (const target of targets) {
    if (!validTargetTypes.includes(target.type)) {
      return res.status(400).json({ message: `Invalid target type: ${target.type}` });
    }
    if (!target.value) {
      return res.status(400).json({ message: `Target value is required for type: ${target.type}` });
    }
  }

  const conn = await pool.promise().getConnection();
  try {
    await conn.beginTransaction();

    const [announcementResult] = await conn.query(
      `
      INSERT INTO announcements
      (organization_id, branch_id, title, description, impact, reason, 
       category, priority, attachment_url,
       created_by, created_by_role, status, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
    `,
      [
        user.organization_id,
        user.role === 'Super_Admin' ? branch_id || null : user.branch_id,
        title,
        description,
        impact || null,
        reason || null,
        category || 'General',
        priority || 'Medium',
        attachment_url || null,
        user.id,
        user.role,
        start_date,
        end_date || null,
      ]
    );

    const announcementId = announcementResult.insertId;

    for (const target of targets) {
      let targetRole = null;
      let targetGradeId = null;
      let targetClassId = null;

      if (target.type === 'role') targetRole = target.value;
      else if (target.type === 'grade') targetGradeId = parseInt(target.value, 10);
      else if (target.type === 'class') targetClassId = parseInt(target.value, 10);

      await conn.query(
        `INSERT INTO announcement_targets (announcement_id, target_role, target_grade_id, target_class_id)
         VALUES (?, ?, ?, ?)`,
        [announcementId, targetRole, targetGradeId, targetClassId]
      );
    }

    await conn.commit();
    res.status(201).json({ message: 'Announcement created successfully' });
  } catch (err) {
    await conn.rollback();
    console.error('Announcement creation error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
};

/**
 * Helper to fetch user's specific context directly to check targets
 */
const getUserTargetingInfo = async (user) => {
  const info = {
    role: user.role,
    gradeIds: [],
    classIds: []
  };

  try {
    if (user.role === 'Teacher') {
      const [profile] = await pool.promise().execute(
        `SELECT assigned_grade, assigned_class FROM teacher_profiles WHERE user_id = ?`,
        [user.id]
      );
      if (profile.length > 0) {
        if (profile[0].assigned_grade) info.gradeIds.push(profile[0].assigned_grade);
        if (profile[0].assigned_class) info.classIds.push(profile[0].assigned_class);
      }
    } else if (user.role === 'Parent') {
      const [children] = await pool.promise().execute(
        `SELECT grade_id, class_id FROM student_profiles WHERE parent_user_id = ?`,
        [user.id]
      );
      children.forEach(c => {
        if (c.grade_id) info.gradeIds.push(c.grade_id);
        if (c.class_id) info.classIds.push(c.class_id);
      });
    }
  } catch (err) {
    console.error("Error fetching targeting info:", err);
  }

  return info;
};

/**
 * GET announcements (admin/creator view - includes drafts, all statuses)
 */
exports.getAnnouncements = async (req, res) => {
  const user = req.user;
  const userTargetingInfo = await getUserTargetingInfo(user); // Fetch user's grade/class info

  let query = `
    SELECT DISTINCT a.*
    FROM announcements a
    WHERE a.organization_id = ?
  `;
  const params = [user.organization_id];

  // Super_Admin can see all announcements in their organization
  if (user.role === 'Super_Admin') {
    // No further branch/target filtering needed here for Super_Admin
  } else if (user.role === 'School_Admin') {
    // School_Admin can see all announcements created for their branch or global ones
    query += ` AND (a.branch_id = ? OR a.branch_id IS NULL)`;
    params.push(user.branch_id);
  } else {
    // Teacher, Clerk, Parent can only see announcements they created
    // This endpoint is for admin/creator view, not for general consumption by end-users.
    // For end-users, getMyAnnouncements should be used.
    query += ` AND a.created_by = ?`;
    params.push(user.id);
    // Further filtering by branch for non-Super_Admin creators
    if (user.branch_id) {
      query += ` AND (a.branch_id = ? OR a.branch_id IS NULL)`;
      params.push(user.branch_id);
    }
  }

  try {
    const [rows] = await pool.promise().query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Get announcements error:', err);
    res.status(500).json({ message: 'Failed to load announcements', error: err.message });
  }
};

/**
 * GET single announcement
 * Includes robust permission checks based on user role, organization, and branch.
 */
exports.getAnnouncementById = async (req, res) => {
  const { id } = req.params;
  const { organization_id: requesterOrg, branch_id: requesterBranch, role: requesterRole } = req.user;

  const requesterTargetingInfo = await getUserTargetingInfo(req.user);

  try {
    // First, fetch the announcement and its targets
    const [announcementRows] = await pool.promise().query(
      `SELECT a.*,
              GROUP_CONCAT(DISTINCT CONCAT('role:', at.target_role)) AS target_roles_list,
              GROUP_CONCAT(DISTINCT CONCAT('grade:', at.target_grade_id)) AS target_grades_list,
              GROUP_CONCAT(DISTINCT CONCAT('class:', at.target_class_id)) AS target_classes_list
       FROM announcements a
       LEFT JOIN announcement_targets at ON a.id = at.announcement_id
       WHERE a.id = ? AND a.organization_id = ?
       GROUP BY a.id`,
      [id, requesterOrg]
    );
    if (announcementRows.length === 0) {
      return res.status(404).json({ message: 'Announcement not found or not in your organization' });
    }

    const announcement = announcementRows[0];

    const targets = [];
    if (announcement.target_roles_list) {
      announcement.target_roles_list.split(',').forEach(t => {
        const role = t.replace('role:', '');
        if (role !== 'null') targets.push({ type: 'role', value: role });
      });
    }
    if (announcement.target_grades_list) {
      announcement.target_grades_list.split(',').forEach(t => {
        const grade = t.replace('grade:', '');
        if (grade !== 'null') targets.push({ type: 'grade', value: parseInt(grade, 10) });
      });
    }
    if (announcement.target_classes_list) {
      announcement.target_classes_list.split(',').forEach(t => {
        const cls = t.replace('class:', '');
        if (cls !== 'null') targets.push({ type: 'class', value: parseInt(cls, 10) });
      });
    }

    delete announcement.target_roles_list;
    delete announcement.target_grades_list;
    delete announcement.target_classes_list;

    // Permission check based on role and branch
    let canView = false;

    if (requesterRole === 'Super_Admin') {
      canView = true; // Super_Admin can view any announcement within their organization
    } else if (announcement.created_by === req.user.id) {
      // Creator can always view their own announcement
      canView = true;
    } else if (requesterRole === 'School_Admin') {
      // School_Admin can view announcements for their branch or global announcements (branch_id IS NULL)
      if (announcement.branch_id === requesterBranch || announcement.branch_id === null) {
        canView = true;
      }
    } else { // Teacher, Clerk, Parent
      // These roles can only view announcements targeted at them (role, grade, or class) and relevant to their branch
      const isTargeted = targets.some(target => {
        if (target.type === 'role' && target.value === requesterRole) return true;
        if (target.type === 'grade' && requesterTargetingInfo.gradeIds.includes(target.value)) return true;
        if (target.type === 'class' && requesterTargetingInfo.classIds.includes(target.value)) return true;
        return false;
      });

      if (isTargeted && (announcement.branch_id === requesterBranch || announcement.branch_id === null)) {
        canView = true; // User is targeted and announcement is for their branch or global
      }
    }

    if (!canView) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ ...announcement, targets });
  } catch (err) {
    console.error('Get announcement by ID error:', err);
    res.status(500).json({ message: 'Failed to fetch announcement', error: err.message });
  }
};


/**
 * Get announcement for the mobile app users by their role, grade, or class (published only)
 */
exports.getMyAnnouncements = async (req, res) => {
  const user = req.user;
  const userTargetingInfo = await getUserTargetingInfo(user); // Fetch user's grade/class info

  try {
    let query = `
      SELECT DISTINCT a.*
      FROM announcements a
      JOIN announcement_targets at ON a.id = at.announcement_id
      WHERE a.organization_id = ?
        AND a.status = 'published'
        AND (a.branch_id = ? OR a.branch_id IS NULL)
    `;
    const params = [user.organization_id, user.branch_id];

    // Build dynamic targeting conditions
    const targetConditions = [];
    if (userTargetingInfo.role) {
      targetConditions.push(`at.target_role = ?`);
      params.push(userTargetingInfo.role);
    }
    if (userTargetingInfo.gradeIds.length > 0) {
      targetConditions.push(`at.target_grade_id IN (${userTargetingInfo.gradeIds.map(() => '?').join(',')})`);
      params.push(...userTargetingInfo.gradeIds);
    }
    if (userTargetingInfo.classIds.length > 0) {
      targetConditions.push(`at.target_class_id IN (${userTargetingInfo.classIds.map(() => '?').join(',')})`);
      params.push(...userTargetingInfo.classIds);
    }

    if (targetConditions.length > 0) {
      query += ` AND (${targetConditions.join(' OR ')})`;
    } else {
      // If no specific targeting info for the user, they shouldn't see anything via this endpoint
      return res.json([]);
    }

    query += ` ORDER BY a.created_at DESC`;

    const [announcements] = await pool.promise().query(query, params);

    // For each announcement, fetch its specific targets
    const announcementsWithTargets = await Promise.all(announcements.map(async (announcement) => {
      const [targets] = await pool.promise().query(`SELECT target_role, target_grade_id, target_class_id FROM announcement_targets WHERE announcement_id = ?`, [announcement.id]);
      return { ...announcement, targets };
    }));

    res.json(announcementsWithTargets);
  } catch (err) {
    console.error('Get My Announcements error:', err);
    res.status(500).json({ 
      message: 'Failed to load announcements', 
      error: err.message 
    });
  }
};




/**
 * UPDATE announcement
 */
exports.updateAnnouncement = async (req, res) => {
  const { id } = req.params;
  const { 
    title, description, impact, reason, category, priority, 
    attachment_url, start_date, end_date, status, targets 
  } = req.body; 
  const user = req.user;

  const conn = await pool.promise().getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT * FROM announcements WHERE id = ? AND created_by = ?`,
      [id, user.id]
    );
    
    // Only the creator can update. Also check if the announcement exists.
    // If the announcement exists but created_by doesn't match, it's an unauthorized attempt.
    // If it doesn't exist, it's a 404.
    if (!rows.length) return res.status(403).json({ message: 'Unauthorized' });

    await conn.query(
      `
      UPDATE announcements
      SET title=?, description=?, impact=?, reason=?, 
          category=?, priority=?, attachment_url=?,
          start_date=?, end_date=?, status=?
      WHERE id=?
    `,
      [title, description, impact, reason, category, priority, attachment_url, start_date, end_date, status, id]
    );

    if (targets?.length) {
      // Delete existing targets and re-insert new ones
      await conn.query(`DELETE FROM announcement_targets WHERE announcement_id = ?`, [id]);

      for (const target of targets) {
        let targetRole = null;
        let targetGradeId = null;
        let targetClassId = null;

        if (target.type === 'role') targetRole = target.value;
        else if (target.type === 'grade') targetGradeId = parseInt(target.value, 10);
        else if (target.type === 'class') targetClassId = parseInt(target.value, 10);

        await conn.query(
          `INSERT INTO announcement_targets (announcement_id, target_role, target_grade_id, target_class_id)
           VALUES (?, ?, ?, ?)`,
          [id, targetRole, targetGradeId, targetClassId]
        );
      }
    }

    await conn.commit();
    res.json({ message: 'Announcement updated' });
  } catch (err) {
    await conn.rollback();
    console.error('Update announcement error:', err);
    res.status(500).json({ message: 'Update failed', error: err.message });
  } finally {
    conn.release();
  }
};

/**
 * DELETE announcement
 */
exports.deleteAnnouncement = async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  try {
    const [result] = await pool.promise().query(
      `DELETE FROM announcements WHERE id = ? AND created_by = ?`,
      [id, user.id]
    );

    if (!result.affectedRows) return res.status(403).json({ message: 'Unauthorized or not found' });

    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    console.error('Delete announcement error:', err);
    res.status(500).json({ message: 'Delete failed', error: err.message });
  }
};
