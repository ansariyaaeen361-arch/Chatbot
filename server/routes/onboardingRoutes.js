const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { analyzeWebsite } = require('../controllers/onboardingController');

router.post('/analyze', auth, analyzeWebsite);

module.exports = router;