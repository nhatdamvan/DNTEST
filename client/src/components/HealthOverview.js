import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Activity, Droplets, Shield, HelpCircle, Zap, Sun, BarChart3, Gem, ChevronDown, ChevronUp, CheckCircle, AlertCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const HealthOverview = ({ user, userReport, onNext, onPrev }) => {
  const { t, language } = useLanguage();
  const [animatedScore, setAnimatedScore] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);
  const scrollContainerRef = useRef(null);
  const targetScore = userReport?.report?.health_score || 85;

  // Animate health score on component mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setAnimatedScore(prev => {
          if (prev < targetScore) {
            // Increased increment from 2 to 10 for 5x faster animation
            return Math.min(prev + 10, targetScore);
          }
          clearInterval(interval);
          return targetScore;
        });
      }, 20); // Reduced interval from 30ms to 20ms for smoother animation
    }, 200); // Reduced delay from 500ms to 200ms for quicker start

    return () => clearTimeout(timer);
  }, [targetScore]);

  // Check scroll indicators
  useEffect(() => {
    const checkScroll = () => {
      if (scrollContainerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
        setShowLeftScroll(scrollLeft > 0);
        setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 10);
      }
    };

    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', checkScroll);
      checkScroll(); // Initial check
    }

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', checkScroll);
      }
    };
  }, [userReport]);

  // Calculate progress percentage for ring
  const progressPercentage = (animatedScore / 1000) * 100;
  const circumference = 2 * Math.PI * 110;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  // Score ranges configuration
  const scoreRanges = [
    { min: 0, max: 500, label: 'Low', color: '#ef4444', bgColor: '#fee2e2' },
    { min: 500, max: 700, label: 'Moderate', color: '#f59e0b', bgColor: '#fef3c7' },
    { min: 700, max: 1000, label: 'Very Good', color: '#174798', bgColor: '#e6f2ff' }
  ];

  // Get score range info
  const getScoreRangeInfo = (score) => {
    const range = scoreRanges.find(r => score >= r.min && score <= r.max);
    return range || scoreRanges[2];
  };

  const currentRange = getScoreRangeInfo(targetScore);

  // Congratulatory messages based on score range
  const getCongratulatoryMessage = (score) => {
    if (score >= 700) {
      return {
        title: t('healthOverview.congratsTitle'),
        message: t('healthOverview.congratsMessage')
      };
    } else if (score >= 500) {
      return {
        title: t('healthOverview.keepItUpTitle') || "Good Progress! 💪",
        message: t('healthOverview.keepItUpMessage') || "You're on the right track! With some targeted improvements, you can boost your health score even higher."
      };
    } else {
      return {
        title: t('healthOverview.needsAttentionTitle') || "Let's Work Together! 🤝",
        message: t('healthOverview.needsAttentionMessage') || "Your health needs attention. Follow the personalized action plan to improve your wellness journey."
      };
    }
  };

  const congratsMessage = getCongratulatoryMessage(targetScore);

  // Icon mapping for categories
  const iconMap = {
    'Heart': Heart,
    'Activity': Activity,
    'Droplets': Droplets,
    'Shield': Shield,
    'Zap': Zap,
    'Sun': Sun,
    'BarChart3': BarChart3,
    'Gem': Gem,
    'Layers': Shield
  };

  // Get category health status
  const getCategoryHealthStatus = (percentage) => {
    if (percentage >= 80) return { text: t('healthOverview.excellent'), color: '#174798' };
    if (percentage >= 60) return { text: t('healthOverview.good'), color: '#3b82f6' };
    if (percentage >= 40) return { text: t('healthOverview.fair'), color: '#f59e0b' };
    return { text: t('healthOverview.needsAttention'), color: '#ef4444' };
  };

  // Get status icon and color
  const getStatusIcon = (status) => {
    switch(status?.toLowerCase()) {
      case 'normal':
        return { icon: CheckCircle, color: 'text-[#174798]', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' };
      case 'borderline':
        return { icon: AlertCircle, color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' };
      case 'flagged':
      case 'severe':
      case 'abnormal':
        return { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
      default:
        return { icon: AlertCircle, color: 'text-gray-600', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' };
    }
  };

  // Process categories from userReport
  const categories = userReport?.categories?.filter(cat => 
    parseInt(cat.tested_parameters) > 0
  ).map(cat => {
    const IconComponent = iconMap[cat.icon] || Shield;
    const normalParams = parseInt(cat.normal_parameters) || 0;
    const testedParams = parseInt(cat.tested_parameters) || 0;
    const totalParams = parseInt(cat.total_parameters_in_category) || testedParams || 1;
    const percentage = parseInt(cat.percentage_normal) || 0;
    const colorHex = (cat.color || '#3b82f6').replace('#', '');
    const healthStatus = getCategoryHealthStatus(percentage);
    
    console.log('Category:', {
      id: cat.category_id,
      name: cat.category_name || 'Unknown',
      score: parseInt(cat.score) || 0,
      icon: IconComponent,
      color: colorHex,
      normalParams: normalParams,
      testedParams: testedParams,
      totalParams: totalParams,
      percentage: percentage,
      healthStatus: healthStatus,
      parameters: cat.parameters
      });

    return {
      id: cat.category_id,
      name: language === 'vi' && cat.category_name_vi ? cat.category_name_vi : cat.category_name || 'Unknown',
      score: parseInt(cat.score) || 0,
      icon: IconComponent,
      color: colorHex,
      normalParams: normalParams,
      testedParams: testedParams,
      totalParams: totalParams,
      percentage: percentage,
      healthStatus: healthStatus,
      parameters: (cat.parameters || []).map(param => ({
        ...param,
        display_name: language === 'vi' && param.master_parameter_key_vi 
          ? param.master_parameter_key_vi 
          : (param.master_parameter_key || param.display_name || param.parameter_name)
      }))
    };
  }) || [];

  // *NOTE : Is this supposed to be hardcoded?
  // Get top 3 metrics from API
  const topMetrics = userReport?.topMetrics || [
    { parameter_name: 'Blood Pressure', parameter_value: '120/80', unit: 'mmHg', status: 'Normal' },
    { parameter_name: 'Blood Sugar', parameter_value: '95', unit: 'mg/dL', status: 'Normal' },
    { parameter_name: 'Cholesterol', parameter_value: '180', unit: 'mg/dL', status: 'Normal' }
  ];

  // Scroll functions
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  return (
    <div className="page health-overview min-h-screen bg-gray-50">
      {/* Header */}
      <header className="flex justify-between items-center p-6 pr-20 bg-white border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">{t('healthOverview.title')}</h1>
      </header>
      
      {/* Main Content */}
      <main className="pb-24">
        {/* Health Score Section */}
        <section className="text-center py-8 bg-white">
          <p className="text-gray-600 mb-4 font-medium">{t('healthOverview.yourHealthScore')}</p>
          
          <div className="relative w-60 h-60 mx-auto mb-6">
            {/* Progress Ring */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 240 240">
              <circle
                cx="120"
                cy="120"
                r="110"
                stroke="#F5F5F7"
                strokeWidth="12"
                fill="none"
              />
              <motion.circle
                cx="120"
                cy="120"
                r="110"
                stroke={currentRange.color}
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 0.1, ease: "easeOut" }}
              />
            </svg>
            
            {/* Score Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.div 
                className="text-6xl font-black"
                style={{ color: currentRange.color }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                {animatedScore}
              </motion.div>
              <div className="text-gray-500 text-lg">{1000}</div>
            </div>
          </div>
          
          {/* Score Range Indicator */}
          <div className="max-w-md mx-auto mb-6 px-6">
            <div className="flex h-3 rounded-full overflow-hidden mb-2">
              {scoreRanges.map((range, index) => (
                <div
                  key={index}
                  className="flex-1 relative"
                  style={{ backgroundColor: range.bgColor }}
                >
                  {index < scoreRanges.length - 1 && (
                    <div className="absolute right-0 top-0 bottom-0 w-px bg-white"></div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>0</span>
              <span>500</span>
              <span>700</span>
              <span>1000</span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-red-600">{t('healthOverview.low')}</span>
              <span className="text-amber-600">{t('healthOverview.moderate')}</span>
              <span className="text-emerald-600">{t('healthOverview.veryGood')}</span>
            </div>
          </div>
          
          {/* Congratulatory Message */}
          <motion.div 
            className="max-w-md mx-auto mx-6 p-4 rounded-xl"
            style={{ backgroundColor: currentRange.bgColor }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            <h2 className="text-lg font-bold mb-2" style={{ color: currentRange.color }}>
              {congratsMessage.title}
            </h2>
            <p className="text-sm text-gray-700">
              {congratsMessage.message}
            </p>
          </motion.div>
        </section>

        {/* Health Categories - Horizontal Scrollable */}
        <section className="py-8 bg-gray-50">
          <div className="px-6 mb-4">
            <h3 className="text-lg font-bold text-gray-900">{t('healthOverview.healthCategories')}</h3>
            <p className="text-sm text-gray-600 mt-1">{t('healthOverview.tapCategory')}</p>
          </div>
          
          {categories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No test data available
            </div>
          ) : (
            <div className="relative">
              {/* Scroll Indicators */}
              <AnimatePresence>
                {showLeftScroll && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={scrollLeft}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-2 hover:bg-gray-50"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </motion.button>
                )}
                {showRightScroll && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={scrollRight}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-2 hover:bg-gray-50"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Horizontal Scrollable Container */}
              <div 
                ref={scrollContainerRef}
                className="flex gap-4 overflow-x-auto pb-4 px-6 scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitScrollbar: { display: 'none' } }}
              >
                {categories.map((category, index) => {
                  const Icon = category.icon;
                  const isSelected = selectedCategory === category.id;
                  
                  return (
                    <motion.div
                      key={category.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1, duration: 0.3 }}
                      className="flex-shrink-0"
                    >
                      <div
                        className={`relative w-64 bg-white rounded-2xl shadow-sm border-2 transition-all cursor-pointer ${
                          isSelected ? 'border-blue-500 shadow-lg scale-105' : 'border-gray-100 hover:shadow-md hover:border-gray-200'
                        }`}
                        onClick={() => setSelectedCategory(isSelected ? null : category.id)}
                      >
                        {/* Card Header */}
                        <div className="p-5">
                          <div className="flex items-start justify-between mb-4">
                            <div 
                              className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm"
                              style={{ 
                                backgroundColor: `#${category.color}15`,
                                color: `#${category.color}`
                              }}
                            >
                              <Icon className="w-7 h-7" />
                            </div>
                            <div className="text-right">
                              <div className="text-3xl font-bold" style={{ color: `#${category.color}` }}>
                                {category.percentage}%
                              </div>
                              <p className="text-xs font-medium" style={{ color: category.healthStatus.color }}>
                                {category.healthStatus.text}
                              </p>
                            </div>
                          </div>
                          
                          <h4 className="font-bold text-gray-900 text-lg mb-2">
                            {category.name}
                          </h4>
                          
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">
                              {category.normalParams}/{category.testedParams} {t('healthOverview.inRange')}
                            </span>
                            <span className="text-gray-400">
                              {category.testedParams} {t('healthOverview.tests')}
                            </span>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="mt-4 w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                            <motion.div
                              className="h-full rounded-full transition-all"
                              style={{ backgroundColor: `#${category.color}` }}
                              initial={{ width: 0 }}
                              animate={{ width: `${category.percentage}%` }}
                              transition={{ delay: 0.5 + index * 0.1, duration: 0.8 }}
                            />
                          </div>
                        </div>
                        
                        {/* Selected Indicator */}
                        {isSelected && (
                          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                            <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse" />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Selected Category Parameters */}
        <AnimatePresence>
          {selectedCategory && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white border-t border-gray-100"
            >
              {(() => {
                const category = categories.find(c => c.id === selectedCategory);
                if (!category || category.parameters.length === 0) return null;

                return (
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold text-gray-900">
                        {category.name} {t('healthOverview.testResults')}
                      </h4>
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className="text-sm text-blue-600 font-medium"
                      >
                        {t('healthOverview.close')}
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {category.parameters.map((param, index) => {
                        const statusInfo = getStatusIcon(param.status);
                        const StatusIcon = statusInfo.icon;
                        
                        return (
                          <motion.div
                            key={param.parameter_id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`flex items-center justify-between p-4 rounded-xl border ${statusInfo.borderColor} ${statusInfo.bgColor}`}
                          >
                            <div className="flex items-center gap-3">
                              <StatusIcon className={`w-6 h-6 ${statusInfo.color}`} />
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {param.display_name.split(',')[0]}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {t('healthOverview.normalRange')} {param.display_reference_min || param.reference_min} - {param.display_reference_max || param.reference_max} {param.unit}
                                </p>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <p className={`font-bold text-xl ${statusInfo.color}`}>
                                {param.parameter_value}
                              </p>
                              <p className="text-xs text-gray-500">
                                {param.unit}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </motion.section>
          )}
        </AnimatePresence>

        {/* Key Metrics Footer */}
        <section className="bg-white px-6 py-8 border-t border-gray-100 mt-auto">
          <h3 className="text-lg font-bold text-gray-900 mb-6 text-center">
            {t('healthOverview.keyHealthMetrics')}
          </h3>
          
          <div className="grid grid-cols-3 gap-6 text-center">
            {topMetrics.map((metric, index) => {
              // Format the parameter value to show only one decimal place
              const formatValue = (value) => {
                if (!value) return '0';
                
                // Check if it's blood pressure format (e.g., "120/80")
                if (value.toString().includes('/')) {
                  return value;
                }
                
                // Convert to number and format with 1 decimal place
                const numValue = parseFloat(value);
                return isNaN(numValue) ? value : numValue.toFixed(1);
              };

              return (
                <motion.div
                  key={metric.parameter_name}
                  className="relative"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + index * 0.1, duration: 0.5 }}
                >
                  <div className={`text-2xl font-black mb-1 ${
                    metric.status === 'Normal' ? 'text-emerald-600' : 
                    metric.status === 'Borderline' ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {formatValue(metric.parameter_value)} {metric.unit}
                  </div>
                  <div className="text-xs text-gray-600 uppercase tracking-wide font-medium">
                    {language === 'vi' && metric.parameter_key_vi 
                      ? metric.parameter_key_vi 
                      : (metric.parameter_key?.replace(/_/g, ' ') || metric.parameter_name)}
                  </div>
                  {index < topMetrics.length - 1 && (
                    <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-px h-10 bg-gray-300" />
                  )}
                </motion.div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};

export default HealthOverview;
