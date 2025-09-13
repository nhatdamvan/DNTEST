const reportRepo = require('../repositories/reportRepository');

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

function getAgeGroup(age) {
  if (age >= 10 && age < 20) return '10-20';
  if (age >= 20 && age < 30) return '20-30';
  if (age >= 30 && age < 40) return '30-40';
  if (age >= 40 && age < 50) return '40-50';
  if (age >= 50 && age < 60) return '50-60';
  if (age >= 60) return '60+';
  return null;
}

const getUserReport = async (userId) => {
  const user = await reportRepo.getUserWithLatestReport(userId);
  if (!user || !user.report_id) return null;

  const reportId = user.report_id;
  const userAge = user.age || calculateAge(user.date_of_birth);

  const [
    categories,
    categoryParameters,
    topMetrics,
    parameters,
    risks,
    hraCompleted,
    peerAverage,
    pastHealthScore,
    nationalAverage,
    paramAverages
  ] = await Promise.all([
    reportRepo.getCategories(reportId),
    reportRepo.getCategoryParameters(reportId),
    reportRepo.getTopMetrics(reportId),
    reportRepo.getParameters(reportId),
    reportRepo.getRisks(reportId),
    reportRepo.getHraCompleted(reportId),
    reportRepo.getPeerAverage(user.company_id),
    reportRepo.getPastHealthScore(user.user_id),
    reportRepo.getNationalAverage(user.location),
    reportRepo.getParamAverages(user.company_id, user.location, getAgeGroup(userAge), user.gender)
  ]);

  // Group parameters by category
  const categoryParametersMap = {};
  categoryParameters.forEach(param => {
    if (!categoryParametersMap[param.category_id]) {
      categoryParametersMap[param.category_id] = [];
    }
    categoryParametersMap[param.category_id].push({
      parameter_id: param.parameter_id,  // This is now the master parameter_id
      lab_parameter_id: param.lab_parameter_id,
      parameter_name: param.parameter_name,
      display_name: param.display_name || param.parameter_name,
      parameter_value: param.parameter_value,
      unit: param.unit,
      reference_min: param.reference_min,
      reference_max: param.reference_max,
      status: param.status,
      priority: param.parameter_priority,
      master_parameter_key: param.master_parameter_key,
      master_parameter_key_vi: param.master_parameter_key_vi
    });
  });

  // Add parameters to categories with Vietnamese names
  const categoriesWithParameters = categories.map(category => ({
    ...category,
    category_name_vi: category.category_name_vi,
    parameters: categoryParametersMap[category.category_id] || []
  }));

  console.log('\n[DEBUG-Service] === USER REPORT COMPILATION ===');
  console.log('[DEBUG-Service] User Info:', {
    user_id: user.user_id,
    company_id: user.company_id,
    location: user.location,
    gender: user.gender,
    age: userAge,
    age_group: getAgeGroup(userAge)
  });
  
  console.log('[DEBUG-Service] Categories with parameters:');
  categoriesWithParameters.forEach((cat, idx) => {
    console.log(`  [${idx + 1}] ${cat.category_name}: ${cat.parameters.length} parameters`);
    cat.parameters.slice(0, 2).forEach(p => {
      console.log(`      - ${p.parameter_name} (${p.parameter_value} ${p.unit})`);
    });
  });
  
  console.log('[DEBUG-Service] Parameter Averages Summary:');
  console.log(`  Total averages fetched: ${paramAverages.length}`);
  if (paramAverages.length > 0) {
    console.log('  Sample averages:');
    paramAverages.slice(0, 5).forEach(avg => {
      console.log(`    - ${avg.parameter_key}: ${avg.average_value}`);
    });
  } else {
    console.log('  WARNING: No averages found for this demographic group!');
  }
  console.log('[DEBUG-Service] === END REPORT COMPILATION ===\n');

  return {
    user: {
      user_id: user.user_id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      gender: user.gender,
      date_of_birth: user.date_of_birth,
      age: user.age || calculateAge(user.date_of_birth),
      company: user.company_id
    },
    report: {
      report_id: reportId,
      health_score: user.health_score || 85,
      biological_age: user.biological_age,
      test_date: user.test_date,
      hra_completed: hraCompleted,
      peer_average: peerAverage || user.health_score,
      past_health_score: pastHealthScore,
      national_average: nationalAverage || user.health_score
    },
    categories: categoriesWithParameters,
    topMetrics,
    parameters,
    risks,
    paramAverages
  };
};

const getAllUserReports = async (userId) => {
  const reports = await reportRepo.getAllUserReports(userId);
  return reports;
};

const getUserReportById = async (userId, reportId) => {
  const user = await reportRepo.getUserWithSpecificReport(userId, reportId);
  if (!user || !user.report_id) return null;

  const userAge = user.age || calculateAge(user.date_of_birth);

  const [
    categories,
    categoryParameters,
    topMetrics,
    parameters,
    risks,
    hraCompleted,
    peerAverage,
    pastHealthScore,
    nationalAverage,
    paramAverages
  ] = await Promise.all([
    reportRepo.getCategories(reportId),
    reportRepo.getCategoryParameters(reportId),
    reportRepo.getTopMetrics(reportId),
    reportRepo.getParameters(reportId),
    reportRepo.getRisks(reportId),
    reportRepo.getHraCompleted(reportId),
    reportRepo.getPeerAverage(user.company_id),
    reportRepo.getPastHealthScore(user.user_id),
    reportRepo.getNationalAverage(user.location),
    reportRepo.getParamAverages(user.company_id, user.location, getAgeGroup(userAge), user.gender)
  ]);

  // Group parameters by category
  const categoryParametersMap = {};
  categoryParameters.forEach(param => {
    if (!categoryParametersMap[param.category_id]) {
      categoryParametersMap[param.category_id] = [];
    }
    categoryParametersMap[param.category_id].push({
      parameter_id: param.parameter_id,  // This is now the master parameter_id
      lab_parameter_id: param.lab_parameter_id,
      parameter_name: param.parameter_name,
      display_name: param.display_name || param.parameter_name,
      parameter_value: param.parameter_value,
      unit: param.unit,
      reference_min: param.reference_min,
      reference_max: param.reference_max,
      status: param.status,
      priority: param.parameter_priority,
      master_parameter_key: param.master_parameter_key,
      master_parameter_key_vi: param.master_parameter_key_vi
    });
  });

  // Add parameters to categories with Vietnamese names
  const categoriesWithParameters = categories.map(category => ({
    ...category,
    category_name_vi: category.category_name_vi,
    parameters: categoryParametersMap[category.category_id] || []
  }));

  return {
    user: {
      user_id: user.user_id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      gender: user.gender,
      date_of_birth: user.date_of_birth,
      age: user.age || calculateAge(user.date_of_birth),
      company: user.company_id
    },
    report: {
      report_id: reportId,
      health_score: user.health_score || 85,
      biological_age: user.biological_age,
      test_date: user.test_date,
      hra_completed: hraCompleted,
      peer_average: peerAverage || user.health_score,
      past_health_score: pastHealthScore,
      national_average: nationalAverage || user.health_score
    },
    categories: categoriesWithParameters,
    topMetrics,
    parameters,
    risks,
    paramAverages
  };
};

module.exports = {
  getUserReport,
  getAllUserReports,
  getUserReportById,
  calculateAge,
  getAgeGroup
};