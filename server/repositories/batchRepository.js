const { getClient, query } = require('../config/database');

async function updateBatchStatus(batchId, status, approvedBy) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query(`
      UPDATE batch_uploads 
      SET status = $2, approved_by = $3, approved_at = CURRENT_TIMESTAMP
      WHERE batch_id = $1
    `, [batchId, status, approvedBy]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getValidBatchRecords(batchId) {
  const result = await query(`
    SELECT * FROM batch_records 
    WHERE batch_id = $1 AND validation_status = 'valid'
    ORDER BY row_number
  `, [batchId]);
  return result.rows;
}

async function getBatchById(batchId) {
  const result = await query(`SELECT * FROM batch_uploads WHERE batch_id = $1`, [batchId]);
  return result.rows[0] || null;
}

async function getParameterKeys() {
  const result = await query(`SELECT parameter_key FROM parameter_master ORDER BY parameter_priority, parameter_id`);
  return result.rows.map(row => row.parameter_key);
}

async function getBatchRecords(batchId, limit = 100) {
  const result = await query(
    `SELECT * FROM batch_records WHERE batch_id = $1 ORDER BY row_number LIMIT $2`,
    [batchId, limit]
  );
  return result.rows;
}

async function getRecentBatches(limit = 50) {
  const result = await query(
    `SELECT 
      bu.*,
      (SELECT DISTINCT company_id 
       FROM batch_records br 
       WHERE br.batch_id = bu.batch_id 
       LIMIT 1) as company_id
    FROM batch_uploads bu 
    ORDER BY bu.created_at DESC 
    LIMIT $1`,
    [limit]
  );
  return result.rows;
}

async function rejectBatch(batchId, reason) {
  await query(`
    UPDATE batch_uploads 
    SET status = 'rejected', 
        error_details = jsonb_build_object('rejection_reason', $2::text),
        updated_at = CURRENT_TIMESTAMP
    WHERE batch_id = $1
  `, [batchId, reason || 'Rejected by admin']);
}

module.exports = {
  updateBatchStatus,
  getValidBatchRecords,
  getBatchById,
  getParameterKeys,
  getBatchRecords,
  getRecentBatches,
  rejectBatch
};