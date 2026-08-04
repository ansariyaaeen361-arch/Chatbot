const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireVerified = require('../middleware/requireVerified');
const { analyzeWebsite } = require('../controllers/onboardingController');

router.post('/analyze', auth, requireVerified, analyzeWebsite);

module.exports = router;