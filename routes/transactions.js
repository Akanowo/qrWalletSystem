const { getSingleTransaction } = require('../controllers/transactions');
const authenticate = require('../middleware/authenticate');

const router = require('express').Router();

router.route('/:id').get(authenticate, getSingleTransaction);

module.exports = router;
