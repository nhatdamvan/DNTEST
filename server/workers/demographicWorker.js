const { Worker } = require('bullmq');
const { getClient } = require('../config/database');
const connection = require('../queues/redisConnection');

const buffer = [];
const BATCH_SIZE = 5;  // Adjust batch size 

const worker = new Worker('demographic-averages', async job => {
  buffer.push(job.data);
  const totalRecords = buffer.reduce((sum, jobData) => sum + (jobData.records?.length || 0), 0);
  console.log('Received demographic averages job:', job.id, 'Total records in buffer:', totalRecords);

  if (totalRecords >= BATCH_SIZE) {
  let recordCount = 0;
  const batch = [];
  while (buffer.length && (recordCount < BATCH_SIZE || batch.length === 0)) {
    const jobData = buffer[0];
    const jobRecords = jobData.records?.length || 0;
    // Always take at least one job, even if it exceeds BATCH_SIZE
    if (recordCount + jobRecords <= BATCH_SIZE || batch.length === 0) {
      batch.push(buffer.shift());
      recordCount += jobRecords;
      console.log(`Added job with ${jobRecords} records to batch. Total in batch: ${recordCount}`);
    } else {
      break;
    }
  }
  if (batch.length > 0) {
    console.log(`Processing batch of ${batch.length} jobs with ${recordCount} total records.`);
    console.log('Batch details:', batch.map(b => ({ jobId: b.jobId, records: b.records.length })));
    await processBatchOfDemographics(batch);
  }
}
  
}, { connection, concurrency: 2 });

async function processBatchOfDemographics(batch) {
  const client = await getClient();
  try {
    const allRecords = batch.flatMap(jobData => jobData.records);

    console.log('All records:', allRecords.length, allRecords);

    // Define age groups
    const ageGroups = [ 
      { min: 10, max: 20, label: '10-20' },
      { min: 20, max: 30, label: '20-30' },
      { min: 30, max: 40, label: '30-40' },
      { min: 40, max: 50, label: '40-50' },
      { min: 50, max: 60, label: '50-60' },
      { min: 60, max: 200, label: '60+' }
    ];

    // Group records
    const groupMap = {};
    for (const rec of allRecords) {
      const ageGroup = ageGroups.find(g => rec.age >= g.min && rec.age < g.max)?.label || '60+';
      const location = rec.location || 'Unknown';
      const company_id = rec.company_id;
      const gender = rec.gender;
      const paramKeys = Object.keys(rec).filter(k => !['company_id', 'age', 'gender', 'location'].includes(k));
      console.log(`[DEBUG-Worker] Record ${rec.company_id} params:`, paramKeys);
      // no location filter
      for (const param of paramKeys) {
        const key = `${company_id}|${location}|${ageGroup}|${gender}|${param}`;
        if (!groupMap[key]) groupMap[key] = [];
        groupMap[key].push(Number(rec[param]));
        console.log(`[DEBUG-Worker] Added value for ${param}: ${rec[param]} to group ${key}`);
      }
    }

    // Prepare all group keys for batch SELECT
    const groupKeys = Object.keys(groupMap).map(key => key.split('|'));

    console.log('Group map keys:', Object.keys(groupMap));
    console.log('Group map values:', Object.values(groupMap).map(v => v.length));
    // 1. Fetch all existing averages in one query
    let existingMap = {};
    if (groupKeys.length > 0) {
      const res = await client.query(
        `SELECT company_id, location, age_group, gender, parameter_key, average_value, sample_size
         FROM demographic_averages
         WHERE (company_id, location, age_group, gender, parameter_key) IN (
           ${groupKeys.map((_, i) => `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`).join(',')}
         )`,
        groupKeys.flat()
      );
      for (const row of res.rows) {
        const key = `${row.company_id}|${row.location}|${row.age_group}|${row.gender}|${row.parameter_key}`;
        existingMap[key] = {
          average_value: Number(row.average_value) || 0,
          sample_size: Number(row.sample_size) || 0
        };
      }
    }

    // 2. Prepare all upserts
    const upsertValues = [];
    for (const key in groupMap) {
      const [company_id, location, age_group, gender, parameter_key] = key.split('|');
      const newValues = groupMap[key].filter(v => !isNaN(v));
        console.log('Key:', key, 'Values:', groupMap[key], 'Filtered:', newValues);

      if (newValues.length === 0) continue;

      const existing = existingMap[key] || { average_value: 0, sample_size: 0 };
      const totalSum = existing.average_value * existing.sample_size + newValues.reduce((a, b) => a + b, 0);
      const totalCount = existing.sample_size + newValues.length;
      const updatedAvg = totalCount > 0 ? totalSum / totalCount : 0;

      upsertValues.push([
        company_id, location, age_group, gender, parameter_key, updatedAvg, totalCount
      ]);
    }

    // 3. Batch upsert all values
    if (upsertValues.length > 0) {
      // Need to get parameter_id for each parameter_key
      const paramIdMap = {};
      const uniqueParamKeys = [...new Set(upsertValues.map(row => row[4]))];
      const paramResult = await client.query(
        'SELECT parameter_key, parameter_id FROM parameter_master WHERE parameter_key = ANY($1)',
        [uniqueParamKeys]
      );
      paramResult.rows.forEach(row => {
        paramIdMap[row.parameter_key] = row.parameter_id;
      });
      
      // Update upsertValues to include parameter_id
      const valuesWithParamId = upsertValues.map(row => [
        ...row.slice(0, 4), // company_id, location, age_group, gender
        row[4], // parameter_key
        paramIdMap[row[4]] || row[4], // parameter_id (fallback to key if not found)
        row[5], // average_value
        row[6]  // sample_size
      ]);
      
      const valueStrings = valuesWithParamId.map(
        (_, i) => `($${i * 8 + 1}, $${i * 8 + 2}, $${i * 8 + 3}, $${i * 8 + 4}, $${i * 8 + 5}, $${i * 8 + 6}, $${i * 8 + 7}, $${i * 8 + 8}, CURRENT_TIMESTAMP)`
      ).join(',');
      
      await client.query(
        `INSERT INTO demographic_averages
          (company_id, location, age_group, gender, parameter_key, parameter_id, average_value, sample_size, last_updated)
         VALUES ${valueStrings}
         ON CONFLICT (company_id, location, age_group, gender, parameter_id)
         DO UPDATE SET 
           parameter_key = EXCLUDED.parameter_key,
           average_value = EXCLUDED.average_value, 
           sample_size = EXCLUDED.sample_size, 
           last_updated = CURRENT_TIMESTAMP`,
        valuesWithParamId.flat()
      );
      console.log('Demographic averages calculated and updated for all groups', upsertValues.length);
    }

    console.log('Processed batch of demographic averages:', batch.map(b => b.jobId).join(', '));
    console.log('Total records processed:', upsertValues);
  } catch (err) {
    console.error('Demographic worker error:', err);
  } finally {
    client.release();
  }
}