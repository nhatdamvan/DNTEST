import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, BarChart3, TrendingUp, Star, Calendar } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const CoverPage = ({ user, userReport, onNext, navigateToPage }) => {
  const { t } = useLanguage();

  // Count completed HRAs (mock data for now)
  const completedHRAs = userReport?.report?.hra_completed || 0;
  const totalHRAs = 3; // CVD, Diabetes, Hypertension

  const features = [
    {
      icon: BarChart3,
      title: t('coverPage.healthOverview'),
      description: t('coverPage.healthOverviewDesc'),
      color: "bg-blue-50 border-blue-200",
      iconColor: "bg-[#174798]",
      pageNumber: 1
    },
    {
      icon: TrendingUp,
      title: t('coverPage.comparativeAnalysis'), 
      description: t('coverPage.comparativeAnalysisDesc'),
      color: "bg-blue-50 border-blue-200",
      iconColor: "bg-blue-600",
      pageNumber: 2
    },
    {
      icon: Star,
      title: t('coverPage.riskAssessment'),
      description: t('coverPage.riskAssessmentDesc'),
      color: "bg-amber-50 border-amber-200",
      iconColor: "bg-amber-600",
      pageNumber: 3
    },
    {
      icon: Calendar,
      title: t('coverPage.actionPlan'),
      description: t('coverPage.actionPlanDesc'),
      color: "bg-purple-50 border-purple-200",
      iconColor: "bg-purple-600",
      pageNumber: 4
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Dec 15, 2024';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getTotalTestsDone = () => {
    if (!userReport?.parameters) return "NA";
    return userReport.parameters.length;
  };

  return (
    <motion.div 
      className="page cover-page bg-white min-h-screen flex flex-col"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Welcome Section */}
      <motion.div className="welcome-section px-6 pt-8 pb-4" variants={itemVariants}>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t('coverPage.welcome')},<br />
          <span className="text-[#174798]">
            {user?.first_name || 'User'}! 👋
          </span>

        {/* *NOTE : Take a few moments to complete your profile + add a yellow dot in complete profile */}
        </h1>
        <p className="text-gray-600 text-sm">
          {t('coverPage.subtitle')}
        </p>
      </motion.div>

      {/* What's Inside Section - Now Clickable */}
      <motion.div className="px-6 pb-4" variants={itemVariants}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t('coverPage.whatsInside')}
        </h2>
        
        <div className="grid grid-cols-2 gap-3">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className={`${feature.color} border rounded-xl p-4 flex flex-col items-center text-center transition-all duration-200 cursor-pointer hover:shadow-md`}
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigateToPage(feature.pageNumber)}
            >
              <div className={`${feature.iconColor} w-10 h-10 rounded-lg flex items-center justify-center mb-2`}>
                <feature.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-xs leading-tight">
                {feature.description}
              </p>
              <CheckCircle className="w-4 h-4 text-[#174798] mt-2" />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* User Details Section */}
      <motion.div className="px-6 pb-4" variants={itemVariants}>
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-gray-900 font-semibold">{t('coverPage.yourDetails')}</h3>
            <span className="bg-[#174798] text-white px-3 py-1 rounded-lg text-xs font-semibold">
              {userReport?.report?.report_id || 'SR-2024-XXXX'}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
            <div>
              <span className="text-xs text-gray-500 uppercase font-medium">{t('coverPage.name')}</span>
              <span className="text-gray-900 font-semibold block">
                {user?.first_name} {user?.last_name}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase font-medium">{t('coverPage.age')}</span>
              <span className="text-gray-900 font-semibold block">
                {userReport?.user?.age} {t('coverPage.years')}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase font-medium">{t('coverPage.gender')}</span>
              <span className="text-gray-900 font-semibold block">
                {userReport?.user?.gender || 'NA'}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase font-medium">{t('coverPage.generated')}</span>
              <span className="text-gray-900 font-semibold block">
                {formatDate(userReport?.report?.test_date)}
              </span>
            </div>
          </div>
          
          <div className="flex gap-3 pt-3 border-t border-gray-200">
            <div className="flex-1 text-center">
              <div className="text-2xl font-black text-[#174798]">
                {userReport?.report?.health_score || 'NA'}
              </div>
              <div className="text-xs text-gray-500 uppercase font-medium">
                {t('coverPage.healthScore')}
              </div>
            </div>
            <div className="flex-1 text-center">
              <div className="text-2xl font-black text-[#174798]">
                {getTotalTestsDone()}
              </div>
              <div className="text-xs text-gray-500 uppercase font-medium">
                {t('coverPage.testsDone')}
              </div>
            </div>
            <div className="flex-1 text-center">
              <div className="text-2xl font-black text-[#174798]">
                {completedHRAs}/{totalHRAs}
              </div>
              <div className="text-xs text-gray-500 uppercase font-medium">
                {t('coverPage.hraTaken')}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* CTA Button */}
      <motion.div className="px-6 pb-8" variants={itemVariants}>
        <motion.button
          className="w-full bg-gradient-to-r from-[#174798] to-[#0f2d52] text-white py-4 px-6 rounded-xl text-base font-semibold flex items-center justify-center gap-2 shadow-lg"
          onClick={onNext}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {t('coverPage.startJourney')}
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
            <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
          </svg>
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default CoverPage;