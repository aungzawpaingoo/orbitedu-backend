const pool = require('../config/db');

/* ===================== GET ALL ===================== */
exports.getAll = async (req, res) => {
  const { timetable_id } = req.query;
  if (!timetable_id) return res.status(400).json({ message: 'timetable_id is required' });

  const [rows] = await pool.promise().execute(
    `SELECT te.*, u.name AS teacher_name
     FROM timetable_entries te
     LEFT JOIN users u ON te.teacher_id = u.id
     WHERE te.timetable_id = ?
     ORDER BY FIELD(te.day_of_week, 'MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'), te.period_number ASC`,
    [timetable_id]
  );
  res.json(rows);
};

/* ===================== GET BY ID ===================== */
exports.getById = async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.promise().execute(
    `SELECT * FROM timetable_entries WHERE id = ?`,
    [id]
  );
  res.json(rows[0] || null);
};

/* ===================== CREATE ===================== */
exports.create = async (req, res) => {
  const data = req.body;

  const columns = Object.keys(data);
  const values = Object.values(data);

  const sql = `
    INSERT INTO timetable_entries
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
    UPDATE timetable_entries
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
    `DELETE FROM timetable_entries WHERE id = ?`,
    [id]
  );
  res.json({ success: true });
};
