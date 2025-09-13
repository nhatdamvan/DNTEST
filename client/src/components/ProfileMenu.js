import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, HelpCircle, LogOut, Calendar } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import { useLanguage } from '../contexts/LanguageContext';
import axios from 'axios';

const ProfileMenu = ({ user, onSignOut, onSupport, onReportChange, currentReportId }) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [userReports, setUserReports] = useState([]);
  const [showReportSelector, setShowReportSelector] = useState(false);
  const menuRef = useRef(null);

  // Fetch user reports
  useEffect(() => {
    if (user?.user_id) {
      fetchUserReports();
    }
  }, [user]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowReportSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUserReports = async () => {
    try {
      const response = await axios.get(`/api/reports/user/${user.user_id}/all`);
      setUserReports(response.data);
    } catch (error) {
      console.error('Failed to fetch user reports:', error);
    }
  };

  const formatReportDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} - ${t('common.report')} ${date.getFullYear()}`;
  };

  const menuItems = [
    {
      icon: Calendar,
      label: t('common.selectReport') || 'Select Report',
      onClick: () => {
        setShowReportSelector(!showReportSelector);
      },
      hasSubmenu: true,
      showBadge: userReports.length > 1
    },
    {
      icon: HelpCircle,
      label: t('common.support'),
      onClick: () => {
        setIsOpen(false);
        onSupport();
      }
    },
    {
      icon: LogOut,
      label: t('common.signOut'),
      onClick: () => {
        setIsOpen(false);
        onSignOut();
      }
    }
  ];

  return (
    <div className="flex items-center gap-2 p-1">
      <LanguageSwitcher />
      <div className="relative" ref={menuRef}>
        {/* Profile Icon Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
        >
          <User className="w-5 h-5 text-gray-600" />
        </button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50"
            >
              {/* User Info */}
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email}
                </p>
              </div>

              {/* Menu Items */}
              <div className="py-1">
                {menuItems.map((item, index) => (
                  <div key={index}>
                    <button
                      onClick={item.onClick}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                    >
                      <item.icon className="w-4 h-4 text-gray-500" />
                      <span className="flex-1">{item.label}</span>
                      {item.showBadge && (
                        <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                          {userReports.length}
                        </span>
                      )}
                      {item.hasSubmenu && (
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </button>
                    
                    {/* Report Selector Submenu */}
                    {item.hasSubmenu && showReportSelector && (
                      <div className="bg-gray-50 border-l-2 border-gray-200 ml-4">
                        {userReports.length > 0 ? (
                          userReports.map((report) => (
                            <button
                              key={report.report_id}
                              onClick={() => {
                                onReportChange(report.report_id);
                                setIsOpen(false);
                                setShowReportSelector(false);
                              }}
                              className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between transition-colors ${
                                currentReportId === report.report_id
                                  ? 'bg-blue-50 text-blue-600'
                                  : 'text-gray-600 hover:bg-gray-100'
                              }`}
                            >
                              <span>{formatReportDate(report.test_date)}</span>
                              {currentReportId === report.report_id && (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-sm text-gray-500">
                            {t('common.noReports') || 'No reports available'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ProfileMenu;