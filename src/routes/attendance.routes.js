const router = require('express').Router();
const ctrl = require('../controllers/attendance.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.use(verifyToken);

// ========== GET ATTENDANCE ==========
router.get('/history', ctrl.getHistory);
router.get('/', ctrl.getAll); // role-based + optional filters
router.get('/:id', ctrl.getById); // single row by ID

// ========== CREATE / UPDATE / DELETE ==========
router.post('/', ctrl.create); // create new attendance row
router.put('/:id', ctrl.update); // update row by ID
router.delete('/:id', ctrl.remove); // delete row by ID

// ========== CUSTOM UPDATE FOR FRONTEND ==========
router.post('/update', async (req, res) => {
  try {
    const {
      userId,
      date,
      status,
      checkIn,
      checkOut,
      reason,
      branch_id,
      organization_id,
    } = req.body;

    if (!userId || !date) {
      return res.status(400).json({ message: 'userId and date are required' });
    }

    // First: Check if attendance exists for this student and date
    const [existing] = await pool
      .promise()
      .query(
        `SELECT id FROM attendance WHERE student_id = ? AND attendance_date = ?`,
        [userId, date]
      );

    if (existing.length > 0) {
      // Update existing row
      const attendanceId = existing[0].id;
      await pool
        .promise()
        .execute(
          `UPDATE attendance
           SET status = ?, check_in_time = ?, check_out_time = ?, reason = ?, last_changed_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [status, checkIn, checkOut, reason, attendanceId]
        );
      res.json({ message: 'Attendance updated', id: attendanceId });
    } else {
      // Create new row
      const [result] = await pool
        .promise()
        .execute(
          `INSERT INTO attendance 
           (student_id, attendance_date, status, check_in_time, check_out_time, reason, branch_id, organization_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, date, status, checkIn, checkOut, reason, branch_id, organization_id]
        );
      res.json({ message: 'Attendance created', id: result.insertId });
    }
  } catch (err) {
    console.error('Attendance custom update error:', err);
    res.status(500).json({ message: 'Failed to update attendance' });
  }
});

module.exports = router;
