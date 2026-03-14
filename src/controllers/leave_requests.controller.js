const pool = require('../config/db');

/* ===================== GET ALL ===================== */
exports.getAll = async (req, res) => {
  try {
    const { role, organization_id, branch_id, id: user_id } = req.user;

    let where = `WHERE is_deleted = 0 AND organization_id = ?`;
    const params = [organization_id];

    if (role !== 'Super_Admin') {
      where += ` AND branch_id = ?`;
      params.push(branch_id);
    }

    if (role === 'Teacher' || role === 'Student' || role === 'Clerk') {
      where += ` AND user_id = ?`;
      params.push(user_id);
    }

    if (role === 'School_Admin') {
      where += ` AND (user_id = ? OR approver_id = ?)`;
      params.push(user_id, user_id);
    }

    const [rows] = await pool.promise().query(
      `SELECT * FROM leave_requests ${where} ORDER BY applied_at DESC`,
      params
    );

    res.json(rows);
  } catch (err) {
    console.error('Get leave requests error:', err);
    res.status(500).json({ message: 'Failed to fetch leave requests' });
  }
};



/**================GET APPROVER =========================*/
exports.getApprover = async (req, res) => {
  try {
    const { organization_id, branch_id } = req.user;

    const [rows] = await pool.promise().query(
      `SELECT id, name, username 
       FROM users 
       WHERE role = 'School_Admin' 
         AND organization_id = ? 
         AND branch_id = ?`,
      [organization_id, branch_id]
    );

    if (!rows.length) return res.status(404).json({ message: 'No approver found' });

    res.json(rows); // return array of possible approvers
  } catch (err) {
    console.error('Get approver error:', err);
    res.status(500).json({ message: 'Failed to fetch approvers' });
  }
};


/* ===================== GET BY ID ===================== */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, organization_id, branch_id, id: user_id } = req.user;

    let where = `WHERE id = ? AND is_deleted = 0 AND organization_id = ?`;
    const params = [id, organization_id];

    if (role !== 'Super_Admin') {
      where += ` AND branch_id = ?`;
      params.push(branch_id);
    }

    const [rows] = await pool.promise().query(
      `SELECT * FROM leave_requests ${where}`,
      params
    );

    if (!rows.length) return res.status(404).json({ message: 'Record not found' });

    const record = rows[0];

    if (
      ['Teacher', 'Student', 'Clerk'].includes(role) &&
      record.user_id !== user_id
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(record);
  } catch (err) {
    console.error('Get leave request error:', err);
    res.status(500).json({ message: 'Failed to fetch record' });
  }
};

/* ===================== CREATE ===================== */
exports.create = async (req, res) => {
  try {
    const { id: user_id, organization_id, branch_id } = req.user;
    const data = req.body;

    const payload = {
      ...data,
      user_id,
      organization_id,
      branch_id,
      created_by: user_id,
      status: 'Pending',
    };

    const columns = Object.keys(payload);
    const values = Object.values(payload);

    const sql = `
      INSERT INTO leave_requests
      (${columns.map(c => `\`${c}\``).join(',')})
      VALUES (${columns.map(() => '?').join(',')})
    `;

    const [result] = await pool.promise().execute(sql, values);

    res.json({ id: result.insertId });
  } catch (err) {
    console.error('Create leave request error:', err);
    res.status(500).json({ message: 'Failed to create leave request' });
  }
};

/* ===================== UPDATE ===================== */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, id: user_id, organization_id, branch_id } = req.user;
    const data = req.body;

    if (['Teacher', 'Student', 'Clerk'].includes(role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    let where = `WHERE id = ? AND organization_id = ?`;
    const params = [id, organization_id];

    if (role !== 'Super_Admin') {
      where += ` AND branch_id = ?`;
      params.push(branch_id);
    }

    const [rows] = await pool.promise().query(
      `SELECT id FROM leave_requests ${where}`,
      params
    );

    if (!rows.length) return res.status(404).json({ message: 'Record not found' });

    const payload = {
      ...data,
      updated_by: user_id,
    };

    const columns = Object.keys(payload);
    const values = Object.values(payload);

    const sql = `
      UPDATE leave_requests
      SET ${columns.map(c => `\`${c}\` = ?`).join(',')}
      WHERE id = ?
    `;

    await pool.promise().execute(sql, [...values, id]);

    res.json({ success: true });
  } catch (err) {
    console.error('Update leave request error:', err);
    res.status(500).json({ message: 'Failed to update leave request' });
  }
};

/* ===================== DELETE (SOFT) ===================== */
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, id: user_id, organization_id, branch_id } = req.user;

    if (['Teacher', 'Student', 'Clerk'].includes(role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    let where = `WHERE id = ? AND organization_id = ?`;
    const params = [id, organization_id];

    if (role !== 'Super_Admin') {
      where += ` AND branch_id = ?`;
      params.push(branch_id);
    }

    const [rows] = await pool.promise().query(
      `SELECT id FROM leave_requests ${where}`,
      params
    );

    if (!rows.length) return res.status(404).json({ message: 'Record not found' });

    await pool.promise().execute(
      `UPDATE leave_requests SET is_deleted = 1, updated_by = ? WHERE id = ?`,
      [user_id, id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Delete leave request error:', err);
    res.status(500).json({ message: 'Failed to delete leave request' });
  }
};
