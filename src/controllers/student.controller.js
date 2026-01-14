const Student = require('../models/student.model');

// Create student
exports.createStudent = (req, res) => {
    const data = req.body;
    Student.create(data, (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ id: result.insertId });
    });
};

// Get students
exports.getStudents = (req, res) => {
    const { orgId, branchId } = req.params;
    Student.getByOrgBranch(orgId, branchId, (err, rows) => {
        if (err) return res.status(500).json({ error: err });
        res.json(rows);
    });
};

// Update student
exports.updateStudent = (req, res) => {
    const { id } = req.params;
    const data = req.body;
    Student.update(id, data, (err) => {
        if (err) return res.status(500).json({ error: err });
        res.sendStatus(200);
    });
};

// Delete student
exports.deleteStudent = (req, res) => {
    const { id } = req.params;
    Student.delete(id, (err) => {
        if (err) return res.status(500).json({ error: err });
        res.sendStatus(200);
    });
};
