const reportService = require('../service/reportService');

// GET /api/reports/user/:userId
const getUserReport = async (req, res) => {
  try {
    const { userId } = req.params;
    const report = await reportService.getUserReport(userId);
    if (!report) {
      return res.status(404).json({ error: 'User or report not found' });
    }
    res.json(report);
  } catch (error) {
    console.error('Error fetching user report:', error);
    res.status(500).json({ error: 'Failed to fetch user report' });
  }
};

// GET /api/reports/user/:userId/all
const getAllUserReports = async (req, res) => {
  try {
    const { userId } = req.params;
    const reports = await reportService.getAllUserReports(userId);
    res.json(reports);
  } catch (error) {
    console.error('Error fetching all user reports:', error);
    res.status(500).json({ error: 'Failed to fetch user reports' });
  }
};

// GET /api/reports/user/:userId/report/:reportId
const getUserReportById = async (req, res) => {
  try {
    const { userId, reportId } = req.params;
    const report = await reportService.getUserReportById(userId, reportId);
    if (!report) {
      return res.status(404).json({ error: 'User or report not found' });
    }
    res.json(report);
  } catch (error) {
    console.error('Error fetching user report by ID:', error);
    res.status(500).json({ error: 'Failed to fetch user report' });
  }
};

module.exports = {
  getUserReport,
  getAllUserReports,
  getUserReportById
};