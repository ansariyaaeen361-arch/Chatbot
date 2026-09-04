const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireVerified = require('../middleware/requireVerified');
const requireSeatCompliance = require('../middleware/requireSeatCompliance');
const requireRole = require('../middleware/requireRole');
const requirePlanFeature = require('../middleware/requirePlanFeature');
const {
  getOverview,
  getHomeSummary,
  getHomeTrend,
  getMessageTrend,
  getTopQuestions,
  getMissedFaqs,
  getAgentStats,
  getLeads,
  getLeadConversation,
  exportLeadsCsv
} = require('../controllers/analyticsController');

router.get('/home', auth, requireVerified, requireSeatCompliance, requireRole('owner', 'admin'), getHomeSummary);
router.get('/home-trend', auth, requireVerified, requireSeatCompliance, requireRole('owner', 'admin'), getHomeTrend);
router.get('/message-trend', auth, requireVerified, requireSeatCompliance, requireRole('owner', 'admin'), requirePlanFeature('analytics'), getMessageTrend);
router.get('/overview', auth, requireVerified, requireSeatCompliance, requireRole('owner', 'admin'), requirePlanFeature('analytics'), getOverview);
router.get('/top-questions', auth, requireVerified, requireSeatCompliance, requireRole('owner', 'admin'), requirePlanFeature('analytics'), getTopQuestions);
router.get('/missed-faqs', auth, requireVerified, requireSeatCompliance, requireRole('owner', 'admin'), requirePlanFeature('analytics'), getMissedFaqs);
router.get('/agent-stats', auth, requireVerified, requireSeatCompliance, requireRole('owner', 'admin'), requirePlanFeature('analytics'), getAgentStats);
router.get('/leads', auth, requireVerified, requireSeatCompliance, requireRole('owner', 'admin'), requirePlanFeature('analytics'), getLeads);
router.get('/leads/:leadId/conversation', auth, requireVerified, requireSeatCompliance, requireRole('owner', 'admin'), requirePlanFeature('analytics'), getLeadConversation);
router.get('/leads/export', auth, requireVerified, requireSeatCompliance, requireRole('owner', 'admin'), requirePlanFeature('analytics'), exportLeadsCsv);

module.exports = router;