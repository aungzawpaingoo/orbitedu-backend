const pool = require('../config/db');

/* ===================== GET ALL ===================== */
exports.getAll = async (req, res) => {
  const [rows] = await pool.promise().query(
    `SELECT * FROM __TABLE__`
  );
  res.json(rows);
};

/* ===================== GET BY ID ===================== */
exports.getById = async (req, res) => {
  const { id } = req.params;

  const [rows] = await pool.promise().query(
    `SELECT * FROM __TABLE__ WHERE id = ?`,
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
    INSERT INTO __TABLE__
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
    UPDATE __TABLE__
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
    `DELETE FROM __TABLE__ WHERE id = ?`,
    [id]
  );

  res.json({ success: true });
};
