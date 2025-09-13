import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, User, Shield } from 'lucide-react';
import axios from 'axios';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';

const AdminLogin = ({ onLogin }) => {
  const { t, changeLanguage } = useLanguage();
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Set English as default for admin portal on component mount
  useEffect(() => {
    // Check if there's a specific admin language preference
    const adminLang = localStorage.getItem('adminLanguage');
    if (!adminLang) {
      // If no admin-specific preference, default to English
      changeLanguage('en');
      localStorage.setItem('adminLanguage', 'en');
    } else {
      // Use the stored admin preference
      changeLanguage(adminLang);
    }
  }, [changeLanguage]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
       const response = await axios.post('/api/admin/login', {
      username: credentials.username,
      password: credentials.password,
      });
      console.log('Login response:', response.data);
      const { token, user } = response.data;
      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminUser', JSON.stringify(user));
      console.log('Calling onLogin with:', credentials);
      await onLogin(credentials);
    } catch (error) {
      setError(
        error.response?.data?.error ||
        'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      {/* Language Switcher - positioned in top right */}
      {/* Temporarily hidden - uncomment to enable language switching
      <div className="absolute top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>
      */}
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo/Header Section */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('admin.portal.title')}</h1>
          <p className="text-gray-600">{t('admin.portal.subtitle')}</p>
        </motion.div>

        {/* Login Form */}
        <motion.div
          className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t('admin.login.title')}</h2>
            <p className="text-gray-600 text-sm">{t('admin.login.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {t('admin.login.username')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder={t('admin.login.usernamePlaceholder')}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {t('admin.login.password')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder={t('admin.login.passwordPlaceholder')}
                  required
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                className="bg-red-50 border border-red-200 rounded-lg p-3"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.3 }}
              >
                <p className="text-red-600 text-sm">{error}</p>
              </motion.div>
            )}

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={loading || !credentials.username.trim() || !credentials.password.trim()}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold py-3 px-4 rounded-xl hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-4 focus:ring-indigo-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {t('admin.login.signingIn')}...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  {t('admin.login.signIn')}
                </>
              )}
            </motion.button>
          </form>


          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">
              {t('admin.login.authorizedOnly')}
            </p>
          </div>
        </motion.div>

        {/* Additional Info */}
        <motion.div
          className="mt-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <p className="text-sm text-gray-500">
            {t('admin.footer.version')}
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;