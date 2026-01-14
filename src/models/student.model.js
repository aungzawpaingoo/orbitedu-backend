const db = require('../config/db'); // Your existing DB connection

const Student = {};

// Create a student
Student.create = (data, callback) => {
    const query = `INSERT INTO students
                   (organization_id, branch_id, student_code, name, dob, gender)
                   VALUES (?, ?, ?, ?, ?, ?)`;
    db.query(
        query,
        [
            data.organization_id,
            data.branch_id,
            data.student_code,
            data.name,
            data.dob,
            data.gender
        ],
        callback
    );
};

// Get students by organization + branch
Student.getByOrgBranch = (orgId, branchId, callback) => {
    const query = `SELECT s.*, b.name AS branch_name
                   FROM students s
                   JOIN branches b ON s.branch_id = b.id
                   WHERE s.organization_id = ? AND s.branch_id = ?`;
    db.query(query, [orgId, branchId], callback);
};

// Update student
Student.update = (id, data, callback) => {
    const query = `UPDATE students
                   SET name=?, student_code=?, dob=?, gender=?
                   WHERE id=?`;
    db.query(query, [data.name, data.student_code, data.dob, data.gender, id], callback);
};

// Delete student
Student.delete = (id, callback) => {
    const query = 'DELETE FROM students WHERE id=?';
    db.query(query, [id], callback);
};

module.exports = Student;
