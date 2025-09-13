import React,  { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, 
  Users, 
  TrendingUp, 
  Award,
  BarChart3,
  Target,
  Calendar,
  ArrowRight,
  FileText
} from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';

const CorporateCoverPage = ({ user, dashboardData, onNext, selectedYear, setSelectedYear, availableYears }) => {
  const { t } = useLanguage();

  const [coverData, setCoverData] = useState(null);
  const [loading, setLoading] = useState(true);

 useEffect(() => {
  const token = localStorage.getItem('corporateToken');
  console.log('Fetching cover data for year:', selectedYear);

  fetch(`/api/corporate/cover-data?year=${selectedYear}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
    .then(res => res.json())
    .then(data => {
      setCoverData(data);
      setLoading(false);
    })
    .catch(err => {
      console.error('Failed to fetch cover data:', err);
      setLoading(false);
    });
}, [selectedYear]);
  // Use actual data from corporate-dashboard-data.txt
  // const coverData = {
  //   companyInfo: {
  //     companyId: "CUG_INSMART_VN",
  //     companyName: "Insmart Vietnam",
  //     totalEmployees: 1100,
  //     testDate: "2024-12-21",
  //     lastUpdated: "2025-06-24T10:30:00Z"
  //   },
  //   metrics: {
  //     chqScore: 73,
  //     chqLevel: "Above Average",
  //     totalEmployees: 1100,
  //     employeesTested: 411,
  //     participationRate: 37.4,
  //     employeesConsulted: 127,
  //     consultationRate: 30.9,
  //     smartReportsAccessed: 352,
  //     smartReportsRate: 85.6
  //   }
  // };

  console.log('Cover data:', coverData);

  const getCompanyInitials = (name) => {
    return name
      ?.split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'IN';
  };

  const getCHQLevel = (score) => {
    // if (level === "Above Average") return { 
    //   text: t('corporate.cover.aboveAverage'), 
    //   color: 'text-blue-600', 
    //   bg: 'bg-blue-100' 
    // };
    if (score >= 80) return { text: t('corporate.cover.excellent'), color: 'text-[#174798]', bg: 'bg-[#174798]/10' };
    if (score >= 60) return { text: t('corporate.cover.average'), color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { text: t('corporate.cover.needsImprovement'), color: 'text-red-600', bg: 'bg-red-100' };
  };

  if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <span className="text-gray-500 text-lg">{t('loading') || 'Loading...'}</span>
        </div>
      );
    }

    if (!coverData || coverData.error) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <span className="text-red-500 text-lg">{'Failed to load data.'}</span>
        </div>
      );
    }

  const chqLevel = getCHQLevel(coverData?.metrics?.chqScore);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#174798]/5 via-white to-[#174798]/10 flex items-center justify-center p-6">
      <motion.div
        className="max-w-5xl w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Company Logo/Badge with Year Selector */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="w-24 h-24 bg-gradient-to-br from-[#174798] to-[#174798]/80 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <span className="text-3xl font-bold text-white">
              {getCompanyInitials(coverData.companyInfo.companyName)}
            </span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {t('corporate.cover.welcomeMessage')}
          </h1>
          <h2 className="text-2xl text-gray-700 mb-2">
            {coverData.companyInfo.companyName}
          </h2>
          <p className="text-gray-600 text-lg">
            {t('corporate.cover.subtitle')}
          </p>
        </motion.div>

        {/* Key Metrics Summary */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          {/* CHQ Score */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <Award className="w-8 h-8 text-[#174798]" />
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${chqLevel.bg} ${chqLevel.color}`}>
                {chqLevel.text}
              </span>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">
              {coverData.metrics.chqScore}/1000
            </h3>
            <p className="text-sm text-gray-600">{t('corporate.cover.chqScore')}</p>
          </div>

          {/* Participation */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-[#174798]" />
              <span className="text-2xl font-bold text-[#174798]">
                {coverData.metrics.participationRate}%
              </span>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">
              {coverData.metrics.employeesTested}/{coverData.metrics.totalEmployees}
            </h3>
            <p className="text-sm text-gray-600">{t('corporate.cover.participation')}</p>
          </div>

          {/* Smart Reports Accessed */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <FileText className="w-8 h-8 text-[#174798]/70" />
              <span className="text-2xl font-bold text-[#174798]/70">
                {coverData.metrics.smartReportsRate}%
              </span>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">
              {coverData.metrics.smartReportsAccessed}
            </h3>
            <p className="text-sm text-gray-600">{t('corporate.cover.smartReportsAccessed')}</p>
          </div>
        </motion.div>

        {/* What's Inside */}
        <motion.div
          className="bg-white rounded-xl shadow-lg p-8 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <h3 className="text-xl font-bold text-gray-900 mb-6">{t('corporate.cover.whatsInside')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#174798]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-6 h-6 text-[#174798]" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">{t('corporate.cover.overview')}</h4>
                <p className="text-sm text-gray-600">{t('corporate.cover.overviewDesc')}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#174798]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-[#174798]" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">{t('corporate.cover.comparison')}</h4>
                <p className="text-sm text-gray-600">{t('corporate.cover.comparisonDesc')}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#174798]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="w-6 h-6 text-[#174798]/70" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">{t('corporate.cover.actionPlan')}</h4>
                <p className="text-sm text-gray-600">{t('corporate.cover.actionPlanDesc')}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Call to Action */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <button
            onClick={onNext}
            className="inline-flex items-center gap-3 bg-gradient-to-r from-[#174798] to-[#174798]/90 text-white px-8 py-4 rounded-xl font-semibold hover:from-[#174798]/90 hover:to-[#174798]/80 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            {t('corporate.cover.startAnalysis')}
            <ArrowRight className="w-5 h-5" />
          </button>
          <p className="text-sm text-gray-500 mt-4">
            {t('corporate.cover.lastUpdated')}: {new Date(coverData.companyInfo.lastUpdated).toLocaleDateString()}
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default CorporateCoverPage;