const { query } = require('../config/database');

/**
 * Health Index V2 - Percentage-based calculation engine
 * Version: HI_v2_2025_08
 */

// Safety flag thresholds
const SAFETY_FLAGS = {
  CRP: { threshold: 50, unit: 'mg/L' },
  HbA1c: { threshold: 10, unit: '%' },
  FPG: { threshold: 250, unit: 'mg/dL' },
  LDL: { threshold: 250, unit: 'mg/dL' },
  HEALTH_SCORE: { threshold: 400 }
};

/**
 * Calculate Health Index using new percentage-based method
 * @param {Object} parameters - Lab parameter values keyed by parameter_id
 * @param {String} gender - MALE/FEMALE/null
 * @param {String} userId - User ID for logging
 * @returns {Object} - { score, scoreBreakdown, ruleVersion }
 */
async function calculateHealthIndexV2(parameters, gender, userId = null) {
  const ruleVersion = 'HI_v2_2025_08';
  const scoreBreakdown = {
    parameterPenalties: [],
    combinationPenalties: [],
    totalPenalty: 0,
    completeness: 0,
    safetyFlags: [],
    confidence: 'Normal',
    timestamp: new Date().toISOString()
  };

  try {
    // 1. Fetch active Health Index parameters
    const hiParamsResult = await query(`
      SELECT hip.*, pm.parameter_key, pm.unit,
             pm.reference_min, pm.reference_max,
             pm.reference_min_male, pm.reference_max_male,
             pm.reference_min_female, pm.reference_max_female
      FROM health_index_parameters hip
      JOIN parameter_master pm ON hip.parameter_id = pm.parameter_id
      WHERE hip.is_active = true AND hip.include_in_index = true
    `);

    if (hiParamsResult.rows.length === 0) {
      console.warn('[HealthIndexV2] No active parameters configured');
      return { score: 1000, scoreBreakdown, ruleVersion };
    }

    // 2. Calculate parameter penalties
    let includedCount = 0;
    let presentCount = 0;
    let totalParamPenalty = 0;

    for (const hiParam of hiParamsResult.rows) {
      includedCount++;
      const value = parameters[hiParam.parameter_id];
      
      if (value === null || value === undefined || value === '') {
        continue;
      }
      
      presentCount++;
      const numValue = parseFloat(value);
      
      if (isNaN(numValue)) {
        console.warn(`[HealthIndexV2] Invalid value for ${hiParam.parameter_id}: ${value}`);
        continue;
      }

      // Get gender-specific or default reference ranges
      const { refMin, refMax } = getGenderSpecificRanges(hiParam, gender);
      
      // Calculate deviation percentage
      const deviation = calculateDeviation(numValue, refMin, refMax, hiParam.direction);
      
      if (deviation > 0) {
        // Calculate penalty: weight * pmax * min(1, deviation / k_full)
        const severity = Math.min(1, deviation / hiParam.k_full);
        const penalty = hiParam.weight * hiParam.pmax * severity;
        
        totalParamPenalty += penalty;
        
        scoreBreakdown.parameterPenalties.push({
          parameterId: hiParam.parameter_id,
          parameterKey: hiParam.parameter_key,
          value: numValue,
          unit: hiParam.unit,
          refMin,
          refMax,
          direction: hiParam.direction,
          deviation: Math.round(deviation * 10000) / 100, // percentage with 2 decimals
          severity: Math.round(severity * 100) / 100,
          penalty: Math.round(penalty * 100) / 100
        });
      }

      // Check safety flags
      checkSafetyFlag(hiParam.parameter_key, numValue, scoreBreakdown.safetyFlags);
    }

    // 3. Calculate completeness
    scoreBreakdown.completeness = includedCount > 0 ? presentCount / includedCount : 0;
    if (scoreBreakdown.completeness < 0.6) {
      scoreBreakdown.confidence = 'Low Confidence';
    }

    // 4. Fetch and evaluate combination rules
    const combosResult = await query(`
      SELECT * FROM health_index_combinations
      WHERE is_active = true
    `);

    let totalComboPenalty = 0;

    for (const combo of combosResult.rows) {
      const memberIds = combo.members.parameter_ids || [];
      
      if (memberIds.length < 2) {
        console.warn(`[HealthIndexV2] Combo ${combo.rule_name} has less than 2 members`);
        continue;
      }

      // Get deviations for member parameters
      const memberDeviations = [];
      const memberSeverities = [];
      
      for (const memberId of memberIds) {
        const hiParam = hiParamsResult.rows.find(p => p.parameter_id === memberId);
        if (!hiParam || !hiParam.include_in_index) continue;
        
        const value = parameters[memberId];
        if (value === null || value === undefined || value === '') continue;
        
        const numValue = parseFloat(value);
        if (isNaN(numValue)) continue;
        
        const { refMin, refMax } = getGenderSpecificRanges(hiParam, gender);
        const deviation = calculateDeviation(numValue, refMin, refMax, hiParam.direction);
        
        if (deviation > 0) {
          memberDeviations.push(deviation);
          memberSeverities.push(Math.min(1, deviation / hiParam.k_full));
        }
      }

      // Check trigger conditions
      let triggered = false;
      
      switch (combo.trigger_type) {
        case 'all_out':
          triggered = memberDeviations.length === memberIds.length && memberDeviations.length > 0;
          break;
          
        case 'any_two':
          triggered = memberDeviations.length >= 2;
          break;
          
        case 'avg_dev_ge_t':
          if (memberSeverities.length > 0) {
            const avgSeverity = memberSeverities.reduce((a, b) => a + b, 0) / memberSeverities.length;
            triggered = avgSeverity >= combo.trigger_threshold;
          }
          break;
      }

      if (triggered) {
        let penalty = combo.combo_max;
        
        if (combo.scale_by_avg && memberSeverities.length > 0) {
          const avgSeverity = memberSeverities.reduce((a, b) => a + b, 0) / memberSeverities.length;
          penalty = combo.combo_max * avgSeverity;
        }
        
        totalComboPenalty += penalty;
        
        scoreBreakdown.combinationPenalties.push({
          ruleName: combo.rule_name,
          memberIds: memberIds,
          triggerType: combo.trigger_type,
          avgSeverity: memberSeverities.length > 0 
            ? Math.round(memberSeverities.reduce((a, b) => a + b, 0) / memberSeverities.length * 100) / 100
            : 0,
          penalty: Math.round(penalty * 100) / 100
        });
      }
    }

    // 5. Calculate final score
    scoreBreakdown.totalPenalty = Math.round((totalParamPenalty + totalComboPenalty) * 100) / 100;
    const finalScore = Math.max(0, 1000 - scoreBreakdown.totalPenalty);

    // Check health score safety flag
    if (finalScore < SAFETY_FLAGS.HEALTH_SCORE.threshold) {
      scoreBreakdown.safetyFlags.push({
        type: 'HEALTH_SCORE',
        value: finalScore,
        threshold: SAFETY_FLAGS.HEALTH_SCORE.threshold,
        message: `Health Score (${finalScore}) is below critical threshold`
      });
    }

    console.log(`[HealthIndexV2] User ${userId}: Score=${finalScore}, Penalties=${scoreBreakdown.totalPenalty}`);

    return {
      score: Math.round(finalScore),
      scoreBreakdown,
      ruleVersion
    };

  } catch (error) {
    console.error('[HealthIndexV2] Calculation error:', error);
    throw error;
  }
}

/**
 * Get gender-specific or default reference ranges
 */
function getGenderSpecificRanges(param, gender) {
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
  
  return { refMin, refMax };
}

/**
 * Calculate deviation percentage based on direction
 */
function calculateDeviation(value, refMin, refMax, direction) {
  switch (direction) {
    case 'high_bad':
      return value > refMax ? (value - refMax) / refMax : 0;
      
    case 'low_bad':
      return value < refMin ? (refMin - value) / refMin : 0;
      
    case 'two_sided':
      if (value < refMin) {
        return (refMin - value) / refMin;
      } else if (value > refMax) {
        return (value - refMax) / refMax;
      }
      return 0;
      
    default:
      console.warn(`[HealthIndexV2] Unknown direction: ${direction}`);
      return 0;
  }
}

/**
 * Check if parameter value triggers safety flag
 */
function checkSafetyFlag(parameterKey, value, safetyFlags) {
  // Map parameter keys to safety flag checks
  const flagMap = {
    'CRP': 'CRP',
    'HbA1c': 'HbA1c',
    'Fasting Glucose': 'FPG',
    'LDL': 'LDL'
  };

  const flagType = flagMap[parameterKey];
  if (flagType && SAFETY_FLAGS[flagType]) {
    const flag = SAFETY_FLAGS[flagType];
    
    if (value >= flag.threshold) {
      safetyFlags.push({
        type: flagType,
        parameter: parameterKey,
        value: value,
        threshold: flag.threshold,
        unit: flag.unit,
        message: `${parameterKey} (${value} ${flag.unit}) exceeds critical threshold of ${flag.threshold} ${flag.unit}`
      });
    }
  }
}

/**
 * Convert parameter display names to IDs using parameter_master mapping
 */
async function convertParametersToIds(displayParameters) {
  const parameterIds = {};
  
  try {
    const paramMasterRows = await query('SELECT parameter_id, parameter_key FROM parameter_master');
    const keyToIdMap = {};
    
    for (const row of paramMasterRows.rows) {
      keyToIdMap[row.parameter_key] = row.parameter_id;
    }
    
    for (const [displayName, value] of Object.entries(displayParameters)) {
      const paramId = keyToIdMap[displayName];
      if (paramId && value !== null && value !== undefined && value !== '') {
        parameterIds[paramId] = value;
      }
    }
  } catch (err) {
    console.error('[HealthIndexV2] Error converting parameters:', err);
    throw err;
  }
  
  return parameterIds;
}

/**
 * Main entry point - calculates health score from display parameters
 */
async function calculateHealthScore(displayParameters, gender = null, userId = null) {
  // Convert display names to parameter IDs
  const parameterIds = await convertParametersToIds(displayParameters);
  
  // Calculate using new method
  const result = await calculateHealthIndexV2(parameterIds, gender, userId);
  
  return result.score;
}

/**
 * Get detailed health score with breakdown
 */
async function calculateHealthScoreWithBreakdown(displayParameters, gender = null, userId = null) {
  // Convert display names to parameter IDs
  const parameterIds = await convertParametersToIds(displayParameters);
  
  // Calculate using new method
  return await calculateHealthIndexV2(parameterIds, gender, userId);
}

module.exports = {
  calculateHealthScore,
  calculateHealthScoreWithBreakdown,
  calculateHealthIndexV2,
  convertParametersToIds
};