const { query, getClient } = require('../config/database');

async function getAllParameters() {
  console.time('[ParameterMaster] Query execution time');
  
  const result = await query(`
    SELECT 
      pm.*,
      STRING_AGG(pc.category_name, ', ' ORDER BY pc.category_name) as category_name,
      STRING_AGG(pc.category_key, ', ' ORDER BY pc.category_key) as category_key,
      STRING_AGG(pcm.category_id::text, ', ' ORDER BY pcm.category_id) as category_id,
      COALESCE(pus.can_delete, true) as can_delete
    FROM parameter_master pm
    LEFT JOIN parameter_category_mappings pcm ON pm.parameter_id = pcm.parameter_id
    LEFT JOIN parameter_categories pc ON pcm.category_id = pc.id
    LEFT JOIN parameter_usage_status pus ON pm.parameter_id = pus.parameter_id
    GROUP BY pm.id, pm.parameter_id, pm.parameter_key, pm.parameter_key_vi, pm.parameter_text_mapping, 
             pm.parameter_priority, pm.unit, pm.reference_min, pm.reference_max,
             pm.reference_min_male, pm.reference_max_male, pm.reference_min_female, 
             pm.reference_max_female, pm.created_at, pm.updated_at, pm.category_id,
             pus.can_delete
    ORDER BY pm.parameter_priority, pm.parameter_id
  `);
  
  console.timeEnd('[ParameterMaster] Query execution time');
  console.log(`[ParameterMaster] Retrieved ${result.rows.length} parameters`);
  
  return result.rows;
}

async function createParameter(data) {
  const { 
    parameter_id, parameter_key, parameter_key_vi, parameter_text_mapping, parameter_priority, unit, 
    reference_min, reference_max,
    reference_min_male, reference_max_male, reference_min_female, reference_max_female 
  } = data;
  
  // Use gender-specific values if provided, otherwise use general values for both
  const min_male = reference_min_male !== undefined ? reference_min_male : reference_min;
  const max_male = reference_max_male !== undefined ? reference_max_male : reference_max;
  const min_female = reference_min_female !== undefined ? reference_min_female : reference_min;
  const max_female = reference_max_female !== undefined ? reference_max_female : reference_max;
  
  const result = await query(`
    INSERT INTO parameter_master 
    (parameter_id, parameter_key, parameter_key_vi, parameter_text_mapping, parameter_priority, unit, 
     reference_min, reference_max, reference_min_male, reference_max_male, 
     reference_min_female, reference_max_female)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `, [parameter_id, parameter_key, parameter_key_vi, parameter_text_mapping, parameter_priority || 1, unit, 
      reference_min, reference_max, min_male, max_male, min_female, max_female]);
  return result.rows[0];
}

async function updateParameter(id, data) {
  const { 
    parameter_id, parameter_key, parameter_key_vi, parameter_text_mapping, parameter_priority, unit, 
    reference_min, reference_max, reference_min_male, reference_max_male, 
    reference_min_female, reference_max_female, category_id 
  } = data;
  
  // Get a client for transaction
  const client = await getClient();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    // Get current parameter with all fields
    const currentParam = await client.query('SELECT * FROM parameter_master WHERE id = $1', [id]);
    if (!currentParam.rows[0]) {
      throw new Error('Parameter not found');
    }
    const oldParam = currentParam.rows[0];
    const oldParameterId = oldParam.parameter_id;
    
    // Don't allow parameter_id updates as it's a primary identifier with foreign key constraints
    if (parameter_id && parameter_id !== oldParameterId) {
      throw new Error('Parameter ID cannot be changed once created. It is referenced by other tables.');
    }
    
    // Update parameter_master (without changing parameter_id)
    const updateQuery = `UPDATE parameter_master 
         SET parameter_key = $2,
             parameter_key_vi = $3, 
             parameter_text_mapping = $4, 
             parameter_priority = $5,
             unit = $6,
             reference_min = $7,
             reference_max = $8,
             reference_min_male = $9,
             reference_max_male = $10,
             reference_min_female = $11,
             reference_max_female = $12,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`;
    
    // Use gender-specific values if explicitly provided, otherwise keep existing values
    const min_male = reference_min_male !== undefined ? reference_min_male : oldParam.reference_min_male;
    const max_male = reference_max_male !== undefined ? reference_max_male : oldParam.reference_max_male;
    const min_female = reference_min_female !== undefined ? reference_min_female : oldParam.reference_min_female;
    const max_female = reference_max_female !== undefined ? reference_max_female : oldParam.reference_max_female;
    
    const params = [id, parameter_key, parameter_key_vi, parameter_text_mapping, parameter_priority, unit, 
                    reference_min, reference_max, min_male, max_male, min_female, max_female];
    
    // Update the parameter_master table
    const result = await client.query(updateQuery, params);
    
    // Handle category mapping
    if (category_id !== undefined) {
      // Delete existing mapping
      await client.query(
        'DELETE FROM parameter_category_mappings WHERE parameter_id = $1',
        [parameter_id || oldParameterId]
      );
      
      // Add new mapping if category_id is provided
      if (category_id) {
        await client.query(
          'INSERT INTO parameter_category_mappings (parameter_id, category_id) VALUES ($1, $2)',
          [parameter_id || oldParameterId, category_id]
        );
      }
    }
    
    await client.query('COMMIT');
    
    // Return updated parameter with category info
    const updatedParam = await query(`
      SELECT 
        pm.*,
        pc.category_name,
        pc.category_key,
        pcm.category_id
      FROM parameter_master pm
      LEFT JOIN parameter_category_mappings pcm ON pm.parameter_id = pcm.parameter_id
      LEFT JOIN parameter_categories pc ON pcm.category_id = pc.id
      WHERE pm.id = $1
    `, [id]);
    
    return updatedParam.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

async function deleteParameter(id) {
  const result = await query(
    `DELETE FROM parameter_master WHERE id = $1 RETURNING parameter_id`,
    [id]
  );
  return result.rows[0];
}

async function getParameterCategoryMappings() {
  const result = await query(`
    SELECT pcm.parameter_id, pcm.category_id
    FROM parameter_category_mappings pcm
    `);
  return result.rows;
}

async function getAllCategories() {
  const result = await query(`
    SELECT id, category_key, category_name 
    FROM parameter_categories 
    WHERE is_active = true 
    ORDER BY display_order, category_name
  `);
  return result.rows;
}

module.exports = {
  getAllParameters,
  createParameter,
  updateParameter,
  deleteParameter,
  getParameterCategoryMappings,
  getAllCategories
};