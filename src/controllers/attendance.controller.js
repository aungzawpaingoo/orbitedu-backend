const pool = require('../config/db');

/* ===================== GET ALL ===================== */
// exports.getAll = async (req, res) => {
//     try {
//         const { role, organization_id, branch_id, id: user_id } = req.user;
//         const { start_date, end_date, student_id, attendance_for } = req.query;

//         // Updated query with aliases
//         let query = `
//             SELECT 
//                 a.*,
//                 u.name
//             FROM attendance a
//             LEFT JOIN users u ON u.id = a.user_id
//             WHERE a.attendance_date = CURDATE()
//         `;

//         let params = [];

//         // Filter by tab selection
//         if (attendance_for) {
//             query += ` AND a.attendance_for = ?`;
//             params.push(attendance_for);

//             // If Self tab, filter by current user
//             // if (attendance_for === 'School_Admin' || attendance_for === 'Self') {
//             //     query += ` AND a.user_id = ?`;
//             //     params.push(user_id);
//             // }
//             // Only restrict to self for non-admin roles
//             if (attendance_for === 'Self' && role !== 'School_Admin' && role !== 'Super_Admin') {
//                 query += ` AND a.user_id = ?`;
//                 params.push(user_id);
//             }
//         }

//         // Role-based filter
//         if (role === 'School_Admin' || role === 'Teacher' || role === 'Clerk') {
//             query += ` AND a.branch_id = ?`;
//             params.push(branch_id);
//         }

//         if (role === 'Parent') {
//             query += ` AND a.student_id = ?`;
//             params.push(user_id);
//         }

//         if (role === 'Super_Admin') {
//             if (req.query.organization_id) {
//                 query += ` AND a.organization_id = ?`;
//                 params.push(req.query.organization_id);
//             }
//             if (req.query.branch_id) {
//                 query += ` AND a.branch_id = ?`;
//                 params.push(req.query.branch_id);
//             }
//         }

//         // Optional frontend filters
//         if (student_id) {
//             query += ` AND a.student_id = ?`;
//             params.push(student_id);
//         }
//         if (start_date) {
//             query += ` AND a.attendance_date >= ?`;
//             params.push(start_date);
//         }
//         if (end_date) {
//             query += ` AND a.attendance_date <= ?`;
//             params.push(end_date);
//         }

//         const [rows] = await pool.promise().query(query, params);
//         res.json(rows);
//     } catch (err) {
//         console.error('Get all attendance error:', err);
//         res.status(500).json({ message: 'Failed to fetch attendance' });
//     }
// };
exports.getAll = async (req, res) => {
    try {
        const { role, branch_id, id: user_id } = req.user;
        const { start_date, end_date, attendance_for } = req.query;

        let query = `
            SELECT 
                a.*,
                u.name
            FROM attendance a
            LEFT JOIN users u ON u.id = a.user_id
            WHERE 1=1
        `;
        let params = [];

        // Date filter
        if (start_date) {
            query += ` AND a.attendance_date >= ?`;
            params.push(start_date);
        }
        if (end_date) {
            query += ` AND a.attendance_date <= ?`;
            params.push(end_date);
        }

        // Filter by role & attendance_for
        if (['Teacher', 'Clerk'].includes(role)) {
            query += ` AND a.user_id = ?`;
            params.push(user_id);
        } else if (role === 'School_Admin') {
            query += ` AND a.branch_id = ?`;
            params.push(branch_id);
        } else if (role === 'Parent') {
            query += ` AND a.student_id = ?`;
            params.push(user_id);
        }

        // Optional filter for frontend
        if (attendance_for) {
            query += ` AND a.attendance_for = ?`;
            params.push(attendance_for);
        }

        query += ` ORDER BY a.attendance_date DESC`;

        const [rows] = await pool.promise().query(query, params);
        res.json(rows);

    } catch (err) {
        console.error('Get all attendance error:', err);
        res.status(500).json({ message: 'Failed to fetch attendance' });
    }
};




/* ===================== GET BY ID ===================== */
exports.getById = async (req, res) => {
    const { id } = req.params;
    const { role, branch_id, id: user_id } = req.user;

    try {
        let query = `
            SELECT 
                a.*,
                u.name
            FROM attendance a
            LEFT JOIN users u ON u.id = a.user_id
            WHERE a.id = ?
        `;
        let params = [id];

        if (role === 'School_Admin' || role === 'Teacher' || role === 'Clerk') {
            query += ` AND a.branch_id = ?`;
            params.push(branch_id);
        }

        if (role === 'Parent') {
            query += ` AND a.student_id = ?`;
            params.push(user_id);
        }

        const [rows] = await pool.promise().query(query, params);
        res.json(rows[0] || null);
    } catch (err) {
        console.error('Get attendance by ID error:', err);
        res.status(500).json({ message: 'Failed to fetch attendance by ID' });
    }
};


/* ===================== GET HISTORY ===================== */

exports.getHistory = async (req, res) => {
    try {
        const { role, branch_id, id: user_id } = req.user;

        let query = `
      SELECT 
        a.*,
        u.name
      FROM attendance a
      LEFT JOIN users u ON u.id = a.user_id
      WHERE 1=1
    `;

        let params = [];

        // Teacher / Clerk → only self
        if (['Teacher', 'Clerk'].includes(role)) {
            query += ` AND a.user_id = ?`;
            params.push(user_id);
        }

        // School Admin → branch data
        if (role === 'School_Admin') {
            query += ` AND a.branch_id = ?`;
            params.push(branch_id);
        }

        if (role === 'Parent') {
            query += ` AND a.student_id = ?`;
            params.push(user_id);
        }


        // Only current month & year
        query += ` 
      AND MONTH(a.attendance_date) = MONTH(CURDATE())
      AND YEAR(a.attendance_date) = YEAR(CURDATE())
      AND a.attendance_date <= CURDATE()

    `;

        query += ` ORDER BY a.attendance_date DESC`;

        const [rows] = await pool.promise().query(query, params);

        res.json(rows);

    } catch (err) {
        console.error('Attendance history error:', err);
        res.status(500).json({ message: 'Failed to fetch attendance history' });
    }
};


/* ===================== GET HISTORY ===================== */





/* ===================== CREATE ===================== */
exports.create = async (req, res) => {
    const { role, branch_id: user_branch, id: logged_user_id, organization_id } = req.user;
    const data = { ...req.body };

    if (!['School_Admin', 'Teacher', 'Clerk', 'Super_Admin'].includes(role)) {
        return res.status(403).json({ message: 'Access denied' });
    }

    /* ===================== ROLE + SELF ATTENDANCE RULES ===================== */

    if (data.attendance_for === 'Self') {

        // Teacher & Clerk → ONLY themselves
        if (['Teacher', 'Clerk'].includes(role)) {
            data.user_id = logged_user_id;
        }

        // School_Admin → can mark for self OR others
        if (role === 'School_Admin') {
            if (!data.user_id) {
                data.user_id = logged_user_id;
            }
        }
    }

    /* ===================== STUDENT ATTENDANCE RULE ===================== */

    if (data.student_id) {
        // Teacher / Clerk / Admin can mark student attendance
        if (!['Teacher', 'Clerk', 'School_Admin', 'Super_Admin'].includes(role)) {
            return res.status(403).json({ message: 'Not allowed to mark student attendance' });
        }
    }

    /* ===================== BRANCH SECURITY ===================== */

    if (role !== 'Super_Admin') {
        data.branch_id = user_branch;
    }

    try {
        /* ===================== DUPLICATE CHECK ===================== */

        const attendanceDate = data.attendance_date || new Date().toISOString().split('T')[0];

        const [existing] = await pool.promise().query(
            `
      SELECT id
      FROM attendance
      WHERE attendance_for = ?
        AND attendance_date = ?
        AND (
          (user_id IS NOT NULL AND user_id = ?)
          OR
          (student_id IS NOT NULL AND student_id = ?)
        )
      LIMIT 1
      `,
            [
                data.attendance_for,
                attendanceDate,
                data.user_id || null,
                data.student_id || null,
            ]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                message: 'Attendance already marked for today',
            });
        }

        /* ===================== AUTO FILL DEFAULTS ===================== */

        data.attendance_date = attendanceDate;
        data.organization_id = data.organization_id || organization_id;
        data.recorded_by_user_id = logged_user_id;
        data.recorded_by_role = role;
        data.is_manual = 1;


        /* ===================== INSERT ===================== */

        const columns = Object.keys(data);
        const values = Object.values(data);

        const sql = `
      INSERT INTO attendance
      (${columns.map(c => `\`${c}\``).join(',')})
      VALUES (${columns.map(() => '?').join(',')})
    `;

        const [result] = await pool.promise().execute(sql, values);

        res.json({
            id: result.insertId,
            message: 'Attendance created successfully',
        });

    } catch (err) {
        console.error('Create attendance error:', err);
        res.status(500).json({ message: 'Failed to create attendance' });
    }
};



/* ===================== UPDATE ===================== */
exports.update = async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    const { role, branch_id: user_branch, id: user_id } = req.user;

    if (!['School_Admin', 'Teacher', 'Clerk', 'Super_Admin'].includes(role)) {
        return res.status(403).json({ message: 'Access denied' });
    }

    if (role !== 'Super_Admin' && data.branch_id && data.branch_id !== user_branch) {
        return res.status(403).json({ message: 'Cannot update attendance for another branch' });
    }

    const columns = Object.keys(data);
    const values = Object.values(data);

    const sql = `
        UPDATE attendance
        SET ${columns.map(c => `\`${c}\` = ?`).join(',')}
        WHERE id = ?
    `;

    try {
        await pool.promise().execute(sql, [...values, id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Update attendance error:', err);
        res.status(500).json({ message: 'Failed to update attendance' });
    }
};

/* ===================== DELETE ===================== */
exports.remove = async (req, res) => {
    const { id } = req.params;
    const { role, branch_id: user_branch } = req.user;

    if (!['School_Admin', 'Teacher', 'Clerk', 'Super_Admin'].includes(role)) {
        return res.status(403).json({ message: 'Access denied' });
    }

    if (role !== 'Super_Admin') {
        const [[row]] = await pool.promise().query(
            'SELECT branch_id FROM attendance WHERE id = ?',
            [id]
        );
        if (!row || row.branch_id !== user_branch) {
            return res.status(403).json({ message: 'Cannot delete attendance from another branch' });
        }
    }

    try {
        await pool.promise().execute(`DELETE FROM attendance WHERE id = ?`, [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Delete attendance error:', err);
        res.status(500).json({ message: 'Failed to delete attendance' });
    }
};







