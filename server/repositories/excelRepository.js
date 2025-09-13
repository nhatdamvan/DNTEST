const { query, getClient } = require('../config/database');

async function getParameterKeys() {
  const result = await query(`SELECT parameter_key FROM parameter_master ORDER BY parameter_priority, parameter_id`);
  return result.rows.map(row => row.parameter_key);
}

async function insertBatchUpload(client, batchId, filename, uploadedBy, totalRecords) {
  await client.query(`
    INSERT INTO batch_uploads (batch_id, filename, uploaded_by, total_records)
    VALUES ($1, $2, $3, $4)
  `, [batchId, filename, uploadedBy, totalRecords]);
}

async function insertBatchRecord(client, columns, values) {
  const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
  await client.query(
    `INSERT INTO batch_records (${columns.join(', ')}) VALUES (${placeholders})`,
    values
  );
}

async function updateBatchStatus(client, batchId, validCount, errorCount) {
  await client.query(`
    UPDATE batch_uploads
    SET status = 'validated', valid_records = $2, error_records = $3, updated_at = CURRENT_TIMESTAMP
    WHERE batch_id = $1
  `, [batchId, validCount, errorCount]);
}

async function getParameterTemplateData() {
  const result = await query(`
    SELECT 
      parameter_key, 
      unit, 
      reference_min, 
      reference_max,
      parameter_priority,
      parameter_id
    FROM parameter_master
    ORDER BY parameter_priority, parameter_id
  `);
  return result.rows;
}

function normalizeRecords(records, columns) {
  if (records.length === 0) return [];
  // If first record is already an object, assume all are
  if (typeof records[0] === 'object' && !Array.isArray(records[0])) return records;
  // Otherwise, map arrays to objects
  return records.map(arr =>
    Object.fromEntries(columns.map((col, idx) => [col, arr[idx]]))
  );
}

async function insertBatchRecordsBulk(client, records) {
  const columns = [
    'batch_id', 'row_number', 'employee_id', 'name', 'date_of_birth', 'gender', 'email', 'phone',
    'test_date', 'company_id', 'location', 'validation_status', 'validation_message',
    'parameter_name', 'parameter_value'
  ];
  // Normalize records to objects with named keys
  records = normalizeRecords(records, columns);

  records = records.map(record => ({
    ...record,
    date_of_birth: convertDate(record.date_of_birth),
    test_date: convertDate(record.test_date)
  }));

  console.log(`Inserting ${records.length} records in batch...`);
  if (records.length === 0) return;
  const BATCH_SIZE = 500;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    console.log('First record:', records[0]);
    console.log('Expected columns:', columns);
    const batch = records.slice(i, i + BATCH_SIZE);
    const valuePlaceholders = batch.map(
      (_, rowIdx) => `(${columns.map((_, colIdx) => `$${rowIdx * columns.length + colIdx + 1}`).join(', ')})`
    ).join(', ');
    const flatValues = batch.flatMap(record => columns.map(col => record[col]));
    console.log(`Inserting batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(records.length / BATCH_SIZE)}`);
    console.log(`Batch size: ${batch.length}`);
    console.log(`Values:`, flatValues.slice(0, 10)); // Log first 10 values for debugging
    console.log(`Total values: ${flatValues.length}`);
    try {
      await client.query(
        `INSERT INTO batch_records (${columns.join(', ')}) VALUES ${valuePlaceholders}`,
        flatValues
      );
    } catch (err) {
      console.error('Error inserting batch_records:', err);
      throw err; // rethrow if you want to stop on error
    }
  }
}


function convertDate(dateStr) {
  // Converts 'DD/MM/YYYY' to 'YYYY-MM-DD'
  if (!dateStr || typeof dateStr !== 'string') return dateStr;
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return dateStr;
}

// async function insertBatchRecordsBulk(client, records) {
//   if (records.length === 0) return;
//   const columns = [
//     'batch_id', 'row_number', 'employee_id', 'name', 'date_of_birth', 'gender', 'email', 'phone',
//     'test_date', 'company_id', 'validation_status', 'validation_message',
//     'parameter_name', 'parameter_value'
//   ];
//   const valuePlaceholders = records.map(
//     (_, i) => `(${columns.map((_, j) => `$${i * columns.length + j + 1}`).join(', ')})`
//   ).join(', ');
//   const flatValues = records.flatMap(record => columns.map(col => record[col]));
//   await client.query(
//     `INSERT INTO batch_records (${columns.join(', ')}) VALUES ${valuePlaceholders}`,
//     flatValues
//   );
// }

// async function insertBatchRecordsBulk(client, records) {
//   console.log(`Inserting ${records.length} records in batch...`);
//   if (records.length === 0) return;
//   const columns = [
//     'batch_id', 'row_number', 'employee_id', 'name', 'date_of_birth', 'gender', 'email', 'phone',
//     'test_date', 'company_id', 'validation_status', 'validation_message',
//     'parameter_name', 'parameter_value'
//   ];
//   const BATCH_SIZE = 500;
//   for (let i = 0; i < records.length; i += BATCH_SIZE) {
//     console.log('First record:', records[0]);
//     console.log('Expected columns:', columns);
//     const batch = records.slice(i, i + BATCH_SIZE);
//     const valuePlaceholders = batch.map(
//       (_, rowIdx) => `(${columns.map((_, colIdx) => `$${rowIdx * columns.length + colIdx + 1}`).join(', ')})`
//     ).join(', ');
//     const flatValues = batch.flatMap(record => columns.map(col => record[col]));
//     console.log(`Inserting batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(records.length / BATCH_SIZE)}`);
//     console.log(`Batch size: ${batch.length}`);
//     console.log(`Values:`, flatValues.slice(0, 10)); // Log first 10 values for debugging
//     console.log(`Total values: ${flatValues.length}`);
//     try {
//       await client.query(
//         `INSERT INTO batch_records (${columns.join(', ')}) VALUES ${valuePlaceholders}`,
//         flatValues
//       );
//     } catch (err) {
//       console.error('Error inserting batch_records:', err);
//       throw err; // rethrow if you want to stop on error
//     }
//   }
// }

async function getUserReportCount(userId, client) {
  const result = await client.query(
    'SELECT COUNT(*) as count FROM user_reports WHERE user_id = $1',
    [userId]
  );
  return parseInt(result.rows[0].count);
}

async function getCompanyById(companyId, client) {
  const result = await client.query(
    'SELECT * FROM companies WHERE company_id = $1',
    [companyId]
  );
  return result.rows[0];
}

async function getParametersByIds(parameterIds) {
  const result = await query(`
    SELECT 
      parameter_key, 
      unit, 
      reference_min, 
      reference_max,
      parameter_priority,
      parameter_id
    FROM parameter_master
    WHERE parameter_id = ANY($1)
    ORDER BY parameter_priority, parameter_id
  `, [parameterIds]);
  return result.rows;
}

async function getParametersByCategories(categoryIds) {
  const result = await query(`
    SELECT DISTINCT
      pm.parameter_key, 
      pm.unit, 
      pm.reference_min, 
      pm.reference_max,
      pm.parameter_priority,
      pm.parameter_id
    FROM parameter_master pm
    JOIN parameter_category_mappings pcm ON pm.parameter_id = pcm.parameter_id
    WHERE pcm.category_id = ANY($1)
    ORDER BY pm.parameter_priority, pm.parameter_id
  `, [categoryIds]);
  return result.rows;
}

module.exports = {
  getParameterKeys,
  insertBatchUpload,
  insertBatchRecord,
  updateBatchStatus,
  getParameterTemplateData,
  insertBatchRecordsBulk,
  getUserReportCount,
  getCompanyById,
  getParametersByIds,
  getParametersByCategories
};