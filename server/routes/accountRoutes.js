const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getMe, updateAccount, changePassword } = require('../controllers/accountController');

router.get('/me', auth, getMe);
router.put('/me', auth, updateAccount);
router.put('/password', auth, changePassword);

module.exports = router;