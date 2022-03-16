const { createClient } = require('redis');

module.exports = async () => {
	let client;
	if (process.env.NODE_ENV.trim() === 'production') {
		client = createClient({ url: process.env.REDIS_URL });
	} else {
		client = createClient();
	}

	client.on('error', (err) => console.log('Redis Client Error', err));

	await client.connect();

	return client;
};
