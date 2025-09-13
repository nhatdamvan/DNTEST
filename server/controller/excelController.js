// Now using consolidated excelService with all functions
const excelService = require('../service/excelService');

async function uploadBatch(req, res) {
  try {
    console.log('Admin user:', req.admin);
    console.log('[ExcelController] Upload type:', req.body.source || 'file');
    console.log('[ExcelController] Has file:', !!req.file);
    
    // Check if this is a manual entry
    if (req.body.source === 'manual' && req.body.data) {
      // Parse the manual data
      const manualData = JSON.parse(req.body.data);
      const result = await excelService.processManualData(manualData, req.admin);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed. No data was uploaded.',
          errors: result.errors,
          validRecords: result.validCount,
          errorRecords: result.errorCount,
          totalRecords: result.totalRecords
        });
      }
      res.json(result);
    } else {
      // Handle file upload - now using uploadBatch (which is the enhanced version)
      console.log('[ExcelController] Processing file upload');
      if (!req.file) {
        console.log('[ExcelController] No file provided');
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      console.log('[ExcelController] Calling uploadBatch for file:', req.file.originalname);
      const result = await excelService.uploadBatch(req.file, req.admin);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed. No data was uploaded.',
          errors: result.errors,
          validRecords: result.validCount,
          errorRecords: result.errorCount,
          totalRecords: result.totalRecords
        });
      }
      res.json(result);
    }
  } catch (error) {
    console.error('Error processing upload:', error);
    res.status(500).json({ error: 'Failed to process upload' });
  }
}

async function downloadTemplate(req, res) {
  try {
    const buffer = await excelService.generateHealthDataTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=health_data_template.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({ error: 'Failed to generate template' });
  }
}

module.exports = {
  uploadBatch,
  downloadTemplate
};