const router = require('express').Router();
const {
	handleLogin,
	handleSignUp,
	verifyEmail,
} = require('../controllers/auth');

router.route('/signup').post(handleSignUp);

router.route('/login').post(handleLogin);

router.route('/verify-email').post(verifyEmail);

module.exports = router;
