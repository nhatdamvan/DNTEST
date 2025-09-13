const { query } = require('../config/database');

async function getDashboardStats() {
  const stats = await query(`
    SELECT 
      (SELECT COUNT(*) FROM users) as total_users,
      (SELECT COUNT(*) FROM user_reports) as total_reports,
      (SELECT COUNT(*) FROM batch_uploads WHERE status = 'completed') as completed_batches,
      (SELECT COUNT(*) FROM batch_uploads WHERE status = 'validated') as pending_batches
  `);
  return stats.rows[0];
}

async function getRecentBatches(limit = 5) {
  const recentBatches = await query(`
    SELECT batch_id, filename, uploaded_by, created_at, status, total_records
    FROM batch_uploads
    ORDER BY created_at DESC
    LIMIT $1
  `, [limit]);
  return recentBatches.rows;
}

module.exports = {
  getDashboardStats,
  getRecentBatches,
};