const router = require('express').Router();

const paymentRouter = require('./payment');
const authRouter = require('./auth');
const webhookRouter = require('./webhook');
const authenticate = require('../middleware/authenticate');
const accountRounter = require('./account');
const transactionRouter = require('./transactions');

router.use('/auth', authRouter);
router.use('/payment', authenticate, paymentRouter);
router.use('/webhook', webhookRouter);
router.use('/account', accountRounter);
router.use('/transactions', transactionRouter);

module.exports = router;
