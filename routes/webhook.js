const router = require('express').Router();

const { handleWebhookTransaction } = require('../controllers/webhook');

router.route('/').post(handleWebhookTransaction);

module.exports = router;
