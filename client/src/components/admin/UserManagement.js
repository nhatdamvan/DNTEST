import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Edit2, 
  Trash2, 
  Eye, 
  EyeOff,
  Search,
  Building2,
  Calendar,
  Mail,
  Phone,
  UserX,
  ChevronLeft,
  ChevronRight,
  FileText,
  Settings,
  AlertCircle,
  ArrowLeft,
  History,
  Clock,
  User,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import axios from 'axios';

// Employee Count Manager Component
const EmployeeCountManager = ({ company, employeeCounts, loading, onUpdate }) => {
  const currentYear = new Date().getFullYear();
  const [editingYears, setEditingYears] = useState({});
  const [tempCounts, setTempCounts] = useState({});

  // Get years to display
  const years = [];
  for (let year = currentYear; year >= currentYear - 4; year--) {
    years.push(year);
  }
  
  // Include any additional years from the data
  Object.keys(employeeCounts).forEach(year => {
    const yearNum = parseInt(year);
    if (!years.includes(yearNum) && yearNum < currentYear - 4) {
      years.push(yearNum);
    }
  });
  
  years.sort((a, b) => b - a);

  const handleEdit = (year) => {
    setEditingYears(prev => ({ ...prev, [year]: true }));
    setTempCounts(prev => ({ ...prev, [year]: employeeCounts[year] || 0 }));
  };

  const handleSave = async (year) => {
    await onUpdate(company.company_id, year, tempCounts[year] || 0);
    setEditingYears(prev => ({ ...prev, [year]: false }));
  };

  const handleCancel = (year) => {
    setEditingYears(prev => ({ ...prev, [year]: false }));
    setTempCounts(prev => ({ ...prev, [year]: employeeCounts[year] || 0 }));
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
      >
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#174798]"></div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
    >
      <h5 className="font-medium text-gray-900 mb-3">Employee Counts by Year</h5>
      
      <div className="space-y-2">
        {years.map(year => {
          const count = employeeCounts[year] || 0;
          const isEditing = editingYears[year];
          
          return (
            <div key={year} className="flex items-center justify-between py-2 px-3 bg-white rounded border border-gray-200">
              <span className="text-sm font-medium text-gray-700">{year}</span>
              
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={tempCounts[year] || 0}
                    onChange={(e) => setTempCounts(prev => ({ 
                      ...prev, 
                      [year]: parseInt(e.target.value) || 0 
                    }))}
                    className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#174798] focus:border-transparent"
                    min="0"
                  />
                  <button
                    onClick={() => handleSave(year)}
                    className="px-2 py-1 bg-[#174798] text-white rounded text-xs hover:bg-[#0f2d52]"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => handleCancel(year)}
                    className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{count} employees</span>
                  <button
                    onClick={() => handleEdit(year)}
                    className="p-1 text-[#174798] hover:bg-blue-50 rounded"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
        
        <p className="text-xs text-gray-500 mt-2">
          Note: Employee counts are used to calculate participation rates and health metrics for each year.
        </p>
      </div>
    </motion.div>
  );
};

const UserManagement = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingEmail, setEditingEmail] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showCompanyManager, setShowCompanyManager] = useState(false);
  const [companiesWithUserCount, setCompaniesWithUserCount] = useState([]);
  const [deleteCompanyConfirm, setDeleteCompanyConfirm] = useState(null);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [newCompany, setNewCompany] = useState({ company_id: '', company_name: '', contact_email: '' });
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [deletingAllUsers, setDeletingAllUsers] = useState(false);
  const [editingEmployeeCount, setEditingEmployeeCount] = useState(null);
  const [employeeCountsByYear, setEmployeeCountsByYear] = useState({});
  const [loadingEmployeeCounts, setLoadingEmployeeCounts] = useState(false);
  const [showDeletionLogs, setShowDeletionLogs] = useState(false);
  const [deletionLogs, setDeletionLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [editedCompanyData, setEditedCompanyData] = useState({ company_name: '', contact_email: '' });
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany && !showCompanyManager) {
      fetchUsers();
    }
  }, [selectedCompany, showCompanyManager]);

  useEffect(() => {
    if (showCompanyManager && companiesWithUserCount.length === 0) {
      fetchCompaniesWithUserCount();
    }
  }, [showCompanyManager]);

  const fetchEmployeeCountsByYear = async (companyId) => {
    console.log('[UserManagement] fetchEmployeeCountsByYear called for:', companyId);
    setLoadingEmployeeCounts(true);
    
    try {
      const token = localStorage.getItem('adminToken');
      console.log('[UserManagement] Token for fetch:', token ? `Present (length: ${token.length})` : 'Missing');
      
      const response = await axios.get(`/api/admin/companies/${companyId}/employee-counts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('[UserManagement] Employee counts response:', response.data);
      
      // Convert array to object for easier access
      const countsObj = {};
      response.data.forEach(item => {
        countsObj[item.year] = item.total_employees;
      });
      
      console.log('[UserManagement] Converted counts object:', countsObj);
      setEmployeeCountsByYear(prev => ({ ...prev, [companyId]: countsObj }));
    } catch (error) {
      console.error('[UserManagement] Error fetching employee counts - Full error:', error);
      console.error('[UserManagement] Error response:', error.response);
    } finally {
      setLoadingEmployeeCounts(false);
    }
  };

  const updateEmployeeCount = async (companyId, year, count) => {
    console.log('[UserManagement] updateEmployeeCount called:', { companyId, year, count });
    
    try {
      const token = localStorage.getItem('adminToken');
      console.log('[UserManagement] Admin token:', token ? `Present (length: ${token.length})` : 'Missing');
      
      const url = `/api/admin/companies/${companyId}/employee-counts/${year}`;
      const payload = { total_employees: count };
      const headers = { Authorization: `Bearer ${token}` };
      
      console.log('[UserManagement] Request details:', {
        url,
        payload,
        headers: { ...headers, Authorization: 'Bearer [REDACTED]' }
      });
      
      const response = await axios.put(url, payload, { headers });
      
      console.log('[UserManagement] Update successful:', response.data);
      
      // Update local state
      setEmployeeCountsByYear(prev => ({
        ...prev,
        [companyId]: {
          ...prev[companyId],
          [year]: count
        }
      }));
      
      // Refresh company list to update total user count
      fetchCompaniesWithUserCount();
    } catch (error) {
      console.error('[UserManagement] Error updating employee count - Full error:', error);
      console.error('[UserManagement] Error response:', error.response);
      console.error('[UserManagement] Error details:', error.response?.data);
      alert(error.response?.data?.error || 'Failed to update employee count');
    }
  };

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      console.log('[UserManagement] Fetching companies with token:', token ? 'Present' : 'Missing');
      
      const response = await axios.get('/api/admin/companies', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('[UserManagement] Companies fetched:', response.data);
      setCompanies(response.data);
    } catch (error) {
      console.error('[UserManagement] Error fetching companies:', error.response || error);
    }
  };

  const fetchCompaniesWithUserCount = async () => {
    console.log('[CompanyManager] fetchCompaniesWithUserCount called');
    setLoadingCompanies(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/companies-with-users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('[CompanyManager] Companies with user count:', response.data);
      setCompaniesWithUserCount(response.data);
    } catch (error) {
      console.error('[CompanyManager] Error fetching companies with user count:', error);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const deleteCompany = async (companyId) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`/api/admin/companies/${companyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh lists
      fetchCompanies();
      fetchCompaniesWithUserCount();
      setDeleteCompanyConfirm(null);
      
      // If we just deleted the selected company, clear selection
      if (selectedCompany === companyId) {
        setSelectedCompany('');
        setUsers([]);
      }
    } catch (error) {
      console.error('Error deleting company:', error);
      alert(error.response?.data?.error || 'Failed to delete company');
    }
  };

  const createCompany = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      
      // Validate input
      if (!newCompany.company_id || !newCompany.company_name) {
        alert('Company ID and Name are required');
        return;
      }
      
      const response = await axios.post('/api/admin/companies', newCompany, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert(`Company "${response.data.company_name}" created successfully`);
      setShowAddCompany(false);
      setNewCompany({ company_id: '', company_name: '', contact_email: '' });
      
      // Refresh both lists
      fetchCompanies();
      fetchCompaniesWithUserCount();
    } catch (error) {
      console.error('Error creating company:', error);
      if (error.response && error.response.data && error.response.data.error) {
        alert(error.response.data.error);
      } else {
        alert('Failed to create company');
      }
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      console.log('[UserManagement] Fetching users for company:', selectedCompany);
      
      // When ALL_COMPANIES is selected, don't send company_id parameter
      const endpoint = selectedCompany === 'ALL_COMPANIES' 
        ? '/api/admin/users'
        : `/api/admin/users?company_id=${selectedCompany}`;
      
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('[UserManagement] Users fetched:', response.data);
      console.log('[UserManagement] Total users:', response.data.length);
      setUsers(response.data);
    } catch (error) {
      console.error('[UserManagement] Error fetching users:', error.response || error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (userId) => {
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(`/api/admin/users/${userId}/password`, 
        { password: newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('Password updated successfully');
      setEditingUser(null);
      setNewPassword('');
      setShowPassword(false);
    } catch (error) {
      console.error('Error updating password:', error);
      alert('Failed to update password');
    }
  };

  const updateEmail = async (userId) => {
    if (!newEmail || !newEmail.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }
    
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.put(`/api/admin/users/${userId}/email`, 
        { email: newEmail },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.message) {
        alert('Email updated successfully');
        setEditingEmail(null);
        setNewEmail('');
        // Refresh users to show updated email
        fetchUsers();
      }
    } catch (error) {
      console.error('Error updating email:', error);
      if (error.response?.data?.error) {
        alert(error.response.data.error);
      } else {
        alert('Failed to update email');
      }
    }
  };

  const deleteUser = async (userId) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      fetchUsers(); // Refresh user list
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const deleteAllUsersInCompany = async () => {
    console.log('[DEBUG deleteAllUsers] ========== START ==========');
    console.log('[DEBUG deleteAllUsers] Function called');
    console.log('[DEBUG deleteAllUsers] selectedCompany:', selectedCompany);
    console.log('[DEBUG deleteAllUsers] Type of selectedCompany:', typeof selectedCompany);
    
    if (selectedCompany === 'ALL_COMPANIES') {
      console.log('[DEBUG deleteAllUsers] ALL_COMPANIES selected, aborting');
      alert('Cannot delete all users from all companies. Please select a specific company.');
      return;
    }

    try {
      setDeletingAllUsers(true);
      const token = localStorage.getItem('adminToken');
      console.log('[DEBUG deleteAllUsers] Token exists:', !!token);
      console.log('[DEBUG deleteAllUsers] Token preview:', token ? token.substring(0, 30) + '...' : 'null');
      
      const deleteUrl = `/api/admin/companies/${selectedCompany}/users`;
      console.log('[DEBUG deleteAllUsers] Delete URL:', deleteUrl);
      console.log('[DEBUG deleteAllUsers] Full URL would be:', `${window.location.origin}${deleteUrl}`);
      console.log('[DEBUG deleteAllUsers] HTTP Method: DELETE');
      console.log('[DEBUG deleteAllUsers] Company ID in URL:', selectedCompany);
      console.log('[DEBUG deleteAllUsers] About to send DELETE request...');
      
      const response = await axios.delete(deleteUrl, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('[DEBUG deleteAllUsers] SUCCESS - Response received');
      console.log('[DEBUG deleteAllUsers] Response status:', response.status);
      console.log('[DEBUG deleteAllUsers] Response data:', response.data);
      console.log('[DEBUG deleteAllUsers] Deleted count:', response.data.deletedCount);
      console.log('[DEBUG deleteAllUsers] Message:', response.data.message);
      
      alert(response.data.message || `Successfully deleted ${response.data.deletedCount} users`);
      setShowDeleteAllConfirm(false);
      fetchUsers(); // Refresh user list
      
      // Also refresh companies list to update user counts
      if (showCompanyManager) {
        console.log('[DEBUG deleteAllUsers] Refreshing companies list...');
        fetchCompaniesWithUserCount();
      }
    } catch (error) {
      console.error('[DEBUG deleteAllUsers] ========== ERROR ==========');
      console.error('[DEBUG deleteAllUsers] Error caught:', error);
      console.error('[DEBUG deleteAllUsers] Error name:', error.name);
      console.error('[DEBUG deleteAllUsers] Error message:', error.message);
      console.error('[DEBUG deleteAllUsers] Error response exists:', !!error.response);
      
      if (error.response) {
        console.error('[DEBUG deleteAllUsers] Response status:', error.response.status);
        console.error('[DEBUG deleteAllUsers] Response status text:', error.response.statusText);
        console.error('[DEBUG deleteAllUsers] Response headers:', error.response.headers);
        console.error('[DEBUG deleteAllUsers] Response data:', error.response.data);
        console.error('[DEBUG deleteAllUsers] Response data type:', typeof error.response.data);
        console.error('[DEBUG deleteAllUsers] Response data stringified:', JSON.stringify(error.response.data, null, 2));
      }
      
      console.error('[DEBUG deleteAllUsers] Request config:', {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers,
        baseURL: error.config?.baseURL
      });
      
      console.error('[DEBUG deleteAllUsers] Error stack:', error.stack);
      
      // Show detailed error to user
      const errorMessage = error.response?.data?.details || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to delete users';
      const errorDetails = `
Error: ${errorMessage}
Status: ${error.response?.status || 'Unknown'}
Company: ${selectedCompany}
URL: /api/admin/companies/${selectedCompany}/users

Check browser console for full details.`;
      
      alert(errorDetails);
    } finally {
      setDeletingAllUsers(false);
      console.log('[DEBUG deleteAllUsers] ========== END ==========');
    }
  };

  const fetchDeletionLogs = async () => {
    console.log('[DEBUG] fetchDeletionLogs called');
    console.log('[DEBUG] selectedCompany:', selectedCompany);
    
    if (!selectedCompany || selectedCompany === 'ALL_COMPANIES') {
      console.log('[DEBUG] No company selected or ALL_COMPANIES selected, returning');
      return;
    }

    try {
      setLoadingLogs(true);
      const token = localStorage.getItem('adminToken');
      console.log('[DEBUG] Token exists:', !!token);
      console.log('[DEBUG] Token value:', token ? token.substring(0, 20) + '...' : 'null');
      
      const requestUrl = `/api/admin/deletion-audit`;
      const requestParams = { company_id: selectedCompany };
      
      console.log('[DEBUG] Request URL:', requestUrl);
      console.log('[DEBUG] Request params:', requestParams);
      console.log('[DEBUG] Full URL:', `${requestUrl}?company_id=${selectedCompany}`);
      
      const response = await axios.get(requestUrl, {
        params: requestParams,
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('[DEBUG] Response received:', response);
      console.log('[DEBUG] Response status:', response.status);
      console.log('[DEBUG] Response data:', response.data);
      
      setDeletionLogs(response.data.audit_logs || []);
      setShowDeletionLogs(true);
    } catch (error) {
      console.error('[DEBUG] Error fetching deletion logs - Full error object:', error);
      console.error('[DEBUG] Error response:', error.response);
      console.error('[DEBUG] Error response status:', error.response?.status);
      console.error('[DEBUG] Error response data:', error.response?.data);
      console.error('[DEBUG] Error message:', error.message);
      console.error('[DEBUG] Error stack:', error.stack);
      
      // Show detailed error to user
      const errorMessage = error.response?.data?.details || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to fetch deletion logs';
      alert(`Error: ${errorMessage}\n\nStatus: ${error.response?.status}\nCheck console for details.`);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleEditCompany = (company) => {
    setEditingCompany(company.company_id);
    setEditedCompanyData({
      company_name: company.company_name || '',
      contact_email: company.contact_email || ''
    });
  };

  const handleSaveCompany = async (companyId) => {
    try {
      const token = localStorage.getItem('adminToken');
      
      const response = await axios.put(`/api/admin/companies/${companyId}`, editedCompanyData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update the local state
      setCompaniesWithUserCount(prev => 
        prev.map(c => c.company_id === companyId 
          ? { ...c, ...editedCompanyData }
          : c
        )
      );
      
      // Also update the main companies list if needed
      setCompanies(prev => 
        prev.map(c => c.company_id === companyId 
          ? { ...c, ...editedCompanyData }
          : c
        )
      );
      
      setEditingCompany(null);
      alert('Company updated successfully');
    } catch (error) {
      console.error('Error updating company:', error);
      alert(error.response?.data?.error || 'Failed to update company');
    }
  };

  const handleCancelEdit = () => {
    setEditingCompany(null);
    setEditedCompanyData({ company_name: '', contact_email: '' });
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      user.user_id?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      user.full_name?.toLowerCase().includes(search) ||
      `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase().includes(search)
    );
  });

  // Sort users if a sort field is selected
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!sortField) return 0;
    
    let aValue, bValue;
    
    if (sortField === 'user_id') {
      aValue = a.user_id || '';
      bValue = b.user_id || '';
    } else if (sortField === 'report_count') {
      aValue = parseInt(a.report_count) || 0;
      bValue = parseInt(b.report_count) || 0;
    } else if (sortField === 'created_at') {
      aValue = new Date(a.created_at).getTime();
      bValue = new Date(b.created_at).getTime();
    }
    
    if (sortField === 'report_count' || sortField === 'created_at') {
      // Numeric comparison
      if (sortDirection === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    } else {
      // String comparison
      if (sortDirection === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    }
  });

  // Handle sorting
  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with default ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get sort icon for a field
  const getSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-blue-600" />
      : <ArrowDown className="w-3 h-3 text-blue-600" />;
  };

  // Pagination calculations
  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = sortedUsers.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCompany]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {showCompanyManager ? 'Company Management' : 'User Management'}
          </h2>
          <p className="text-gray-600">
            {showCompanyManager 
              ? 'Manage companies and view user counts'
              : 'Manage users by company with full control over accounts'}
          </p>
        </div>
        <button
          onClick={() => {
            setShowCompanyManager(!showCompanyManager);
            if (!showCompanyManager) {
              setSelectedCompany('');
              setUsers([]);
            }
          }}
          className="px-4 py-2 bg-[#174798] text-white rounded-lg hover:bg-[#0f2d52] transition-colors flex items-center gap-2"
        >
          {showCompanyManager ? (
            <>
              <ArrowLeft className="w-4 h-4" />
              Back to Users
            </>
          ) : (
            <>
              <Settings className="w-4 h-4" />
              Manage Companies
            </>
          )}
        </button>
      </div>

      {/* Company Management View */}
      {showCompanyManager ? (
        <div>
          {/* Add New Company Button */}
          <div className="mb-6">
            <button
              onClick={() => setShowAddCompany(!showAddCompany)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Building2 className="w-4 h-4" />
              {showAddCompany ? 'Cancel' : 'Add New Company'}
            </button>
          </div>

          {/* Add Company Form */}
          {showAddCompany && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-6 border border-gray-200 rounded-lg bg-gray-50"
            >
              <h4 className="font-medium text-gray-900 mb-4">Add New Company</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newCompany.company_id}
                    onChange={(e) => setNewCompany(prev => ({ ...prev, company_id: e.target.value }))}
                    placeholder="e.g., CUG003"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#174798] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newCompany.company_name}
                    onChange={(e) => setNewCompany(prev => ({ ...prev, company_name: e.target.value }))}
                    placeholder="e.g., ABC Corporation"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#174798] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={newCompany.contact_email}
                    onChange={(e) => setNewCompany(prev => ({ ...prev, contact_email: e.target.value }))}
                    placeholder="e.g., hr@company.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#174798] focus:border-transparent"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={createCompany}
                  className="px-4 py-2 bg-[#174798] text-white rounded-lg hover:bg-[#0f2d52] transition-colors"
                >
                  Create Company
                </button>
                <button
                  onClick={() => {
                    setShowAddCompany(false);
                    setNewCompany({ company_id: '', company_name: '', contact_email: '' });
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          {/* Companies List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200"
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Companies ({companiesWithUserCount.filter(c => c.company_id).length})
              </h3>
            </div>
            
            {loadingCompanies ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#174798]"></div>
                <p className="mt-4 text-gray-500">Loading companies...</p>
              </div>
            ) : (
              <div className="p-6">
                <div className="space-y-3">
                  {companiesWithUserCount
                    .filter(company => company.company_id)
                    .map((company) => (
                      <div key={company.company_id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            {editingCompany === company.company_id ? (
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Company Name</label>
                                  <input
                                    type="text"
                                    value={editedCompanyData.company_name}
                                    onChange={(e) => setEditedCompanyData(prev => ({ ...prev, company_name: e.target.value }))}
                                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#174798]"
                                    placeholder="Enter company name"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Contact Email</label>
                                  <input
                                    type="email"
                                    value={editedCompanyData.contact_email}
                                    onChange={(e) => setEditedCompanyData(prev => ({ ...prev, contact_email: e.target.value }))}
                                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#174798]"
                                    placeholder="Enter contact email (optional)"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleSaveCompany(company.company_id)}
                                    className="px-3 py-1 bg-[#174798] text-white text-sm rounded hover:bg-[#0f2d52]"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-gray-900">{company.company_name || 'Unnamed Company'}</h4>
                                  <button
                                    onClick={() => handleEditCompany(company)}
                                    className="p-1 text-[#174798] hover:bg-blue-50 rounded"
                                    title="Edit company details"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                </div>
                                <p className="text-sm text-gray-500">ID: {company.company_id}</p>
                                <div className="flex items-center gap-4 mt-2">
                                  <span className="text-sm text-gray-600">
                                    <Users className="inline w-4 h-4 mr-1" />
                                    {company.user_count} user{company.user_count !== 1 ? 's' : ''}
                                  </span>
                                  {company.contact_email && (
                                    <span className="text-sm text-gray-600">
                                      <Mail className="inline w-4 h-4 mr-1" />
                                      {company.contact_email}
                                    </span>
                                  )}
                                </div>
                              </>
                            )}
                            {/* Employee Count Management Button - only show when not editing */}
                            {editingCompany !== company.company_id && (
                              <div className="mt-3">
                                <button
                                  onClick={() => {
                                    if (editingEmployeeCount === company.company_id) {
                                      setEditingEmployeeCount(null);
                                    } else {
                                      setEditingEmployeeCount(company.company_id);
                                      fetchEmployeeCountsByYear(company.company_id);
                                    }
                                  }}
                                  className="text-sm text-[#174798] hover:text-[#0f2d52] flex items-center gap-1"
                                >
                                  <Users className="w-4 h-4" />
                                  {editingEmployeeCount === company.company_id ? 'Hide' : 'Manage'} Employee Counts by Year
                                </button>
                              </div>
                            )}
                          </div>
                          {editingCompany !== company.company_id && (
                            <div className="ml-4">
                              {company.user_count === 0 ? (
                              deleteCompanyConfirm === company.company_id ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-red-600">Delete company?</span>
                                  <button
                                    onClick={() => deleteCompany(company.company_id)}
                                    className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    onClick={() => setDeleteCompanyConfirm(null)}
                                    className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteCompanyConfirm(company.company_id)}
                                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 flex items-center gap-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </button>
                              )
                            ) : (
                              <div className="flex items-center text-gray-400 text-sm">
                                <AlertCircle className="w-4 h-4 mr-1" />
                                Cannot delete
                              </div>
                            )}
                            </div>
                          )}
                        </div>
                        
                        {/* Employee Count by Year Management */}
                        {editingEmployeeCount === company.company_id && (
                          <EmployeeCountManager
                            company={company}
                            employeeCounts={employeeCountsByYear[company.company_id] || {}}
                            loading={loadingEmployeeCounts}
                            onUpdate={updateEmployeeCount}
                          />
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      ) : (
        // User Management View
        <>
          {/* Company Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Company
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={selectedCompany}
                onChange={(e) => {
                  console.log('[UserManagement] Company selected:', e.target.value);
                  const selectedComp = companies.find(c => c.company_id === e.target.value);
                  console.log('[UserManagement] Selected company details:', selectedComp);
                  setSelectedCompany(e.target.value);
                }}
                className="pl-10 w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a company...</option>
                <option value="ALL_COMPANIES">All Companies</option>
                {companies
                  .filter(company => company.company_id) // Filter out companies with empty IDs
                  .map((company) => (
                    <option key={company.company_id} value={company.company_id}>
                      {company.company_name} (ID: {company.company_id})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {(selectedCompany && selectedCompany !== '') && (
            <>
              {/* Search Bar and Delete All Users */}
              <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by user ID, email, or name..."
                    className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                {/* Delete All Users Button and View Logs - Only show for specific companies */}
                {selectedCompany !== 'ALL_COMPANIES' && (
                  <div className="flex gap-2">
                    {/* View Deletion Logs Button */}
                    <button
                      onClick={fetchDeletionLogs}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                      <History className="w-4 h-4" />
                      View Deletion Logs
                    </button>
                    
                    {filteredUsers.length > 0 && (
                      <button
                        onClick={() => setShowDeleteAllConfirm(true)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete All Users ({filteredUsers.length})
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Delete All Users Confirmation Modal */}
              {showDeleteAllConfirm && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50"
                >
                  <motion.div
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
                  >
                    <div className="flex items-center mb-4">
                      <AlertCircle className="w-8 h-8 text-red-600 mr-3" />
                      <h3 className="text-lg font-semibold text-gray-900">Confirm Delete All Users</h3>
                    </div>
                    
                    <p className="text-gray-600 mb-4">
                      Are you sure you want to delete all {filteredUsers.length} users from{' '}
                      <span className="font-semibold">
                        {companies.find(c => c.company_id === selectedCompany)?.company_name || selectedCompany}
                      </span>?
                    </p>
                    
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                      <p className="text-sm text-red-800">
                        <strong>Warning:</strong> This action cannot be undone. All user accounts, 
                        health reports, and associated data will be permanently deleted.
                      </p>
                    </div>
                    
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setShowDeleteAllConfirm(false)}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                        disabled={deletingAllUsers}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={deleteAllUsersInCompany}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                        disabled={deletingAllUsers}
                      >
                        {deletingAllUsers ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4" />
                            Delete All Users
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {/* Deletion Logs Modal */}
              {showDeletionLogs && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50"
                >
                  <motion.div
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col"
                  >
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <History className="w-6 h-6 text-gray-700 mr-3" />
                          <h3 className="text-xl font-semibold text-gray-900">
                            Deletion Audit Logs - {companies.find(c => c.company_id === selectedCompany)?.company_name}
                          </h3>
                        </div>
                        <button
                          onClick={() => setShowDeletionLogs(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6">
                      {loadingLogs ? (
                        <div className="flex justify-center items-center py-12">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#174798]"></div>
                        </div>
                      ) : deletionLogs.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          <History className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                          <p>No deletion logs found for this company</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {deletionLogs.map((log) => (
                            <div key={log.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center mb-2">
                                    {log.operation_type === 'delete_all_company_users' ? (
                                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
                                        Bulk Deletion
                                      </span>
                                    ) : (
                                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                                        Single User
                                      </span>
                                    )}
                                    <span className="ml-2 text-sm text-gray-600">
                                      <Clock className="w-4 h-4 inline mr-1" />
                                      {new Date(log.deleted_at).toLocaleString()}
                                    </span>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4 mt-3">
                                    <div>
                                      <p className="text-sm text-gray-600">Deleted by:</p>
                                      <p className="font-medium">
                                        {log.deleted_by_admin_name} ({log.deleted_by_admin_email})
                                      </p>
                                    </div>
                                    
                                    {log.operation_type === 'delete_all_company_users' ? (
                                      <div>
                                        <p className="text-sm text-gray-600">Users Deleted:</p>
                                        <p className="font-medium text-red-600">{log.deleted_count} users</p>
                                      </div>
                                    ) : (
                                      <div>
                                        <p className="text-sm text-gray-600">User Deleted:</p>
                                        <p className="font-medium">
                                          {log.user_email || log.user_identifier} (ID: {log.user_id})
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {log.additional_info && (
                                    <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                                      <p className="text-gray-600 mb-1">Additional Details:</p>
                                      <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                                        {JSON.stringify(log.additional_info, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                  
                                  {log.ip_address && (
                                    <p className="text-xs text-gray-500 mt-2">
                                      IP Address: {log.ip_address}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="p-6 border-t border-gray-200">
                      <button
                        onClick={() => setShowDeletionLogs(false)}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {/* Password Update Inline Form */}
              {editingUser && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg"
                >
                  <h3 className="text-lg font-semibold mb-3">Update Password</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    User: {users.find(u => u.user_id === editingUser)?.full_name || 
                           `${users.find(u => u.user_id === editingUser)?.first_name || ''} ${users.find(u => u.user_id === editingUser)?.last_name || ''}`.trim()} 
                    ({editingUser})
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-sm">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg pr-10 focus:ring-2 focus:ring-[#174798] focus:border-transparent"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <button
                      onClick={() => updatePassword(editingUser)}
                      disabled={!newPassword || newPassword.length < 6}
                      className="px-4 py-2 bg-[#174798] text-white rounded-lg hover:bg-[#0f2d52] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Update
                    </button>
                    <button
                      onClick={() => {
                        setEditingUser(null);
                        setNewPassword('');
                        setShowPassword(false);
                      }}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Users Table */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200"
                style={{ maxHeight: '500px', overflowY: 'auto' }}
              >
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Users ({sortedUsers.length})
                  </h3>
                </div>

                {loading ? (
                  <div className="p-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-gray-500">Loading users...</p>
                  </div>
                ) : sortedUsers.length === 0 ? (
                  <div className="p-12 text-center">
                    <UserX className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No users found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th 
                            className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24 cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('user_id')}
                          >
                            <div className="flex items-center gap-1">
                              User ID
                              {getSortIcon('user_id')}
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Phone
                          </th>
                          <th 
                            className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('report_count')}
                          >
                            <div className="flex items-center justify-center gap-1">
                              Reports
                              {getSortIcon('report_count')}
                            </div>
                          </th>
                          {selectedCompany === 'ALL_COMPANIES' && (
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Company
                            </th>
                          )}
                          <th 
                            className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24 cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('created_at')}
                          >
                            <div className="flex items-center gap-1">
                              Created
                              {getSortIcon('created_at')}
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedUsers.map((user) => (
                          <tr key={user.user_id} className="hover:bg-gray-50">
                            <td className="px-3 py-3 whitespace-nowrap text-xs font-medium text-gray-900">
                              {user.user_id}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {editingEmail === user.user_id ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="email"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    placeholder="New email"
                                    className="px-3 py-1 border border-gray-300 rounded text-sm w-48"
                                  />
                                  <button
                                    onClick={() => updateEmail(user.user_id)}
                                    disabled={!newEmail || !newEmail.includes('@')}
                                    className="px-2 py-1 bg-[#174798] text-white rounded text-xs hover:bg-[#0f2d52] disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingEmail(null);
                                      setNewEmail('');
                                    }}
                                    className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <Mail className="w-4 h-4" />
                                  {user.email || '-'}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <Phone className="w-4 h-4" />
                                {user.phone || '-'}
                              </div>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-center">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                user.report_count > 0 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                <FileText className="w-3 h-3 mr-1" />
                                {user.report_count || 0}
                              </span>
                            </td>
                            {selectedCompany === 'ALL_COMPANIES' && (
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                {user.company_name || user.company_id || '-'}
                              </td>
                            )}
                            <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(user.created_at).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => navigate(`/admin/user-details/${user.user_id}`)}
                                  className="px-3 py-1 bg-[#174798] text-white rounded text-xs hover:bg-[#0f2d52] flex items-center gap-1"
                                  title="View user details"
                                >
                                  <FileText className="w-3 h-3" />
                                  View Details
                                </button>
                                {editingUser !== user.user_id && editingEmail !== user.user_id && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingEmail(user.user_id);
                                        setNewEmail(user.email || '');
                                      }}
                                      className="p-1 text-[#174798] hover:bg-blue-50 rounded"
                                      title="Edit email"
                                    >
                                      <Mail className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setEditingUser(user.user_id)}
                                      className="p-1 text-[#174798] hover:bg-blue-50 rounded"
                                      title="Edit password"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                {deleteConfirm === user.user_id ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-red-600">Delete?</span>
                                    <button
                                      onClick={() => deleteUser(user.user_id)}
                                      className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                                    >
                                      Yes
                                    </button>
                                    <button
                                      onClick={() => setDeleteConfirm(null)}
                                      className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setDeleteConfirm(user.user_id)}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                    title="Delete user"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
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
            </>
          )}
        </>
      )}
    </div>
  );
};

export default UserManagement;