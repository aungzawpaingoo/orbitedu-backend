// const express = require('express');
// const dotenv = require('dotenv');
// const cors = require('cors');
// const path = require('path');
// // const userProfileRoutes = require('./routes/userProfile.routes');

// dotenv.config();

// const app = express();
// app.use(cors());
// app.use(express.json());

// const authRoutes = require('./routes/auth.routes');
// const userRoutes = require('./routes/user.routes');

// app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);

// // app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// // app.use('/api/user-profile', userProfileRoutes);


// app.get('/', (req, res) => {
//   res.send('orbitEDU backend is running ✅');
// });

// module.exports = app;





// const express = require('express');
// const dotenv = require('dotenv');
// const cors = require('cors');
// const path = require('path');

// dotenv.config();

// const app = express();
// app.use(cors());
// app.use(express.json());

// // Routes
// const authRoutes = require('./routes/auth.routes');
// const userRoutes = require('./routes/user.routes');
// const teacherRoutes = require('./routes/teacher.routes'); // ✅ new import

// // Mount routes
// app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/teachers', teacherRoutes); // ✅ new route

// // Test root route
// app.get('/', (req, res) => {
//   res.send('orbitEDU backend is running ✅');
// });

// module.exports = app;







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
const attendanceRoutes = require('./routes/attendanceRoutes');
const clerkRoutes = require('./routes/clerk.routes');
const studentRoutes = require('./routes/student.routes');
const onboardingRoutes = require('./routes/onboarding.routes');
const branchOnboardingRoutes = require('./routes/branches.route');
const announcementRoutes = require('./routes/announcement.routes');





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




// Test root route
app.get('/', (req, res) => {
  res.send('orbitEDU backend is running ✅');
});

module.exports = app;


