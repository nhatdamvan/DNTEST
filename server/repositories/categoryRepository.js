const { query, getClient } = require('../config/database');

async function getAllCategories() {
  const categoriesResult = await query(`
    SELECT * FROM parameter_categories 
    WHERE is_active = true
    ORDER BY display_order
  `);
  const mappingsResult = await query(`
    SELECT 
      pcm.category_id,
      pcm.parameter_id,
      pcm.display_order,
      pm.parameter_key,
      pm.parameter_text_mapping,
      pm.unit,
      pm.reference_min,
      pm.reference_max
    FROM parameter_category_mappings pcm
    JOIN parameter_master pm ON pcm.parameter_id = pm.parameter_id
    ORDER BY pcm.category_id, pcm.display_order
  `);
  return { categories: categoriesResult.rows, mappings: mappingsResult.rows };
}

async function insertCategory(client, data) {
  const { category_key, category_name, category_name_vi, description, icon, color } = data;
  const result = await client.query(`
    INSERT INTO parameter_categories 
    (category_key, category_name, category_name_vi, description, icon, color, display_order)
    VALUES ($1, $2, $3, $4, $5, $6, (SELECT COALESCE(MAX(display_order), 0) + 1 FROM parameter_categories))
    RETURNING *
  `, [category_key, category_name, category_name_vi, description, icon, color]);
  return result.rows[0];
}

async function insertCategoryParameterMapping(client, categoryId, parameterId, displayOrder) {
  await client.query(`
    INSERT INTO parameter_category_mappings 
    (category_id, parameter_id, display_order)
    VALUES ($1, $2, $3)
  `, [categoryId, parameterId, displayOrder]);
}

async function updateCategory(client, id, data) {
  const { category_name, category_name_vi, description, icon, color, display_order } = data;
  const result = await client.query(`
    UPDATE parameter_categories 
    SET category_name = $2,
        category_name_vi = $3, 
        description = $4,
        icon = $5,
        color = $6,
        display_order = $7,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `, [id, category_name, category_name_vi, description, icon, color, display_order]);
  return result.rows[0];
}

async function deleteCategoryParameterMappings(client, categoryId) {
  await client.query(`
    DELETE FROM parameter_category_mappings WHERE category_id = $1
  `, [categoryId]);
}

async function softDeleteCategory(id) {
  const result = await query(`
    UPDATE parameter_categories 
    SET is_active = false, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING category_key
  `, [id]);

  
  return result.rows[0];
}

async function addParameterToCategory(id, parameter_id) {
  const orderResult = await query(`
    SELECT MAX(display_order) as max_order 
    FROM parameter_category_mappings 
    WHERE category_id = $1
  `, [id]);
  const nextOrder = (orderResult.rows[0].max_order || 0) + 1;
  await query(`
    INSERT INTO parameter_category_mappings 
    (category_id, parameter_id, display_order)
    VALUES ($1, $2, $3)
  `, [id, parameter_id, nextOrder]);
}

async function removeParameterFromCategory(id, parameterId) {
  await query(`
    DELETE FROM parameter_category_mappings 
    WHERE category_id = $1 AND parameter_id = $2
  `, [id, parameterId]);
}

async function reorderParametersInCategory(client, id, parameter_ids) {
  for (let i = 0; i < parameter_ids.length; i++) {
    await client.query(`
      UPDATE parameter_category_mappings 
      SET display_order = $3
      WHERE category_id = $1 AND parameter_id = $2
    `, [id, parameter_ids[i], i + 1]);
  }
}

module.exports = {
  getAllCategories,
  insertCategory,
  insertCategoryParameterMapping,
  updateCategory,
  deleteCategoryParameterMappings,
  softDeleteCategory,
  addParameterToCategory,
  removeParameterFromCategory,
  reorderParametersInCategory,
};