const { query } = require('../server/config/database');

async function calculateInitialAverages() {
  console.log('Starting initial demographic averages calculation...');
  
  try {
    // First, get all existing lab parameters with user demographic info
    const result = await query(`
      SELECT 
        u.company_id,
        u.location,
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, u.date_of_birth)) as age,
        u.gender,
        lp.parameter_name,
        lp.parameter_value::numeric,
        lp.unit
      FROM lab_parameters lp
      JOIN user_reports ur ON lp.report_id = ur.report_id
      JOIN users u ON ur.user_id = u.user_id
      WHERE lp.parameter_value IS NOT NULL 
        AND u.company_id IS NOT NULL
        AND u.date_of_birth IS NOT NULL
    `);
    
    console.log(`Found ${result.rows.length} parameters to process`);
    
    // Define age groups
    const ageGroups = [
      { min: 10, max: 20, label: '10-20' },
      { min: 20, max: 30, label: '20-30' },
      { min: 30, max: 40, label: '30-40' },
      { min: 40, max: 50, label: '40-50' },
      { min: 50, max: 60, label: '50-60' },
      { min: 60, max: 200, label: '60+' }
    ];
    
    // Group data by demographics
    const groupedData = {};
    
    for (const row of result.rows) {
      const age = parseInt(row.age) || 0;
      const ageGroup = ageGroups.find(g => age >= g.min && age < g.max)?.label || '60+';
      const location = row.location || 'Unknown';
      const company_id = row.company_id;
      const gender = row.gender || 'Unknown';
      const parameterKey = row.parameter_name;
      const value = parseFloat(row.parameter_value);
      
      if (isNaN(value)) continue;
      
      // Create key for grouping
      const key = `${company_id}|${location}|${ageGroup}|${gender}|${parameterKey}`;
      
      if (!groupedData[key]) {
        groupedData[key] = {
          company_id,
          location,
          age_group: ageGroup,
          gender,
          parameter_key: parameterKey,
          values: []
        };
      }
      
      groupedData[key].values.push(value);
    }
    
    console.log(`Created ${Object.keys(groupedData).length} demographic groups`);
    
    // Calculate averages and insert into database
    let inserted = 0;
    for (const key in groupedData) {
      const group = groupedData[key];
      const values = group.values;
      
      if (values.length === 0) continue;
      
      const average = values.reduce((a, b) => a + b, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      
      await query(`
        INSERT INTO demographic_averages 
          (company_id, location, age_group, gender, parameter_key, average_value, min_value, max_value, sample_size, last_updated)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
        ON CONFLICT (company_id, location, age_group, gender, parameter_key)
        DO UPDATE SET 
          average_value = EXCLUDED.average_value,
          min_value = EXCLUDED.min_value,
          max_value = EXCLUDED.max_value,
          sample_size = EXCLUDED.sample_size,
          last_updated = CURRENT_TIMESTAMP
      `, [
        group.company_id,
        group.location,
        group.age_group,
        group.gender,
        group.parameter_key,
        average,
        min,
        max,
        values.length
      ]);
      
      inserted++;
      if (inserted % 10 === 0) {
        console.log(`Inserted ${inserted} averages...`);
      }
    }
    
    console.log(`Successfully calculated and inserted ${inserted} demographic averages`);
    
    // Also calculate country-level averages (across all companies)
    console.log('Calculating country-level averages...');
    
    const countryResult = await query(`
      SELECT 
        'ALL' as company_id,
        'India' as location,
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, u.date_of_birth)) as age,
        u.gender,
        lp.parameter_name,
        lp.parameter_value::numeric
      FROM lab_parameters lp
      JOIN user_reports ur ON lp.report_id = ur.report_id
      JOIN users u ON ur.user_id = u.user_id
      WHERE lp.parameter_value IS NOT NULL 
        AND u.date_of_birth IS NOT NULL
    `);
    
    // Group country-level data
    const countryGroupedData = {};
    
    for (const row of countryResult.rows) {
      const age = parseInt(row.age) || 0;
      const ageGroup = ageGroups.find(g => age >= g.min && age < g.max)?.label || '60+';
      const gender = row.gender || 'Unknown';
      const parameterKey = row.parameter_name;
      const value = parseFloat(row.parameter_value);
      
      if (isNaN(value)) continue;
      
      const key = `ALL|India|${ageGroup}|${gender}|${parameterKey}`;
      
      if (!countryGroupedData[key]) {
        countryGroupedData[key] = {
          values: []
        };
      }
      
      countryGroupedData[key].values.push(value);
    }
    
    // Insert country-level averages
    let countryInserted = 0;
    for (const key in countryGroupedData) {
      const [company_id, location, age_group, gender, parameter_key] = key.split('|');
      const values = countryGroupedData[key].values;
      
      if (values.length === 0) continue;
      
      const average = values.reduce((a, b) => a + b, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      
      await query(`
        INSERT INTO demographic_averages 
          (company_id, location, age_group, gender, parameter_key, average_value, min_value, max_value, sample_size, last_updated)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
        ON CONFLICT (company_id, location, age_group, gender, parameter_key)
        DO UPDATE SET 
          average_value = EXCLUDED.average_value,
          min_value = EXCLUDED.min_value,
          max_value = EXCLUDED.max_value,
          sample_size = EXCLUDED.sample_size,
          last_updated = CURRENT_TIMESTAMP
      `, [company_id, location, age_group, gender, parameter_key, average, min, max, values.length]);
      
      countryInserted++;
    }
    
    console.log(`Successfully calculated and inserted ${countryInserted} country-level averages`);
    
    // Show summary
    const summary = await query(`
      SELECT 
        COUNT(*) as total_averages,
        COUNT(DISTINCT company_id) as companies,
        COUNT(DISTINCT parameter_key) as parameters,
        COUNT(DISTINCT age_group) as age_groups,
        COUNT(DISTINCT gender) as genders
      FROM demographic_averages
    `);
    
    console.log('\n=== Summary ===');
    console.log('Total averages:', summary.rows[0].total_averages);
    console.log('Companies:', summary.rows[0].companies);
    console.log('Parameters:', summary.rows[0].parameters);
    console.log('Age groups:', summary.rows[0].age_groups);
    console.log('Genders:', summary.rows[0].genders);
    
  } catch (error) {
    console.error('Error calculating averages:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the calculation
calculateInitialAverages();