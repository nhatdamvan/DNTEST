const { query } = require('../config/database');

const getUserWithLatestReport = async (userId) => {
  const result = await query(`
    SELECT u.*, ur.report_id, ur.test_date
    FROM users u
    LEFT JOIN user_reports ur ON u.user_id = ur.user_id
    WHERE u.user_id = $1
    ORDER BY ur.test_date DESC
    LIMIT 1
  `, [userId]);
  return result.rows[0];
};

const getLabParameters = async (reportId) => {
  const result = await query(`
    SELECT parameter_name, parameter_value
    FROM lab_parameters
    WHERE report_id = $1
  `, [reportId]);
  return result.rows;
};

const saveRiskAssessment = async (reportId, riskType, riskPercentage, riskLevel, timeframe, factors) => {
  await query(
    `INSERT INTO risk_assessments (report_id, risk_type, risk_percentage, risk_level, timeframe, factors, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [reportId, riskType, riskPercentage, riskLevel, timeframe, JSON.stringify(factors)]
  );
};

const getLatestRiskAssessment = async (reportId, riskType) => {
  const result = await query(`
    SELECT risk_percentage, created_at
    FROM risk_assessments
    WHERE report_id = $1 AND risk_type = $2
    ORDER BY created_at DESC
    LIMIT 1
  `, [reportId, riskType]);
  return result.rows[0];
};

module.exports = {
  getUserWithLatestReport,
  getLabParameters,
  saveRiskAssessment,
  getLatestRiskAssessment
};