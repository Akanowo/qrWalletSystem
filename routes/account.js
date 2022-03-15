const router = require('express').Router();

const {
	handleGetBanks,
	updateAccount,
} = require('../controllers/accountController');
const authenticate = require('../middleware/authenticate');

router.route('/getbanks').get(authenticate, handleGetBanks);
router.route('/update').post(authenticate, updateAccount);

module.exports = router;
