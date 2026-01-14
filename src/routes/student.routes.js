const express = require('express');
const router = express.Router();
const studentController = require('../controllers/student.controller');

// Create
router.post('/', studentController.createStudent);

// Read (by org & branch)
router.get('/:orgId/:branchId', studentController.getStudents);

// Update
router.put('/:id', studentController.updateStudent);

// Delete
router.delete('/:id', studentController.deleteStudent);

module.exports = router;
