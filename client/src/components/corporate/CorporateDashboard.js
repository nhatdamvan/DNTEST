import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  LogOut, 
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import LanguageSwitcher from '../LanguageSwitcher';
import axios from 'axios';

// Import the separate page components
import CorporateCoverPage from './pages/CorporateCoverPage';
import CorporateOverview from './pages/CorporateOverview';
import CorporateComparison from './pages/CorporateComparison';
import CorporateActionPlan from './pages/CorporateActionPlan';

// Import the sample data
import sampleData from '../../data/corporateDashboardData.json';

const CorporateDashboard = ({ user, onLogout }) => {
  const { t, language } = useLanguage();
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null); // Initialize as null, will be set from available years
  const [availableYears, setAvailableYears] = useState([]);
  const [filters, setFilters] = useState({
    location: 'all',
    ageGroup: 'all',
    gender: 'all'
  });

  useEffect(() => {
    fetchAvailableYears();
  }, []);

  useEffect(() => {
    // Only fetch dashboard data if we have a selected year
    if (selectedYear) {
      fetchDashboardData();
    }
  }, [filters, selectedYear]);

  // Background regeneration of action plan when language changes
  const regenerateActionPlanInBackground = async () => {
    try {
      console.log('Regenerating action plan in background for language:', language);
      const token = localStorage.getItem('corporateToken');
      
      const response = await axios.post(
        `/api/corporate/action-plan?language=${language}`,
        {},
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Action plan regenerated successfully in background');
    } catch (error) {
      console.error('Error regenerating action plan in background:', error);
      // Fail silently - this is a background operation
    }
  };

  // Trigger action plan regeneration when language changes
  useEffect(() => {
    if (language) {
      regenerateActionPlanInBackground();
    }
  }, [language]);

  const fetchAvailableYears = async () => {
    try {
      const token = localStorage.getItem('corporateToken');
      const response = await axios.get('/api/corporate/available-years', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.years && response.data.years.length > 0) {
        setAvailableYears(response.data.years);
        // Set the selected year to the most recent year with data (first in the sorted list)
        // Only set if selectedYear is not already set
        if (!selectedYear) {
          setSelectedYear(response.data.years[0]);
          console.log('Setting default year to most recent:', response.data.years[0]);
        }
      } else {
        // No data years found, use current year as fallback
        const currentYear = new Date().getFullYear();
        setAvailableYears([currentYear]);
        if (!selectedYear) {
          setSelectedYear(currentYear);
        }
      }
    } catch (error) {
      console.error('Error fetching available years:', error);
      // Fallback to current year if error
      const currentYear = new Date().getFullYear();
      setAvailableYears([currentYear]);
      if (!selectedYear) {
        setSelectedYear(currentYear);
      }
    }
  };

  const fetchDashboardData = async () => {
    try {
      console.log('Fetching dashboard data with year:', selectedYear, 'and filters:', filters);
      setLoading(true);
      const token = localStorage.getItem('corporateToken');
      const params = new URLSearchParams(filters);
      params.append('year', selectedYear);
      
      console.log('API request params:', params.toString());
      
      try {
        const response = await axios.get(`/api/corporate/dashboard-data?${params}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Dashboard data received from API:', response.data);
        console.log('Debug info from backend:', response.data.debugInfo);
        setDashboardData(response.data);
      } catch (apiError) {
        console.log('API failed, using sample data');
        // Transform sample data to match expected structure
        const transformedData = transformSampleData(sampleData, filters);
        setDashboardData(transformedData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Use sample data as fallback
      const transformedData = transformSampleData(sampleData, filters);
      setDashboardData(transformedData);
    } finally {
      setLoading(false);
    }
  };

  // Transform sample data to match expected dashboard structure
  const transformSampleData = (data, currentFilters) => {
    const { coverPageData, overviewPageData, comparisonPageData, actionPlanPageData, companyInfo } = data;
    
    // Apply filters to the data
    let filteredData = {
      metrics: {
        chq_score: coverPageData.metrics.chqScore,
        total_employees: coverPageData.metrics.totalEmployees,
        employees_tested: coverPageData.metrics.employeesTested,
        employees_consulted: coverPageData.metrics.employeesConsulted,
        cvd_risk_percentage: overviewPageData.riskPredictions.cvd.highRiskPercentage,
        diabetes_risk_percentage: overviewPageData.riskPredictions.diabetes.highRiskPercentage,
        hypertension_risk_percentage: overviewPageData.riskPredictions.hypertension.highRiskPercentage,
        smart_reports_accessed: coverPageData.metrics.smartReportsAccessed
      },
      participation: overviewPageData.participationFunnel,
      demographics: transformDemographics(overviewPageData.demographics, currentFilters),
      concerns: overviewPageData.healthConcerns,
      wins: overviewPageData.healthWins,
      riskPredictions: overviewPageData.riskPredictions,
      comparison: comparisonPageData,
      actionPlan: actionPlanPageData,
      companyInfo: companyInfo,
      lastUpdated: companyInfo.lastUpdated
    };

    // Apply location filter
    if (currentFilters.location !== 'all') {
      const locationData = overviewPageData.demographics.location.find(
        loc => loc.name === currentFilters.location
      );
      if (locationData) {
        filteredData.metrics.employees_tested = locationData.tested;
        filteredData.metrics.employees_consulted = Math.round(locationData.tested * 0.31);
      }
    }

    // Apply age filter
    if (currentFilters.ageGroup !== 'all') {
      const ageData = overviewPageData.demographics.age.find(
        age => age.range === currentFilters.ageGroup
      );
      if (ageData) {
        filteredData.metrics.employees_tested = ageData.tested;
        filteredData.metrics.employees_consulted = Math.round(ageData.tested * 0.31);
      }
    }

    // Apply gender filter
    if (currentFilters.gender !== 'all') {
      const genderData = overviewPageData.demographics.gender.find(
        g => g.name === currentFilters.gender
      );
      if (genderData) {
        filteredData.metrics.employees_tested = genderData.tested;
        filteredData.metrics.employees_consulted = Math.round(genderData.tested * 0.31);
      }
    }

    return filteredData;
  };

  const transformDemographics = (demographics, filters) => {
    const result = [];
    
    demographics.location.forEach(loc => {
      demographics.gender.forEach(gender => {
        demographics.age.forEach(age => {
          // Calculate proportional values based on the original data
          const locationRatio = loc.tested / 411;
          const genderRatio = gender.tested / 411;
          const ageRatio = age.tested / 411;
          
          // Estimate combined values
          const estimatedCount = Math.round(411 * locationRatio * genderRatio * ageRatio);
          const estimatedTested = Math.round(estimatedCount * (loc.percentage / 100));
          
          result.push({
            location: loc.name,
            gender: gender.name,
            age_group: age.range,
            employee_count: estimatedCount,
            tested_count: estimatedTested
          });
        });
      });
    });
    
    return result;
  };

  // Navigation functions
  const nextPage = () => {
    console.log('Next page clicked, current page:', currentPage);
    if (currentPage < 3) {
      setCurrentPage(currentPage + 1);
      console.log('Moving to page:', currentPage + 1);
    }
  };

  const prevPage = () => {
    console.log('Previous page clicked, current page:', currentPage);
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
      console.log('Moving to page:', currentPage - 1);
    }
  };

  // Page transition animation
  const pageVariants = {
    initial: { opacity: 0, x: 100 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -100 }
  };

  const pageTransition = {
    type: "tween",
    ease: "anticipate",
    duration: 0.3
  };

  if (loading || !dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#174798]"></div>
          <p className="mt-4 text-gray-500">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const getPageTitle = () => {
    switch(currentPage) {
      case 0: return t('corporate.dashboard.cover');
      case 1: return t('corporate.dashboard.overview');
      case 2: return t('corporate.dashboard.comparison');
      case 3: return t('corporate.dashboard.actionPlan');
      default: return '';
    }
  };

  // Render the current page component
  const renderCurrentPage = () => {
    console.log('Rendering page:', currentPage);
    
    try {
      switch(currentPage) {
        case 0:
          return (
            <CorporateCoverPage 
              user={user}
              dashboardData={dashboardData}
              onNext={nextPage}
              selectedYear={selectedYear}
              setSelectedYear={setSelectedYear}
              availableYears={availableYears}
            />
          );
        case 1:
          return (
            <CorporateOverview 
              dashboardData={dashboardData}
              filters={filters}
              onFilterChange={setFilters}
              selectedYear={selectedYear}
            />
          );
        case 2:
          return (
            <CorporateComparison 
              dashboardData={dashboardData}
              selectedYear={selectedYear}
            />
          );
        case 3:
          return (
            <CorporateActionPlan 
              dashboardData={dashboardData}
            />
          );
        default:
          return <div>Invalid page</div>;
      }
    } catch (error) {
      console.error('Error rendering page:', error);
      return (
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-4">Error rendering page</h2>
          <p className="text-gray-600">{error.message}</p>
          <button 
            onClick={() => setCurrentPage(0)}
            className="mt-4 px-4 py-2 bg-[#174798] text-white rounded-lg"
          >
            Return to Cover Page
          </button>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - show on all pages including cover */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[#174798] to-[#174798]/90 rounded-xl flex items-center justify-center shadow-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{getPageTitle()}</h1>
                <p className="text-sm text-gray-500">
                  {dashboardData?.companyInfo?.companyName || user?.company_name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Year Selector - Show on all pages */}
              {availableYears.length > 0 && selectedYear && (
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#174798]"
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              )}
              <LanguageSwitcher />
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.full_name || 'HR Manager'}</p>
                <p className="text-xs text-gray-500">{user?.email || 'hr@insmart.vn'}</p>
              </div>
              <button
                onClick={onLogout}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            className="min-h-screen"
          >
            {renderCurrentPage()}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Bar - Only show on pages 1, 2, and 3 */}
        {currentPage > 0 && (
          <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4">
            <div className="flex justify-between items-center max-w-7xl mx-auto">
              <button 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  currentPage === 1 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-[#174798] hover:bg-[#174798]/5'
                }`}
                onClick={prevPage}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="hidden sm:inline">{t('common.previous')}</span>
              </button>
              
              <div className="flex items-center gap-2">
                {[1, 2, 3].map((page) => (
                  <div
                    key={page}
                    className={`w-2 h-2 rounded-full transition-all ${
                      page === currentPage 
                        ? 'w-8 bg-[#174798]' 
                        : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
              
              <button 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  currentPage === 3
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-[#174798] hover:bg-[#174798]/5'
                }`}
                onClick={nextPage}
                disabled={currentPage === 3}
              >
                <span className="hidden sm:inline">{t('common.next')}</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </nav>
        )}
      </div>
    </div>
  );
};

export default CorporateDashboard;