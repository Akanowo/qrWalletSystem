const mongoose = require('mongoose');

module.exports = () => {
	return mongoose
		.connect(
			process.env.NODE_ENV.trim() === 'production'
				? process.env.MONGO_URI
				: 'mongodb://localhost:27017/walletDB',
			{
				useNewUrlParser: true,
			}
		)
		.then((client) => {
			console.log('DB connected successfully'.blue.inverse);
		})
		.catch((err) => {
			console.log('Err connecting to db'.red.inverse, err);
		});
};
