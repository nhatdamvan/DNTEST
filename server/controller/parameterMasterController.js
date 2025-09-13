const parameterService = require('../service/parameterMasterService');

// Simple in-memory cache for parameter master
let parameterCache = {
  data: null,
  timestamp: null,
  TTL: 60000 // 1 minute cache
};

async function getAllParameters(req, res) {
  try {
    // Check if we have valid cached data
    const now = Date.now();
    if (parameterCache.data && parameterCache.timestamp && (now - parameterCache.timestamp < parameterCache.TTL)) {
      console.log('[ParameterMaster] Serving from cache');
      return res.json(parameterCache.data);
    }
    
    // Fetch fresh data
    console.log('[ParameterMaster] Fetching fresh data');
    const params = await parameterService.getAllParameters();
    
    // Update cache
    parameterCache.data = params;
    parameterCache.timestamp = now;
    
    res.json(params);
  } catch (error) {
    console.error('Error fetching parameter master:', error);
    res.status(500).json({ error: 'Failed to fetch parameters' });
  }
}

async function createParameter(req, res) {
  try {
    const param = await parameterService.createParameter(req.body);
    // Invalidate cache
    parameterCache.data = null;
    parameterCache.timestamp = null;
    res.json(param);
  } catch (error) {
    console.error('Error creating parameter:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'Parameter ID already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create parameter' });
    }
  }
}

async function updateParameter(req, res) {
  try {
    const { id } = req.params;
    console.log(`[DEBUG] Updating parameter master ID: ${id}`);
    console.log(`[DEBUG] Request body:`, req.body);
    
    const param = await parameterService.updateParameter(id, req.body);
    if (!param) {
      console.error(`[ERROR] Parameter not found with ID: ${id}`);
      return res.status(404).json({ error: 'Parameter not found' });
    }
    
    console.log(`[DEBUG] Parameter master updated successfully:`, param);
    // Invalidate cache
    parameterCache.data = null;
    parameterCache.timestamp = null;
    res.json(param);
  } catch (error) {
    console.error('[ERROR] Error updating parameter:', error);
    console.error('[ERROR] Stack trace:', error.stack);
    res.status(500).json({ error: error.message || 'Failed to update parameter' });
  }
}

async function deleteParameter(req, res) {
  try {
    const { id } = req.params;
    // Invalidate cache on delete
    parameterCache.data = null;
    parameterCache.timestamp = null;
    const deleted = await parameterService.deleteParameter(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Parameter not found' });
    }
    res.json({ success: true, deleted: deleted.parameter_id });
  } catch (error) {
    console.error('Error deleting parameter:', error);
    // Check if it's a constraint violation due to associated data
    if (error.message && error.message.includes('has associated user report data')) {
      res.status(400).json({ error: 'Cannot delete this parameter because it has associated user report data' });
    } else {
      res.status(500).json({ error: 'Failed to delete parameter' });
    }
  }
}

async function getParameterCategoryMappings(req, res) {
  try {
    const mappings = await parameterService.getParameterCategoryMappings();
    res.json(mappings);
  } catch (error) {
    console.error('Error fetching parameter-category mappings:', error);
    res.status(500).json({ error: 'Failed to fetch parameter-category mappings' });
  }
}

async function getAllCategories(req, res) {
  try {
    const categories = await parameterService.getAllCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
}

async function getParameterKeys(req, res) {
  try {
    const params = await parameterService.getAllParameters();
    const parameterKeys = params.map(param => ({
      key: param.parameter_key,
      text: param.parameter_text_mapping,
      unit: param.unit,
      reference_min: param.reference_min,
      reference_max: param.reference_max,
      reference_min_male: param.reference_min_male,
      reference_max_male: param.reference_max_male,
      reference_min_female: param.reference_min_female,
      reference_max_female: param.reference_max_female
    }));
    res.json(parameterKeys);
  } catch (error) {
    console.error('Error fetching parameter keys:', error);
    res.status(500).json({ error: 'Failed to fetch parameter keys' });
  }
}

async function getAvailablePriorities(req, res) {
  try {
    const { excludeId } = req.query;
    const priorities = await parameterService.getAvailablePriorities(excludeId ? parseInt(excludeId) : null);
    res.json(priorities);
  } catch (error) {
    console.error('Error fetching available priorities:', error);
    res.status(500).json({ error: 'Failed to fetch available priorities' });
  }
}

module.exports = {
  getAllParameters,
  createParameter,
  updateParameter,
  deleteParameter,
  getParameterCategoryMappings,
  getAllCategories,
  getParameterKeys,
  getAvailablePriorities
};