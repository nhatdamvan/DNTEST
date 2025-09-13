import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Edit2, Trash2, Save, X, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';

const ParameterMaster = () => {
  const [parameters, setParameters] = useState([]);
  const [categories, setCategories] = useState([]);
  const [availablePriorities, setAvailablePriorities] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [formData, setFormData] = useState({
    parameter_id: '',
    parameter_key: '',
    parameter_key_vi: '',
    parameter_text_mapping: '',
    parameter_priority: 1,
    unit: '',
    reference_min: '',
    reference_max: '',
    reference_min_male: '',
    reference_max_male: '',
    reference_min_female: '',
    reference_max_female: '',
    category_id: ''
  });
  const [sameAsDefault, setSameAsDefault] = useState({ male: false, female: false });

  // Fetch parameters and categories on component mount
  useEffect(() => {
    fetchParameters();
    fetchCategories();
  }, []);

  // Fetch available priorities when form is shown or editing changes
  useEffect(() => {
    if (showAddForm) {
      fetchAvailablePriorities(editingId);
    }
  }, [showAddForm, editingId]);

  // Handle copying default values when checkbox is checked or default values change
  useEffect(() => {
    if (sameAsDefault.male) {
      setFormData(prev => ({
        ...prev,
        reference_min_male: prev.reference_min,
        reference_max_male: prev.reference_max
      }));
    }
    if (sameAsDefault.female) {
      setFormData(prev => ({
        ...prev,
        reference_min_female: prev.reference_min,
        reference_max_female: prev.reference_max
      }));
    }
  }, [formData.reference_min, formData.reference_max, sameAsDefault]);

  const fetchParameters = async () => {
    console.log('[ParameterMaster] Fetching parameters...');
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/parameter-master', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('[ParameterMaster] Parameters fetched:', response.data.length);
      if (response.data.length > 0) {
        console.log('[ParameterMaster] Sample parameter:', response.data[0]);
      }
      setParameters(response.data);
    } catch (error) {
      console.error('[ParameterMaster] Error fetching parameters:', error);
      console.error('[ParameterMaster] Error response:', error.response?.data);
      alert('Failed to fetch parameters: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/parameter-categories', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchAvailablePriorities = async (excludeId = null) => {
    try {
      const token = localStorage.getItem('adminToken');
      const url = excludeId 
        ? `/api/admin/parameter-priorities?excludeId=${excludeId}`
        : '/api/admin/parameter-priorities';
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailablePriorities(response.data);
      
      // If no priority is set in form, set the first available one
      if (!formData.parameter_priority && response.data.length > 0) {
        setFormData(prev => ({ ...prev, parameter_priority: response.data[0] }));
      }
    } catch (error) {
      console.error('Error fetching available priorities:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('[ParameterMaster] Submitting form:', formData);
    console.log('[ParameterMaster] Editing ID:', editingId);
    
    try {
      const token = localStorage.getItem('adminToken');
      
      // Convert numeric fields to numbers or null
      const dataToSubmit = {
        ...formData,
        parameter_priority: formData.parameter_priority ? parseInt(formData.parameter_priority) : 1,
        reference_min: formData.reference_min !== '' ? parseFloat(formData.reference_min) : null,
        reference_max: formData.reference_max !== '' ? parseFloat(formData.reference_max) : null,
        reference_min_male: formData.reference_min_male !== '' ? parseFloat(formData.reference_min_male) : null,
        reference_max_male: formData.reference_max_male !== '' ? parseFloat(formData.reference_max_male) : null,
        reference_min_female: formData.reference_min_female !== '' ? parseFloat(formData.reference_min_female) : null,
        reference_max_female: formData.reference_max_female !== '' ? parseFloat(formData.reference_max_female) : null,
        category_id: formData.category_id || null
      };
      
      console.log('[ParameterMaster] Data to submit:', dataToSubmit);
      
      if (editingId) {
        // Update existing parameter
        console.log('[ParameterMaster] Updating parameter:', editingId);
        const response = await axios.put(`/api/admin/parameter-master/${editingId}`, dataToSubmit, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('[ParameterMaster] Update response:', response.data);
      } else {
        // Create new parameter
        console.log('[ParameterMaster] Creating new parameter');
        const response = await axios.post('/api/admin/parameter-master', dataToSubmit, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('[ParameterMaster] Create response:', response.data);
      }
      
      // Reset form and refresh list
      resetForm();
      fetchParameters();
    } catch (error) {
      console.error('[ParameterMaster] Error saving parameter:', error);
      console.error('[ParameterMaster] Error response:', error.response?.data);
      alert(error.response?.data?.error || 'Failed to save parameter');
    }
  };

  const handleEdit = (param) => {
    setFormData({
      parameter_id: param.parameter_id,
      parameter_key: param.parameter_key,
      parameter_key_vi: param.parameter_key_vi || '',
      parameter_text_mapping: param.parameter_text_mapping,
      parameter_priority: param.parameter_priority || 1,
      unit: param.unit || '',
      reference_min: param.reference_min || '',
      reference_max: param.reference_max || '',
      reference_min_male: param.reference_min_male !== null && param.reference_min_male !== undefined ? param.reference_min_male : '',
      reference_max_male: param.reference_max_male !== null && param.reference_max_male !== undefined ? param.reference_max_male : '',
      reference_min_female: param.reference_min_female !== null && param.reference_min_female !== undefined ? param.reference_min_female : '',
      reference_max_female: param.reference_max_female !== null && param.reference_max_female !== undefined ? param.reference_max_female : '',
      category_id: param.category_id || ''
    });
    
    // Check if gender-specific values match default values
    const maleMatchesDefault = 
      param.reference_min_male === param.reference_min && 
      param.reference_max_male === param.reference_max;
    const femaleMatchesDefault = 
      param.reference_min_female === param.reference_min && 
      param.reference_max_female === param.reference_max;
    
    setSameAsDefault({ 
      male: maleMatchesDefault && param.reference_min_male !== null && param.reference_min_male !== undefined,
      female: femaleMatchesDefault && param.reference_min_female !== null && param.reference_min_female !== undefined
    });
    
    setEditingId(param.id);
    setShowAddForm(true);
  };

  const handleDelete = async (id, parameterId) => {
    if (window.confirm(`Are you sure you want to delete parameter ${parameterId}?`)) {
      try {
        const token = localStorage.getItem('adminToken');
        await axios.delete(`/api/admin/parameter-master/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchParameters();
      } catch (error) {
        console.error('Error deleting parameter:', error);
        if (error.response && error.response.status === 400) {
          alert(error.response.data.error || 'Cannot delete this parameter');
        } else {
          alert('Failed to delete parameter');
        }
      }
    }
  };

  const resetForm = () => {
    setFormData({
      parameter_id: '',
      parameter_key: '',
      parameter_key_vi: '',
      parameter_text_mapping: '',
      parameter_priority: 1,
      unit: '',
      reference_min: '',
      reference_max: '',
      reference_min_male: '',
      reference_max_male: '',
      reference_min_female: '',
      reference_max_female: '',
      category_id: ''
    });
    setSameAsDefault({ male: false, female: false });
    setEditingId(null);
    setShowAddForm(false);
  };

  // Filter parameters based on search term
  const filteredParameters = parameters.filter(param =>
    param.parameter_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    param.parameter_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    param.parameter_text_mapping.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredParameters.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedParameters = filteredParameters.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Parameter Master</h2>
        <p className="text-gray-600">Manage parameter mappings for lab test results</p>
      </div>

      {/* Search and Add Button */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search parameters..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#174798] focus:border-[#174798]"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowAddForm(true);
            fetchAvailablePriorities();
          }}
          className="bg-[#174798] text-white px-6 py-2 rounded-lg hover:bg-[#0f2d52] transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Parameter
        </button>
      </div>

      {/* Add/Edit Form */}
      <AnimatePresence>
      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-200"
        >
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? 'Edit Parameter' : 'Add New Parameter'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parameter ID <span className="text-red-500">*</span> {editingId && <span className="text-xs text-gray-500">(cannot be changed)</span>}
              </label>
              <input
                type="text"
                value={formData.parameter_id}
                onChange={(e) => setFormData({ ...formData, parameter_id: e.target.value })}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#174798] ${
                  editingId ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                placeholder="e.g., P001"
                required
                disabled={editingId}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parameter Key <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.parameter_key}
                onChange={(e) => setFormData({ ...formData, parameter_key: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#174798]"
                placeholder="e.g., HbA1c"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parameter Key (Vietnamese)
              </label>
              <input
                type="text"
                value={formData.parameter_key_vi || ''}
                onChange={(e) => setFormData({ ...formData, parameter_key_vi: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#174798]"
                placeholder="e.g., HbA1c"
              />
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parameter Text Mapping <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.parameter_text_mapping}
                onChange={(e) => setFormData({ ...formData, parameter_text_mapping: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#174798]"
                placeholder="e.g., HbA1c,A1C,Glycated Hemoglobin,Hemoglobin A1c"
                rows={2}
                required
              />
              <p className="text-xs text-gray-500 mt-1">Comma-separated list of alternative names</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.parameter_priority}
                onChange={(e) => setFormData({ ...formData, parameter_priority: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#174798]"
                required
              >
                {/* Show current priority if editing, even if it's taken */}
                {editingId && formData.parameter_priority && (
                  <option value={formData.parameter_priority}>
                    {formData.parameter_priority} (current)
                  </option>
                )}
                {/* Show available priorities */}
                {availablePriorities.map(priority => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Priority determines the order in key metrics display (top 3 shown)
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#174798]"
                placeholder="e.g., mg/dL, %"
                required
              />
            </div>
            
            <div className="col-span-2">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Reference Ranges</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Min <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.reference_min}
                    onChange={(e) => setFormData({ ...formData, reference_min: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#174798]"
                    placeholder="Default minimum"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Max <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.reference_max}
                    onChange={(e) => setFormData({ ...formData, reference_max: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#174798]"
                    placeholder="Default maximum"
                    required
                  />
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-700 mt-2 bg-yellow-50 p-2 rounded-lg border border-yellow-200">
                ⚠️ Default range is used if no gender-specific range is set below
              </p>
            </div>
            
            <div className="col-span-2">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Gender-Specific Ranges</h4>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-medium text-blue-900">Male</h5>
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={sameAsDefault.male}
                        onChange={(e) => setSameAsDefault({ ...sameAsDefault, male: e.target.checked })}
                        className="rounded border-gray-300 text-[#174798] focus:ring-[#174798]"
                      />
                      <span className="text-gray-600">Same as default</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Min
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={formData.reference_min_male}
                        onChange={(e) => {
                          if (!sameAsDefault.male) {
                            setFormData({ ...formData, reference_min_male: e.target.value });
                          }
                        }}
                        disabled={sameAsDefault.male}
                        className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#174798] ${sameAsDefault.male ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        placeholder={formData.reference_min || "Min"}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Max
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={formData.reference_max_male}
                        onChange={(e) => {
                          if (!sameAsDefault.male) {
                            setFormData({ ...formData, reference_max_male: e.target.value });
                          }
                        }}
                        disabled={sameAsDefault.male}
                        className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#174798] ${sameAsDefault.male ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        placeholder={formData.reference_max || "Max"}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="bg-pink-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-medium text-pink-900">Female</h5>
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={sameAsDefault.female}
                        onChange={(e) => setSameAsDefault({ ...sameAsDefault, female: e.target.checked })}
                        className="rounded border-gray-300 text-[#174798] focus:ring-[#174798]"
                      />
                      <span className="text-gray-600">Same as default</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Min
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={formData.reference_min_female}
                        onChange={(e) => {
                          if (!sameAsDefault.female) {
                            setFormData({ ...formData, reference_min_female: e.target.value });
                          }
                        }}
                        disabled={sameAsDefault.female}
                        className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#174798] ${sameAsDefault.female ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        placeholder={formData.reference_min || "Min"}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Max
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={formData.reference_max_female}
                        onChange={(e) => {
                          if (!sameAsDefault.female) {
                            setFormData({ ...formData, reference_max_female: e.target.value });
                          }
                        }}
                        disabled={sameAsDefault.female}
                        className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#174798] ${sameAsDefault.female ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        placeholder={formData.reference_max || "Max"}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Leave empty to use default values for that gender</p>
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#174798]"
                required
              >
                <option value="">Select a Category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.category_name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Assign this parameter to a category</p>
            </div>
            
            <div className="col-span-2 flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#174798] text-white rounded-lg hover:bg-[#0f2d52] transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editingId ? 'Update' : 'Save'}
              </button>
            </div>
          </form>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Parameters Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200"
        style={{ maxHeight: '600px', overflowY: 'auto' }}
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Parameters ({filteredParameters.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                  Key / VI
                </th>
                <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                  Mappings
                </th>
                <th className="px-2 py-2 text-center font-medium text-gray-500 uppercase tracking-wider w-12">
                  Pri
                </th>
                <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                  Unit / Range
                </th>
                <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-2 py-2 text-center font-medium text-gray-500 uppercase tracking-wider w-20">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    Loading parameters...
                  </td>
                </tr>
              ) : paginatedParameters.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    No parameters found
                  </td>
                </tr>
              ) : (
                paginatedParameters.map((param, index) => (
                  <tr key={`${param.id}-${index}`} className="hover:bg-gray-50">
                    <td className="px-2 py-2 text-gray-900 font-medium">
                      {param.parameter_id}
                    </td>
                    <td className="px-2 py-2">
                      <div className="text-gray-900 font-medium">{param.parameter_key}</div>
                      {param.parameter_key_vi && (
                        <div className="text-gray-500 text-xs">{param.parameter_key_vi}</div>
                      )}
                    </td>
                    <td className="px-2 py-2 text-gray-500">
                      <div className="max-w-[200px] truncate" title={param.parameter_text_mapping}>
                        {param.parameter_text_mapping}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-center text-gray-700 font-semibold">
                      {param.parameter_priority}
                    </td>
                    <td className="px-2 py-2">
                      <div className="text-gray-700">{param.unit || '-'}</div>
                      {param.reference_min && param.reference_max && (
                        <div className="text-gray-500 text-xs">
                          {param.reference_min}-{param.reference_max}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2 text-gray-600">
                      <div className="max-w-[120px] truncate" title={param.category_name}>
                        {param.category_name || '-'}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        onClick={() => handleEdit(param)}
                        className="text-[#174798] hover:text-[#0f2d52] mr-2"
                        title="Edit"
                      >
                        <Edit2 className="w-3 h-3 inline" />
                      </button>
                      <button
                        onClick={() => handleDelete(param.id, param.parameter_id)}
                        className={`${
                          param.can_delete === false
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-red-600 hover:text-red-900'
                        }`}
                        disabled={param.can_delete === false}
                        title={param.can_delete === false ? 'Cannot delete - has associated user data' : 'Delete parameter'}
                      >
                        <Trash2 className="w-3 h-3 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredParameters.length)} of {filteredParameters.length} parameters
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            {[...Array(totalPages)].map((_, index) => {
              const page = index + 1;
              if (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1)
              ) {
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-[#174798] text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                );
              } else if (page === currentPage - 2 || page === currentPage + 2) {
                return <span key={page} className="px-1 text-gray-400">...</span>;
              }
              return null;
            })}
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParameterMaster;