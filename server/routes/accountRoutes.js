const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireVerified = require('../middleware/requireVerified');
const { getMe, updateAccount, changePassword } = require('../controllers/accountController');

router.get('/me', auth, getMe);
router.put('/me', auth, requireVerified, updateAccount);
router.put('/password', auth, requireVerified, changePassword);

module.exports = router;