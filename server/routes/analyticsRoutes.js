const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getOverview,
  getTopQuestions,
  getLeads,
  exportLeadsCsv
} = require('../controllers/analyticsController');

router.get('/overview', auth, getOverview);
router.get('/top-questions', auth, getTopQuestions);
router.get('/leads', auth, getLeads);
router.get('/leads/export', auth, exportLeadsCsv);

module.exports = router;