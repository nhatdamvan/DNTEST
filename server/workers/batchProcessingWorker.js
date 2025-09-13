const { Worker } = require('bullmq');
const { getClient, query } = require('../config/database');
const { processBatch, updateBatchStatusWithError } = require('../service/batchService');
const sendMail = require('../utils/email');
const connection = require('../queues/redisConnection');


const worker = new Worker('process-batch', async job => {
  const { batchId, adminEmail } = job.data;
  console.log(`Worker processing batch ${batchId}`);
  
  try {
    const result = await processBatch(batchId);
    console.log(`Batch ${batchId} processed successfully:`, result);
    
    if (adminEmail) {
      await sendMail.sendApprovedEmail(adminEmail, 'ASYNC', batchId, result.records);
    }
    
    console.log(`Batch ${batchId} processed in background by worker. Notification sent to ${adminEmail}.`);
    return result;
    
  } catch (error) {
    console.error(`Error in batch worker for ${batchId}:`, error);
    
    // Update batch status with detailed error information
    try {
      const errorDetails = {
        error: error.message,
        type: 'WORKER_ERROR',
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
      
      await updateBatchStatusWithError(batchId, 'failed', adminEmail, errorDetails);
      
      // Send error email
      if (adminEmail) {
        if (sendMail.sendDetailedErrorEmail) {
          await sendMail.sendDetailedErrorEmail(adminEmail, errorDetails, batchId);
        } else {
          await sendMail.sendErrorEmail(adminEmail, error.message, batchId);
        }
      }
    } catch (updateError) {
      console.error(`Failed to update batch status for ${batchId}:`, updateError);
    }
    
    throw error;
  } 
}, { connection, concurrency: 1 });