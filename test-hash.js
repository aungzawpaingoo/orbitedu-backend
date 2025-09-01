const bcrypt = require('bcryptjs');

const password = 'admin123';
const hash = '$2a$10$eW5uExYTe1K0FItZpqLOUuYWe1yce7nBGfK1KmU9XLap9v3EC6KH2';

bcrypt.compare(password, hash, (err, result) => {
  if (err) throw err;
  console.log('✅ Password match result:', result);
});
