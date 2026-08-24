const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireVerified = require('../middleware/requireVerified');
const requireSeatCompliance = require('../middleware/requireSeatCompliance');
const requireRole = require('../middleware/requireRole');
const { upload, uploadLauncherMedia } = require('../middleware/upload');
const {
  getProfile,
  updateProfile,
  uploadLogo,
  removeLogo,
  updateFaqs,
  addFaqFromSuggestion,
  getTeam,
  inviteTeamMember,
  removeTeamMember,
  addKnowledgeEntry,
  addKnowledgeFromUrl,
  removeKnowledgeEntry,
  suggestFaqsFromKnowledge,
  uploadLauncherMedia: uploadLauncherMediaHandler,
  removeLauncherMedia,
  testCrmWebhook
} = require('../controllers/businessController');

router.get('/me', auth, getProfile);
router.get('/team', auth, getTeam);

router.put('/me', auth, requireVerified, requireSeatCompliance, requireRole('owner', 'admin'), updateProfile);
router.post('/logo', auth, requireVerified, requireSeatCompliance, requireRole('owner', 'admin'), upload.single('logo'), uploadLogo);
router.delete('/logo', auth, requireVerified, requireSeatCompliance, requireRole('owner', 'admin'), removeLogo);
router.put('/faqs', auth, requireVerified, requireSeatCompliance, requireRole('owner', 'admin'), updateFaqs);
router.post('/faqs/promote', auth, requireVerified, requireSeatCompliance, requireRole('owner', 'admin'), addFaqFromSuggestion);
router.post('/invite', auth, requireVerified, requireSeatCompliance, requireRole('owner', 'admin'), inviteTeamMember);
router.delete('/team/:userId', auth, requireVerified, requireSeatCompliance, requireRole('owner', 'admin'), removeTeamMember);

router.post('/knowledge', auth, requireVerified, requireSeatCompliance, requireRole('owner', 'admin'), addKnowledgeEntry);
router.post('/knowledge/scan', auth, requireVerified, requireSeatCompliance, requireRole('owner', 'admin'), addKnowledgeFromUrl);
router.delete('/knowledge/:entryId', auth, requireVerified, requireSeatCompliance, requireRole('owner', 'admin'), removeKnowledgeEntry);
router.post('/knowledge/:entryId/suggest-faqs', auth, requireVerified, requireSeatCompliance, requireRole('owner', 'admin'), suggestFaqsFromKnowledge);

router.post('/launcher', auth, requireVerified, requireSeatCompliance, requireRole('owner', 'admin'), uploadLauncherMedia.single('media'), uploadLauncherMediaHandler);
router.delete('/launcher', auth, requireVerified, requireSeatCompliance, requireRole('owner', 'admin'), removeLauncherMedia);

router.post('/crm/test', auth, requireVerified, requireSeatCompliance, requireRole('owner', 'admin'), testCrmWebhook);

module.exports = router;