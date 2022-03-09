const router = require('express').Router();
const {
	handleTopup,
	handleTopupAuthorization,
	handleTopupRedirect,
	handleTopupValidation,
	handleTransfer,
	handleWithdrawal,
} = require('../controllers/payment');

router.route('/topup/charge').post(handleTopup);
router.route('/topup/authorize').post(handleTopupAuthorization);
router.route('/topup/validate').post(handleTopupValidation);
router.route('/topup/redirect').get(handleTopupRedirect);
router.route('/transfer').post(handleTransfer);
router.route('/withdraw').post(handleWithdrawal);

module.exports = router;
