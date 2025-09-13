import React, { useState, useEffect  } from 'react';
import { motion } from 'framer-motion';
import { 
  Filter,
  MapPin,
  Calendar,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Activity,
  Heart,
  Brain,
  Droplets,
  Award,
  Lock,
  Info,
  X,
  FileText
} from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';

const CorporateOverview = ({ dashboardData, filters, onFilterChange, selectedYear }) => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState('concerns');
  const [showFilters, setShowFilters] = useState(false);
  const [overviewData, setOverviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper function to translate location names
  const translateLocation = (location) => {
    const locationMap = {
      'Hanoi': 'Hà Nội',
      'Ho Chi Minh City': 'Thành phố Hồ Chí Minh',
      'Da Nang': 'Đà Nẵng',
      'Can Tho': 'Cần Thơ',
      'Hai Phong': 'Hải Phòng',
      'Hanoi office': 'Văn phòng Hà Nội'
    };
    return language === 'vi' ? (locationMap[location] || location) : location;
  };

  // Helper function to translate demographic text
  const translateDemographic = (demographic) => {
    if (language !== 'vi') return demographic;
    
    // Replace age patterns
    let translated = demographic
      .replace(/Males?/gi, 'Nam')
      .replace(/Females?/gi, 'Nữ')
      .replace(/(\d+)-(\d+) years?/gi, '$1-$2 tuổi')
      .replace(/(\d+) - (\d+) yr/gi, '$1 - $2 tuổi');
    
    return translated;
  };

  useEffect(() => {
  const token = localStorage.getItem('corporateToken');
  console.log('[Overview] Fetching data for year:', selectedYear, 'with filters:', filters);
  fetch('/api/corporate/overview-data', {
    method: 'POST', 
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ filters, year: selectedYear })
  })
    .then(res => res.json())
    .then(data => {
      console.log('[Overview] Received data:', data);
      console.log('[=== FRONTEND DEBUG ===]');
      console.log('[Demographics Gender Data]:', data.demographics?.gender);
      console.log('[Demographics Age Data]:', data.demographics?.age);
      console.log('[Metrics]:', data.metrics);
      console.log('[Filters Applied]:', filters);
      console.log('[Selected Year]:', selectedYear);
      
      // Check gender percentage calculation
      if (data.demographics?.gender) {
        const totalFromGender = data.demographics.gender.reduce((sum, g) => sum + g.tested, 0);
        const percentageSum = data.demographics.gender.reduce((sum, g) => sum + g.percentage, 0);
        console.log('[Gender Validation]:', {
          totalTestedFromGender: totalFromGender,
          percentageSumShouldBe100: percentageSum,
          metricsEmployeesTested: data.metrics?.employeesTested,
          genderDetails: data.demographics.gender.map(g => ({
            name: g.name,
            tested: g.tested,
            percentage: g.percentage,
            calculatedPercentage: totalFromGender > 0 ? (g.tested / totalFromGender * 100).toFixed(1) : 0
          }))
        });
      }
      console.log('[=== END FRONTEND DEBUG ===]');
      
      setOverviewData(data);
      setLoading(false);
    })
    .catch(err => {
      console.error('[Overview] Error loading data:', err);
      setError('Failed to load data');
      setLoading(false);
    });
}, [filters, selectedYear]);

if (loading) {
  return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
}
if (error || !overviewData) {
  return <div className="min-h-screen flex items-center justify-center text-red-500">{error || 'No data'}</div>;
}

console.log(`Overview data:`, overviewData);
console.log(`Filters:`, filters);

  // CHQ Score categorization
  const getCHQCategory = (score) => {
    if (score >= 80) return { 
      level: t('corporate.overview.excellent'), 
      color: 'text-[#174798]',
      bgColor: 'bg-[#174798]',
      message: t('corporate.overview.excellentMessage')
    };
    if (score >= 70) return { 
      level: t('corporate.overview.good'), 
      color: 'text-[#174798]/90',
      bgColor: 'bg-[#174798]/90',
      message: t('corporate.overview.goodMessage')
    };
    if (score >= 60) return { 
      level: t('corporate.overview.fair'), 
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-500',
      message: t('corporate.overview.fairMessage')
    };
    return { 
      level: t('corporate.overview.needsAttention'), 
      color: 'text-red-600',
      bgColor: 'bg-red-500',
      message: t('corporate.overview.needsAttentionMessage')
    };
  };

  const chqCategory = getCHQCategory(overviewData?.metrics?.chqScore);

  // Prepare data for charts
  const participationFunnelData = [
    { name: t('corporate.overview.totalEmployees'), value: overviewData?.metrics?.totalEmployees, percentage: 100 },
    { name: t('corporate.overview.healthChecks'), value: overviewData?.metrics?.employeesTested, percentage: ((overviewData?.metrics?.employeesTested / overviewData?.metrics?.totalEmployees) * 100).toFixed(1) },
    { name: t('corporate.overview.smartReportsAccessed'), value: overviewData?.metrics?.smartReportsAccessed, percentage: ((overviewData?.metrics?.smartReportsAccessed / overviewData?.metrics?.employeesTested) * 100).toFixed(1) }
  ];

const riskData = [
  { 
    name: t('corporate.overview.cvdRisk') || 'CVD Risk', 
    value: overviewData?.riskPredictions?.cvd?.highRiskPercentage || 0, 
    icon: Heart,
    color: '#ef4444',
    affected: overviewData?.riskPredictions?.cvd?.highRiskCount || 0,
    status: overviewData?.riskPredictions?.cvd?.status || 'locked',
    mostAffected: overviewData?.riskPredictions?.cvd?.mostAffected || [],
    hraProgress: overviewData?.riskPredictions?.cvd?.hraProgress || 0,
    hraRequired: overviewData?.riskPredictions?.cvd?.hraRequired || 5,
    message: overviewData?.riskPredictions?.cvd?.message || 'Need more HRA participation to unlock'
  },
  { 
    name: t('corporate.overview.diabetesRisk') || 'Diabetes Risk', 
    value: overviewData?.riskPredictions?.diabetes?.highRiskPercentage || 0, 
    icon: Droplets,
    color: '#f59e0b',
    affected: overviewData?.riskPredictions?.diabetes?.highRiskCount || 0,
    status: overviewData?.riskPredictions?.diabetes?.status || 'locked',
    mostAffected: overviewData?.riskPredictions?.diabetes?.mostAffected || [],
    hraProgress: overviewData?.riskPredictions?.diabetes?.hraProgress || 0,
    hraRequired: overviewData?.riskPredictions?.diabetes?.hraRequired || 5,
    message: overviewData?.riskPredictions?.diabetes?.message || 'Need more HRA participation to unlock'
  },
  { 
    name: t('corporate.overview.hypertensionRisk') || 'Hypertension Risk', 
    value: overviewData?.riskPredictions?.hypertension?.highRiskPercentage || 0, 
    icon: Activity,
    color: '#3b82f6',
    affected: overviewData?.riskPredictions?.hypertension?.highRiskCount || 0,
    status: overviewData?.riskPredictions?.hypertension?.status || 'locked',
    mostAffected: overviewData?.riskPredictions?.hypertension?.mostAffected || [],
    hraProgress: overviewData?.riskPredictions?.hypertension?.hraProgress || 0,
    hraRequired: overviewData?.riskPredictions?.hypertension?.hraRequired || 5,
    message: overviewData?.riskPredictions?.hypertension?.message || 'Need more HRA participation to unlock'
  }
];

console.log('Participation Data:', participationFunnelData);
console.log('Risk Data:', riskData);

  const handleResetFilters = () => {
    onFilterChange && onFilterChange({
      location: 'all',
      ageGroup: 'all',
      gender: 'all'
    });
  };

  const hasActiveFilters = filters?.location !== 'all' || filters?.ageGroup !== 'all' || filters?.gender !== 'all';

  return (
    <div className="min-h-screen bg-gray-50 p-6 pb-24">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[#174798] to-[#174798]/90 rounded-2xl p-8 mb-8 text-white"
        >
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">{t('corporate.overview.greeting')}</h1>
              <p className="text-xl mb-1">{overviewData?.companyInfo?.companyName}</p>
              <p className="text-white/80">
                {t('corporate.overview.welcomeMessage')}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Filters Section - Improved UI */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-[#174798] to-[#174798]/90 rounded-xl shadow-md">
                <Filter className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{t('corporate.dashboard.filters.title')}</h3>
                <p className="text-sm text-gray-500">{t('corporate.dashboard.filters.customizeDataView')}</p>
              </div>
              {hasActiveFilters && (
                <span className="px-3 py-1.5 bg-[#174798]/10 text-[#174798] text-sm font-medium rounded-full ml-3">
                  {t('corporate.dashboard.filters.activeFilters', { count: Object.values(filters).filter(f => f !== 'all').length })}
                </span>
              )}
            </div>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
              >
                <X className="w-4 h-4" />
                {t('common.reset')}
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Location Filter */}
            <div className="relative">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                {t('corporate.dashboard.filters.location')}
              </label>
              <div className="relative">
                <select
                  value={filters?.location || 'all'}
                  onChange={(e) => onFilterChange && onFilterChange({ ...filters, location: e.target.value })}
                  className="w-full px-4 py-3 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium appearance-none cursor-pointer hover:bg-gray-100 focus:bg-white focus:ring-2 focus:ring-[#174798] focus:border-transparent transition-all duration-200"
                >
                  {overviewData?.filters?.locations?.map(loc => (
                    <option key={loc} value={loc === 'All Locations' ? 'all' : loc}>
                      {loc === 'All Locations' ? t('corporate.dashboard.filters.allLocations') : loc}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Age Filter */}
            <div className="relative">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                {t('corporate.dashboard.filters.age')}
              </label>
              <div className="relative">
                <select
                  value={filters?.ageGroup || 'all'}
                  onChange={(e) => onFilterChange && onFilterChange({ ...filters, ageGroup: e.target.value })}
                  className="w-full px-4 py-3 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium appearance-none cursor-pointer hover:bg-gray-100 focus:bg-white focus:ring-2 focus:ring-[#174798] focus:border-transparent transition-all duration-200"
                >
                  {overviewData?.filters?.ageGroups?.map(age => (
                    <option key={age} value={age === 'All Ages' ? 'all' : age}>
                      {age === 'All Ages' ? t('corporate.dashboard.filters.allAges') : age}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Gender Filter */}
            <div className="relative">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 text-gray-500" />
                {t('corporate.dashboard.filters.gender')}
              </label>
              <div className="relative">
                <select
                  value={filters?.gender || 'all'}
                  onChange={(e) => onFilterChange && onFilterChange({ ...filters, gender: e.target.value.toLowerCase() })}
                  className="w-full px-4 py-3 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium appearance-none cursor-pointer hover:bg-gray-100 focus:bg-white focus:ring-2 focus:ring-[#174798] focus:border-transparent transition-all duration-200"
                >
                  {overviewData?.filters?.genders?.map(gender => (
                    <option key={gender} value={gender.toLowerCase()}>
                        {gender.toLowerCase() === 'all' ? t('corporate.dashboard.filters.allGenders') : t(`corporate.dashboard.filters.${gender.toLowerCase()}`)}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Metrics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* CHQ Score Card with Scale */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{t('corporate.overview.companyHealthQuotient')}</h3>
              <Award className="w-6 h-6 text-[#174798]" />
            </div>
            
            {/* Score Display */}
            <div className="text-center mb-6">
              <div className="text-5xl font-bold text-gray-900 mb-2">{overviewData?.metrics?.chqScore}</div>
              <p className="text-sm text-gray-500">{t('corporate.overview.outOf1000')}</p>
            </div>

            {/* CHQ Scale Indicator */}
            <div className="mb-4">
              <div className="relative h-8 bg-gradient-to-r from-red-500 via-yellow-500 via-blue-500 to-[#174798] rounded-full overflow-hidden">
                <div 
                  className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
                  style={{ left: `${(overviewData?.metrics?.chqScore/1000)*100}%`, transform: 'translateX(-50%)' }}
                >
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    {overviewData?.metrics?.chqScore}/100
                  </div>
                </div>
              </div>
              
              {/* Scale Labels */}
              <div className="flex justify-between mt-2 text-xs text-gray-600">
                <span>0</span>
                <span>200</span>
                <span>400</span>
                <span>600</span>
                <span>800</span>
                <span>1000</span>
              </div>
            </div>

            {/* Category Badge and Message */}
            <div className="text-center">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-3 ${
                chqCategory.color === 'text-[#174798]' ? 'bg-[#174798]/10' :
                chqCategory.color === 'text-[#174798]/90' ? 'bg-[#174798]/10' :
                chqCategory.color === 'text-yellow-600' ? 'bg-yellow-100' :
                'bg-red-100'
              }`}>
                <CheckCircle className={`w-4 h-4 ${chqCategory.color}`} />
                <span className={`text-sm font-medium ${chqCategory.color}`}>{chqCategory.level}</span>
              </div>
              <p className="text-sm text-gray-600">{chqCategory.message}</p>
            </div>
          </motion.div>

          {/* Health Check Funnel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('corporate.overview.healthCheckFunnel')}</h3>
            <div className="relative">
              {participationFunnelData.map((item, index) => (
                <div key={index} className="relative mb-4">
                  <div 
                    className="relative overflow-hidden rounded-lg bg-gradient-to-r from-[#174798]/10 to-[#174798]/5 p-4 transition-all"
                    style={{
                      width: `${100 - (index * 15)}%`,
                      marginLeft: `${index * 7.5}%`,
                      background: index === 0 ? 'linear-gradient(to right, #3b82f6, #60a5fa)' : 
                                 index === 1 ? 'linear-gradient(to right, #10b981, #34d399)' :
                                             'linear-gradient(to right, #8b5cf6, #a78bfa)'
                    }}
                  >
                    <div className="flex justify-between items-center text-white">
                      <div>
                        <p className="text-sm font-medium opacity-90">{item.name}</p>
                        <p className="text-2xl font-bold">{item.value}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold">{item.percentage}%</p>
                      </div>
                    </div>
                  </div>
                  {index < participationFunnelData.length - 1 && (
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[20px] border-l-transparent border-t-[20px] border-t-gray-200 border-r-[20px] border-r-transparent z-10"></div>
                  )}
                </div>
              ))}
              <div className="text-center mt-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#174798]/10 text-[#174798]/80 rounded-full text-sm">
                  <FileText className="w-4 h-4" />
                  <span>{overviewData?.metrics?.smartReportsAccessed} {t('corporate.overview.smartReportsAccessed')}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Risk Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('corporate.overview.healthRiskPredictions')}</h3>
            <div className="space-y-4">
              {riskData?.map((risk, index) => {
                const Icon = risk.icon;
                // Calculate how many more HRA participations are needed
                const hraNeeded = risk.hraRequired - risk.hraProgress;
                
                return (
                  <div key={index} className="relative">
                    {risk.status === "locked" ? (
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center">
                              <Lock className="w-5 h-5 text-gray-500" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{risk.name}</p>
                              <p className="text-xs text-gray-500">{t('corporate.overview.lockedMetric')}</p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>{t('corporate.overview.hraProgress')}</span>
                            <span>{risk.hraProgress} / {risk.hraRequired}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-gray-400 to-gray-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${(risk.hraProgress / risk.hraRequired) * 100}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            {t('corporate.overview.hraParticipationsNeeded', { count: hraNeeded })}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center`} 
                               style={{ backgroundColor: `${risk.color}20` }}>
                            <Icon className="w-5 h-5" style={{ color: risk.color }} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{risk.name}</p>
                            <p className="text-xs text-gray-500">
                              {t('corporate.overview.employeesAtHighRisk', { affected: risk.affected })}
                            </p>
                            {risk.mostAffected && risk.mostAffected.demographic !== "N/A" && (
                              <p className="text-xs text-gray-500 mt-1">
                                <b>{t('corporate.overview.mostAffected')}:</b> {translateDemographic(risk.mostAffected.demographic)} ({risk.mostAffected.percentage}%), {translateLocation(risk.mostAffected.location)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold" style={{ color: risk.color }}>{risk.value}%</p>
                          <p className="text-xs text-gray-500">{t('corporate.overview.highRisk')}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Demographics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Location Participation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-gray-500" />
              {t('corporate.overview.participationByLocation')}
            </h3>
            <div className="space-y-3">
              {overviewData?.demographics?.location?.map((loc, index) => (
                <div key={index}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{translateLocation(loc.name)}</span>
                    <span className="font-medium">
                      {loc.percentage}% 
                      {loc.tested && ` (${loc.tested})`}
                    </span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-[#174798] h-full rounded-full transition-all duration-500"
                      style={{ width: `${loc.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Gender Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-500" />
              {t('corporate.overview.genderDistribution')}
            </h3>
            <div className="flex items-center justify-center h-48">
              <div className="relative w-40 h-40">
                {overviewData?.demographics?.gender && overviewData.demographics.gender.length > 0 && (
                  <>
                    <div 
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: overviewData.demographics.gender.length === 1 
                          ? (overviewData.demographics.gender[0].name.toLowerCase() === 'male' ? '#3b82f6' : '#ec4899')
                          : `conic-gradient(#3b82f6 0deg ${(overviewData.demographics.gender[1]?.percentage || 0) * 3.6}deg, #ec4899 ${(overviewData.demographics.gender[1]?.percentage || 0) * 3.6}deg 360deg)`
                      }}
                    />
                    <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">{t('corporate.overview.total')}</p>
                        <p className="text-lg font-bold text-gray-900">{overviewData?.metrics?.employeesTested}</p>
                      </div>
                    </div>
                    {overviewData.demographics.gender.length > 1 && (
                      <>
                        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded shadow-sm">
                          <p className="text-sm font-medium text-pink-600">{overviewData.demographics.gender[0]?.percentage}%</p>
                        </div>
                        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded shadow-sm">
                          <p className="text-sm font-medium text-[#174798]">{overviewData.demographics.gender[1]?.percentage}%</p>
                        </div>
                      </>
                    )}
                    {overviewData.demographics.gender.length === 1 && (
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded shadow-sm">
                        <p className={`text-sm font-medium ${overviewData.demographics.gender[0].name.toLowerCase() === 'male' ? 'text-[#174798]' : 'text-pink-600'}`}>
                          100%
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="flex justify-center gap-6 mt-6">
              {overviewData?.demographics?.gender?.filter(gender => gender.tested > 0).map((gender, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className={`w-3 h-3 rounded-full`} 
                    style={{ 
                      backgroundColor: gender.name.toLowerCase() === 'male' ? '#3b82f6' : '#ec4899' 
                    }} 
                  />
                  <span className="text-sm text-gray-700">{t(`corporate.dashboard.filters.${gender.name.toLowerCase()}`)}</span>
                  <span className="text-sm font-medium text-gray-900">({gender.tested})</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Age Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              {t('corporate.overview.ageDistribution')}
            </h3>
            <div className="space-y-3">
              {overviewData?.demographics?.age?.map((age, index) => (
                <div key={index}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{age.range}</span>
                    <span className="font-medium">
                      {age.percentage}%
                      {age.tested && ` (${age.tested})`}
                    </span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-[#174798] h-full rounded-full transition-all duration-500"
                      style={{ width: `${age.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Health Analysis Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">{t('corporate.overview.healthAnalysis')}</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('concerns')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'concerns' 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t('corporate.overview.concerns')}
              </button>
              <button
                onClick={() => setActiveTab('wins')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'wins' 
                    ? 'bg-[#174798]/10 text-[#174798]' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t('corporate.overview.wins')}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {activeTab === 'concerns' ? (
              <>
                {overviewData?.healthConcerns?.map((concern, index) => {
                  const isHighlighted = concern.name === "Low Vitamin D";
                  return (
                    <div 
                      key={index} 
                      className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                        isHighlighted ? 'bg-amber-50 border border-amber-200' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 flex items-center gap-2">
                          {concern.name}
                          {isHighlighted && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                              <AlertCircle className="w-3 h-3" />
                              {t('corporate.overview.limitedData')}
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">
                          {t('corporate.overview.employeesOutOfRange', { affected: concern.affected, total: concern.total })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <motion.div
                            className={isHighlighted ? "bg-amber-500" : "bg-red-500"}
                            initial={{ width: 0 }}
                            animate={{ width: `${concern.percentage}%` }}
                            transition={{ duration: 0.8, delay: index * 0.1 }}
                            style={{ height: '100%', borderRadius: '9999px' }}
                          />
                        </div>
                        <span className={`text-sm font-bold w-12 text-right ${
                          isHighlighted ? 'text-amber-600' : 'text-red-600'
                        }`}>{concern.percentage}%</span>
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <>
                {overviewData?.healthWins?.map((win, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{win.name}</p>
                      <p className="text-sm text-gray-500">
                        {t('corporate.overview.employeesInRange', { normal: win.normal, total: win.total })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <motion.div
                          className="bg-[#174798] h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${win.percentage}%` }}
                          transition={{ duration: 0.8, delay: index * 0.1 }}
                        />
                      </div>
                      <span className="text-sm font-bold text-[#174798] w-12 text-right">{win.percentage}%</span>
                    </div>
                  </div>
                ))}
                <div className="mt-4 p-3 bg-[#174798]/5 rounded-lg">
                  <p className="text-sm text-[#174798] flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {t('corporate.overview.winsNote')}
                  </p>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CorporateOverview;
