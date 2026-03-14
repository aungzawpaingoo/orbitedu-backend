const pool = require('../config/db');

/* ===================== GET ALL ===================== */
exports.getAll = async (req, res) => {
  const orgId = req.user?.organization_id;
  const branchId = req.user?.branch_id;

  const [rows] = await pool.promise().execute(
    `SELECT t.*, g.name AS grade_name, c.name AS class_name, ay.year_label
     FROM timetables t
     LEFT JOIN grades g ON t.grade_id = g.id
     LEFT JOIN classes c ON t.class_id = c.id
     LEFT JOIN academic_years ay ON t.academic_year_id = ay.id
     WHERE t.organization_id = ? AND t.branch_id = ?
     ORDER BY g.level_number ASC, c.name ASC, t.shift ASC`,
    [orgId, branchId]
  );
  res.json(rows);
};

/* ===================== GET BY ID ===================== */
exports.getById = async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.promise().execute(
    `SELECT * FROM timetables WHERE id = ?`,
    [id]
  );
  res.json(rows[0] || null);
};

/* ===================== CREATE ===================== */
exports.create = async (req, res) => {
  const orgId = req.user?.organization_id;
  const branchId = req.user?.branch_id;
  const data = { ...req.body, organization_id: orgId, branch_id: branchId };

  const columns = Object.keys(data);
  const values = Object.values(data);

  const sql = `
    INSERT INTO timetables
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
    UPDATE timetables
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
    `DELETE FROM timetables WHERE id = ?`,
    [id]
  );
  res.json({ success: true });
};
