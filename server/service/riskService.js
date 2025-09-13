const riskRepo = require('../repositories/riskRepository');

// --- Risk calculation functions ---
function calculateFINDRISC(userData) {
  let {
    age,
    bmi,
    waistCircumference,
    gender,
    physicalActivity, // At least 30 min daily
    dailyVegetables, // Every day
    bloodPressureMeds,
    historyHighGlucose, // Ever found in health check
    familyHistoryDiabetes // 'none', 'second_degree', 'first_degree', 'both'
  } = userData;
  
  console.log('[DEBUG] calculateFINDRISC called with:', userData);
  
  // Validate all required fields are present
  const requiredFields = {
    age: 'number',
    bmi: 'number', 
    waistCircumference: 'number',
    gender: 'string',
    physicalActivity: 'boolean',
    dailyVegetables: 'boolean',
    bloodPressureMeds: 'boolean',
    historyHighGlucose: 'boolean',
    familyHistoryDiabetes: 'string'
  };
  
  // Check for missing or invalid fields
  for (const [field, expectedType] of Object.entries(requiredFields)) {
    const value = userData[field];
    
    // Check if field is missing
    if (value === null || value === undefined) {
      throw new Error(`FINDRISC: Required field '${field}' is missing`);
    }
    
    // Type-specific validation
    if (expectedType === 'number') {
      if (typeof value !== 'number' || isNaN(value)) {
        throw new Error(`FINDRISC: Field '${field}' must be a valid number`);
      }
    } else if (expectedType === 'boolean') {
      if (typeof value !== 'boolean') {
        throw new Error(`FINDRISC: Field '${field}' must be a boolean (true/false)`);
      }
    } else if (expectedType === 'string') {
      if (typeof value !== 'string' || value.trim() === '') {
        throw new Error(`FINDRISC: Field '${field}' must be a non-empty string`);
      }
    }
  }
  
  // Validate numeric inputs are non-negative
  if (age < 0 || bmi < 0 || waistCircumference < 0) {
    throw new Error('FINDRISC: Age, BMI, and waist circumference must be non-negative values');
  }
  
  // Log waist circumference for debugging
  console.log(`[DEBUG] Waist validation: value=${waistCircumference}, type=${typeof waistCircumference}`);
  
  // Check if waist value seems unrealistic (but don't auto-convert)
  // Note: Some database values might be in inches, but user input is always in cm
  if (waistCircumference > 0 && waistCircumference < 50) {
    console.log(`[DEBUG] WARNING: Waist ${waistCircumference} seems low for cm. Database value might be in inches.`);
  }
  
  // Validate gender values
  const validGenders = ['M', 'Male', 'male', 'F', 'Female', 'female'];
  if (!validGenders.includes(gender)) {
    throw new Error(`FINDRISC: Gender must be one of: ${validGenders.join(', ')}`);
  }
  
  // Validate familyHistoryDiabetes values
  const validFamilyHistory = ['none', 'second_degree', 'first_degree', 'both'];
  if (!validFamilyHistory.includes(familyHistoryDiabetes)) {
    throw new Error(`FINDRISC: familyHistoryDiabetes must be one of: ${validFamilyHistory.join(', ')}`);
  }
  
  let score = 0;
  
  // Age
  if (age < 45) score += 0;
  else if (age >= 45 && age <= 54) score += 2;
  else if (age >= 55 && age <= 64) score += 3;
  else if (age > 64) score += 4;
  
  // BMI
  if (bmi < 25) score += 0;
  else if (bmi >= 25 && bmi < 30) score += 1;
  else if (bmi >= 30) score += 3;
  
  // Waist circumference (cm)
  // Normalize gender check - treat M/Male/male as male, F/Female/female as female
  const isMale = gender === 'M' || gender === 'Male' || gender === 'male';
  
  if (isMale) {
    if (waistCircumference < 94) score += 0;
    else if (waistCircumference >= 94 && waistCircumference <= 102) score += 3;
    else if (waistCircumference > 102) score += 4;
  } else {
    if (waistCircumference < 80) score += 0;
    else if (waistCircumference >= 80 && waistCircumference <= 88) score += 3;
    else if (waistCircumference > 88) score += 4;
  }
  
  // Physical activity
  if (physicalActivity) score += 0;
  else score += 2;
  
  // Daily vegetables/fruits
  if (dailyVegetables) score += 0;
  else score += 1;
  
  // Blood pressure medication
  if (bloodPressureMeds) score += 2;
  else score += 0;
  
  // History of high blood glucose
  if (historyHighGlucose) score += 5;
  else score += 0;
  
  // Family history
  if (familyHistoryDiabetes === 'none') score += 0;
  else if (familyHistoryDiabetes === 'second_degree') score += 3; // Grandparent, aunt, uncle, cousin
  else if (familyHistoryDiabetes === 'first_degree') score += 5; // Parent, sibling, child
  else if (familyHistoryDiabetes === 'both') score += 5; // Both first and second degree relatives
  
  // Risk interpretation (10-year diabetes risk)
  let risk = {
    score: score,
    category: '',
    percentage: 0
  };
  
  if (score < 7) {
    risk.category = 'LOW';
    risk.percentage = 1; // 1 in 100
  } else if (score >= 7 && score <= 11) {
    risk.category = 'SLIGHTLY_ELEVATED';
    risk.percentage = 4; // 1 in 25
  } else if (score >= 12 && score <= 14) {
    risk.category = 'MODERATE';
    risk.percentage = 17; // 1 in 6
  } else if (score >= 15 && score <= 20) {
    risk.category = 'HIGH';
    risk.percentage = 33; // 1 in 3
  } else {
    risk.category = 'VERY_HIGH';
    risk.percentage = 50; // 1 in 2
  }
  
  console.log('[DEBUG] FINDRISC Calculation Complete:', {
    totalScore: score,
    riskCategory: risk.category,
    riskPercentage: risk.percentage,
    inputs: {
      age, bmi, waistCircumference, gender,
      physicalActivity, dailyVegetables, bloodPressureMeds,
      historyHighGlucose, familyHistoryDiabetes
    }
  });
  
  return risk;
}

function calculateFraminghamRisk(userData) {
  let { age, gender, totalCholesterol, hdl, systolicBP, isSmoker, onBPMeds } = userData;
  
  console.log(`[DEBUG] Calculating Framingham risk for:`, userData);
  
  // Validate and fix cholesterol values
  if (hdl > totalCholesterol) {
    console.log(`[DEBUG] WARNING: HDL (${hdl}) cannot be greater than Total Cholesterol (${totalCholesterol}). Adjusting HDL to 40% of total.`);
    hdl = Math.round(totalCholesterol * 0.4); // Set HDL to 40% of total cholesterol as a reasonable default
  }
  
  // Use the actual values (no minimum enforcement - let the calculation handle edge cases)
  const tc = totalCholesterol || 0;
  const hdlChol = hdl || 0;
  const sbp = systolicBP || 0;
  
  console.log(`[DEBUG] Using values for calculation: TC=${tc}, HDL=${hdlChol}, SBP=${sbp}, Age=${age}, Gender=${gender}`);

  let points = 0;
  
  // Normalize gender check - treat M/Male/male as male
  const isMale = gender === 'M' || gender === 'Male' || gender === 'male';
  
  if (isMale) {
    // Age points for men
    if (age >= 20 && age <= 34) points += -9;
    else if (age >= 35 && age <= 39) points += -4;
    else if (age >= 40 && age <= 44) points += 0;
    else if (age >= 45 && age <= 49) points += 3;
    else if (age >= 50 && age <= 54) points += 6;
    else if (age >= 55 && age <= 59) points += 8;
    else if (age >= 60 && age <= 64) points += 10;
    else if (age >= 65 && age <= 69) points += 11;
    else if (age >= 70 && age <= 74) points += 12;
    else if (age >= 75) points += 13;
    
    // Total Cholesterol points for men by age group
    if (age >= 20 && age <= 39) {
      if (tc < 160) points += 0;
      else if (tc >= 160 && tc <= 199) points += 4;
      else if (tc >= 200 && tc <= 239) points += 7;
      else if (tc >= 240 && tc <= 279) points += 9;
      else points += 11;
    } else if (age >= 40 && age <= 49) {
      if (tc < 160) points += 0;
      else if (tc >= 160 && tc <= 199) points += 3;
      else if (tc >= 200 && tc <= 239) points += 5;
      else if (tc >= 240 && tc <= 279) points += 6;
      else points += 8;
    } else if (age >= 50 && age <= 59) {
      if (tc < 160) points += 0;
      else if (tc >= 160 && tc <= 199) points += 2;
      else if (tc >= 200 && tc <= 239) points += 3;
      else if (tc >= 240 && tc <= 279) points += 4;
      else points += 5;
    } else if (age >= 60 && age <= 69) {
      if (tc < 160) points += 0;
      else if (tc >= 160 && tc <= 199) points += 1;
      else if (tc >= 200 && tc <= 239) points += 1;
      else if (tc >= 240 && tc <= 279) points += 2;
      else points += 3;
    } else if (age >= 70) {
      if (tc < 160) points += 0;
      else if (tc >= 160 && tc <= 199) points += 0;
      else if (tc >= 200 && tc <= 239) points += 0;
      else if (tc >= 240 && tc <= 279) points += 1;
      else points += 1;
    }
    
    // HDL points for men
    if (hdlChol >= 60) points += -1;
    else if (hdlChol >= 50 && hdlChol <= 59) points += 0;
    else if (hdlChol >= 40 && hdlChol <= 49) points += 1;
    else if (hdlChol < 40) points += 2;
    
    // Systolic BP points for men
    if (onBPMeds) {
      if (sbp < 120) points += 0;
      else if (sbp >= 120 && sbp <= 129) points += 1;
      else if (sbp >= 130 && sbp <= 139) points += 2;
      else if (sbp >= 140 && sbp <= 159) points += 2;
      else points += 3;
    } else {
      if (sbp < 120) points += 0;
      else if (sbp >= 120 && sbp <= 129) points += 0;
      else if (sbp >= 130 && sbp <= 139) points += 1;
      else if (sbp >= 140 && sbp <= 159) points += 1;
      else points += 2;
    }
    
    // Smoking points for men by age
    if (isSmoker) {
      if (age >= 20 && age <= 39) points += 8;
      else if (age >= 40 && age <= 49) points += 5;
      else if (age >= 50 && age <= 59) points += 3;
      else if (age >= 60 && age <= 69) points += 1;
      else if (age >= 70) points += 1;
    }
    
    // Convert points to risk percentage for men
    console.log(`[DEBUG] Framingham total points for male: ${points}`);
    if (points < 0) return 1; // Return 1% minimum instead of 0
    else if (points === 0) return 1;
    else if (points === 1) return 1;
    else if (points === 2) return 1;
    else if (points === 3) return 1;
    else if (points === 4) return 1;
    else if (points === 5) return 2;
    else if (points === 6) return 2;
    else if (points === 7) return 3;
    else if (points === 8) return 4;
    else if (points === 9) return 5;
    else if (points === 10) return 6;
    else if (points === 11) return 8;
    else if (points === 12) return 10;
    else if (points === 13) return 12;
    else if (points === 14) return 16;
    else if (points === 15) return 20;
    else if (points === 16) return 25;
    else if (points >= 17) return 30;
    
  } else { // Female
    // Age points for women
    let agePoints = 0;
    if (age >= 20 && age <= 34) agePoints = -7;
    else if (age >= 35 && age <= 39) agePoints = -3;
    else if (age >= 40 && age <= 44) agePoints = 0;
    else if (age >= 45 && age <= 49) agePoints = 3;
    else if (age >= 50 && age <= 54) agePoints = 6;
    else if (age >= 55 && age <= 59) agePoints = 8;
    else if (age >= 60 && age <= 64) agePoints = 10;
    else if (age >= 65 && age <= 69) agePoints = 12;
    else if (age >= 70 && age <= 74) agePoints = 14;
    else if (age >= 75) agePoints = 16;
    points += agePoints;
    console.log(`[DEBUG] Female age ${age} points: ${agePoints}, total: ${points}`);
    
    // Total Cholesterol points for women by age group
    let tcPoints = 0;
    if (age >= 20 && age <= 39) {
      if (tc < 160) tcPoints = 0;
      else if (tc >= 160 && tc <= 199) tcPoints = 4;
      else if (tc >= 200 && tc <= 239) tcPoints = 8;
      else if (tc >= 240 && tc <= 279) tcPoints = 11;
      else tcPoints = 13;
    } else if (age >= 40 && age <= 49) {
      if (tc < 160) tcPoints = 0;
      else if (tc >= 160 && tc <= 199) tcPoints = 3;
      else if (tc >= 200 && tc <= 239) tcPoints = 6;
      else if (tc >= 240 && tc <= 279) tcPoints = 8;
      else tcPoints = 10;
    } else if (age >= 50 && age <= 59) {
      if (tc < 160) tcPoints = 0;
      else if (tc >= 160 && tc <= 199) tcPoints = 2;
      else if (tc >= 200 && tc <= 239) tcPoints = 4;
      else if (tc >= 240 && tc <= 279) tcPoints = 5;
      else tcPoints = 7;
    } else if (age >= 60 && age <= 69) {
      if (tc < 160) tcPoints = 0;
      else if (tc >= 160 && tc <= 199) tcPoints = 1;
      else if (tc >= 200 && tc <= 239) tcPoints = 2;
      else if (tc >= 240 && tc <= 279) tcPoints = 3;
      else tcPoints = 4;
    } else if (age >= 70) {
      if (tc < 160) tcPoints = 0;
      else if (tc >= 160 && tc <= 199) tcPoints = 1;
      else if (tc >= 200 && tc <= 239) tcPoints = 1;
      else if (tc >= 240 && tc <= 279) tcPoints = 2;
      else tcPoints = 2;
    }
    points += tcPoints;
    console.log(`[DEBUG] Female TC ${tc} points: ${tcPoints}, total: ${points}`);
    
    // HDL points for women
    let hdlPoints = 0;
    if (hdlChol >= 60) hdlPoints = -1;
    else if (hdlChol >= 50 && hdlChol <= 59) hdlPoints = 0;
    else if (hdlChol >= 40 && hdlChol <= 49) hdlPoints = 1;
    else if (hdlChol < 40) hdlPoints = 2;
    points += hdlPoints;
    console.log(`[DEBUG] Female HDL ${hdlChol} points: ${hdlPoints}, total: ${points}`);
    
    // Systolic BP points for women
    let sbpPoints = 0;
    if (onBPMeds) {
      if (sbp < 120) sbpPoints = 0;
      else if (sbp >= 120 && sbp <= 129) sbpPoints = 3;
      else if (sbp >= 130 && sbp <= 139) sbpPoints = 4;
      else if (sbp >= 140 && sbp <= 159) sbpPoints = 5;
      else sbpPoints = 6;
    } else {
      if (sbp < 120) sbpPoints = 0;
      else if (sbp >= 120 && sbp <= 129) sbpPoints = 1;
      else if (sbp >= 130 && sbp <= 139) sbpPoints = 2;
      else if (sbp >= 140 && sbp <= 159) sbpPoints = 3;
      else sbpPoints = 4;
    }
    points += sbpPoints;
    console.log(`[DEBUG] Female SBP ${sbp} with meds=${onBPMeds} points: ${sbpPoints}, total: ${points}`);
    
    // Smoking points for women by age
    let smokingPoints = 0;
    if (isSmoker) {
      if (age >= 20 && age <= 39) smokingPoints = 9;
      else if (age >= 40 && age <= 49) smokingPoints = 7;
      else if (age >= 50 && age <= 59) smokingPoints = 4;
      else if (age >= 60 && age <= 69) smokingPoints = 2;
      else if (age >= 70) smokingPoints = 1;
    }
    points += smokingPoints;
    console.log(`[DEBUG] Female smoking=${isSmoker} points: ${smokingPoints}, total: ${points}`);
    
    // Convert points to risk percentage for women
    console.log(`[DEBUG] Framingham total points for female: ${points}`);
    if (points < 9) return 1; // Return 1% minimum instead of 0
    else if (points >= 9 && points <= 12) return 1;
    else if (points === 13 || points === 14) return 2;
    else if (points === 15) return 3;
    else if (points === 16) return 4;
    else if (points === 17) return 5;
    else if (points === 18) return 6;
    else if (points === 19) return 8;
    else if (points === 20) return 11;
    else if (points === 21) return 14;
    else if (points === 22) return 17;
    else if (points === 23) return 22;
    else if (points === 24) return 27;
    else if (points >= 25) return 30;
  }
  
  console.log(`[DEBUG] Framingham calculation complete. Points: ${points}`);
  return 1; // Return 1% minimum instead of 0
}

function calculatePHQ9Score(responses) {
  const totalScore = responses.reduce((sum, score) => sum + score, 0);
  let severity = '';
  let recommendation = '';
  if (totalScore <= 4) {
    severity = 'Minimal';
    recommendation = 'No action needed';
  } else if (totalScore <= 9) {
    severity = 'Mild';
    recommendation = 'Watchful waiting; repeat PHQ-9 at follow-up';
  } else if (totalScore <= 14) {
    severity = 'Moderate';
    recommendation = 'Consider counseling or treatment plan';
  } else if (totalScore <= 19) {
    severity = 'Moderately Severe';
    recommendation = 'Active treatment recommended';
  } else {
    severity = 'Severe';
    recommendation = 'Immediate treatment indicated';
  }
  const suicidalIdeation = responses[8] > 0;
  return {
    totalScore,
    severity,
    recommendation,
    suicidalIdeation,
    needsIntervention: totalScore >= 10
  };
}


function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

const getRiskPoints = async (userId, type, lifestyle = {}, responses = null) => {
  console.log(`[DEBUG] getRiskPoints called - Type: ${type}, UserId: ${userId}`);
  console.log('[DEBUG] Lifestyle data received:', lifestyle);
  console.log('[DEBUG] Responses data received:', responses);
  
  const user = await riskRepo.getUserWithLatestReport(userId);
  if (!user || !user.report_id) throw new Error('User or report not found');
  const reportId = user.report_id;
  console.log(`[DEBUG] Found report ID: ${reportId} for user: ${userId}`);

  const labParams = await riskRepo.getLabParameters(reportId);
  console.log(`[DEBUG] Lab parameters count: ${labParams.length}`);

  // Helper to get parameter by name (case-insensitive)
  const getParam = (name) => {
    const found = labParams.find(
      p => p.parameter_name.toLowerCase() === name.toLowerCase()
    );
    return found ? Number(found.parameter_value) : null;
  };

  // Compose data for Framingham
  const framinghamData = {
    age: user.age || calculateAge(user.date_of_birth),
    gender: user.gender,
    // Use user-provided values if available, otherwise use lab values
    totalCholesterol: lifestyle.totalCholesterol !== undefined && lifestyle.totalCholesterol !== null
      ? Number(lifestyle.totalCholesterol)
      : getParam('Total Cholesterol'),
    hdl: lifestyle.hdl !== undefined && lifestyle.hdl !== null
      ? Number(lifestyle.hdl)
      : getParam('HDL Cholesterol'),
    systolicBP: lifestyle.systolicBP !== undefined && lifestyle.systolicBP !== null
      ? Number(lifestyle.systolicBP)
      : getParam('Systolic BP'),
    isSmoker: lifestyle.isSmoker !== undefined
      ? lifestyle.isSmoker
      : (user.smoking_status === 'Yes' || user.smoking_status === true),
    onBPMeds: lifestyle.onBPMeds !== undefined
      ? lifestyle.onBPMeds
      : (user.bp_meds === 'Yes' || user.bp_meds === true)
  };

  // Compose data for FINDRISC
  const waistFromLifestyle = lifestyle.waistCircumference;
  let waistFromDB = getParam('Waist Circumference');
  
  console.log('[DEBUG] Waist Circumference Sources:');
  console.log('  - From user input (lifestyle):', waistFromLifestyle);
  console.log('  - From database (raw):', waistFromDB);
  
  // If database value exists and is less than 50, it's likely in inches - convert it
  if (waistFromDB !== null && waistFromDB < 50) {
    console.log(`  - Database value ${waistFromDB} appears to be in inches, converting to cm`);
    waistFromDB = Math.round(waistFromDB * 2.54);
    console.log(`  - Converted database value to: ${waistFromDB} cm`);
  }
  
  // Use lifestyle value if provided (always in cm from user), otherwise use DB value
  const waistToUse = waistFromLifestyle !== undefined && waistFromLifestyle !== null
    ? Number(waistFromLifestyle)
    : waistFromDB;
    
  console.log('  - Final value being used:', waistToUse);
  
  const findriscData = {
    age: framinghamData.age,
    gender: user.gender,
    bmi: lifestyle.bmi !== undefined && lifestyle.bmi !== null
      ? Number(lifestyle.bmi)
      : getParam('BMI'),
    waistCircumference: waistToUse,
    physicalActivity: lifestyle.physicalActivity !== undefined
      ? lifestyle.physicalActivity
      : false,
    dailyVegetables: lifestyle.dailyVegetables !== undefined
      ? lifestyle.dailyVegetables
      : false,
    bloodPressureMeds: lifestyle.bloodPressureMeds !== undefined
      ? lifestyle.bloodPressureMeds
      : (user.bp_meds === 'Yes' || user.bp_meds === true),
    historyHighGlucose: lifestyle.historyHighGlucose !== undefined
      ? lifestyle.historyHighGlucose
      : false,
    familyHistoryDiabetes: lifestyle.familyHistoryDiabetes !== undefined
      ? lifestyle.familyHistoryDiabetes
      : 'none'
  };
  
  console.log('[DEBUG] FINDRISC Data Composed:', findriscData);
  console.log('[DEBUG] FINDRISC Data Sources:', {
    'bmi_from_lifestyle': lifestyle.bmi,
    'bmi_from_db': getParam('BMI'),
    'waist_from_lifestyle': lifestyle.waistCircumference,
    'waist_from_db': getParam('Waist Circumference'),
    'bloodPressureMeds_from_lifestyle': lifestyle.bloodPressureMeds,
    'bloodPressureMeds_from_db': user.bp_meds
  });

  let result;
  let riskPercentage = null;
  let factors = {};
  let timeframe = 'not defined';
  let riskType;
  if (type === 'framingham') {
    console.log('[DEBUG] Framingham Data Composed:', framinghamData);
    console.log('[DEBUG] Framingham Data Sources:', {
      'totalCholesterol_from_lifestyle': lifestyle.totalCholesterol,
      'totalCholesterol_from_db': getParam('Total Cholesterol'),
      'hdl_from_lifestyle': lifestyle.hdl,
      'hdl_from_db': getParam('HDL Cholesterol'),
      'systolicBP_from_lifestyle': lifestyle.systolicBP,
      'systolicBP_from_db': getParam('Systolic BP')
    });
    
    const required = ['age', 'gender', 'totalCholesterol', 'hdl', 'systolicBP', 'isSmoker', 'onBPMeds'];
    for (const param of required) {
      if (framinghamData[param] === undefined || framinghamData[param] === null) {
        throw new Error(`Missing parameter: ${param}`);
      }
    }
    result = { points: calculateFraminghamRisk(framinghamData), data: framinghamData };
    riskPercentage = result.points;
    factors = framinghamData;
    // *NOTE : hardcoded timeframe for Framingham
    timeframe = 'Next 10 years'; 
    riskType = 'CVD'
  } else if (type === 'findrisc') {
    const required = [
      'age', 'bmi', 'waistCircumference', 'gender', 'physicalActivity',
      'dailyVegetables', 'bloodPressureMeds', 'historyHighGlucose', 'familyHistoryDiabetes'
    ];
    for (const param of required) {
      if (findriscData[param] === undefined || findriscData[param] === null) {
        throw new Error(`Missing parameter: ${param}`);
      }
    }
    result = { ...calculateFINDRISC(findriscData), data: findriscData };
    riskPercentage = result.percentage;
    factors = findriscData;
    timeframe = 'Next 10 years';
    riskType = 'Diabetes';
    console.log('[DEBUG] FINDRISC Result to be saved:', {
      reportId,
      riskType,
      riskPercentage,
      result
    });
  } else if (type === 'phq9') {
    const phq9Responses = responses || (lifestyle && lifestyle.responses);
    if (!Array.isArray(phq9Responses) || phq9Responses.length !== 9) {
      throw new Error('Invalid PHQ-9 responses');
    }
    result = calculatePHQ9Score(phq9Responses);
    riskPercentage = Math.round((result.totalScore / 27) * 100);
    factors = { responses: responses || (lifestyle && lifestyle.responses) };
    timeframe = 'current';
    riskType = 'Hypertension';
  } else {
    throw new Error('Unknown risk calculator type');
  }

   await riskRepo.saveRiskAssessment(
    reportId,
    riskType,
    riskPercentage,
    riskPercentage >= 50 ? 'high' : (riskPercentage >= 33 ? 'medium' : 'low'),
    timeframe,
    factors
  );

  return result;
};

const getPreviousRiskAssessments = async (reportId) => {
  const types = ['CVD', 'Diabetes', 'Hypertension'];
  const results = {};
  for (const type of types) {
    const assessment = await riskRepo.getLatestRiskAssessment(reportId, type);
    // console.log(`Latest ${type} assessment for report ${reportId}:`, assessment); // Disabled for production
    if (assessment) {
      results[type] = {
        percentage: assessment.risk_percentage,
        lastTaken: assessment.created_at,
        ...assessment
      };
    }
  }
  return results;
};

module.exports = {
  getRiskPoints,
  getPreviousRiskAssessments
};