const { Queue } = require('bullmq');
const connection = require('./redisConnection');
const demographicQueue = new Queue('demographic-averages', { connection });
module.exports = demographicQueue;