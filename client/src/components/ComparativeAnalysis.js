import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { use } from 'react';

const ComparativeAnalysis = ({ user, userReport, onNext, onPrev }) => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState('peers');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [availableCategories, setAvailableCategories] = useState([]);

  // Get available categories from userReport
  useEffect(() => {
    if (userReport?.categories) {
      const categories = userReport.categories
        .filter(cat => parseInt(cat.tested_parameters) > 0)
        .map(cat => ({
          id: cat.category_id,
          name: language === 'vi' && cat.category_name_vi ? cat.category_name_vi : cat.category_name,
          parameters: (cat.parameters || []).map(param => ({
            ...param,
            display_name: language === 'vi' && param.master_parameter_key_vi 
              ? param.master_parameter_key_vi 
              : (param.master_parameter_key || param.display_name || param.parameter_name)
          }))
        }));
      
      setAvailableCategories(categories);
      // Set first category as default
      if (categories.length > 0 && !selectedCategory) {
        setSelectedCategory(categories[0]);
      }
    }
  }, [userReport, selectedCategory, language]);

  const tabs = [
    { id: 'peers', label: t('comparativeAnalysis.vsPeers') },
    { id: 'past', label: t('comparativeAnalysis.vsLastYear') },
    { id: 'national', label: t('comparativeAnalysis.vsNational') }
  ];

  // Get comparison data for selected category
  const getComparisonDataForCategory = () => {
    console.log('\n[DEBUG-Frontend] === COMPARISON DATA CALCULATION ===');
    console.log('[DEBUG-Frontend] Selected Category:', selectedCategory?.name);
    console.log('[DEBUG-Frontend] Category has parameters:', selectedCategory?.parameters?.length || 0);
    
    if (!selectedCategory || !selectedCategory.parameters) {
      console.log('[DEBUG-Frontend] No category or parameters, returning empty metrics');
      return {
        peers: { metrics: [] },
        past: { metrics: [] },
        national: { metrics: [] }
      };
    }

    const paramAverages = userReport.paramAverages || [];
    console.log('[DEBUG-Frontend] Total averages from backend:', paramAverages.length);
    console.log('[DEBUG-Frontend] All average keys from backend:');
    paramAverages.forEach((avg, idx) => {
      console.log(`  [${idx + 1}] ID: "${avg.parameter_id}" | Key: "${avg.parameter_key}" => Normalized: "${normalizeKey(avg.parameter_key)}"`);
      console.log(`      Value: ${avg.average_value}`);
    });

    console.log('[DEBUG-Frontend] Processing category parameters:');
    const categoryMetrics = selectedCategory.parameters.map((param, idx) => {
      console.log(`\n  [Parameter ${idx + 1}] Processing:`);
      console.log(`    Parameter ID: "${param.parameter_id}"`);
      console.log(`    Lab Name: "${param.parameter_name}"`);
      console.log(`    Display Name: "${param.display_name}"`);
      console.log(`    Master Key: "${param.master_parameter_key}"`);
      console.log(`    Lab Name Normalized: "${normalizeKey(param.parameter_name)}"`);
      console.log(`    Master Key Normalized: "${normalizeKey(param.master_parameter_key)}"`);
      
      // Match using parameter_id for reliable matching
      let avgObj = null;
      let matchType = 'none';
      
      // Primary strategy: Match by parameter_id
      if (param.parameter_id) {
        avgObj = paramAverages.find(
          avg => avg.parameter_id === param.parameter_id
        );
        if (avgObj) matchType = 'parameter_id_match';
      }
      
      // Fallback strategies if parameter_id matching fails
      if (!avgObj) {
        // Try matching normalized keys
        avgObj = paramAverages.find(
          avg => normalizeKey(avg.parameter_key) === normalizeKey(param.parameter_name)
        );
        if (avgObj) matchType = 'lab_name_match';
      }
      
      if (!avgObj && param.master_parameter_key) {
        avgObj = paramAverages.find(
          avg => normalizeKey(avg.parameter_key) === normalizeKey(param.master_parameter_key)
        );
        if (avgObj) matchType = 'master_key_match';
      }
      
      console.log(`    Match Result: ${matchType}`);
      if (avgObj) {
        console.log(`    ✓ MATCHED with key: "${avgObj.parameter_key}" (value: ${avgObj.average_value})`);
      } else {
        console.log(`    ✗ NO MATCH FOUND`);
      }
      
      const demographicAverage = avgObj ? Number(avgObj.average_value) : 0;
      const yourValue = Number(param.parameter_value);
      const peerValue = userReport.report.peer_average;
      const pastValue = userReport.report.past_health_score;
      const nationalValue = userReport.report.national_average;
      return {
        name: param.display_name || param.parameter_name,
        yourValue,
        compareValue: demographicAverage,
        unit: param.unit,
        status: param.status,
        peerValue: (peerValue ?? 0),
        pastValue: (pastValue ?? 0),
        nationalValue: (nationalValue ?? 0),
        peerPercentage: demographicAverage === 0
          ? 'N/A'
          : yourValue > demographicAverage
            ? `${Math.round((yourValue - demographicAverage) / demographicAverage * 100)}% ${t('comparativeAnalysis.better')}`
            : `${Math.round((demographicAverage - yourValue) / yourValue * 100)}% ${t('comparativeAnalysis.worse')}`,
        pastPercentage: demographicAverage === 0
          ? 'N/A'
          : yourValue > demographicAverage
            ? `${Math.round((yourValue - demographicAverage) / demographicAverage * 100)}% ${t('comparativeAnalysis.better')}`
            : `${Math.round((demographicAverage - yourValue) / yourValue * 100)}% ${t('comparativeAnalysis.worse')}`,
        nationalPercentage: demographicAverage === 0
          ? 'N/A'
          : yourValue > demographicAverage
            ? `${Math.round((yourValue - demographicAverage) / demographicAverage * 100)}% ${t('comparativeAnalysis.better')}`
            : `${Math.round((demographicAverage - yourValue) / yourValue * 100)}% ${t('comparativeAnalysis.worse')}`,
        _debug: {
          paramName: param.parameter_name,
          masterKey: param.master_parameter_key,
          matchedKey: avgObj?.parameter_key || 'NO_MATCH',
          matchType: matchType
        }
      };
    });
    
    console.log('[DEBUG-Frontend] Category metrics summary:');
    console.log(`  Total parameters: ${categoryMetrics.length}`);
    console.log(`  Matched with averages: ${categoryMetrics.filter(m => m.compareValue > 0).length}`);
    console.log(`  Not matched: ${categoryMetrics.filter(m => m.compareValue === 0).length}`);
    console.log('[DEBUG-Frontend] === END COMPARISON DATA ===\n');

    return {
      peers: {
        title: t('comparativeAnalysis.youVsPeers'),
        subtitle: "",
        yourScore: Number(userReport.report.health_score ?? 0).toFixed(1),
        compareScore: Number(userReport.report.peer_average ?? 0).toFixed(1),
        compareLabel: t('comparativeAnalysis.peerAverage'),
        metrics: categoryMetrics.map(m => ({
          name: m.name,
          yourValue: m.yourValue,
          compareValue: m.compareValue,
          unit: m.unit,
          status: m.status === 'Normal' ? 'higher' : 'lower',
          percentage: m.peerPercentage
        }))
      },
      past: {
        title: t('comparativeAnalysis.yourProgress'),
        subtitle: t('comparativeAnalysis.progressSubtitle'),
        yourScore: Number(userReport.report.health_score ?? 0).toFixed(1),
        compareScore: Number(userReport.report.past_health_score ?? 0).toFixed(1),
        compareLabel: t('comparativeAnalysis.lastYear'),
        metrics: categoryMetrics.map(m => ({
          name: m.name,
          yourValue: m.yourValue,
          compareValue: m.compareValue,
          unit: m.unit,
          status: parseFloat(m.yourValue) < parseFloat(m.pastValue) ? 'higher' : 'lower',
          percentage: m.pastPercentage
        }))
      },
      national: {
        title: t('comparativeAnalysis.youVsCorporateIndia'),
        subtitle: t('comparativeAnalysis.nationalSubtitle'),
        yourScore: Number(userReport.report.health_score ?? 0).toFixed(1),
        compareScore: Number(userReport.report.national_average ?? 0).toFixed(1),
        compareLabel: t('comparativeAnalysis.nationalAverage'),
        metrics: categoryMetrics.map(m => ({
          name: m.name,
          yourValue: m.yourValue,
          compareValue: m.compareValue,
          unit: m.unit,
          status: m.status === 'Normal' ? 'higher' : 'lower',
          percentage: m.nationalPercentage
        }))
      }
    };
  };

  function normalizeKey(str) {
    // Convert to string and lowercase, but preserve spaces for now
    const normalized = str?.toString().toLowerCase().trim();
    // Remove extra spaces and normalize
    return normalized?.replace(/\s+/g, ' ');
  }

  const comparisonData = getComparisonDataForCategory();
  const currentData = comparisonData[activeTab];

  const getBarWidth = (yourValue, compareValue, isYour = false) => {
    const yourNum = parseFloat(yourValue) || 0;
    const compareNum = parseFloat(compareValue) || 0;
    const max = Math.max(yourNum, compareNum);
    if (max === 0) return 0;
    const value = isYour ? yourNum : compareNum;
    return (value / max) * 100;
  };
  
  const getPercentageDifference = (yourValue, compareValue) => {
    const yourNum = parseFloat(yourValue) || 0;
    const compareNum = parseFloat(compareValue) || 0;
    
    if (compareNum === 0) return 0;
    
    const difference = ((yourNum - compareNum) / compareNum) * 100;
    return Math.abs(difference);
  };

  return (
    <div className="page comparative-analysis min-h-screen bg-white">
      {/* Header */}
      <header className="flex justify-between items-center p-6 pr-20 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">{t('comparativeAnalysis.title')}</h1>
      </header>

      {/* Tab Navigation */}
      <div className="flex gap-2 p-4 bg-gray-50 border-b border-gray-100">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 px-4 text-sm font-semibold rounded-xl transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-[#174798] text-white'
                : 'bg-transparent text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <main className="p-6 pb-24">
        {activeTab === 'past' && (!userReport.report.past_health_score || userReport.report.past_health_score === 0) ? (
        <motion.div 
          className="flex flex-col items-center justify-center py-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Illustration Container */}
          <div className="mb-8 relative">
            {/* Background Circle */}
            <div className="w-32 h-32 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center">
              {/* Calendar Icon with Clock */}
              <div className="relative">
                <svg className="w-16 h-16 text-[#174798]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 12h.01M12 15h.01M9 12h.01M9 15h.01M15 12h.01M15 15h.01" />
                </svg>
                {/* Clock overlay */}
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full border-2 border-[#174798] flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#174798]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            {/* Decorative dots */}
            <div className="absolute -top-2 -left-2 w-3 h-3 bg-blue-200 rounded-full animate-pulse"></div>
            <div className="absolute -bottom-1 -right-3 w-2 h-2 bg-blue-300 rounded-full animate-pulse delay-75"></div>
            <div className="absolute top-1/2 -left-4 w-2 h-2 bg-blue-100 rounded-full animate-pulse delay-150"></div>
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-gray-900 mb-3">
            {t('comparativeAnalysis.noHistoricalData') || 'No Historical Data Yet'}
          </h3>

          {/* Description */}
          <p className="text-gray-600 text-center max-w-md mb-6">
            {t('comparativeAnalysis.pastDataNotExist')}
          </p>

          {/* Info Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 max-w-md">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-[#174798] bg-opacity-10 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-[#174798]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">
                  {t('comparativeAnalysis.whatToExpect') || 'What to Expect'}
                </h4>
                <p className="text-sm text-gray-600">
                  {t('comparativeAnalysis.nextYearComparison') || 'Next year, you\'ll be able to see your health progress with detailed comparisons, trend analysis, and personalized insights based on your historical data.'}
                </p>
              </div>
            </div>
          </div>

          {/* Alternative Actions */}
          <div className="mt-8 flex flex-col items-center">
            <p className="text-sm text-gray-500 mb-3">
              {t('comparativeAnalysis.meanwhile') || 'Meanwhile, you can explore:'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setActiveTab('peers')}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {t('comparativeAnalysis.comparePeers') || 'Compare with Peers'}
              </button>
              <button
                onClick={() => setActiveTab('national')}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {t('comparativeAnalysis.compareNational') || 'National Averages'}
              </button>
            </div>
          </div>
        </motion.div>
      ) : (
        <>
        {/* Comparison Header with Category Dropdown */}
        <motion.div 
          className="text-center mb-10"
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-6">
            <div className="flex items-center justify-center gap-4 mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {t('comparativeAnalysis.keyMetricsComparison')}
              </h2>
              
              {/* Category Dropdown */}
            <div className="relative">
              <button
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => {
                  const dropdown = document.getElementById('category-dropdown');
                  dropdown.classList.toggle('hidden');
                }}
              >
                <span className="text-sm font-medium text-gray-700">
                  {selectedCategory?.name || 'Select Category'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
              
              <div
                id="category-dropdown"
                className="hidden absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10"
              >
                {availableCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => {
                      setSelectedCategory(category);
                      document.getElementById('category-dropdown').classList.add('hidden');
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                      selectedCategory?.id === category.id ? 'bg-gray-50 font-medium' : ''
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
            
          </div>
          
          <p className="text-gray-600">{currentData.subtitle}</p>
        </motion.div>

        {/* Visual Comparison */}
        <motion.div 
          className="flex justify-between items-center mb-12 px-5"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="text-center">
            <div className="w-30 h-30 bg-gray-100 rounded-full flex items-center justify-center mb-3 mx-auto">
              <div className="w-24 h-24 bg-[#174798] rounded-full flex items-center justify-center">
                <span className="text-2xl font-black text-white">{currentData.yourScore}</span>
              </div>
            </div>
            <p className="font-semibold text-gray-900">{t('comparativeAnalysis.you')}</p>
          </div>
          
          <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{t('comparativeAnalysis.vs')}</span>
          
          <div className="text-center">
            <div className="w-30 h-30 bg-gray-100 rounded-full flex items-center justify-center mb-3 mx-auto">
              <div className="w-24 h-24 bg-gray-400 rounded-full flex items-center justify-center">
                <span className="text-2xl font-black text-white">{currentData.compareScore}</span>
              </div>
            </div>
            <p className="font-semibold text-gray-900">{currentData.compareLabel}</p>
          </div>
        </motion.div>

        {/* Metrics Comparison */}
        <section className="mb-10">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-bold text-gray-900">
              {selectedCategory?.name} {t('comparativeAnalysis.metrics')}
            </h3>
            {/* Compact Legend */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-50 border border-gray-200"></div>
                <span className="text-gray-600">← {t('comparativeAnalysis.lower')}</span>
              </div>
              <div className="w-px h-4 bg-gray-300"></div>
              <div className="flex items-center gap-1">
                <span className="text-gray-600">{t('comparativeAnalysis.higher')} →</span>
                <div className="w-3 h-3 bg-blue-100 border border-gray-200"></div>
              </div>
            </div>
          </div>
          
           {currentData.metrics.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No parameters available for comparison in this category
              </div>
            ) : (
              currentData.metrics.map((metric, index) => (
                <React.Fragment key={metric.name.split(',')[0]}>
                  {metric.compareValue === 0 ? (
                    <div className="text-center py-4 text-yellow-600 font-semibold">
                      {'Average data not found for the parameter ' + metric.name.split(',')[0] + '. Please check back later.'}
                    </div>
                  ) : (
                    <motion.div
                      className="mb-6"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
                    >
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-semibold text-gray-900">{metric.name.split(',')[0]}</span>
                        <div className="flex gap-4 text-sm">
                          <span className="font-bold text-[#174798]">
                            {metric.yourValue} {metric.unit}
                          </span>
                          <span className="text-gray-500">{t('comparativeAnalysis.vs')}</span>
                          <span className="font-medium text-gray-600">
                            {metric.compareValue} {metric.unit}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {/* Percentage label */}
                        <div className="flex justify-center">
                          <span className="text-sm font-semibold text-gray-700">
                            {metric.percentage}
                          </span>
                        </div>
                        
                        {/* Centered bar chart */}
                        <div className="relative h-8 rounded-lg overflow-hidden">
                          <div className="flex h-full">
                            {/* Left half container - for lower values */}
                            <div className="relative w-1/2 h-full bg-blue-50">
                              {(() => {
                                const yourNum = parseFloat(metric.yourValue) || 0;
                                const compareNum = parseFloat(metric.compareValue) || 0;
                                const isLower = yourNum < compareNum;
                                
                                if (isLower) {
                                  const percentage = compareNum === 0 ? 0 : Math.abs((compareNum - yourNum) / compareNum * 100);
                                  const cappedPercentage = Math.min(percentage, 100);
                                  
                                  return (
                                    <motion.div
                                      className="absolute top-0 right-0 h-full bg-[#174799]"
                                      initial={{ width: 0 }}
                                      animate={{ width: `${cappedPercentage}%` }}
                                      transition={{ delay: 0.5 + index * 0.1, duration: 0.8 }}
                                    />
                                  );
                                }
                                return null;
                              })()}
                            </div>
                            
                            {/* Center divider */}
                            <div className="w-[2px] bg-gray-300 z-10" />
                            
                            {/* Right half container - for higher values */}
                            <div className="relative w-1/2 h-full bg-blue-100">
                              {(() => {
                                const yourNum = parseFloat(metric.yourValue) || 0;
                                const compareNum = parseFloat(metric.compareValue) || 0;
                                const isHigher = yourNum > compareNum;
                                
                                if (isHigher) {
                                  const percentage = compareNum === 0 ? 0 : Math.abs((yourNum - compareNum) / compareNum * 100);
                                  const cappedPercentage = Math.min(percentage, 100);
                                  
                                  return (
                                    <motion.div
                                      className="absolute top-0 left-0 h-full bg-[#174799]"
                                      initial={{ width: 0 }}
                                      animate={{ width: `${cappedPercentage}%` }}
                                      transition={{ delay: 0.5 + index * 0.1, duration: 0.8 }}
                                    />
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </React.Fragment>
              ))
            )}
        </section>
        </>
      )}
      </main>
    </div>
  );
};

export default ComparativeAnalysis;