const mongoose = require('mongoose');

module.exports = () => {
	return mongoose
		.connect(process.env.MONGO_URI, {
			useNewUrlParser: true,
		})
		.then((client) => {
			console.log('DB connected successfully'.blue.inverse);
		})
		.catch((err) => {
			console.log('Err connecting to db'.red.inverse, err);
		});
};
