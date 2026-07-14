const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const upload = require('../middleware/upload');
const {
  getProfile,
  updateProfile,
  uploadLogo,
  updateFaqs,
  getTeam,
  inviteTeamMember
} = require('../controllers/businessController');

// Any logged-in team member can view
router.get('/me', auth, getProfile);
router.get('/team', auth, getTeam);

// Only owner/admin can change these
router.put('/me', auth, requireRole('owner', 'admin'), updateProfile);
router.post('/logo', auth, requireRole('owner', 'admin'), upload.single('logo'), uploadLogo);
router.put('/faqs', auth, requireRole('owner', 'admin'), updateFaqs);
router.post('/invite', auth, requireRole('owner', 'admin'), inviteTeamMember);

module.exports = router;