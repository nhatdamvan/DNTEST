import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

// Import components
import LoginPage from './components/LoginPage';
import CoverPage from './components/CoverPage';
import HealthOverview from './components/HealthOverview';
import ComparativeAnalysis from './components/ComparativeAnalysis';
import RiskAssessment from './components/RiskAssessment';
import ActionPlan from './components/ActionPlan';
import EmailVerification from './components/EmailVerification';
import ProfileMenu from './components/ProfileMenu';
import SupportPage from './components/SupportPage';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import UserDetails from './components/admin/UserDetails';
import CorporateLogin from './components/corporate/CorporateLogin';
import CorporateDashboard from './components/corporate/CorporateDashboard';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';

// Import styles
import './App.css';

// Suppress React Router v7 migration warnings in development
if (process.env.NODE_ENV === 'development') {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (args[0]?.includes?.('React Router Future Flag Warning')) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

// API configuration
// In production (deployed), the frontend nginx will proxy /api calls to the backend
// So we should use relative URLs (empty baseURL) when REACT_APP_API_URL is not set
const API_BASE_URL = process.env.REACT_APP_API_URL || '';
axios.defaults.baseURL = API_BASE_URL;

console.log('[App] Environment:', process.env.NODE_ENV);
console.log('[App] API Base URL:', API_BASE_URL || 'Using relative URLs (will use nginx proxy)');

// Add axios interceptor to always include token
axios.interceptors.request.use(
  (config) => {
    // Use adminToken for admin routes, corporateToken for corporate, else user token
    if (config.url && config.url.startsWith('/api/admin')) {
      const adminToken = localStorage.getItem('adminToken');
      if (adminToken) {
        config.headers.Authorization = `Bearer ${adminToken}`;
      }
    } else if (config.url && config.url.startsWith('/api/corporate')) {
      const corporateToken = localStorage.getItem('corporateToken');
      if (corporateToken) {
        config.headers.Authorization = `Bearer ${corporateToken}`;
      }
    } else {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle authentication errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403 || 
        (error.response?.status === 401 && error.response?.data?.error?.includes('token'))) {
      // Token expired or invalid
      if (error.config?.url?.startsWith('/api/admin')) {
        localStorage.removeItem('adminToken');
        // Only redirect if we're on an admin page
        if (window.location.pathname.startsWith('/admin')) {
          window.location.href = '/admin';
        }
      } else if (error.config?.url?.startsWith('/api/corporate')) {
        localStorage.removeItem('corporateToken');
        if (window.location.pathname.startsWith('/corporate')) {
          window.location.href = '/corporate';
        }
      } else {
        localStorage.removeItem('token');
        if (!window.location.pathname.includes('/login') && 
            !window.location.pathname.includes('/admin') && 
            !window.location.pathname.includes('/corporate')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// axios.interceptors.request.use(
//   (config) => {
//     const token = localStorage.getItem('token');
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => {
//     return Promise.reject(error);
//   }
// );

// Create a separate component for the main app content that uses the language hook
function AppContent() {
  const [currentPage, setCurrentPage] = useState(0);
  const [user, setUser] = useState(null);
  const [userToken, setUserToken] = useState(localStorage.getItem('token'));
  const [userReport, setUserReport] = useState(null);
  const [currentReportId, setCurrentReportId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);
  const [sessionVerified, setSessionVerified] = useState(false); // Track OTP verification for current session
  const [showSupport, setShowSupport] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken'));
  const [corporateUser, setCorporateUser] = useState(null);
  const [corporateToken, setCorporateToken] = useState(localStorage.getItem('corporateToken'));

  const { t } = useLanguage();

  // Check authentication on app load
  useEffect(() => {
    const checkAuth = async () => {
      // Check user token
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await axios.get('/api/auth/verify-token', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.data.valid) {
            setUser(response.data.user);
            setUserToken(token);
            setEmailVerified(response.data.user.email_verified);
            
            // If email is verified in the token, the session is verified
            if (response.data.user.email_verified) {
              setSessionVerified(true);
              await fetchUserReport(response.data.user.user_id);
            } else {
              setSessionVerified(false);
            }
          } else {
            localStorage.removeItem('token');
            setUserToken(null);
          }
        } catch (error) {
          console.error('Token verification failed:', error);
          localStorage.removeItem('token');
          setUserToken(null);
        }
      }

      // Check admin token
      const adminToken = localStorage.getItem('adminToken');
      if (adminToken) {
        setAdminToken(adminToken);
        const storedAdminUser = localStorage.getItem('adminUser');
        if (storedAdminUser) {
          setAdmin(JSON.parse(storedAdminUser));
        }
      }

      // Check corporate token
      const corpToken = localStorage.getItem('corporateToken');
      if (corpToken) {
        // Restore corporate session with stored data or dummy data
        setCorporateToken(corpToken);
        
        // Try to get stored corporate user data
        const storedCorporateUser = localStorage.getItem('corporateUser');
        if (storedCorporateUser) {
          try {
            setCorporateUser(JSON.parse(storedCorporateUser));
          } catch (e) {
            // If parsing fails, set dummy data
            setCorporateUser({
              company_name: 'Viet Micro Electronics',
              full_name: 'HR Manager',
              email: 'hr@vietmicro.com'
            });
          }
        } else {
          // Set dummy corporate user data if no stored data
          setCorporateUser({
            company_name: 'Viet Micro Electronics',
            full_name: 'HR Manager',
            email: 'hr@vietmicro.com'
          });
        }
      }

      setLoading(false);
    };

    checkAuth();
  }, []);

  // Fetch user health report data
  const fetchUserReport = async (userId, reportId = null) => {
    try {
      let response;
      if (reportId) {
        // Fetch specific report by ID
        response = await axios.get(`/api/reports/user/${userId}/report/${reportId}`);
      } else {
        // Fetch latest report
        response = await axios.get(`/api/reports/user/${userId}`);
      }
      setUserReport(response.data);
      setCurrentReportId(response.data.report?.report_id || null);
    } catch (error) {
      console.error('Failed to fetch user report:', error);
    }
  };

  // Handle report change from ProfileMenu
  const handleReportChange = async (reportId) => {
    if (user && reportId) {
      await fetchUserReport(user.user_id, reportId);
    }
  };

  // Handle login
  const handleLogin = async (identifier) => {
    try {
      const response = await axios.post('/api/auth/login', {
        identifier: identifier
      });

      if (response.data.success) {
        const token = response.data.token;
        localStorage.setItem('token', token);
        setUserToken(token);
        setUser(response.data.user);
        
        // Always require OTP verification on login
        setEmailVerified(false);
        setSessionVerified(false);
        
        return { success: true };
      }
    } catch (error) {
      console.error('Login failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  // Handle admin login 
    const handleAdminLogin = async (credentials) => {
      console.log('handleAdminLogin called with:', credentials);

    try {
      const response = await axios.post('/api/admin/login', credentials);
      const { token, user } = response.data;
      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminUser', JSON.stringify(user));
      setAdminToken(token);
      setAdmin(user);
      console.log('Authenticated user login:', user, token);
      return { success: true };
    } catch (error) {
      console.error('Admin login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Admin login failed' 
      };
    }
  };

  // Handle corporate login
  const handleCorporateLogin = async (credentials) => {
    try {
      const response = await axios.post('/api/corporate/login', credentials);
      
      if (response.data.success) {
        const token = response.data.token;
        localStorage.setItem('corporateToken', token);
        setCorporateToken(token);
        setCorporateUser(response.data.user);
        
        // Store corporate user data for session persistence
        localStorage.setItem('corporateUser', JSON.stringify(response.data.user));
        
        return { success: true };
      }
    } catch (error) {
      console.error('Corporate login failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  // Handle email verification
  const handleEmailVerification = async (email, otp, otpToken) => {
    try {
      const response = await axios.post('/api/auth/verify-otp', {
        email,
        otp,
        otpToken
      });


      if (response.data.success) {
        const token = response.data.token;
        localStorage.setItem('token', token);
        setUserToken(token);
        setEmailVerified(true);
        setSessionVerified(true); // Mark session as verified
        setUser(response.data.user);
        
        // Fetch user report after verification
        await fetchUserReport(response.data.user.user_id);
        setCurrentPage(0); // Go to cover page
        
        return { success: true };
      }
    } catch (error) {
      // Check for token errors and redirect
      if (
        error.response &&
        error.response.status === 401 &&
        error.response.data?.error &&
        (
          error.response.data.error.toLowerCase().includes('jwt expired') ||
          error.response.data.error.toLowerCase().includes('invalid token')
        )
      ) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }

      console.error('Email verification failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Verification failed' 
      };
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    setUserToken(null);
    setUser(null);
    setUserReport(null);
    setEmailVerified(false);
    setSessionVerified(false);
    setCurrentPage(0);
    setShowSupport(false);
  };

  // Handle admin logout
  const handleAdminLogout = () => {
    localStorage.removeItem('adminToken');
    setAdminToken(null);
    setAdmin(null);
  };

  // Handle corporate logout
  const handleCorporateLogout = () => {
    localStorage.removeItem('corporateToken');
    localStorage.removeItem('corporateUser');
    setCorporateToken(null);
    setCorporateUser(null);
  };

  // Handle support navigation
  const handleSupport = () => {
    setShowSupport(true);
  };

  // Handle back from support
  const handleBackFromSupport = () => {
    setShowSupport(false);
  };

  // Navigation functions
  const navigateToPage = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const nextPage = () => {
    if (currentPage < 4) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
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

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Admin Routes */}
        <Route 
          path="/adminlogin" 
          element={
            adminToken ? (
              <Navigate to="/admin" />
            ) : (
              <AdminLogin onLogin={handleAdminLogin} />
            )
          } 
        />
        <Route 
          path="/admin" 
          element={
            adminToken ? (
              <AdminDashboard admin={admin} onLogout={handleAdminLogout} />
            ) : (
              <Navigate to="/adminlogin" />
            )
          } 
        />
        <Route 
          path="/admin/user-details/:userId" 
          element={
            adminToken ? (
              <UserDetails />
            ) : (
              <Navigate to="/adminlogin" />
            )
          } 
        />

        {/* Corporate Routes */}
        <Route 
          path="/corporate" 
          element={
            corporateToken ? (
              <CorporateDashboard user={corporateUser} onLogout={handleCorporateLogout} />
            ) : (
              <CorporateLogin onLogin={handleCorporateLogin} />
            )
          } 
        />

        {/* User Routes */}
        <Route 
          path="/*" 
          element={
            <div className="app">
              {/* If no token, show login */}
              {!userToken ? (
                <LoginPage onLogin={handleLogin} />
              ) : !sessionVerified ? (
                // If logged in but session not verified with OTP, show email verification
                <EmailVerification 
                  user={user}
                  onVerificationComplete={handleEmailVerification}
                />
              ) : (
                // Main app with health report
                <div className="container">
                  {/* Profile Menu - shown on all pages except login and email verification */}
                  {emailVerified && !showSupport && (
                    <div className="absolute top-6 right-6 z-50">
                      <ProfileMenu 
                        user={user} 
                        onSignOut={handleLogout}
                        onSupport={handleSupport}
                        onReportChange={handleReportChange}
                        currentReportId={currentReportId}
                      />
                    </div>
                  )}

                  {/* Support Page */}
                  {showSupport ? (
                    <SupportPage onBack={handleBackFromSupport} />
                  ) : (
                    <>
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={currentPage}
                          variants={pageVariants}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          transition={pageTransition}
                        >
                          {currentPage === 0 && (
                            <CoverPage 
                              user={user}
                              userReport={userReport}
                              onNext={nextPage}
                              navigateToPage={navigateToPage}
                            />
                          )}
                          
                          {currentPage === 1 && (
                            <HealthOverview 
                              user={user}
                              userReport={userReport}
                              onNext={nextPage}
                              onPrev={prevPage}
                            />
                          )}
                          
                          {currentPage === 2 && (
                            <ComparativeAnalysis 
                              user={user}
                              userReport={userReport}
                              onNext={nextPage}
                              onPrev={prevPage}
                            />
                          )}
                          
                          {currentPage === 3 && (
                            <RiskAssessment 
                              user={user}
                              userReport={userReport}
                              onNext={nextPage}
                              onPrev={prevPage}
                            />
                          )}
                          
                          {currentPage === 4 && (
                            <ActionPlan 
                              user={user}
                              userReport={userReport}
                              onPrev={prevPage}
                              goToPage={navigateToPage}
                            />
                          )}
                        </motion.div>
                      </AnimatePresence>

                      {/* Navigation Bar - Hide on Cover Page */}
                      {emailVerified && currentPage !== 0 && (
                        <nav className="navigation">
                          <button 
                            className={`nav-button ${currentPage === 0 ? 'disabled' : ''}`}
                            onClick={prevPage}
                            disabled={currentPage === 0}
                          >
                            <svg viewBox="0 0 24 24" className="nav-icon w-5 h-5 fill-current">
                              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                            </svg>
                            <span className="hidden sm:inline">{t('common.previous')}</span>
                          </button>
                          
                          <span className="page-indicator text-sm font-medium">
                            {`${t('common.page')} ${currentPage} ${t('common.of')} 4`}
                          </span>
                          
                          {currentPage < 4 ? (
                            <button 
                              className="nav-button"
                              onClick={nextPage}
                            >
                              <span className="hidden sm:inline">{t('common.next')}</span>
                              <svg viewBox="0 0 24 24" className="nav-icon w-5 h-5 fill-current">
                                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                              </svg>
                            </button>
                          ) : (
                            <div className="w-20"></div>
                          )}
                        </nav>
                      )}

                    </>
                  )}
                </div>
              )}
            </div>
          } 
        />
      </Routes>
    </Router>
  );
}

// Main App component with LanguageProvider
function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

export default App;