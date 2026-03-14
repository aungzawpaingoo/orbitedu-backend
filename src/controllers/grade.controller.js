const pool = require('../config/db');

/* ===================== GET ALL ===================== */
exports.getAll = async (req, res) => {
  const orgId = req.user?.organization_id;
  if (!orgId) return res.status(401).json({ message: 'Unauthorized' });

  const [rows] = await pool.promise().execute(
    `SELECT * FROM grades WHERE organization_id = ? ORDER BY level_number ASC`,
    [orgId]
  );
  res.json(rows);
};

/* ===================== GET BY ID ===================== */
exports.getById = async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.promise().execute(
    `SELECT * FROM grades WHERE id = ?`,
    [id]
  );
  res.json(rows[0] || null);
};

/* ===================== CREATE ===================== */
exports.create = async (req, res) => {
  const orgId = req.user?.organization_id;
  const data = { ...req.body, organization_id: orgId };

  const columns = Object.keys(data);
  const values = Object.values(data);

  const sql = `
    INSERT INTO grades
    (${columns.map(c => `\`${c}\``).join(',')})
    VALUES (${columns.map(() => '?').join(',')})
  `;

  const [result] = await pool.promise().execute(sql, values);
  res.json({ id: result.insertId });
};

/* ===================== UPDATE ===================== */
exports.update = async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  const columns = Object.keys(data);
  const values = Object.values(data);

  const sql = `
    UPDATE grades
    SET ${columns.map(c => `\`${c}\` = ?`).join(',')}
    WHERE id = ?
  `;

  await pool.promise().execute(sql, [...values, id]);
  res.json({ success: true });
};

/* ===================== DELETE ===================== */
exports.remove = async (req, res) => {
  const { id } = req.params;
  await pool.promise().execute(
    `DELETE FROM grades WHERE id = ?`,
    [id]
  );
  res.json({ success: true });
};
