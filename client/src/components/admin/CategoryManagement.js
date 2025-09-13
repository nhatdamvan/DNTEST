// client/src/components/admin/CategoryManagement.js
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  ChevronDown,
  ChevronUp,
  Layers,
  Search,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Package,
  Grid3X3,
  Activity,
  Heart,
  Droplets,
  Shield,
  Zap,
  FlaskConical,
  Bug,
  Pill,
  Stethoscope,
  FileText
} from 'lucide-react';
import axios from 'axios';

const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [parameters, setParameters] = useState([]);
  const [parameterMappings, setParameterMappings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [availableParams, setAvailableParams] = useState([]);
  const [selectedParams, setSelectedParams] = useState([]);
  const [searchAvailable, setSearchAvailable] = useState('');
  const [searchSelected, setSearchSelected] = useState('');
  const [formData, setFormData] = useState({
    category_key: '',
    category_name: '',
    category_name_vi: '',
    description: '',
    icon: 'Layers',
    color: '#3b82f6'
  });

  // Icon mapping for rendering
  const iconMap = {
    'Layers': Layers,
    'Heart': Heart,
    'Droplets': Droplets,
    'Activity': Activity,
    'Shield': Shield,
    'Zap': Zap,
    'FlaskConical': FlaskConical,
    'Bug': Bug,
    'Pill': Pill,
    'Stethoscope': Stethoscope,
    'FileText': FileText,
    'Grid3X3': Grid3X3,
    'Package': Package
  };

  const availableIcons = Object.keys(iconMap);

  const colorOptions = [
    { value: '#ef4444', name: 'Red' },
    { value: '#f59e0b', name: 'Amber' },
    { value: '#10b981', name: 'Emerald' },
    { value: '#3b82f6', name: 'Blue' },
    { value: '#6366f1', name: 'Indigo' },
    { value: '#8b5cf6', name: 'Violet' },
    { value: '#ec4899', name: 'Pink' },
    { value: '#14b8a6', name: 'Teal' },
    { value: '#64748b', name: 'Slate' },
    { value: '#06b6d4', name: 'Cyan' }
  ];

  useEffect(() => {
    fetchCategories();
    fetchParameters();
    fetchParameterMappings();
  }, []);

  // useEffect(() => {
  //   // Update available parameters whenever categories or parameters change
  //   const assignedParameterIds = new Set();
  //   categories.forEach(category => {
  //     category.parameters?.forEach(param => {
  //       assignedParameterIds.add(param.parameter_id);
  //     });
  //   });

  //   const unassignedParams = parameters.filter(param => !assignedParameterIds.has(param.parameter_id));
  //   setAvailableParams(unassignedParams);
  // }, [categories, parameters]);

  useEffect(() => {
  if (parameters.length === 0) return;
  const mappedIds = new Set(parameterMappings.map(m => m.parameter_id));
  const unassignedParams = parameters.filter(param => !mappedIds.has(param.parameter_id));
  setAvailableParams(unassignedParams);
}, [parameters, parameterMappings]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/categories', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchParameters = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/parameter-master', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setParameters(response.data);
    } catch (error) {
      console.error('Error fetching parameters:', error);
    }
  };

  // Fetch all mappings
const fetchParameterMappings = async () => {
  try {
    const token = localStorage.getItem('adminToken');
    const response = await axios.get('/api/admin/parameter-category-mappings', {
      headers: { Authorization: `Bearer ${token}` }
    });
    setParameterMappings(response.data);
  } catch (error) {
    console.error('Error fetching parameter mappings:', error);
  }
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('adminToken');
      const requestData = {
        ...formData,
        parameter_ids: selectedParams.map(p => p.parameter_id)
      };
      
      if (editingId) {
        await axios.put(`/api/admin/categories/${editingId}`, requestData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post('/api/admin/categories', requestData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      resetForm();
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      alert(error.response?.data?.error || 'Failed to save category');
    }
  };

  const handleEdit = (category) => {
    // Get unassigned parameters plus parameters already in this category
    const assignedParameterIds = new Set();
    categories.forEach(cat => {
      if (cat.id !== category.id) {
        cat.parameters?.forEach(param => {
          assignedParameterIds.add(param.parameter_id);
        });
      }
    });

    const availableForEdit = parameters.filter(param => !assignedParameterIds.has(param.parameter_id));
    setAvailableParams(availableForEdit.filter(p => !category.parameters.some(cp => cp.parameter_id === p.parameter_id)));
    setSelectedParams(category.parameters || []);

    setFormData({
      category_key: category.category_key,
      category_name: category.category_name,
      category_name_vi: category.category_name_vi || '',
      description: category.description || '',
      icon: category.icon || 'Layers',
      color: category.color || '#3b82f6'
    });
    setEditingId(category.id);
    setShowForm(true);
  };

  const handleDelete = async (id, categoryName) => {
    if (window.confirm(`Are you sure you want to delete category "${categoryName}"? This will unassign all parameters from this category.`)) {
      try {
        const token = localStorage.getItem('adminToken');
        await axios.delete(`/api/admin/categories/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchCategories();
      } catch (error) {
        console.error('Error deleting category:', error);
        alert('Failed to delete category');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      category_key: '',
      category_name: '',
      category_name_vi: '',
      description: '',
      icon: 'Layers',
      color: '#3b82f6'
    });
    setSelectedParams([]);
    setSearchAvailable('');
    setSearchSelected('');
    setEditingId(null);
    setShowForm(false);
  };

  const toggleCategory = (categoryId) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Move parameter from available to selected
  const addParameter = (param) => {
    setAvailableParams(availableParams.filter(p => p.parameter_id !== param.parameter_id));
    setSelectedParams([...selectedParams, param]);
  };

  // Move parameter from selected to available
  const removeParameter = (param) => {
    setSelectedParams(selectedParams.filter(p => p.parameter_id !== param.parameter_id));
    setAvailableParams([...availableParams, param].sort((a, b) => 
      a.parameter_id.localeCompare(b.parameter_id)
    ));
  };

  // Move all parameters
  const addAllParameters = () => {
    const filtered = getFilteredAvailable();
    setSelectedParams([...selectedParams, ...filtered]);
    setAvailableParams(availableParams.filter(p => !filtered.includes(p)));
  };

  const removeAllParameters = () => {
    const filtered = getFilteredSelected();
    setAvailableParams([...availableParams, ...filtered].sort((a, b) => 
      a.parameter_id.localeCompare(b.parameter_id)
    ));
    setSelectedParams(selectedParams.filter(p => !filtered.includes(p)));
  };

  // Filter functions
  const getFilteredAvailable = () => {
    return availableParams.filter(param =>
      param.parameter_id.toLowerCase().includes(searchAvailable.toLowerCase()) ||
      param.parameter_key.toLowerCase().includes(searchAvailable.toLowerCase()) ||
      param.parameter_text_mapping.toLowerCase().includes(searchAvailable.toLowerCase())
    );
  };

  const getFilteredSelected = () => {
    return selectedParams.filter(param =>
      param.parameter_id.toLowerCase().includes(searchSelected.toLowerCase()) ||
      param.parameter_key.toLowerCase().includes(searchSelected.toLowerCase()) ||
      param.parameter_text_mapping.toLowerCase().includes(searchSelected.toLowerCase())
    );
  };

  const renderIcon = (iconName) => {
    const Icon = iconMap[iconName] || Layers;
    return <Icon className="w-5 h-5" />;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Category Management</h2>
        <p className="text-gray-600 text-lg">Organize parameters into logical health categories</p>
      </div>

      {/* Add Category Button */}
      <div className="mb-8">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg flex items-center gap-3 text-lg font-medium"
        >
          <Plus className="w-6 h-6" />
          Create New Category
        </motion.button>
      </div>

      {/* Add/Edit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                {editingId ? 'Edit Category' : 'Create New Category'}
              </h3>
              <button
                onClick={resetForm}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Category Key *
                  </label>
                  <input
                    type="text"
                    value={formData.category_key}
                    onChange={(e) => setFormData({ ...formData, category_key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="e.g., blood_count"
                    required
                    disabled={editingId}
                  />
                  <p className="text-xs text-gray-500 mt-1">Unique identifier, no spaces allowed</p>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    value={formData.category_name}
                    onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="e.g., Blood Count"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Display Name (Vietnamese)
                  </label>
                  <input
                    type="text"
                    value={formData.category_name_vi || ''}
                    onChange={(e) => setFormData({ ...formData, category_name_vi: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="e.g., Công thức máu"
                  />
                </div>
                <div></div>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  rows={3}
                  placeholder="Brief description of this category..."
                />
              </div>

              {/* Icon and Color Selection */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Icon
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {availableIcons.map(icon => (
                      <motion.button
                        key={icon}
                        type="button"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setFormData({ ...formData, icon })}
                        className={`p-3 rounded-xl border-2 transition-all ${
                          formData.icon === icon 
                            ? 'border-blue-500 bg-blue-50 text-blue-600' 
                            : 'border-gray-300 hover:border-gray-400 text-gray-600'
                        }`}
                      >
                        {renderIcon(icon)}
                      </motion.button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Color Theme
                  </label>
                  <div className="grid grid-cols-5 gap-3">
                    {colorOptions.map(({ value, name }) => (
                      <motion.button
                        key={value}
                        type="button"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setFormData({ ...formData, color: value })}
                        className={`relative h-12 rounded-xl border-2 transition-all ${
                          formData.color === value 
                            ? 'border-gray-800 scale-110' 
                            : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: value }}
                        title={name}
                      >
                        {formData.color === value && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-3 h-3 bg-white rounded-full" />
                          </div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Parameter Selection - Dual List */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-gray-700 mb-4">
                  Assign Parameters
                </label>
                
                <div className="grid grid-cols-5 gap-4">
                  {/* Available Parameters */}
                  <div className="col-span-2">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium text-gray-700">Available Parameters</h4>
                        <span className="text-sm text-gray-500">{getFilteredAvailable().length} items</span>
                      </div>
                      <div className="mb-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search parameters..."
                            value={searchAvailable}
                            onChange={(e) => setSearchAvailable(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                      </div>
                      <div className="bg-white rounded-lg border border-gray-200 h-80 overflow-y-auto">
                        {getFilteredAvailable().length === 0 ? (
                          <div className="p-4 text-center text-gray-500 text-sm">
                            {searchAvailable ? 'No matching parameters' : 'No available parameters'}
                          </div>
                        ) : (
                          <div className="p-2">
                            {getFilteredAvailable().map(param => (
                              <motion.div
                                key={param.parameter_id}
                                whileHover={{ backgroundColor: '#f3f4f6' }}
                                onClick={() => addParameter(param)}
                                className="p-3 rounded-lg cursor-pointer border border-transparent hover:border-gray-300 mb-2"
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900">{param.parameter_id}</div>
                                    <div className="text-sm text-gray-600">{param.parameter_key}</div>
                                    {param.unit && (
                                      <div className="text-xs text-gray-500 mt-1">Unit: {param.unit}</div>
                                    )}
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-gray-400 mt-1" />
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Transfer Buttons */}
                  <div className="flex flex-col items-center justify-center gap-4">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={addAllParameters}
                      disabled={getFilteredAvailable().length === 0}
                      className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Add all"
                    >
                      <ChevronRight className="w-5 h-5" />
                      <ChevronRight className="w-5 h-5 -ml-3" />
                    </motion.button>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={removeAllParameters}
                      disabled={getFilteredSelected().length === 0}
                      className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Remove all"
                    >
                      <ChevronLeft className="w-5 h-5" />
                      <ChevronLeft className="w-5 h-5 -ml-3" />
                    </motion.button>
                  </div>

                  {/* Selected Parameters */}
                  <div className="col-span-2">
                    <div className="bg-blue-50 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium text-gray-700">Selected Parameters</h4>
                        <span className="text-sm text-gray-500">{selectedParams.length} items</span>
                      </div>
                      <div className="mb-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search selected..."
                            value={searchSelected}
                            onChange={(e) => setSearchSelected(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                      </div>
                      <div className="bg-white rounded-lg border border-gray-200 h-80 overflow-y-auto">
                        {getFilteredSelected().length === 0 ? (
                          <div className="p-4 text-center text-gray-500 text-sm">
                            {searchSelected ? 'No matching parameters' : 'No parameters selected'}
                          </div>
                        ) : (
                          <div className="p-2">
                            {getFilteredSelected().map(param => (
                              <motion.div
                                key={param.parameter_id}
                                whileHover={{ backgroundColor: '#f3f4f6' }}
                                onClick={() => removeParameter(param)}
                                className="p-3 rounded-lg cursor-pointer border border-transparent hover:border-gray-300 mb-2"
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900">{param.parameter_id}</div>
                                    <div className="text-sm text-gray-600">{param.parameter_key}</div>
                                    {param.unit && (
                                      <div className="text-xs text-gray-500 mt-1">Unit: {param.unit}</div>
                                    )}
                                  </div>
                                  <ChevronLeft className="w-4 h-4 text-gray-400 mt-1" />
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>Click on parameters to move them between lists. Each parameter can only belong to one category.</span>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-4">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={resetForm}
                  className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all font-medium"
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-medium shadow-lg"
                >
                  {editingId ? 'Update Category' : 'Create Category'}
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-500">Loading categories...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl p-12 text-center">
            <Layers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-600">No categories created yet</p>
            <p className="text-gray-500 mt-2">Click "Create New Category" to get started</p>
          </div>
        ) : (
          categories.map((category) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-14 h-14 rounded-xl flex items-center justify-center shadow-sm"
                      style={{ backgroundColor: category.color + '20', color: category.color }}
                    >
                      {renderIcon(category.icon)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {category.category_name}
                        {category.category_name_vi && (
                          <span className="text-base font-normal text-gray-500 ml-2">
                            ({category.category_name_vi})
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center gap-4 mt-1">
                        <p className="text-sm text-gray-500">
                          <span className="font-medium">{category.parameters?.length || 0}</span> parameters
                        </p>
                        <p className="text-sm text-gray-400">
                          Key: <span className="font-mono">{category.category_key}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all"
                    >
                      {expandedCategories.has(category.id) ? 
                        <ChevronUp className="w-4 h-4" /> : 
                        <ChevronDown className="w-4 h-4" />
                      }
                    </button>
                    <button
                      onClick={() => handleEdit(category)}
                      className="p-1.5 text-[#174798] hover:text-[#0f2d52] hover:bg-blue-50 rounded transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id, category.category_name)}
                      className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {category.description && (
                  <p className="text-gray-600 mt-3 ml-18">{category.description}</p>
                )}
              </div>
              
              {/* Expanded Parameters List */}
              <AnimatePresence>
                {expandedCategories.has(category.id) && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="border-t border-gray-100 bg-gray-50 overflow-hidden"
                  >
                    <div className="p-4">
                      {category.parameters?.length === 0 ? (
                        <p className="text-center text-gray-500 py-4 text-sm">No parameters assigned to this category</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {category.parameters?.map((param) => (
                            <div key={param.parameter_id} className="bg-white rounded p-2 border border-gray-200">
                              <div className="font-medium text-xs text-gray-900">{param.parameter_id}</div>
                              <div className="text-xs text-gray-600 truncate">{param.parameter_key}</div>
                              <div className="flex items-center gap-2 mt-1">
                                {param.unit && (
                                  <span className="text-[10px] text-gray-500">{param.unit}</span>
                                )}
                                {(param.reference_min !== null || param.reference_max !== null) && (
                                  <span className="text-[10px] text-blue-600">
                                    {param.reference_min}-{param.reference_max}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default CategoryManagement;