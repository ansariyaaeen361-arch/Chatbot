const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requirePlanFeature = require('../middleware/requirePlanFeature');
const {
  getOverview,
  getTopQuestions,
  getLeads,
  exportLeadsCsv
} = require('../controllers/analyticsController');

router.get('/overview', auth, requirePlanFeature('analytics'), getOverview);
router.get('/top-questions', auth, requirePlanFeature('analytics'), getTopQuestions);
router.get('/leads', auth, requirePlanFeature('analytics'), getLeads);
router.get('/leads/export', auth, requirePlanFeature('analytics'), exportLeadsCsv);

module.exports = router;