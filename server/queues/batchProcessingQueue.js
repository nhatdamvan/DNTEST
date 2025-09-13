const { Queue } = require('bullmq');
const connection = require('./redisConnection');
const batchProcessingQueue = new Queue('process-batch', { connection });
module.exports = batchProcessingQueue;