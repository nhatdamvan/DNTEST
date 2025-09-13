import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  User,
  Mail,
  Phone,
  Building2,
  FileText,
  Edit2,
  Trash2,
  Save,
  X,
  AlertCircle,
  Activity,
  ChevronDown
} from 'lucide-react';
import axios from 'axios';

const UserDetails = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedReport, setSelectedReport] = useState(null);
  const [labParameters, setLabParameters] = useState([]);
  const [editingParam, setEditingParam] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [error, setError] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');
  const [showAddParameter, setShowAddParameter] = useState(false);
  const [newParameter, setNewParameter] = useState({
    parameter_name: '',
    parameter_value: '',
    unit: ''
  });
  const [availableParameters, setAvailableParameters] = useState([]);
  const [addingParameter, setAddingParameter] = useState(false);

  useEffect(() => {
    console.log('[UserDetails] Component mounted/updated for user:', userId);
    fetchUserData();
    fetchAvailableParameters();
  }, [userId]);

  useEffect(() => {
    if (reports.length > 0 && selectedYear) {
      const yearReports = reports.filter(r => 
        new Date(r.test_date).getFullYear() === selectedYear
      );
      if (yearReports.length > 0 && !selectedReport) {
        setSelectedReport(yearReports[0].report_id);
      }
    }
  }, [reports, selectedYear]);

  useEffect(() => {
    if (selectedReport) {
      fetchLabParameters();
    }
  }, [selectedReport]);

  const fetchUserData = async () => {
    console.log('[UserDetails] Starting fetchUserData for user:', userId);
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      
      // Fetch user details
      console.log('[UserDetails] Fetching user details...');
      const userResponse = await axios.get(`/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('[UserDetails] User data:', userResponse.data);
      setUser(userResponse.data);

      // Fetch user reports
      console.log('[UserDetails] Fetching user reports...');
      const reportsResponse = await axios.get(`/api/admin/users/${userId}/reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('[UserDetails] Reports data:', reportsResponse.data);
      setReports(reportsResponse.data);
      
      // Set the latest year as default
      if (reportsResponse.data.length > 0) {
        const years = [...new Set(reportsResponse.data.map(r => 
          new Date(r.test_date).getFullYear()
        ))];
        const latestYear = Math.max(...years);
        console.log('[UserDetails] Setting selected year:', latestYear);
        setSelectedYear(latestYear);
      } else {
        console.log('[UserDetails] No reports found for user');
      }
    } catch (error) {
      console.error('[UserDetails] Error fetching user data:', error);
      console.error('[UserDetails] Error response:', error.response?.data);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableParameters = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/parameter-master', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableParameters(response.data.sort((a, b) => 
        a.parameter_key.localeCompare(b.parameter_key)
      ));
    } catch (error) {
      console.error('[UserDetails] Error fetching available parameters:', error);
    }
  };

  const fetchLabParameters = async () => {
    console.log('[UserDetails] Fetching lab parameters for report:', selectedReport);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`/api/admin/reports/${selectedReport}/parameters`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('[UserDetails] Lab parameters response:', response.data);
      console.log('[UserDetails] Number of parameters:', response.data.length);
      if (response.data.length > 0) {
        console.log('[UserDetails] Sample parameter:', response.data[0]);
      }
      setLabParameters(response.data);
    } catch (error) {
      console.error('[UserDetails] Error fetching lab parameters:', error);
      console.error('[UserDetails] Error response:', error.response?.data);
    }
  };

  const sendReportEmail = async () => {
    setSendingEmail(true);
    setEmailMessage('');
    try {
      const response = await axios.post(`/api/admin/users/${userId}/send-report-email`);
      if (response.data.success) {
        setEmailMessage('Report ready email sent successfully!');
        setTimeout(() => setEmailMessage(''), 5000);
      }
    } catch (error) {
      console.error('[UserDetails] Send email error:', error);
      setEmailMessage(
        error.response?.data?.error || 'Failed to send email'
      );
      setTimeout(() => setEmailMessage(''), 5000);
    } finally {
      setSendingEmail(false);
    }
  };

  const updateParameter = async (paramId) => {
    console.log('[UserDetails] Updating parameter:', paramId, 'with value:', editValue);
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.put(`/api/admin/lab-parameters/${paramId}`, 
        { parameter_value: editValue },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('[UserDetails] Parameter updated successfully:', response.data);
      
      // Show success message with updated values
      if (response.data.updated) {
        const { health_score, biological_age } = response.data.updated;
        alert(`Parameter updated successfully!\n\nRecalculated values:\n• Health Score: ${health_score}\n• Biological Age: ${biological_age}`);
      }
      
      setEditingParam(null);
      setEditValue('');
      
      // Refresh both parameters and reports to show new health score
      await Promise.all([
        fetchLabParameters(),
        fetchUserData()
      ]);
    } catch (error) {
      console.error('[UserDetails] Error updating parameter:', error);
      console.error('[UserDetails] Error response:', error.response?.data);
      alert('Failed to update parameter: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const deleteReport = async (reportId) => {
    // Check if user has minimum 2 reports
    if (reports.length <= 1) {
      alert('User must have at least one report. Cannot delete the last report.');
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      // Using POST instead of DELETE to avoid proxy issues
      await axios.post(`/api/admin/reports/${reportId}/delete`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setDeleteConfirm(null);
      fetchUserData();
      
      // If deleted report was selected, select another
      if (selectedReport === reportId) {
        const remainingReports = reports.filter(r => r.report_id !== reportId);
        if (remainingReports.length > 0) {
          setSelectedReport(remainingReports[0].report_id);
        }
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Failed to delete report');
    }
  };

  const addParameter = async () => {
    if (!newParameter.parameter_name || !newParameter.parameter_value) {
      alert('Parameter name and value are required');
      return;
    }
    
    setAddingParameter(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.post(
        `/api/admin/reports/${selectedReport}/parameters`,
        newParameter,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        // Refresh parameters
        await fetchLabParameters();
        
        // Update report scores if they changed
        if (response.data.updated_scores) {
          setReports(reports.map(r => 
            r.report_id === selectedReport 
              ? { ...r, 
                  health_score: response.data.updated_scores.health_score,
                  biological_age: response.data.updated_scores.biological_age
                }
              : r
          ));
        }
        
        // Reset form
        setNewParameter({ parameter_name: '', parameter_value: '', unit: '' });
        setShowAddParameter(false);
        
        alert('Parameter added successfully');
      }
    } catch (error) {
      console.error('[UserDetails] Error adding parameter:', error);
      alert(error.response?.data?.error || 'Failed to add parameter');
    } finally {
      setAddingParameter(false);
    }
  };

  // Get unique years from reports
  const availableYears = [...new Set(reports.map(r => 
    new Date(r.test_date).getFullYear()
  ))].sort((a, b) => b - a);

  // Get reports for selected year
  const yearReports = reports.filter(r => 
    new Date(r.test_date).getFullYear() === selectedYear
  );

  // Group parameters by category
  const groupedParameters = labParameters.reduce((acc, param) => {
    const category = param.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(param);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#174798]"></div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-lg text-gray-600">{error || 'User not found'}</p>
        <button
          onClick={() => navigate('/admin/users')}
          className="mt-4 px-4 py-2 bg-[#174798] text-white rounded-lg hover:bg-[#0f2d52]"
        >
          Back to Users
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin', { state: { activeTab: 'users' } })}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to User Management
        </button>
        <h1 className="text-3xl font-bold text-gray-900">User Details</h1>
      </div>

      {/* User Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <User className="w-4 h-4" />
              <span className="text-sm">Name</span>
            </div>
            <p className="font-medium text-gray-900">
              {user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim()}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Mail className="w-4 h-4" />
              <span className="text-sm">Email</span>
            </div>
            <p className="font-medium text-gray-900">{user.email}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Phone className="w-4 h-4" />
              <span className="text-sm">Phone</span>
            </div>
            <p className="font-medium text-gray-900">{user.phone || '-'}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Building2 className="w-4 h-4" />
              <span className="text-sm">Company</span>
            </div>
            <p className="font-medium text-gray-900">{user.company_id}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <User className="w-4 h-4" />
              <span className="text-sm">User ID</span>
            </div>
            <p className="font-medium text-gray-900">{user.user_id}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">Gender</span>
            </div>
            <p className="font-medium text-gray-900">{user.gender || '-'}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">Date of Birth</span>
            </div>
            <p className="font-medium text-gray-900">
              {user.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString() : '-'}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <FileText className="w-4 h-4" />
              <span className="text-sm">Total Reports</span>
            </div>
            <p className="font-medium text-gray-900">{reports.length}</p>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={sendReportEmail}
            disabled={sendingEmail || !user.email}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              sendingEmail || !user.email
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-[#174798] text-white hover:bg-[#0f2d52]'
            }`}
          >
            <Mail className="w-4 h-4" />
            {sendingEmail ? 'Sending...' : 'Send Report Email'}
          </button>
          
          {emailMessage && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`text-sm ${
                emailMessage.includes('success') ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {emailMessage}
            </motion.span>
          )}
        </div>
      </motion.div>

      {/* Year and Report Selection */}
      {reports.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Health Reports</h2>
          
          {/* Year Dropdown */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Year
            </label>
            <div className="relative w-48">
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(parseInt(e.target.value));
                  setSelectedReport(null);
                }}
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#174798] focus:border-transparent appearance-none"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Report Tabs */}
          <div className="flex flex-wrap gap-2">
            {yearReports.map((report) => (
              <motion.button
                key={report.report_id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedReport(report.report_id)}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  selectedReport === report.report_id
                    ? 'bg-[#174798] text-white border-[#174798]'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm">
                    {new Date(report.test_date).toLocaleDateString()} 
                    {report.health_score && ` - Score: ${report.health_score}`}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Delete Report Button */}
          {selectedReport && (
            <div className="mt-4 flex items-center gap-4">
              {deleteConfirm === selectedReport ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-600">
                    {reports.length <= 1 ? 'Cannot delete the last report' : 'Delete this report?'}
                  </span>
                  {reports.length > 1 && (
                    <>
                      <button
                        onClick={() => deleteReport(selectedReport)}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                      >
                        Yes, Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirm(selectedReport)}
                  disabled={reports.length <= 1}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    reports.length <= 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-red-50 text-red-600 hover:bg-red-100'
                  }`}
                  title={reports.length <= 1 ? 'User must have at least one report' : 'Delete report'}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Report
                </button>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Lab Parameters */}
      {selectedReport && labParameters.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Lab Parameters</h2>
            <button
              onClick={() => setShowAddParameter(true)}
              className="px-4 py-2 bg-[#174798] text-white rounded-lg hover:bg-[#0f2d52] transition-colors flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Add Parameter
            </button>
          </div>
          
          {/* Add Parameter Form */}
          {showAddParameter && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Add New Parameter</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parameter Name
                  </label>
                  <select
                    value={newParameter.parameter_name}
                    onChange={(e) => setNewParameter({ ...newParameter, parameter_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#174798]"
                  >
                    <option value="">Select parameter...</option>
                    {availableParameters
                      .filter(param => !labParameters.some(lp => lp.parameter_name === param.parameter_key))
                      .map(param => (
                        <option key={param.parameter_id} value={param.parameter_key}>
                          {param.parameter_key}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Value
                  </label>
                  <input
                    type="text"
                    value={newParameter.parameter_value}
                    onChange={(e) => setNewParameter({ ...newParameter, parameter_value: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#174798]"
                    placeholder="Enter value"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit (optional)
                  </label>
                  <input
                    type="text"
                    value={newParameter.unit}
                    onChange={(e) => setNewParameter({ ...newParameter, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#174798]"
                    placeholder="Auto-filled from master"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={addParameter}
                  disabled={addingParameter}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {addingParameter ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Add Parameter
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowAddParameter(false);
                    setNewParameter({ parameter_name: '', parameter_value: '', unit: '' });
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          <div className="space-y-6">
            {Object.entries(groupedParameters).map(([category, params]) => (
              <div key={category}>
                <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#174798]" />
                  {category}
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Parameter
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Value
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reference Range
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {params.map((param) => (
                        <tr key={param.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {param.parameter_name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {editingParam === param.id ? (
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="px-2 py-1 border border-gray-300 rounded text-sm w-24"
                                autoFocus
                              />
                            ) : (
                              <span className={param.status === 'Normal' ? '' : 'text-red-600 font-medium'}>
                                {param.parameter_value}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {param.unit || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {param.display_reference_min && param.display_reference_max
                              ? `${param.display_reference_min} - ${param.display_reference_max}`
                              : param.reference_min && param.reference_max
                              ? `${param.reference_min} - ${param.reference_max}`
                              : '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              param.status === 'Normal'
                                ? 'bg-green-100 text-green-800'
                                : param.status === 'Borderline'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {param.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {editingParam === param.id ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateParameter(param.id)}
                                  className="text-green-600 hover:text-green-800"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingParam(null);
                                    setEditValue('');
                                  }}
                                  className="text-gray-600 hover:text-gray-800"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingParam(param.id);
                                  setEditValue(param.parameter_value);
                                }}
                                className="text-[#174798] hover:text-[#0f2d52]"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* No Reports Message */}
      {reports.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-50 rounded-lg p-12 text-center"
        >
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-xl text-gray-600">No health reports found for this user</p>
        </motion.div>
      )}
    </div>
  );
};

export default UserDetails;