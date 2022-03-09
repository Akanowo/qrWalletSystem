const { createClient } = require('redis');

module.exports = async () => {
	const client = createClient();

	client.on('error', (err) => console.log('Redis Client Error', err));

	await client.connect();

	return client;
};
