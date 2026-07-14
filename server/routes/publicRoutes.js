const express = require('express');
const router = express.Router();
const { getPublicConfig, createLead } = require('../controllers/publicController');
const { strictLimiter } = require('../middleware/rateLimiter');
const checkOrigin = require('../middleware/checkOrigin');

router.get('/config/:businessId', getPublicConfig);
router.post('/lead/:businessId', checkOrigin, strictLimiter, createLead);

module.exports = router;