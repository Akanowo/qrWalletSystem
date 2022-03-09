const Flutterwave = require('flutterwave-node-v3');

const flwClient = new Flutterwave(
	process.env.FLW_PUBLIC_KEY,
	process.env.FLW_SECRET
);

module.exports = { flwClient };
