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
    start_date,
    end_date,
    branch_id,
    targets, // array of roles
  } = req.body;

  const user = req.user;

  if (!title || !description || !start_date || !targets?.length) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // 🔐 ROLE VALIDATION
  if (user.role === 'Super_Admin') {
    if (targets.some(r => r !== 'School_Admin')) {
      return res.status(403).json({ message: 'Super_Admin can only target School_Admin' });
    }
  }

  if (user.role === 'School_Admin') {
    if (!branch_id) {
      return res.status(400).json({ message: 'branch_id is required for School_Admin' });
    }

    const allowed = ['Teacher', 'Clerk', 'Parent'];
    if (targets.some(r => !allowed.includes(r))) {
      return res.status(403).json({ message: 'Invalid target role' });
    }
  }

  const conn = await pool.promise().getConnection();
  try {
    await conn.beginTransaction();

    const [announcementResult] = await conn.query(
      `
      INSERT INTO announcements
      (organization_id, branch_id, title, description, impact, reason,
       created_by, created_by_role, status, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
    `,
      [
        user.organization_id,
        user.role === 'Super_Admin' ? branch_id || null : user.branch_id,
        title,
        description,
        impact || null,
        reason || null,
        user.id,
        user.role,
        start_date,
        end_date || null,
      ]
    );

    const announcementId = announcementResult.insertId;

    for (const role of targets) {
      await conn.query(
        `INSERT INTO announcement_targets (announcement_id, target_role) VALUES (?, ?)`,
        [announcementId, role]
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
 * GET announcements (role-aware)
 * [[[[AND a.status = 'published']]]]
 */
exports.getAnnouncements = async (req, res) => {
  const user = req.user;

  let query = `
    SELECT DISTINCT a.*
    FROM announcements a
    JOIN announcement_targets t ON a.id = t.announcement_id
    WHERE a.organization_id = ?
      
  `;
  const params = [user.organization_id];

  if (user.role === 'School_Admin') {
    query += ` AND (a.branch_id = ? OR a.branch_id IS NULL)`;
    params.push(user.branch_id);
  } else if (user.role !== 'Super_Admin') {
    query += `
      AND t.target_role = ?
      AND (a.branch_id = ? OR a.branch_id IS NULL)
    `;
    params.push(user.role, user.branch_id);
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
 */
exports.getAnnouncementById = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.promise().query(
      `SELECT * FROM announcements WHERE id = ?`,
      [id]
    );

    if (!rows.length) return res.status(404).json({ message: 'Announcement not found' });

    const [targets] = await pool.promise().query(
      `SELECT target_role FROM announcement_targets WHERE announcement_id = ?`,
      [id]
    );

    res.json({ ...rows[0], targets: targets.map(t => t.target_role) });
  } catch (err) {
    console.error('Get announcement by ID error:', err);
    res.status(500).json({ message: 'Failed to fetch announcement', error: err.message });
  }
};

/**
 * UPDATE announcement
 */
exports.updateAnnouncement = async (req, res) => {
  const { id } = req.params;
  const { title, description, impact, reason, start_date, end_date, status, targets } = req.body;
  const user = req.user;

  const conn = await pool.promise().getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT * FROM announcements WHERE id = ? AND created_by = ?`,
      [id, user.id]
    );

    if (!rows.length) return res.status(403).json({ message: 'Unauthorized' });

    await conn.query(
      `
      UPDATE announcements
      SET title=?, description=?, impact=?, reason=?,
          start_date=?, end_date=?, status=?
      WHERE id=?
    `,
      [title, description, impact, reason, start_date, end_date, status, id]
    );

    if (targets?.length) {
      await conn.query(`DELETE FROM announcement_targets WHERE announcement_id = ?`, [id]);

      for (const role of targets) {
        await conn.query(
          `INSERT INTO announcement_targets (announcement_id, target_role) VALUES (?, ?)`,
          [id, role]
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
