const batchService = require('../service/batchService');

async function approveBatch(req, res) {
  try {
    const { batchId } = req.params;
    const adminEmail = req.admin.email;
    const result = await batchService.approveBatch(batchId, adminEmail);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error approving batch:', error);
    res.status(500).json({ error: 'Failed to approve batch' });
  } 
}

async function getBatchDetails(req, res) {
  try {
    const { batchId } = req.params;
    const details = await batchService.getBatchDetails(batchId);

    if (!details) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    res.json(details);
  } catch (error) {
    console.error('Error fetching batch details:', error);
    res.status(500).json({ error: 'Failed to fetch batch details' });
  }
}

async function getBatches(req, res) {
  try {
    const batches = await batchService.listRecentBatches();
    res.json(batches);
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({ error: 'Failed to fetch batches' });
  }
}

async function rejectBatch(req, res) {
  try {
    const { batchId } = req.params;
    const { reason } = req.body;
    const adminEmail = req.admin.email;

    const result = await batchService.rejectBatch(batchId, reason, adminEmail);
    res.json(result);
  } catch (error) {
    console.error('Error rejecting batch:', error);
    res.status(500).json({ error: 'Failed to reject batch' });
  }
}

async function deleteBatch(req, res) {
  try {
    const { batchId } = req.params;
    const adminEmail = req.admin ? req.admin.email : 'unknown';
    
    console.log(`[DEBUG Batch Delete] ========== START ==========`);
    console.log(`[DEBUG Batch Delete] Admin: ${adminEmail}`);
    console.log(`[DEBUG Batch Delete] Batch ID: ${batchId}`);
    console.log(`[DEBUG Batch Delete] Request headers:`, req.headers);
    console.log(`[DEBUG Batch Delete] Admin object:`, req.admin);
    
    const result = await batchService.deleteBatch(batchId);
    
    console.log(`[DEBUG Batch Delete] Result:`, result);
    console.log(`[DEBUG Batch Delete] ========== END ==========`);
    
    res.json({ success: true, message: 'Batch deleted successfully', ...result });
  } catch (error) {
    console.error('[DEBUG Batch Delete] ERROR:', error);
    console.error('[DEBUG Batch Delete] Error stack:', error.stack);
    console.error('[DEBUG Batch Delete] Error message:', error.message);
    res.status(500).json({ error: error.message || 'Failed to delete batch' });
  }
}

async function downloadBatchExcel(req, res) {
  try {
    const { batchId } = req.params;
    
    console.log(`[DEBUG Batch Download] ========== START ==========`);
    console.log(`[DEBUG Batch Download] Batch ID: ${batchId}`);
    console.log(`[DEBUG Batch Download] Admin:`, req.admin);
    
    const filePath = await batchService.getBatchExcelPath(batchId);
    
    console.log(`[DEBUG Batch Download] File path from service:`, filePath);
    
    if (!filePath) {
      console.log(`[DEBUG Batch Download] No file path found in database for batch ${batchId}`);
      return res.status(404).json({ error: 'Excel file not available for this batch' });
    }
    
    const fs = require('fs');
    const path = require('path');
    
    console.log(`[DEBUG Batch Download] Checking if file exists at:`, filePath);
    
    if (!fs.existsSync(filePath)) {
      console.log(`[DEBUG Batch Download] File does not exist on filesystem:`, filePath);
      return res.status(404).json({ error: 'Excel file not found on server' });
    }
    
    console.log(`[DEBUG Batch Download] File exists, sending download...`);
    const filename = `batch_${batchId}.xlsx`;
    
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('[DEBUG Batch Download] Error during download:', err);
      } else {
        console.log('[DEBUG Batch Download] File sent successfully');
      }
    });
    
    console.log(`[DEBUG Batch Download] ========== END ==========`);
  } catch (error) {
    console.error('[DEBUG Batch Download] ERROR:', error);
    console.error('[DEBUG Batch Download] Error stack:', error.stack);
    console.error('[DEBUG Batch Download] Error message:', error.message);
    res.status(500).json({ error: 'Failed to download Excel file' });
  }
}

module.exports = {
  approveBatch,
  getBatchDetails,
  getBatches,
  rejectBatch,
  deleteBatch,
  downloadBatchExcel
};