const router = require('express').Router();

const paymentRouter = require('./payment');
const authRouter = require('./auth');
const authenticate = require('../middleware/authenticate');

router.use('/auth', authRouter);
router.use('/payment', authenticate, paymentRouter);

module.exports = router;
