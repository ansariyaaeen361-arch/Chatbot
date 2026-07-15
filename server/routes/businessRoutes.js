const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { upload, uploadLauncherMedia } = require('../middleware/upload');
const {
  getProfile,
  updateProfile,
  uploadLogo,
  updateFaqs,
  getTeam,
  inviteTeamMember,
  addKnowledgeEntry,
  addKnowledgeFromUrl,
  removeKnowledgeEntry,
  uploadLauncherMedia: uploadLauncherMediaHandler,
  removeLauncherMedia
} = require('../controllers/businessController');

router.get('/me', auth, getProfile);
router.get('/team', auth, getTeam);

router.put('/me', auth, requireRole('owner', 'admin'), updateProfile);
router.post('/logo', auth, requireRole('owner', 'admin'), upload.single('logo'), uploadLogo);
router.put('/faqs', auth, requireRole('owner', 'admin'), updateFaqs);
router.post('/invite', auth, requireRole('owner', 'admin'), inviteTeamMember);

router.post('/knowledge', auth, requireRole('owner', 'admin'), addKnowledgeEntry);
router.post('/knowledge/scan', auth, requireRole('owner', 'admin'), addKnowledgeFromUrl);
router.delete('/knowledge/:entryId', auth, requireRole('owner', 'admin'), removeKnowledgeEntry);

router.post('/launcher', auth, requireRole('owner', 'admin'), uploadLauncherMedia.single('media'), uploadLauncherMediaHandler);
router.delete('/launcher', auth, requireRole('owner', 'admin'), removeLauncherMedia);

module.exports = router;