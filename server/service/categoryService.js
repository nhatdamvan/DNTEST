const categoryRepository = require('../repositories/categoryRepository');
const { getClient } = require('../config/database');

async function getAllCategories() {
  const { categories, mappings } = await categoryRepository.getAllCategories();
  return categories.map(category => {
    const parameters = mappings
      .filter(mapping => mapping.category_id === category.id)
      .map(mapping => ({
        parameter_id: mapping.parameter_id,
        parameter_key: mapping.parameter_key,
        parameter_text_mapping: mapping.parameter_text_mapping,
        unit: mapping.unit,
        reference_min: mapping.reference_min,
        reference_max: mapping.reference_max,
        display_order: mapping.display_order
      }));
    return { ...category, parameters };
  });
}

async function createCategory(data) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const category = await categoryRepository.insertCategory(client, data);
    console.log('Created category:', category);
    if (data.parameter_ids && data.parameter_ids.length > 0) {
      for (let i = 0; i < data.parameter_ids.length; i++) {
        await categoryRepository.insertCategoryParameterMapping(client, category.id, data.parameter_ids[i], i + 1);
        console.log(`Inserted mapping for category ${category.id} and parameter ${data.parameter_ids[i]}`);
      }
    }
    console.log('Inserted category-parameter mappings');
    await client.query('COMMIT');
    return category;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function updateCategory(id, data) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const category = await categoryRepository.updateCategory(client, id, data);
    if (!category) {
      await client.query('ROLLBACK');
      return null;
    }
    if (data.parameter_ids !== undefined) {
      await categoryRepository.deleteCategoryParameterMappings(client, id);
      for (let i = 0; i < data.parameter_ids.length; i++) {
        await categoryRepository.insertCategoryParameterMapping(client, id, data.parameter_ids[i], i + 1);
      }
    }
    await client.query('COMMIT');
    return category;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function deleteCategory(id) {
  const client = await getClient(); 
  try {
    await client.query('BEGIN');
    await categoryRepository.softDeleteCategory(id);
    await categoryRepository.deleteCategoryParameterMappings(client, id);
    await client.query('COMMIT');
    return { success: true, category_key: id };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function addParameterToCategory(id, parameter_id) {
  await categoryRepository.addParameterToCategory(id, parameter_id);
}

async function removeParameterFromCategory(id, parameterId) {
  await categoryRepository.removeParameterFromCategory(id, parameterId);
}

async function reorderParametersInCategory(id, parameter_ids) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    await categoryRepository.reorderParametersInCategory(client, id, parameter_ids);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  addParameterToCategory,
  removeParameterFromCategory,
  reorderParametersInCategory,
};