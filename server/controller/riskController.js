const riskService = require('../service/riskService');

const getRiskPoints = async (req, res) => {
  try {
    const { userId, type, lifestyle = {} } = req.body;
    if (!userId || !type) {
      return res.status(400).json({ error: 'userId and type are required' });
    }
    const result = await riskService.getRiskPoints(userId, type, lifestyle, req.body.responses);
    res.json(result);
  } catch (error) {
    console.error('Error in /risk/points:', error);
    res.status(400).json({ error: error.message || 'Failed to calculate risk points' });
  }
};

const getPreviousRiskAssessments = async (req, res) => {
  try {
    const reportId = req.query.reportId;
    if (!reportId) return res.status(400).json({ error: 'reportId is required' });
    const data = await riskService.getPreviousRiskAssessments(reportId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch risk assessments' });
  }
};

module.exports = {
  getRiskPoints,
  getPreviousRiskAssessments
};