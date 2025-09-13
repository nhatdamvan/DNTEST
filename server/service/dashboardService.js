const dashboardRepository = require('../repositories/dashboardRepository');

async function fetchDashboardStats() {
  const stats = await dashboardRepository.getDashboardStats();
  const recentBatches = await dashboardRepository.getRecentBatches(5);
  return { stats, recentBatches };
}

module.exports = {
  fetchDashboardStats,
};