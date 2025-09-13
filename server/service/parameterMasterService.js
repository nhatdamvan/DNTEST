const parameterRepository = require('../repositories/parameterMasterRepository');

async function getAllParameters() {
  return await parameterRepository.getAllParameters();
}

async function createParameter(data) {
  // Check if priority is already taken
  const allParams = await parameterRepository.getAllParameters();
  const priorityTaken = allParams.some(param => param.parameter_priority === data.parameter_priority);
  
  if (priorityTaken) {
    throw new Error(`Priority ${data.parameter_priority} is already assigned to another parameter`);
  }
  
  return await parameterRepository.createParameter(data);
}

async function updateParameter(id, data) {
  // Check if new priority is already taken by another parameter
  if (data.parameter_priority !== undefined) {
    const allParams = await parameterRepository.getAllParameters();
    const priorityTaken = allParams.some(param => 
      param.id !== parseInt(id) && param.parameter_priority === data.parameter_priority
    );
    
    if (priorityTaken) {
      throw new Error(`Priority ${data.parameter_priority} is already assigned to another parameter`);
    }
  }
  
  return await parameterRepository.updateParameter(id, data);
}

async function deleteParameter(id) {
  return await parameterRepository.deleteParameter(id);
}

async function getParameterCategoryMappings() {
  return await parameterRepository.getParameterCategoryMappings();
}

async function getAllCategories() {
  return await parameterRepository.getAllCategories();
}

async function getAvailablePriorities(excludeId = null) {
  const allParams = await parameterRepository.getAllParameters();
  const usedPriorities = allParams
    .filter(param => excludeId ? param.id !== excludeId : true)
    .map(param => param.parameter_priority)
    .filter(priority => priority !== null && priority !== undefined);
  
  const maxPriority = Math.max(allParams.length, ...usedPriorities, 0) + 1;
  const availablePriorities = [];
  
  for (let i = 1; i <= maxPriority; i++) {
    if (!usedPriorities.includes(i)) {
      availablePriorities.push(i);
    }
  }
  
  return availablePriorities;
}

module.exports = {
  getAllParameters,
  createParameter,
  updateParameter,
  deleteParameter,
  getParameterCategoryMappings,
  getAllCategories,
  getAvailablePriorities
};