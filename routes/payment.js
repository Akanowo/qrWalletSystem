const router = require('express').Router();
const {
	handleTopup,
	handleTransfer,
	handleWithdrawal,
} = require('../controllers/payment');

router.route('/topup').post(handleTopup);
router.route('/transfer').post(handleTransfer);
router.route('/withdraw').post(handleWithdrawal);

module.exports = router;
