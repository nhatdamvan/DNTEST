import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { 
  Upload, 
  FileSpreadsheet, 
  Settings, 
  LogOut,
  Shield,
  Users,
  BarChart,
  Clock,
  CheckCircle,
  Building2,
  Layers,
  UserCog
} from 'lucide-react';
import axios from 'axios';
import { useLanguage } from '../contexts/LanguageContext';
import ParameterMaster from './admin/ParameterMaster';
import DataUpload from './admin/DataUpload';
import BatchManagement from './admin/BatchManagement';
import CorporateUserManagement from './admin/CorporateUserManagement';
import CategoryManagement from './admin/CategoryManagement';
import RoleManagement from './admin/RoleManagement';
import UserManagement from './admin/UserManagement';
import HealthIndexConfig from './admin/HealthIndexConfig';


const AdminDashboard = ({ admin, onLogout }) => {
  const location = useLocation();
  const { changeLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    total_users: 0,
    total_reports: 0,
    completed_batches: 0,
    pending_batches: 0
  });
  const [recentBatches, setRecentBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showRoleManagement, setShowRoleManagement] = useState(false);

  // Maintain English for admin portal
  useEffect(() => {
    const adminLang = localStorage.getItem('adminLanguage') || 'en';
    changeLanguage(adminLang);
  }, [changeLanguage]);

  useEffect(() => {
    fetchDashboardStats();
    
    // Check if we're coming back from UserDetails with a specific tab
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location]);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/dashboard-stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data.stats);
      setRecentBatches(response.data.recentBatches);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = () => {
    setActiveTab('batches');
    fetchDashboardStats();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'upload':
        return <DataUpload onUploadSuccess={handleUploadSuccess} />;
      case 'batches':
        return <BatchManagement />;
      case 'parameters':
        return <ParameterMaster />;
      case 'corporate':
        return <CorporateUserManagement />;
      case 'categories':
        return <CategoryManagement />;
      case 'users':
        return <UserManagement />;
      case 'healthindex':
        return <HealthIndexConfig />;
      default:
        return renderDashboard();
    }
  };

  const renderDashboard = () => (
    <div className="p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Overview - v2.1</h2>
        <p className="text-gray-600">Monitor system health and recent activities • Health Index V2 Active</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total_users}</p>
              <p className="text-sm text-gray-500">Total Users</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6 text-[#174798]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total_reports}</p>
              <p className="text-sm text-gray-500">Reports Generated</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.completed_batches}</p>
              <p className="text-sm text-gray-500">Completed Batches</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pending_batches}</p>
              <p className="text-sm text-gray-500">Pending Approval</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Batches */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200"
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Batch Uploads</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Batch ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  File Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Upload Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Records
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentBatches.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    No recent uploads
                  </td>
                </tr>
              ) : (
                recentBatches.map((batch) => (
                  <tr key={batch.batch_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {batch.batch_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {batch.filename}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(batch.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {batch.total_records}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        batch.status === 'completed' 
                          ? 'bg-blue-100 text-[#174798]' 
                          : batch.status === 'validated'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {batch.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );


const handleRole = () => {
  setShowDropdown(false);
  setShowRoleManagement(true);
};


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-500">Smart Report Management</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{admin?.username || 'Admin'}</p>
                <p className="text-xs text-gray-500">{admin?.role || 'Super Admin'}</p>
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowDropdown((prev) => !prev)}
                  className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    {admin?.role === 'superadmin' && (
                      <button
                        onClick={handleRole}
                        className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                      >
                        Create Role
                      </button>
                    )}
                  
                    <button
                      onClick={() => { setShowDropdown(false); onLogout(); }}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showRoleManagement ? (
    <RoleManagement onBack={() => setShowRoleManagement(false)} />
  ) : (
    <>
        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'dashboard'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent'
              }`}
            >
              <BarChart className="w-4 h-4 inline-block mr-2" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'upload'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent'
              }`}
            >
              <Upload className="w-4 h-4 inline-block mr-2" />
              Upload Data
            </button>
            <button
              onClick={() => setActiveTab('batches')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'batches'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 inline-block mr-2" />
              Batch Management
            </button>
            <button
              onClick={() => setActiveTab('parameters')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'parameters'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent'
              }`}
            >
              <Settings className="w-4 h-4 inline-block mr-2" />
              Parameter Master
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'categories'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent'
              }`}
            >
              <Layers className="w-4 h-4 inline-block mr-2" />
              Categories
            </button>
            <button
              onClick={() => setActiveTab('corporate')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'corporate'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent'
              }`}
            >
              <Building2 className="w-4 h-4 inline-block mr-2" />
              Corporate Users
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'users'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent'
              }`}
            >
              <UserCog className="w-4 h-4 inline-block mr-2" />
              User Management
            </button>
            <button
              onClick={() => setActiveTab('healthindex')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'healthindex'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent'
              }`}
            >
              <BarChart className="w-4 h-4 inline-block mr-2" />
              Health Index Config
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {loading && activeTab === 'dashboard' ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-500">Loading dashboard...</p>
            </div>
          ) : (
            renderContent()
          )}
        </div>
      </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;