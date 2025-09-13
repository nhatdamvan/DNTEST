import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  Save, 
  Plus, 
  Trash2, 
  Edit2, 
  AlertCircle,
  Check,
  X,
  Info
} from 'lucide-react';
import axios from 'axios';

const HealthIndexConfig = () => {
  const [activeTab, setActiveTab] = useState('parameters');
  const [parameters, setParameters] = useState([]);
  const [combinations, setCombinations] = useState([]);
  const [availableParams, setAvailableParams] = useState([]);
  const [dataFetched, setDataFetched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Form states
  const [showComboForm, setShowComboForm] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);
  const [comboForm, setComboForm] = useState({
    rule_name: '',
    parameter_ids: [],
    trigger_type: 'all_out',
    trigger_threshold: '',
    combo_max: 60,
    scale_by_avg: false,
    is_active: true
  });

  useEffect(() => {
    if (!dataFetched) {
      fetchData();
    }
  }, [dataFetched]);

  const fetchData = async () => {
    console.log('[HealthIndexConfig] fetchData started');
    if (loading) {
      console.log('[HealthIndexConfig] Already loading, skipping duplicate fetch');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      console.log('[HealthIndexConfig] Token exists:', !!token);
      console.log('[HealthIndexConfig] Token length:', token?.length);
      
      if (!token) {
        console.error('[HealthIndexConfig] No admin token found. Please log in again.');
        setErrorMessage('Authentication required. Please log in again.');
        setLoading(false);
        // Redirect to login after 2 seconds
        setTimeout(() => {
          window.location.href = '/admin';
        }, 2000);
        return;
      }
      
      const headers = { Authorization: `Bearer ${token}` };
      console.log('[HealthIndexConfig] Request headers:', headers);

      // First, test if the API is reachable
      console.log('[HealthIndexConfig] Testing API connectivity...');
      try {
        const testRes = await axios.get('/api/health', { timeout: 5000 });
        console.log('[HealthIndexConfig] API health check:', testRes.data);
      } catch (testError) {
        console.error('[HealthIndexConfig] API health check failed:', testError.message);
        console.error('[HealthIndexConfig] This might indicate a network or server issue');
      }

      // Fetch both parameters and combinations
      console.log('[HealthIndexConfig] Fetching data from APIs...');
      
      try {
        console.log('[HealthIndexConfig] Starting parallel API calls for better performance...');
        console.time('[HealthIndexConfig] All API calls');
        
        // Execute all API calls in parallel for better performance
        const [paramsRes, combosRes, availableRes] = await Promise.all([
          axios.get('/api/admin/health-index/parameters', { 
            headers,
            timeout: 10000 // 10 second timeout
          }),
          axios.get('/api/admin/health-index/combinations', { 
            headers,
            timeout: 10000 // 10 second timeout
          }),
          axios.get('/api/admin/parameter-master', { 
            headers,
            timeout: 10000 // 10 second timeout
          })
        ]);
        
        console.timeEnd('[HealthIndexConfig] All API calls');
        
        console.log('[HealthIndexConfig] API responses received:');
        console.log('[HealthIndexConfig] - Parameters count:', Array.isArray(paramsRes.data) ? paramsRes.data.length : 'Not an array');
        console.log('[HealthIndexConfig] - Combinations count:', Array.isArray(combosRes.data) ? combosRes.data.length : 'Not an array');
        console.log('[HealthIndexConfig] - Available parameters count:', Array.isArray(availableRes.data) ? availableRes.data.length : 'Not an array');

        // Validate responses are arrays
        if (!Array.isArray(paramsRes.data)) {
          console.error('[HealthIndexConfig] Parameters response is not an array:', paramsRes.data);
          throw new Error('Invalid parameters response format');
        }
        if (!Array.isArray(combosRes.data)) {
          console.error('[HealthIndexConfig] Combinations response is not an array:', combosRes.data);
          throw new Error('Invalid combinations response format');
        }
        if (!Array.isArray(availableRes.data)) {
          console.error('[HealthIndexConfig] Available parameters response is not an array:', availableRes.data);
          throw new Error('Invalid available parameters response format');
        }

        setParameters(paramsRes.data);
        setCombinations(combosRes.data);
        setAvailableParams(availableRes.data);
        setDataFetched(true);
        
        console.log('[HealthIndexConfig] Data fetched successfully');
      } catch (apiError) {
        console.error('[HealthIndexConfig] API Error:', apiError);
        console.error('[HealthIndexConfig] API Error Message:', apiError.message);
        console.error('[HealthIndexConfig] API Error Code:', apiError.code);
        console.error('[HealthIndexConfig] API Error Response:', apiError.response);
        console.error('[HealthIndexConfig] API Error Status:', apiError.response?.status);
        console.error('[HealthIndexConfig] API Error Data:', apiError.response?.data);
        
        // Check for timeout
        if (apiError.code === 'ECONNABORTED') {
          console.error('[HealthIndexConfig] Request timeout - API took too long to respond');
        }
        
        throw apiError;
      }
    } catch (error) {
      console.error('[HealthIndexConfig] Error fetching Health Index config:', error);
      console.error('[HealthIndexConfig] Error type:', error.name);
      console.error('[HealthIndexConfig] Error message:', error.message);
      console.error('[HealthIndexConfig] Error stack:', error.stack);
      
      if (error.response?.status === 403) {
        console.error('[HealthIndexConfig] 403 Forbidden - Session expired');
        setErrorMessage('Session expired. Please log in again.');
        // Clear invalid token
        localStorage.removeItem('adminToken');
        // Redirect to login after 2 seconds
        setTimeout(() => {
          window.location.href = '/admin';
        }, 2000);
      } else if (error.response) {
        console.error('[HealthIndexConfig] Server error:', error.response.status, error.response.data);
        setErrorMessage(`Server error: ${error.response.data?.error || 'Failed to load configuration'}`);
      } else if (error.request) {
        console.error('[HealthIndexConfig] No response received:', error.request);
        setErrorMessage('No response from server. Please check your connection.');
      } else {
        console.error('[HealthIndexConfig] Request setup error:', error.message);
        setErrorMessage('Failed to load configuration: ' + error.message);
      }
    } finally {
      setLoading(false);
      console.log('[HealthIndexConfig] Loading complete');
    }
  };

  const updateParameter = async (paramId, field, value) => {
    try {
      const token = localStorage.getItem('adminToken');
      const param = parameters.find(p => p.parameter_id === paramId);
      
      await axios.put(
        `/api/admin/health-index/parameters/${paramId}`,
        { ...param, [field]: value },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setParameters(prev => 
        prev.map(p => p.parameter_id === paramId ? { ...p, [field]: value } : p)
      );
      
      showSuccess('Parameter updated successfully');
    } catch (error) {
      console.error('Error updating parameter:', error);
      showError('Failed to update parameter');
    }
  };

  const saveCombination = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Validate form
      if (!comboForm.rule_name || comboForm.parameter_ids.length < 2) {
        showError('Rule name and at least 2 parameters are required');
        return;
      }

      if (comboForm.trigger_type === 'avg_dev_ge_t' && !comboForm.trigger_threshold) {
        showError('Threshold is required for average deviation trigger');
        return;
      }

      const payload = {
        rule_name: comboForm.rule_name,
        members: { parameter_ids: comboForm.parameter_ids },
        trigger_type: comboForm.trigger_type,
        trigger_threshold: comboForm.trigger_type === 'avg_dev_ge_t' 
          ? parseFloat(comboForm.trigger_threshold) 
          : null,
        combo_max: parseFloat(comboForm.combo_max),
        scale_by_avg: comboForm.scale_by_avg,
        is_active: comboForm.is_active
      };

      if (editingCombo) {
        await axios.put(
          `/api/admin/health-index/combinations/${editingCombo.id}`,
          payload,
          { headers }
        );
      } else {
        await axios.post('/api/admin/health-index/combinations', payload, { headers });
      }

      showSuccess(`Combination ${editingCombo ? 'updated' : 'created'} successfully`);
      resetComboForm();
      fetchData();
    } catch (error) {
      console.error('Error saving combination:', error);
      showError('Failed to save combination');
    } finally {
      setSaving(false);
    }
  };

  const deleteCombination = async (id) => {
    if (!window.confirm('Are you sure you want to delete this combination rule?')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`/api/admin/health-index/combinations/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      showSuccess('Combination deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting combination:', error);
      showError('Failed to delete combination');
    }
  };

  const resetComboForm = () => {
    setShowComboForm(false);
    setEditingCombo(null);
    setComboForm({
      rule_name: '',
      parameter_ids: [],
      trigger_type: 'all_out',
      trigger_threshold: '',
      combo_max: 60,
      scale_by_avg: false,
      is_active: true
    });
  };

  const editCombination = (combo) => {
    setEditingCombo(combo);
    setComboForm({
      rule_name: combo.rule_name,
      parameter_ids: combo.members.parameter_ids || [],
      trigger_type: combo.trigger_type,
      trigger_threshold: combo.trigger_threshold || '',
      combo_max: combo.combo_max,
      scale_by_avg: combo.scale_by_avg,
      is_active: combo.is_active
    });
    setShowComboForm(true);
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const showError = (message) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(''), 5000);
  };

  const getTriggerDescription = (type) => {
    switch (type) {
      case 'all_out':
        return 'All parameters must be out of range';
      case 'any_two':
        return 'Any 2 or more parameters out of range';
      case 'avg_dev_ge_t':
        return 'Average deviation ≥ threshold';
      default:
        return '';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Health Index Configuration</h2>
        <p className="text-gray-600">Configure parameters and combination rules for Health Index calculation</p>
      </div>

      {/* Messages */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2"
          >
            <Check className="w-5 h-5 text-green-600" />
            <span className="text-green-800">{successMessage}</span>
          </motion.div>
        )}
        
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2"
          >
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{errorMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('parameters')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'parameters'
                ? 'text-[#174798] border-[#174798]'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            Included Parameters
          </button>
          <button
            onClick={() => setActiveTab('combinations')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'combinations'
                ? 'text-[#174798] border-[#174798]'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            Combination Rules
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#174798]"></div>
        </div>
      ) : (
        <>
          {/* Parameters Tab */}
          {activeTab === 'parameters' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200"
            >
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Parameter
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Unit
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Include
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Direction
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Max Penalty (pmax)
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Full Penalty % (k_full)
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Weight
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Active
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {parameters.map((param) => (
                      <tr key={param.parameter_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {param.parameter_key}
                            </div>
                            <div className="text-xs text-gray-500">
                              {param.parameter_id}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {param.unit || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={param.include_in_index}
                            onChange={(e) => updateParameter(param.parameter_id, 'include_in_index', e.target.checked)}
                            className="rounded border-gray-300 text-[#174798] focus:ring-[#174798]"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={param.direction}
                            onChange={(e) => updateParameter(param.parameter_id, 'direction', e.target.value)}
                            className="text-sm border-gray-300 rounded-md focus:ring-[#174798] focus:border-[#174798]"
                            disabled={!param.include_in_index}
                          >
                            <option value="high_bad">High Bad</option>
                            <option value="low_bad">Low Bad</option>
                            <option value="two_sided">Two Sided</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={param.pmax}
                            onChange={(e) => updateParameter(param.parameter_id, 'pmax', parseFloat(e.target.value))}
                            className="w-20 text-sm border-gray-300 rounded-md focus:ring-[#174798] focus:border-[#174798]"
                            min="0"
                            step="5"
                            disabled={!param.include_in_index}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={param.k_full}
                            onChange={(e) => updateParameter(param.parameter_id, 'k_full', parseFloat(e.target.value))}
                            className="w-20 text-sm border-gray-300 rounded-md focus:ring-[#174798] focus:border-[#174798]"
                            min="0.01"
                            max="1"
                            step="0.05"
                            disabled={!param.include_in_index}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={param.weight}
                            onChange={(e) => updateParameter(param.parameter_id, 'weight', parseFloat(e.target.value))}
                            className="w-20 text-sm border-gray-300 rounded-md focus:ring-[#174798] focus:border-[#174798]"
                            min="0.1"
                            step="0.1"
                            disabled={!param.include_in_index}
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={param.is_active}
                            onChange={(e) => updateParameter(param.parameter_id, 'is_active', e.target.checked)}
                            className="rounded border-gray-300 text-[#174798] focus:ring-[#174798]"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="p-4 bg-blue-50 border-t border-blue-200">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Parameter Configuration Guide:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li><strong>Direction:</strong> High Bad = penalty when above range, Low Bad = penalty when below range, Two Sided = penalty on both sides</li>
                      <li><strong>pmax:</strong> Maximum penalty points this parameter can contribute (default: 75)</li>
                      <li><strong>k_full:</strong> Percentage deviation for full penalty, e.g., 0.25 = 25% outside range gets full penalty</li>
                      <li><strong>Weight:</strong> Multiplier for this parameter's penalty (default: 1.0)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Combinations Tab */}
          {activeTab === 'combinations' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="mb-4">
                <button
                  onClick={() => setShowComboForm(true)}
                  className="px-4 py-2 bg-[#174798] text-white rounded-lg hover:bg-[#0f2d52] transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Combination Rule
                </button>
              </div>

              {/* Combination Form */}
              {showComboForm && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <h3 className="text-lg font-semibold mb-4">
                    {editingCombo ? 'Edit' : 'Add'} Combination Rule
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rule Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={comboForm.rule_name}
                        onChange={(e) => setComboForm({ ...comboForm, rule_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#174798] focus:border-transparent"
                        placeholder="e.g., Metabolic Risk"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Trigger Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={comboForm.trigger_type}
                        onChange={(e) => setComboForm({ ...comboForm, trigger_type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#174798] focus:border-transparent"
                      >
                        <option value="all_out">All Out of Range</option>
                        <option value="any_two">Any Two Out of Range</option>
                        <option value="avg_dev_ge_t">Average Deviation ≥ Threshold</option>
                      </select>
                    </div>
                    
                    {comboForm.trigger_type === 'avg_dev_ge_t' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Threshold (0-1) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={comboForm.trigger_threshold}
                          onChange={(e) => setComboForm({ ...comboForm, trigger_threshold: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#174798] focus:border-transparent"
                          min="0"
                          max="1"
                          step="0.1"
                          placeholder="e.g., 0.5"
                        />
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Penalty <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={comboForm.combo_max}
                        onChange={(e) => setComboForm({ ...comboForm, combo_max: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#174798] focus:border-transparent"
                        min="0"
                        step="5"
                        placeholder="e.g., 60"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Member Parameters <span className="text-red-500">*</span> (Select at least 2)
                    </label>
                    <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-3 bg-white border border-gray-300 rounded-lg">
                      {availableParams
                        .filter(p => parameters.find(hp => hp.parameter_id === p.parameter_id)?.include_in_index)
                        .map((param) => (
                          <label key={param.parameter_id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={comboForm.parameter_ids.includes(param.parameter_id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setComboForm({
                                    ...comboForm,
                                    parameter_ids: [...comboForm.parameter_ids, param.parameter_id]
                                  });
                                } else {
                                  setComboForm({
                                    ...comboForm,
                                    parameter_ids: comboForm.parameter_ids.filter(id => id !== param.parameter_id)
                                  });
                                }
                              }}
                              className="rounded border-gray-300 text-[#174798] focus:ring-[#174798]"
                            />
                            <span className="text-sm">{param.parameter_key}</span>
                          </label>
                        ))}
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center gap-6">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={comboForm.scale_by_avg}
                        onChange={(e) => setComboForm({ ...comboForm, scale_by_avg: e.target.checked })}
                        className="rounded border-gray-300 text-[#174798] focus:ring-[#174798]"
                      />
                      <span className="text-sm font-medium text-gray-700">Scale penalty by average severity</span>
                    </label>
                    
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={comboForm.is_active}
                        onChange={(e) => setComboForm({ ...comboForm, is_active: e.target.checked })}
                        className="rounded border-gray-300 text-[#174798] focus:ring-[#174798]"
                      />
                      <span className="text-sm font-medium text-gray-700">Active</span>
                    </label>
                  </div>
                  
                  <div className="mt-6 flex gap-2">
                    <button
                      onClick={saveCombination}
                      disabled={saving}
                      className="px-4 py-2 bg-[#174798] text-white rounded-lg hover:bg-[#0f2d52] transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving...' : 'Save Rule'}
                    </button>
                    <button
                      onClick={resetComboForm}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Combinations List */}
              <div className="space-y-4">
                {combinations.map((combo) => (
                  <motion.div
                    key={combo.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`p-4 bg-white rounded-lg border ${
                      combo.is_active ? 'border-gray-200' : 'border-gray-300 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{combo.rule_name}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {getTriggerDescription(combo.trigger_type)}
                          {combo.trigger_threshold && ` (threshold: ${combo.trigger_threshold})`}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {combo.members.parameter_ids.map(id => {
                            const param = availableParams.find(p => p.parameter_id === id);
                            return param ? (
                              <span key={id} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                {param.parameter_key}
                              </span>
                            ) : null;
                          })}
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-sm">
                          <span className="text-gray-600">
                            Max penalty: <strong>{combo.combo_max} pts</strong>
                          </span>
                          {combo.scale_by_avg && (
                            <span className="text-blue-600">
                              Scaled by average severity
                            </span>
                          )}
                          {!combo.is_active && (
                            <span className="text-red-600">
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => editCombination(combo)}
                          className="p-2 text-[#174798] hover:bg-blue-50 rounded-lg"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteCombination(combo.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {combinations.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No combination rules configured. Click "Add Combination Rule" to create one.
                </div>
              )}
            </motion.div>
          )}
        </>
      )}
    </div>
  );
};

export default HealthIndexConfig;