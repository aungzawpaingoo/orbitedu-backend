// const express = require('express');
// const router = express.Router();
// const { createUser, getCreatedUsersByCurrentUser } = require('../controllers/user.controller');
// const { verifyToken } = require('../middleware/auth.middleware');

// router.post('/create', verifyToken, createUser);
// router.get('/created-by/me', verifyToken, getCreatedUsersByCurrentUser);


// module.exports = router;




const express = require('express');
const router = express.Router();
const { createUser, getCreatedUsersByCurrentUser, verifyUser2FA, getUsers } = require('../controllers/user.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.post('/create', verifyToken, createUser);

router.get('/created-by/me', verifyToken, getCreatedUsersByCurrentUser);

router.get('/', verifyToken, getUsers);

router.post('/2fa/verify/:userId', verifyToken, verifyUser2FA);



module.exports = router;


