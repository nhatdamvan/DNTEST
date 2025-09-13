import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronLeft,
  ChevronRight,
  Heart,
  Activity,
  Droplets,
  Info,
  TrendingUp,
  TrendingDown,
  Zap,
  Shield,
  BarChart3,
  Users
} from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';

const CorporateComparison = ({ dashboardData, selectedYear }) => {
  const { t, language } = useLanguage();
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [selectedCategoryParams, setSelectedCategoryParams] = useState([]);
  const [showParameters, setShowParameters] = useState(false);

  // Icon mapping for categories from database
  const getIconComponent = (iconName) => {
    const iconMap = {
      'Heart': '❤️',
      'Shield': '🛡️',
      'Droplets': '💧',
      'Activity': '⚡',
      'Sun': '☀️',
      'Zap': '⚡',
      'BarChart3': '📊',
      'Gem': '💎',
      'FlaskConical': '⚗️',
      'TestTube': '🧪',
      'AlertCircle': '⚠️',
      'TrendingUp': '📈',
      'Bug': '🦠',
      'Beaker': '🧪',
      'Pill': '💊',
      'Stethoscope': '🩺',
      'ClipboardCheck': '📋',
      'Image': '🖼️',
      'Eye': '👁️',
      'FileText': '📄'
    };
    return iconMap[iconName] || '📊';
  };

  // Fetch categories from database
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const res = await fetch('/api/corporate/categories-with-parameters', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('corporateToken')}`
          }
        });
        const data = await res.json();
        if (data.categories) {
          setCategories(data.categories);
          // Set first category as default if available
          if (data.categories.length > 0) {
            setSelectedMarker(data.categories[0].category_key);
            setSelectedCategoryParams(data.categories[0].parameters || []);
          }
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  const currentYear = selectedYear || new Date().getFullYear();
  const prevYear = currentYear - 1;
  const [selectedMarker, setSelectedMarker] = useState('');
  // const [comparisonMode, setComparisonMode] = useState('corporate');
  // const [selectedLocations, setSelectedLocations] = useState(['Hanoi', 'Ho Chi Minh City']);
   const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      if (!selectedMarker) return;

  const fetchComparisonData = async () => {
    setLoading(true);
    try {
      console.log('Fetching comparison data for marker:', selectedMarker, 'year:', currentYear);
      const res = await fetch(`/api/corporate/comparison-data?category=${selectedMarker}&year=${currentYear}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('corporateToken')}`
        }
      });
      const data = await res.json();
      setComparisonData(data);
      
      // Update selected category parameters
      const selectedCategory = categories.find(c => c.category_key === selectedMarker);
      if (selectedCategory) {
        setSelectedCategoryParams(selectedCategory.parameters || []);
      }
    } catch (err) {
      console.error('Failed to fetch comparison data', err);
    }
    setLoading(false);
  };
  fetchComparisonData();
}, [selectedMarker, currentYear, categories]);

console.log('Comparison data:', comparisonData);
if (comparisonData) {
  console.log('Parameter Comparison:', comparisonData.parameterComparison);
  console.log('Top Issues:', comparisonData.topIssuesComparison);
  console.log('Biological Age:', comparisonData.biologicalAge);
  console.log('Yearly Trends:', comparisonData.yearlyTrends);
}

  if (loading || !comparisonData || loadingCategories) {
    return <div className="min-h-screen flex items-center justify-center">{t('common.loading')}</div>;
  }

  // Risk projections data
  const riskProjections = [
    { 
      risk: t('corporate.overview.cvdRisk'), 
      category: t('corporate.comparison.highRisk'), 
      stMicro: comparisonData?.riskComparison?.cvd?.company, 
      corporateVietnam: comparisonData?.riskComparison?.cvd?.allData,
      icon: Heart,
      color: 'from-red-500 to-rose-600',
      improvement: comparisonData?.riskComparison?.cvd?.improvement,
      status: comparisonData?.riskComparison?.cvd?.status || 'unlocked',
      hraProgress: comparisonData?.riskComparison?.cvd?.hraProgress || 0,
      hraRequired: comparisonData?.riskComparison?.cvd?.hraRequired || 5
    },
    { 
      risk: t('corporate.overview.hypertensionRisk'), 
      category: t('corporate.comparison.highRisk'), 
      stMicro: comparisonData?.riskComparison?.hypertension?.company, 
      corporateVietnam: comparisonData?.riskComparison?.hypertension?.allData,
      icon: Activity,
      color: 'from-[#174798] to-[#174798]/80',
      improvement: comparisonData?.riskComparison?.hypertension?.improvement,
      status: comparisonData?.riskComparison?.hypertension?.status || 'unlocked',
      hraProgress: comparisonData?.riskComparison?.hypertension?.hraProgress || 0,
      hraRequired: comparisonData?.riskComparison?.hypertension?.hraRequired || 5
    },
    { 
      risk: t('corporate.overview.diabetesRisk'), 
      category: t('corporate.comparison.highRisk'), 
      stMicro: comparisonData?.riskComparison?.diabetes?.company, 
      corporateVietnam: comparisonData?.riskComparison?.diabetes?.allData,
      icon: Droplets,
      color: 'from-orange-500 to-amber-600',
      improvement: comparisonData?.riskComparison?.diabetes?.improvement,
      status: comparisonData?.riskComparison?.diabetes?.status || 'unlocked',
      hraProgress: comparisonData?.riskComparison?.diabetes?.hraProgress || 0,
      hraRequired: comparisonData?.riskComparison?.diabetes?.hraRequired || 5
    }
  ];

  const handleMarkerScroll = (direction) => {
    const currentIndex = categories.findIndex(c => c.category_key === selectedMarker);
    if (direction === 'left' && currentIndex > 0) {
      const newCategory = categories[currentIndex - 1];
      setSelectedMarker(newCategory.category_key);
      setSelectedCategoryParams(newCategory.parameters || []);
      setShowParameters(false);
    } else if (direction === 'right' && currentIndex < categories.length - 1) {
      const newCategory = categories[currentIndex + 1];
      setSelectedMarker(newCategory.category_key);
      setSelectedCategoryParams(newCategory.parameters || []);
      setShowParameters(false);
    }
  };

  const handleCategoryClick = (category) => {
    setSelectedMarker(category.category_key);
    setSelectedCategoryParams(category.parameters || []);
    setShowParameters(true);
  };

  // Get current marker data
const currentMarkerData = comparisonData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-[#174798]/5 p-6 pb-24">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            {t('corporate.comparison.title')}
          </h2>
          <div className="flex items-center gap-2 text-gray-600">
            <Info className="w-5 h-5" />
            <p className="text-lg">{t('corporate.comparison.subtitle')}</p>
          </div>
        </motion.div>

        {/* Health Markers Section - Enhanced UI */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-xl p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              {t('corporate.comparison.selectHealthMarker')}
            </h3>
            {/* <div className="flex items-center gap-2">
              <button
                onClick={() => setComparisonMode('within')}
                className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-300 ${
                  comparisonMode === 'within' 
                    ? 'bg-gradient-to-r from-[#174798] to-[#174798]/80 text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t('corporate.comparison.withinCompany')}
              </button>
              <button
                onClick={() => setComparisonMode('corporate')}
                className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-300 ${
                  comparisonMode === 'corporate' 
                    ? 'bg-gradient-to-r from-[#174798] to-[#174798]/80 text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t('corporate.comparison.corporateVietnam')}
              </button>
            </div> */}
          </div>

          {/* Health Markers Carousel - Enhanced */}
          <div className="relative">
            <button
              onClick={() => handleMarkerScroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full shadow-xl p-3 hover:bg-gray-50 transition-all duration-300 hover:scale-110"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={() => handleMarkerScroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full shadow-xl p-3 hover:bg-gray-50 transition-all duration-300 hover:scale-110"
            >
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </button>
            
            <div className="overflow-x-auto scrollbar-hide px-16">
              <div className="flex gap-4">
                {categories.map((category) => {
                  const isSelected = selectedMarker === category.category_key;
                  return (
                    <motion.button
                      key={category.id}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleCategoryClick(category)}
                      className={`flex-shrink-0 w-36 min-h-[120px] p-5 rounded-2xl border-2 transition-all duration-300 relative overflow-visible ${
                        isSelected 
                          ? 'border-[#174798] shadow-xl bg-[#E8F0FF]' 
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-lg bg-white'
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center h-full">
                        <div className={`text-4xl mb-3 ${isSelected ? 'animate-pulse' : ''}`}>
                          {getIconComponent(category.icon)}
                        </div>
                        <p className={`text-sm font-semibold ${isSelected ? 'text-[#174798]' : 'text-gray-900'}`}>
                          {language === 'vi' && category.category_name_vi ? category.category_name_vi : category.category_name}
                        </p>
                        {category.param_count && (
                          <span className="text-xs text-gray-500 mt-1">
                            {category.param_count} {language === 'vi' ? 'chỉ số' : 'params'}
                          </span>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
          
          {/* Parameters Section - Show when category is selected */}
          {showParameters && selectedCategoryParams.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
              className="mt-6 pt-6 border-t border-gray-200"
            >
              <h4 className="text-lg font-semibold text-gray-800 mb-4">
                Parameters in {(() => {
                  const category = categories.find(c => c.category_key === selectedMarker);
                  return language === 'vi' && category?.category_name_vi ? category.category_name_vi : category?.category_name;
                })()}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {selectedCategoryParams.map((param) => (
                  <div
                    key={param.parameter_id}
                    className="bg-gray-50 rounded-lg p-3 border border-gray-200 hover:border-[#174798] transition-colors cursor-pointer"
                  >
                    <div className="font-medium text-sm text-gray-900">
                      {language === 'vi' && param.parameter_key_vi ? param.parameter_key_vi : param.parameter_key}
                    </div>
                    {param.unit && (
                      <div className="text-xs text-gray-500 mt-1">
                        Unit: {param.unit}
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      Range: {param.reference_min || '0'} - {param.reference_max || 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Comparison Tables and Charts - Enhanced Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Parameter Comparison Table - Enhanced */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {t('corporate.comparison.parameterComparison')}
              </h3>
              <BarChart3 className="w-6 h-6 text-gray-400" />
            </div>
            
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      {t('common.parameters')}
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      {t('common.yourCompany')}
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      {t('common.vietnamAverage')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentMarkerData.parameterComparison && currentMarkerData.parameterComparison.length > 0 ? currentMarkerData.parameterComparison.map((param, index) => {
                    const isBetter = param.trend === 'better';
                    return (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm">
                          <div>
                            <p className="font-semibold text-gray-900">{language === 'vi' ? (param.nameVi || param.name) : (param.nameEn || param.name)}</p>
                            <p className="text-xs text-gray-500 mt-1">{t('common.ideal')}: {param.ideal.min ?? 'N/A'} - {param.ideal.max ?? 'N/A'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-lg font-bold text-gray-900">
                              {param.company || 'N/A'}
                            </span>
                            {isBetter && <TrendingDown className="w-4 h-4 text-[#174798]" />}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-lg font-semibold text-gray-600">
                            {/* {param.vietnamAvg} */}
                            {param.allData || 'N/A'}
                          </span>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan="3" className="px-6 py-8 text-center text-gray-500">
                        No parameter data available for comparison
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* <button className="mt-4 text-sm text-[#174798] hover:text-[#174798]/80 font-medium flex items-center gap-1 group">
              {t('corporate.comparison.fullView')}
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button> */}
          </motion.div>

          {/* Trend Charts - Enhanced Visual */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {t('corporate.comparison.yearlyTrends')}
              </h3>
              <TrendingUp className="w-6 h-6 text-gray-400" />
            </div>
            
            {/* <div className="grid grid-cols-2 gap-4">
              {selectedMarker === 'lipid' && currentMarkerData?.yearlyTrends && (
                <>
                  {[
                    { name: 'Total Cholesterol', fy23: currentMarkerData.yearlyTrends[2023]?.cholesterol ?? 'N/A', fy24: currentMarkerData.yearlyTrends[2024]?.cholesterol ?? 'N/A', trend: 'down', good: true },
                    { name: 'HDL Cholesterol', fy23: currentMarkerData.yearlyTrends[2023]?.hdl ?? 'N/A', fy24: currentMarkerData.yearlyTrends[2024]?.hdl ?? 'N/A', trend: 'up', good: true },
                    { name: 'LDL Cholesterol', fy23: currentMarkerData.yearlyTrends[2023]?.ldl ?? 'N/A', fy24: currentMarkerData.yearlyTrends[2024]?.ldl ?? 'N/A', trend: 'down', good: true },
                    { name: 'Triglycerides', fy23: currentMarkerData.yearlyTrends[2023]?.triglycerides ?? 'N/A', fy24: currentMarkerData.yearlyTrends[2024]?.triglycerides ?? 'N/A', trend: 'down', good: true }
                  ].map((item, index) => (
                    <motion.div
                      key={index}
                      whileHover={{ scale: 1.02 }}
                      className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl hover:shadow-md transition-all"
                    >
                      <p className="text-sm font-medium text-gray-600 mb-3">{item.name}</p>
                      <div className="flex items-end justify-between">
                        <div className="text-center">
                          <p className="text-xs text-gray-500">FY 23-24</p>
                          <p className="text-xl font-bold text-gray-700">{item.fy23}</p>
                        </div>
                        <div className={`p-2 rounded-full ${item.good ? 'bg-[#174798]/10' : 'bg-red-100'}`}>
                          {item.trend === 'down' ? 
                            <TrendingDown className={`w-5 h-5 ${item.good ? 'text-[#174798]' : 'text-red-600'}`} /> :
                            <TrendingUp className={`w-5 h-5 ${item.good ? 'text-[#174798]' : 'text-red-600'}`} />
                          }
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500">FY 24-25</p>
                          <p className={`text-xl font-bold ${item.good ? 'text-[#174798]' : 'text-red-600'}`}>
                            {item.fy24}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </>
              )}
            </div> */}
            <div className="grid grid-cols-2 gap-4">
              {(currentMarkerData?.yearlyTrendsWithTranslations || currentMarkerData?.yearlyTrends) &&
                (currentMarkerData.yearlyTrendsWithTranslations ? 
                  Object.entries(currentMarkerData.yearlyTrendsWithTranslations).map(([paramName, data]) => (
                  <motion.div
                    key={paramName}
                    whileHover={{ scale: 1.02 }}
                    className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl hover:shadow-md transition-all"
                  >
                    <p className="text-sm font-medium text-gray-600 mb-3">{language === 'vi' ? data.nameVi : data.nameEn}</p>
                    <div className="flex items-end justify-between">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">{prevYear}</p>
                        <p className="text-xl font-bold text-gray-700">{data.years[prevYear] ?? 'N/A'}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">{currentYear}</p>
                        <p className="text-xl font-bold text-[#174798]">{data.years[currentYear] ?? 'N/A'}</p>
                      </div>
                    </div>
                  </motion.div>
                )) : 
                Object.entries(currentMarkerData.yearlyTrends).map(([paramName, years]) => (
                  <motion.div
                    key={paramName}
                    whileHover={{ scale: 1.02 }}
                    className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl hover:shadow-md transition-all"
                  >
                    <p className="text-sm font-medium text-gray-600 mb-3">{paramName}</p>
                    <div className="flex items-end justify-between">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">{prevYear}</p>
                        <p className="text-xl font-bold text-gray-700">{years[prevYear] ?? 'N/A'}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">{currentYear}</p>
                        <p className="text-xl font-bold text-[#174798]">{years[currentYear] ?? 'N/A'}</p>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* Top Issues Comparison - Enhanced Visual */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-xl p-8 mb-8"
        >
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            {t('corporate.comparison.topIssuesComparison')}
          </h3>
          
          <div className="space-y-6">
            {comparisonData.topIssuesComparison ? comparisonData.topIssuesComparison.map((issue, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className="relative"
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      issue.severity === 'high' ? 'bg-red-500' :
                      issue.severity === 'medium' ? 'bg-yellow-500' :
                      'bg-[#174798]'
                    }`} />
                    <p className="font-medium text-gray-700">{language === 'vi' ? (issue.issueVi || issue.issue) : (issue.issueEn || issue.issue)}</p>
                  </div>
                  <p className="text-sm text-gray-500">{issue.count}</p>
                </div>
                
                <div className="space-y-3">
                  {/* Your Company Bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">{t('common.yourCompany')} ({currentYear})</span>
                      <span className="text-sm font-bold text-gray-900">{issue.company}%</span>
                    </div>
                    <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div 
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#174798] to-[#174798]/90 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${issue.company}%` }}
                        transition={{ duration: 0.8, delay: 0.2 + index * 0.1 }}
                      />
                    </div>
                  </div>
                  
                  {/* Vietnam Average Bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">{t('common.vietnamAverage')} (All Time)</span>
                      <span className="text-sm font-bold text-gray-600">{issue.allData || 'N/A'}%</span>
                    </div>
                    <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div 
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-gray-400 to-gray-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: issue.allData ? `${issue.allData}%` : '0%' }}
                        transition={{ duration: 0.8, delay: 0.3 + index * 0.1 }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )) : (
              <div className="text-center py-8 text-gray-500">
                No top issues data available
              </div>
            )}
          </div>
        </motion.div>

        {/* Risk Projections and Biological Age - Enhanced Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Risk Projections - Compact Modern Cards */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl shadow-xl p-6"
          >
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              {t('corporate.comparison.riskProjections')}
            </h3>
            
            <div className="space-y-3">
              {riskProjections.map((risk, index) => {
                const Icon = risk.icon;
                return (
                  <motion.div
                    key={index}
                    whileHover={{ scale: 1.01 }}
                    className="relative p-4 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${risk.color} flex items-center justify-center shadow-md`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{risk.risk}</p>
                          <p className="text-xs text-gray-500">{risk.category}</p>
                        </div>
                      </div>
                      {risk.improvement && (
                        <div className="bg-[#174798]/10 text-[#174798] px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          {t('common.lower')}
                        </div>
                      )}
                    </div>
                    
                    {risk.status === 'locked' ? (
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <Info className="w-5 h-5 text-gray-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{t('corporate.overview.lockedMetric')}</p>
                            <p className="text-xs text-gray-500">
                              {risk.hraProgress}/{risk.hraRequired} {t('corporate.overview.hraCompleted')}
                            </p>
                          </div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <p className="text-xs text-gray-600 text-center">
                            {t('corporate.overview.needMoreHra')} {risk.hraRequired - risk.hraProgress} {t('corporate.overview.moreParticipants')}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-white rounded-lg">
                          <p className="text-xs text-gray-500">{t('common.yourCompany')}</p>
                          <p className="text-2xl font-bold text-[#174798]">{risk.stMicro}%</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <p className="text-xs text-gray-500">{t('common.vietnamAverage')}</p>
                          <p className="text-2xl font-bold text-gray-500">{risk.corporateVietnam}%</p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Biological Age Comparison - Modern Design */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-2xl shadow-xl p-6"
          >
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              {t('corporate.comparison.biologicalAge')}
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Your Company */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="relative p-4 bg-gradient-to-br from-[#174798] to-[#174798]/70 rounded-xl text-white shadow-lg"
              >
                <div className="absolute top-3 right-3">
                  <Zap className="w-6 h-6 text-white/20" />
                </div>
                <h4 className="text-base font-semibold mb-4">{t('common.yourCompany')}</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-white/70 text-xs">{t('common.chronologicalAge')}</p>
                    <p className="text-2xl font-bold">{comparisonData.biologicalAge?.company?.overall?.chronological || 'N/A'}</p>
                  </div>
                  <div className="w-full h-px bg-white/20" />
                  <div>
                    <p className="text-white/70 text-xs">{t('common.biologicalAge')}</p>
                    <p className="text-2xl font-bold">{comparisonData.biologicalAge?.company?.overall?.biological || 'N/A'}</p>
                  </div>
                  <div className="pt-2">
                    <div className="inline-flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full">
                      <TrendingUp className="w-3 h-3" />
                      <span className="text-xs font-medium">
                        {t('corporate.comparison.ageDifference', { difference: comparisonData.biologicalAge?.company?.overall?.difference || 0 })}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
              
              {/* Vietnam Average */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="relative p-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl shadow-lg"
              >
                <div className="absolute top-3 right-3">
                  <Users className="w-6 h-6 text-gray-400/30" />
                </div>
                <h4 className="text-base font-semibold text-gray-900 mb-4">{t('common.vietnamAverage')}</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-gray-600 text-xs">{t('common.chronologicalAge')}</p>
                    <p className="text-2xl font-bold text-gray-900">{comparisonData.biologicalAge?.allData?.overall?.chronological || 'N/A'}</p>
                  </div>
                  <div className="w-full h-px bg-gray-300" />
                  <div>
                    <p className="text-gray-600 text-xs">{t('common.biologicalAge')}</p>
                    <p className="text-2xl font-bold text-gray-700">{comparisonData.biologicalAge?.allData?.overall?.biological || 'N/A'}</p>
                  </div>
                  <div className="pt-2">
                    <div className="inline-flex items-center gap-1 bg-gray-300/50 px-3 py-1 rounded-full">
                      <TrendingUp className="w-3 h-3 text-gray-700" />
                      <span className="text-xs font-medium text-gray-700">
                        {t('corporate.comparison.ageDifference', { difference: comparisonData.biologicalAge?.allData?.overall?.difference || 0 })}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
            
            {/* Insight */}
            {/* <div className="mt-4 p-3 bg-[#174798]/5 rounded-lg">
              <p className="text-xs text-[#174798] flex items-start gap-1">
                <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                {t('corporate.comparison.biologicalAgeInsight')}
              </p>
            </div> */}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default CorporateComparison;
