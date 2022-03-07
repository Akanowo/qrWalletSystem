const router = require('express').Router();

const paymentRouter = require('./payment');
const authRouter = require('./auth');

router.use('/auth', authRouter);
router.use('/payment', paymentRouter);

module.exports = router;
