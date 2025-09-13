const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Local PostgreSQL configuration
const localConfig = {
  host: 'localhost',
  port: 5432,
  database: 'smart_report',
  user: 'turbo',
  password: ''
};

// Tables to export in order (respecting foreign key constraints)
const tablesToExport = [
  'companies',
  'users',
  'email_verifications',
  'user_reports',
  'parameter_categories',
  'health_categories',
  'lab_parameters',
  'risk_assessments',
  'parameter_master',
  'batch_uploads',
  'batch_records',
  'corporate_users',
  'parameter_category_mappings',
  'corporate_health_metrics',
  'demographic_averages'
];

async function exportLocalData() {
  const localPool = new Pool(localConfig);
  
  try {
    console.log('📤 Exporting data from local PostgreSQL...\n');
    
    const exportData = {};
    const client = await localPool.connect();
    
    // Export each table
    for (const table of tablesToExport) {
      try {
        const result = await client.query(`SELECT * FROM ${table}`);
        exportData[table] = result.rows;
        console.log(`✅ Exported ${table}: ${result.rows.length} rows`);
      } catch (err) {
        console.log(`⚠️  Skipped ${table}: ${err.message}`);
        exportData[table] = [];
      }
    }
    
    // Get sequences current values
    console.log('\n📊 Exporting sequences...');
    const sequences = {};
    const seqQuery = `
      SELECT sequence_name, last_value 
      FROM information_schema.sequences 
      WHERE sequence_schema = 'public'
    `;
    
    try {
      const seqResult = await client.query(seqQuery);
      for (const seq of seqResult.rows) {
        sequences[seq.sequence_name] = seq.last_value;
      }
      console.log(`✅ Exported ${Object.keys(sequences).length} sequences`);
    } catch (err) {
      console.log('⚠️  Could not export sequences:', err.message);
    }
    
    exportData._sequences = sequences;
    
    // Save to file
    const exportPath = path.join(__dirname, 'data-export.json');
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
    
    console.log(`\n💾 Data exported to: ${exportPath}`);
    console.log(`📦 Total size: ${(fs.statSync(exportPath).size / 1024).toFixed(2)} KB`);
    
    // Summary
    console.log('\n📊 Export Summary:');
    let totalRecords = 0;
    for (const [table, data] of Object.entries(exportData)) {
      if (table !== '_sequences' && data.length > 0) {
        console.log(`   ${table}: ${data.length} records`);
        totalRecords += data.length;
      }
    }
    console.log(`\n   Total records: ${totalRecords}`);
    
    client.release();
    await localPool.end();
    
    console.log('\n✅ Export complete!');
    
  } catch (error) {
    console.error('❌ Export failed:', error.message);
    await localPool.end();
  }
}

exportLocalData();