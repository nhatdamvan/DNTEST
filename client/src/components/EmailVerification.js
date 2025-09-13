import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Shield, ArrowLeft, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { useLanguage } from '../contexts/LanguageContext';

const EmailVerification = ({ user, onVerificationComplete }) => {
  const { language, t } = useLanguage();
  const [email, setEmail] = useState(user?.email || '');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('email'); // 'email' or 'otp'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpToken, setOtpToken] = useState('');

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/auth/request-otp', { email, language });
      
      if (response.data.success) {
        setOtpSent(true);
        setStep('otp');
        setOtpToken(response.data.otpToken);
        
        // For demo purposes, show the OTP
        if (response.data.debug_otp) {
          alert(`Demo OTP: ${response.data.debug_otp}`);
        }
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await onVerificationComplete(email, otp, otpToken);
      if (!result.success) {
        setError(result.error);
      }
    } catch (error) {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setOtp('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="w-16 h-16 bg-[#174798] rounded-2xl flex items-center justify-center mx-auto mb-4">
            {step === 'email' ? (
              <Mail className="w-8 h-8 text-white" />
            ) : (
              <Shield className="w-8 h-8 text-white" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {step === 'email' ? t('emailVerification.verifyEmail') : t('emailVerification.enterCode')}
          </h1>
          <p className="text-gray-600">
            {step === 'email' 
              ? t('emailVerification.verifyEmailDesc') 
              : t('emailVerification.enterCodeDesc')
            }
          </p>
        </motion.div>

        {/* Form */}
        <motion.div
          className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {step === 'email' ? (
            // Email Step
            <form onSubmit={handleRequestOTP} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#174798] focus:border-[#174798] transition-colors"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              {error && (
                <motion.div
                  className="bg-red-50 border border-red-200 rounded-lg p-3"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                >
                  <p className="text-red-600 text-sm">{error}</p>
                </motion.div>
              )}

              <motion.button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full bg-gradient-to-r from-[#174798] to-[#0f2d52] text-white font-semibold py-3 px-4 rounded-xl hover:from-[#0f2d52] hover:to-[#0a1f38] focus:outline-none focus:ring-4 focus:ring-[#174798] focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending Code...
                  </>
                ) : (
                  <>
                    Send Verification Code
                    <Mail className="w-5 h-5" />
                  </>
                )}
              </motion.button>
            </form>
          ) : (
            // OTP Step
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6 text-[#174798]" />
                </div>
                <p className="text-sm text-gray-600">
                  Code sent to <span className="font-medium text-gray-900">{email}</span>
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="block w-full py-3 px-4 text-center text-2xl font-bold border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#174798] focus:border-[#174798] transition-colors tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
                <p className="text-xs text-gray-500 text-center">
                  Enter the 6-digit code from your email
                </p>
              </div>

              {error && (
                <motion.div
                  className="bg-red-50 border border-red-200 rounded-lg p-3"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                >
                  <p className="text-red-600 text-sm">{error}</p>
                </motion.div>
              )}

              <div className="space-y-3">
                <motion.button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full bg-gradient-to-r from-[#174798] to-[#0f2d52] text-white font-semibold py-3 px-4 rounded-xl hover:from-[#0f2d52] hover:to-[#0a1f38] focus:outline-none focus:ring-4 focus:ring-[#174798] focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify & Continue
                      <CheckCircle className="w-5 h-5" />
                    </>
                  )}
                </motion.button>

                <button
                  type="button"
                  onClick={handleBackToEmail}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Email
                </button>
              </div>
            </form>
          )}
        </motion.div>

        {/* Footer */}
        <motion.div
          className="mt-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <p className="text-sm text-gray-500">
            Having trouble? Contact your administrator
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default EmailVerification;
