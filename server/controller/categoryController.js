const categoryService = require('../service/categoryService');

async function getAllCategories(req, res) {
  try {
    const categories = await categoryService.getAllCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
}

async function createCategory(req, res) {
  try {
    const category = await categoryService.createCategory(req.body);
    res.json({ success: true, category });
  } catch (error) {
    console.error('Error creating category:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'Category key already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create category' });
    }
  }
}

async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const category = await categoryService.updateCategory(id, req.body);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({ success: true, category });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
}

async function deleteCategory(req, res) {
  try {
    const { id } = req.params;
    const deleted = await categoryService.deleteCategory(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({ success: true, deleted: deleted.category_key });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
}

async function addParameterToCategory(req, res) {
  try {
    const { id } = req.params;
    const { parameter_id } = req.body;
    await categoryService.addParameterToCategory(id, parameter_id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding parameter to category:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'Parameter already in this category' });
    } else {
      res.status(500).json({ error: 'Failed to add parameter' });
    }
  }
}

async function removeParameterFromCategory(req, res) {
  try {
    const { id, parameterId } = req.params;
    await categoryService.removeParameterFromCategory(id, parameterId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing parameter from category:', error);
    res.status(500).json({ error: 'Failed to remove parameter' });
  }
}

async function reorderParametersInCategory(req, res) {
  try {
    const { id } = req.params;
    const { parameter_ids } = req.body;
    await categoryService.reorderParametersInCategory(id, parameter_ids);
    res.json({ success: true });
  } catch (error) {
    console.error('Error reordering parameters:', error);
    res.status(500).json({ error: 'Failed to reorder parameters' });
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