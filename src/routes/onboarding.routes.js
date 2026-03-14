const express = require('express');
const router = express.Router();
const {
  createOrganization,
  createBranch,
  getBranchesByOrg,
  getOrganizationsWithBranches
} = require('../controllers/onboarding.controller');

const { verifyToken } = require('../middleware/auth.middleware');

router.post('/organization', verifyToken, createOrganization);
router.post('/branch', verifyToken, createBranch);
router.get('/schools-list', getOrganizationsWithBranches);
router.get('/branches/:organization_id', verifyToken, getBranchesByOrg);

module.exports = router;
