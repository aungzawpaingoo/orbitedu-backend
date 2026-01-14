// const express = require('express');
// const router = express.Router();
// const {
//   createOrganization,
//   createBranch,
//   getBranchesByOrg
// } = require('../controllers/onboarding.controller');

// const { verifyToken } = require('../middleware/auth.middleware');

// router.post('/organization', verifyToken, createOrganization);
// router.post('/branch', verifyToken, createBranch);
// router.get('/branches/:organization_id', verifyToken, getBranchesByOrg);

// module.exports = router;



const express = require('express');
const { createBranchKYC, getBranchKYC, getAllBranchKYCs, updateBranchKYC, verifyBranchKYC, deleteBranchKYC } = require('../controllers/branches.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const router = express.Router();


router.post('/branches/kyc', verifyToken, createBranchKYC);
router.get('/branches/:branchId/kyc', verifyToken, getBranchKYC);
router.get('/branches/kyc', verifyToken, getAllBranchKYCs);
router.put('/branches/:branchId/kyc', verifyToken, updateBranchKYC);
router.patch('/branches/:branchId/kyc/verify', verifyToken, verifyBranchKYC);
router.delete('/branches/:branchId/kyc', verifyToken, deleteBranchKYC);

module.exports = router;
