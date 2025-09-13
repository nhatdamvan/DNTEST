const dashboardService = require('../service/dashboardService');

async function getDashboardStats(req, res) {
  try {
    const data = await dashboardService.fetchDashboardStats();
    res.json(data);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
}

module.exports = {
  getDashboardStats,
};