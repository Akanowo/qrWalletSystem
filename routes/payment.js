const router = require('express').Router();
const {
	handleTopup,
	handleTopupAuthorization,
	handleTopupRedirect,
	handleTopupValidation,
	handleTopupTransfer,
	handleTopupUssd,
	handleTransfer,
	handleWithdrawal,
	generateVirtualAccount,
} = require('../controllers/payment');

router.route('/topup/charge').post(handleTopup);
router.route('/topup/authorize').post(handleTopupAuthorization);
router.route('/topup/validate').post(handleTopupValidation);
router.route('/topup/redirect').get(handleTopupRedirect);
router.route('/topup/transfer').post(handleTopupTransfer);
router.route('/topup/ussd').post(handleTopupUssd);
router.route('/transfer').post(handleTransfer);
router.route('/withdraw').post(handleWithdrawal);
router.route('/generate-vacc').post(generateVirtualAccount);

module.exports = router;
