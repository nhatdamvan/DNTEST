import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Phone, Mail } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const SupportPage = ({ onBack }) => {
  const { t } = useLanguage();
  
  return (
    <motion.div 
      className="page support-page min-h-screen bg-white"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <header className="flex items-center gap-4 p-6 border-b border-gray-100">
        <button
          onClick={onBack}
          className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">{t('support.title')}</h1>
      </header>

      {/* Content */}
      <main className="p-6">
        <div className="max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('support.hiWelcome')}
          </h2>
          <p className="text-gray-600 mb-8">
            {t('support.getInTouch')}
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            {t('support.contactUs')}
          </h3>

          {/* Contact Information Cards */}
          <div className="space-y-4">
            {/* Address */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-[#174798]" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {t('support.address')}
                  </h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {t('support.location')}
                  </p>
                </div>
              </div>
            </div>

            {/* Hotline */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {t('support.hotline')}
                  </h4>
                  <a href={`tel:${t('support.hotlineNumber').replace(/\./g, '')}`} 
                     className="text-sm text-blue-600 font-medium hover:text-blue-700">
                    {t('support.hotlineNumber')}
                  </a>
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {t('support.email')}
                  </h4>
                  <a href={`mailto:${t('support.emailAddress')}`} 
                     className="text-sm text-purple-600 font-medium hover:text-purple-700 break-all">
                    {t('support.emailAddress')}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </motion.div>
  );
};

export default SupportPage;