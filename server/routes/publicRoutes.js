const express = require('express');
const router = express.Router();
const { getPublicConfig, createLead, submitFeedback, emailTranscript } = require('../controllers/publicController');
const { strictLimiter } = require('../middleware/rateLimiter');
const checkOrigin = require('../middleware/checkOrigin');

router.get('/config/:businessId', getPublicConfig);
router.post('/lead/:businessId', checkOrigin, strictLimiter, createLead);
router.post('/feedback/:chatLogId', strictLimiter, submitFeedback);
router.post('/transcript/:businessId', checkOrigin, strictLimiter, emailTranscript);

module.exports = router;