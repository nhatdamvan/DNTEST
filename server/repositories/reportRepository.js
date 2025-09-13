const { query } = require('../config/database');

const getUserWithLatestReport = async (userId) => {
  const result = await query(`
    SELECT u.*, ur.report_id, ur.health_score, ur.biological_age, ur.test_date
    FROM users u
    LEFT JOIN user_reports ur ON u.user_id = ur.user_id
    WHERE u.user_id = $1
    ORDER BY ur.test_date DESC
    LIMIT 1
  `, [userId]);
  return result.rows[0];
};

const getUserWithSpecificReport = async (userId, reportId) => {
  const result = await query(`
    SELECT u.*, ur.report_id, ur.health_score, ur.biological_age, ur.test_date
    FROM users u
    LEFT JOIN user_reports ur ON u.user_id = ur.user_id
    WHERE u.user_id = $1 AND ur.report_id = $2
  `, [userId, reportId]);
  return result.rows[0];
};

const getAllUserReports = async (userId) => {
  const result = await query(`
    SELECT report_id, health_score, biological_age, test_date, created_at
    FROM user_reports
    WHERE user_id = $1
    ORDER BY test_date DESC, created_at DESC
  `, [userId]);
  return result.rows;
};

const getCategories = async (reportId) => {
  const result = await query(`
    SELECT 
      pc.id as category_id,
      pc.category_key,
      pc.category_name,
      pc.category_name_vi,
      pc.icon,
      pc.color,
      pc.display_order,
      COUNT(DISTINCT lp.id) as tested_parameters,
      COUNT(DISTINCT CASE WHEN lp.status = 'Normal' THEN lp.id END) as normal_parameters,
      COUNT(DISTINCT pcm.parameter_id) as total_parameters_in_category,
      CASE 
        WHEN COUNT(DISTINCT lp.id) > 0 
        THEN ROUND(COUNT(DISTINCT CASE WHEN lp.status = 'Normal' THEN lp.id END)::numeric / COUNT(DISTINCT lp.id)::numeric * 100)
        ELSE 0 
      END as percentage_normal
    FROM parameter_categories pc
    LEFT JOIN parameter_category_mappings pcm ON pc.id = pcm.category_id
    LEFT JOIN parameter_master pm ON pcm.parameter_id = pm.parameter_id
    LEFT JOIN lab_parameters lp ON lp.report_id = $1 AND POSITION(lp.parameter_name IN pm.parameter_text_mapping) > 0
    WHERE pc.is_active = true
    GROUP BY pc.id, pc.category_key, pc.category_name, pc.category_name_vi, pc.icon, pc.color, pc.display_order
    HAVING COUNT(DISTINCT lp.id) > 0
    ORDER BY pc.display_order
  `, [reportId]);
  return result.rows;
};

const getCategoryParameters = async (reportId) => {
  const result = await query(`
    SELECT DISTINCT ON (pc.id, lp.id)
      pc.id as category_id,
      pc.category_name,
      pc.category_name_vi,
      lp.id as lab_parameter_id,
      pm.parameter_id as parameter_id,
      lp.parameter_name,
      lp.parameter_value,
      lp.unit,
      lp.reference_min,
      lp.reference_max,
      lp.status,
      pm.parameter_text_mapping as display_name,
      pm.parameter_priority,
      pm.parameter_key as master_parameter_key,
      pm.parameter_key_vi as master_parameter_key_vi,
      u.gender,
      CASE 
        WHEN u.gender = 'Male' AND pm.reference_min_male IS NOT NULL 
          THEN pm.reference_min_male
        WHEN u.gender = 'Female' AND pm.reference_min_female IS NOT NULL 
          THEN pm.reference_min_female
        ELSE lp.reference_min
      END as display_reference_min,
      CASE 
        WHEN u.gender = 'Male' AND pm.reference_max_male IS NOT NULL 
          THEN pm.reference_max_male
        WHEN u.gender = 'Female' AND pm.reference_max_female IS NOT NULL 
          THEN pm.reference_max_female
        ELSE lp.reference_max
      END as display_reference_max
    FROM parameter_categories pc
    INNER JOIN parameter_category_mappings pcm ON pc.id = pcm.category_id
    INNER JOIN parameter_master pm ON pcm.parameter_id = pm.parameter_id
    INNER JOIN lab_parameters lp ON lp.report_id = $1 AND POSITION(lp.parameter_name IN pm.parameter_text_mapping) > 0
    INNER JOIN user_reports ur ON ur.report_id = lp.report_id
    INNER JOIN users u ON u.user_id = ur.user_id
    WHERE pc.is_active = true
    ORDER BY pc.id, lp.id, pm.parameter_priority, lp.parameter_name
  `, [reportId]);
  
  console.log(`\n[DEBUG-getCategoryParameters] === DETAILED PARAMETER MAPPING ===`);
  console.log(`[DEBUG-getCategoryParameters] Report ID: ${reportId}`);
  console.log(`[DEBUG-getCategoryParameters] Total parameters found: ${result.rows.length}`);
  console.log('[DEBUG-getCategoryParameters] All parameters with keys:');
  result.rows.forEach((p, idx) => {
    console.log(`  [${idx + 1}] Category: ${p.category_name}`);
    console.log(`      Lab Parameter Name: "${p.parameter_name}"`);
    console.log(`      Master Parameter ID: "${p.parameter_id}"`);
    console.log(`      Master Parameter Key: "${p.master_parameter_key}"`);
    console.log(`      Text Mapping (display): "${p.display_name}"`);
    console.log(`      Value: ${p.parameter_value} ${p.unit}`);
    console.log(`      Status: ${p.status}`);
  });
  console.log(`[DEBUG-getCategoryParameters] === END PARAMETER MAPPING ===\n`);
  
  return result.rows;
};

const getTopMetrics = async (reportId) => {
  const result = await query(`
    SELECT 
      lp.parameter_name,
      lp.parameter_value,
      lp.unit,
      lp.status,
      pm.parameter_key,
      pm.parameter_key_vi,
      pm.parameter_priority
    FROM lab_parameters lp
    LEFT JOIN parameter_master pm ON lp.parameter_name = pm.parameter_id
    WHERE lp.report_id = $1
    ORDER BY pm.parameter_priority, lp.parameter_name
    LIMIT 3
  `, [reportId]);
  return result.rows;
};

const getParameters = async (reportId) => {
  const result = await query(`
    SELECT * FROM lab_parameters 
    WHERE report_id = $1
    ORDER BY parameter_name
  `, [reportId]);
  return result.rows;
};

const getRisks = async (reportId) => {
  const result = await query(`
    SELECT * FROM risk_assessments
    WHERE report_id = $1
    ORDER BY risk_percentage DESC
  `, [reportId]);
  return result.rows;
};

const getHraCompleted = async (reportId) => {
  const result = await query(`
    SELECT COUNT(DISTINCT risk_type) as count
    FROM risk_assessments
    WHERE report_id = $1 AND risk_type IN ('CVD', 'Diabetes', 'Hypertension')
  `, [reportId]);
  return result.rows[0]?.count || 0;
};

const getPeerAverage = async (companyId) => {
  const result = await query(`
    SELECT AVG(ur.health_score) AS avg_health_score
    FROM user_reports ur
    JOIN users u ON ur.user_id = u.user_id
    WHERE u.company_id = $1
  `, [companyId]);
  return result.rows[0]?.avg_health_score;
};

const getPastHealthScore = async (userId) => {
  const result = await query(`
    SELECT health_score
    FROM user_reports
    WHERE user_id = $1
      AND test_date < (CURRENT_DATE - INTERVAL '1 year')
    ORDER BY test_date DESC
    LIMIT 1;
  `, [userId]);
  return result.rows[0]?.health_score;
};

const getNationalAverage = async (location) => {
  const result = await query(`
    SELECT AVG(ur.health_score) AS avg_health_score
    FROM user_reports ur
    JOIN users u ON ur.user_id = u.user_id
  `);
  return result.rows[0]?.avg_health_score;
};

const getParamAverages = async (companyId, location, ageGroup, gender) => {
  console.log('\n[DEBUG-getParamAverages] === DEMOGRAPHIC AVERAGES QUERY ===');
  console.log('[DEBUG-getParamAverages] Query parameters:', {
    companyId,
    location,
    ageGroup,
    gender
  });
  
  const result = await query(`
    SELECT 
      parameter_id,
      parameter_key,
      average_value,
      sample_size
    FROM demographic_averages
    WHERE company_id = $1 AND location = $2 AND age_group = $3 AND gender = $4
    ORDER BY parameter_key
  `, [companyId, location, ageGroup, gender]);

  console.log(`[DEBUG-getParamAverages] Query returned ${result.rows.length} averages`);
  console.log('[DEBUG-getParamAverages] All averages in detail:');
  result.rows.forEach((r, idx) => {
    console.log(`  [${idx + 1}] Parameter ID: "${r.parameter_id}" | Key: "${r.parameter_key}"`);
    console.log(`      Average Value: ${r.average_value}`);
    console.log(`      Sample Size: ${r.sample_size}`);
  });
  
  // Check for common parameters
  const commonParams = ['hba1c', 'systolic_bp', 'diastolic_bp', 'hemoglobin', 'cholesterol_total'];
  console.log('[DEBUG-getParamAverages] Checking for common parameters:');
  commonParams.forEach(param => {
    const found = result.rows.find(r => r.parameter_key === param);
    if (found) {
      console.log(`  ✓ ${param}: ${found.average_value} (n=${found.sample_size})`);
    } else {
      console.log(`  ✗ ${param}: NOT FOUND`);
    }
  });
  console.log('[DEBUG-getParamAverages] === END AVERAGES QUERY ===\n');
  
  return result.rows;
};

// *NOTE
// last year data of user parameter wise 
// nation avg from demographic_averages table

const getLabParams = async (reportId) => {
  const result = await query(`
    SELECT parameter_name, parameter_value
    FROM lab_parameters
    WHERE report_id = $1
  `, [reportId]);
  return result.rows;
};

module.exports = {
  getUserWithLatestReport,
  getUserWithSpecificReport,
  getAllUserReports,
  getCategories,
  getCategoryParameters,
  getTopMetrics,
  getParameters,
  getRisks,
  getHraCompleted,
  getPeerAverage,
  getPastHealthScore,
  getNationalAverage,
  getParamAverages,
  getLabParams
};