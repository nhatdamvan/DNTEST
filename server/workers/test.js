const { Queue } = require('bullmq');
const connection = require('../queues/redisConnection');
const queue = new Queue('process-batch', { connection });
queue.add('test-job', { batchId: 123, adminEmail: 'test@example.com' });