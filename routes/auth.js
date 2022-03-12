const router = require('express').Router();
const {
	handleLogin,
	handleSignUp,
	verifyEmail,
	getProfile,
	logout,
} = require('../controllers/auth');

const authenticate = require('../middleware/authenticate');

router.route('/signup').post(handleSignUp);

router.route('/login').post(handleLogin);

router.route('/verify-email').post(verifyEmail);

router.route('/profile').get(authenticate, getProfile);

router.route('/logout').delete(authenticate, logout);

module.exports = router;
