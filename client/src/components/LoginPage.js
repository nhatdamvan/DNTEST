import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, User, ArrowRight, Heart } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';

const LoginPage = ({ onLogin }) => {
  const { t, language } = useLanguage();
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await onLogin(identifier);
      if (!result.success) {
        setError(result.error);
      }
    } catch (error) {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      {/* Language Switcher - positioned in top right */}
      <div className="absolute top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>

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
          <div className="w-16 h-16 bg-[#174798] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('login.title')}</h1>
          <p className="text-gray-600">{t('login.subtitle')}</p>
        </motion.div>

        {/* Login Form */}
        <motion.div
          className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t('login.welcomeBack')}</h2>
            <p className="text-gray-600 text-sm">{t('login.enterCredentials')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Input Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {t('login.emailOrUserId')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {identifier.includes('@') ? (
                    <Mail className="h-5 w-5 text-gray-400" />
                  ) : (
                    <User className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#174798] focus:border-[#174798] transition-colors"
                  placeholder={t('login.placeholder')}
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
              disabled={loading || !identifier.trim()}
              className="w-full bg-gradient-to-r from-[#174798] to-[#0f2d52] text-white font-semibold py-3 px-4 rounded-xl hover:from-[#0f2d52] hover:to-[#0a1f38] focus:outline-none focus:ring-4 focus:ring-[#174798] focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {t('login.signingIn')}
                </>
              ) : (
                <>
                  {t('login.continue')}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </form>


          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">
              {language === 'vi' ? 'Truy cập an toàn vào dữ liệu sức khỏe của bạn' : 'Secure access to your health data'}
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
            {t('login.needHelp')}
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LoginPage;