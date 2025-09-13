const { query } = require('../config/database');

// Check if V2 calculation is available
let healthIndexV2;
try {
  healthIndexV2 = require('./healthIndexV2');
} catch (err) {
  console.log('[HealthCalculations] V2 not available, using legacy calculation');
}

async function calculateHealthScore(parameters, gender = null, userId = null) {
  // If V2 is available and configured, use it
  if (healthIndexV2) {
    try {
      const hiConfigCheck = await query('SELECT COUNT(*) FROM health_index_parameters WHERE is_active = true AND include_in_index = true');
      if (parseInt(hiConfigCheck.rows[0].count) > 0) {
        console.log('[HealthCalculations] Using V2 calculation');
        return await healthIndexV2.calculateHealthScore(parameters, gender, userId);
      }
    } catch (err) {
      console.log('[HealthCalculations] V2 check failed, falling back to legacy');
    }
  }

  // Legacy calculation
  console.log('[HealthCalculations] Using legacy calculation');
  
  // Convert parameter names to IDs
  const employeeParameters = {};
  
  try {
    const paramMasterRows = await query('SELECT parameter_id, parameter_key FROM parameter_master');
    const textToKeyMap = {};
    
    for (const row of paramMasterRows.rows) {
      textToKeyMap[row.parameter_key] = row.parameter_id;
    }
    
    for (const [displayName, value] of Object.entries(parameters)) {
      const key = textToKeyMap[displayName];
      if (key && value) {
        employeeParameters[key] = value;
      }
    }
  } catch (err) {
    console.error('Error processing parameters for health score:', err);
  }
  
  return await calculateHealthIndex(employeeParameters);
}

async function calculateHealthIndex(inputData) {
  let healthIndex = 1000;
  const penalties = [];

  // Fetch rules
  const penaltyRulesRes = await query('SELECT * FROM health_penalty_rules');
  const conditionRulesRes = await query('SELECT * FROM health_condition_rules');
  const safetyRulesRes = await query('SELECT * FROM health_safety_rules');

  // Group penalty rules
  const grouped = {};
  for (const rule of penaltyRulesRes.rows) {
    if (!grouped[rule.parameter_id]) grouped[rule.parameter_id] = [];
    grouped[rule.parameter_id].push(rule);
  }

  // Apply penalty rules
  for (const pid in inputData) {
    const value = parseFloat(inputData[pid]);
    if (grouped[pid] && !isNaN(value)) {
      const points = applyPenaltyRules(value, grouped[pid]);
      if (points > 0) {
        healthIndex -= points;
        penalties.push({ parameter_id: pid, value, points });
      }
    }
  }

  // Apply condition rules
  for (const rule of conditionRulesRes.rows) {
    let conditionExpr = rule.condition.replace(/(P\d+)/g, (match) => inputData[match] ?? 'null');
    conditionExpr = conditionExpr.replace(/\bAND\b/gi, '&&').replace(/\bOR\b/gi, '||');

    try {
      if (eval(conditionExpr)) {
        healthIndex -= rule.penalty_points;
        penalties.push({ condition: rule.rule_name, points: rule.penalty_points });
      }
    } catch (e) {
      console.error('Error evaluating condition:', e);
    }
  }

  return Math.max(0, healthIndex);
}

function applyPenaltyRules(value, rules) {
  for (const rule of rules) {
    if (rule.direction === 'above' && value > rule.range_start && value <= rule.range_end) return rule.penalty_points;
    if (rule.direction === 'below' && value < rule.range_end && value >= rule.range_start) return rule.penalty_points;
    if (rule.direction === 'range' && value >= rule.range_start && value <= rule.range_end) return rule.penalty_points;
  }
  return 0;
}

async function calculateBiologicalAge(chronologicalAge, gender, parameters, testDate) {
  // If insufficient parameters, return chronological age
  if (!parameters || Object.keys(parameters).length < 6) {
    return chronologicalAge;
  }
  
  const now = new Date();
  const testDt = new Date(testDate);
  const monthsOld = (now - testDt) / (1000 * 60 * 60 * 24 * 30);

  // If data is outdated, return chronological age
  if (monthsOld > 3) {
    return chronologicalAge;
  }

  let totalPenalty = 0;
  
  // Convert parameter names to IDs
  const employeeParameters = {};
  try {
    const paramMasterRows = await query('SELECT parameter_id, parameter_key FROM parameter_master');
    const textToKeyMap = {};
    
    for (const row of paramMasterRows.rows) {
      textToKeyMap[row.parameter_key] = row.parameter_id;
    }
    
    for (const [displayName, value] of Object.entries(parameters)) {
      const key = textToKeyMap[displayName];
      if (key && value) {
        employeeParameters[key] = value;
      }
    }
  } catch (err) {
    console.error('Error processing parameters for biological age:', err);
  }

  // Calculate penalties based on bio age rules
  for (const paramId in employeeParameters) {
    const value = Number(employeeParameters[paramId]);
    if (value <= 0) continue;
    
    // Fetch parameter reference range
    const paramRes = await query(
      `SELECT * FROM parameter_master WHERE parameter_id = $1`,
      [paramId]
    );

    if (paramRes.rows.length === 0) continue;
    const param = paramRes.rows[0];

    // Get gender-specific reference ranges
    let refMin, refMax;
    if (gender && gender.toUpperCase() === 'MALE') {
      refMin = param.reference_min_male !== null ? parseFloat(param.reference_min_male) : parseFloat(param.reference_min);
      refMax = param.reference_max_male !== null ? parseFloat(param.reference_max_male) : parseFloat(param.reference_max);
    } else if (gender && gender.toUpperCase() === 'FEMALE') {
      refMin = param.reference_min_female !== null ? parseFloat(param.reference_min_female) : parseFloat(param.reference_min);
      refMax = param.reference_max_female !== null ? parseFloat(param.reference_max_female) : parseFloat(param.reference_max);
    } else {
      refMin = parseFloat(param.reference_min);
      refMax = parseFloat(param.reference_max);
    }

    // Fetch rules
    const rulesRes = await query(
      `SELECT * FROM bio_age_rules WHERE parameter_id = $1`,
      [paramId]
    );
    
    for (const rule of rulesRes.rows) {
      if (rule.gender && rule.gender !== gender) continue;

      const { direction, range_start, range_end, penalty_years } = rule;
      const numRangeStart = Number(range_start);
      const numRangeEnd = Number(range_end);
      const numPenaltyYears = Number(penalty_years);

      let isMatch = false;
      let deviationPercent = 0;

      if (direction === 'above' && value > refMax) {
        const diff = value - refMax;
        deviationPercent = (diff / refMax) * 100;
        isMatch = deviationPercent >= numRangeStart && deviationPercent <= numRangeEnd;
      } else if (direction === 'below' && value < refMin) {
        const diff = refMin - value;
        deviationPercent = (diff / refMin) * 100;
        isMatch = deviationPercent >= numRangeStart && deviationPercent <= numRangeEnd;
      } else if (direction === 'range') {
        isMatch = value >= numRangeStart && value <= numRangeEnd;
      } else if (direction === 'both') {
        const deviation = value < refMin
          ? (refMin - value) / refMin * 100
          : (value - refMax) / refMax * 100;
        isMatch = deviation >= numRangeStart && deviation <= numRangeEnd;
      }

      if (isMatch) {
        totalPenalty += numPenaltyYears;
        break;
      }
    }
  }

  // Apply max cap of 15 years
  if (totalPenalty > 15) {
    totalPenalty = 15;
  }

  // Bio age ≤ Chrono + 20
  const biologicalAge = Math.min(chronologicalAge + totalPenalty, chronologicalAge + 20);

  return (typeof biologicalAge === 'number' && !isNaN(biologicalAge)) ? biologicalAge : chronologicalAge;
}

module.exports = {
  calculateHealthScore,
  calculateBiologicalAge
};