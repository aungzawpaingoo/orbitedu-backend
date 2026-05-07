const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve uploads folder statically (Add this)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const teacherRoutes = require('./routes/teacher.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const clerkRoutes = require('./routes/clerk.routes');
const studentRoutes = require('./routes/student.routes');
const onboardingRoutes = require('./routes/onboarding.routes');
const branchOnboardingRoutes = require('./routes/branches.route');
const announcementRoutes = require('./routes/announcement.routes');
const academicYearRoutes = require('./routes/academic-year.routes');
const gradeRoutes = require('./routes/grade.routes');
const classRoutes = require('./routes/class.routes');
const timetableRoutes = require('./routes/timetable.routes');
const timetableEntryRoutes = require('./routes/timetable-entry.routes');
const leaverequestRoutes = require('./routes/leave_requests.routes');
//const userProfileRoutes = require('./routes/userProfile.routes');

const profileRoutes = require('./routes/profile.routes');






// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/clerks', clerkRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/branchOnboarding', branchOnboardingRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/academic-years', academicYearRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/timetables', timetableRoutes);
app.use('/api/timetable-entries', timetableEntryRoutes);
app.use('/api/leave-requests', leaverequestRoutes);
app.use('/api/profile', profileRoutes);






// Test root route
app.get('/', (req, res) => {
  const info = `
   ██████╗   ██████╗ ██████╗  ██╗ ████████╗
  ██╔═══██╗ ██╔══██╗ ██╔══██╗ ██║ ╚══██╔══╝
  ██║   ██║ ██████╔╝ ██████╔╝ ██║    ██║   
  ██║   ██║ ██╔══██╗ ██╔══██╗ ██║    ██║   
  ╚██████╔╝ ██║  ██║ ██████╔╝ ██║    ██║   

  STATUS:    Online
  
  TIME:      ${new Date().toISOString().slice(0,19).replace('T', ' ')}
  
  ENV:       ${(process.env.NODE_ENV || 'development').toUpperCase()}
  
  UPTIME:    ${Math.floor(process.uptime())}s
  `;

  res.setHeader('Content-Type', 'text/plain');
  res.status(200).send(info);
});

module.exports = app;


