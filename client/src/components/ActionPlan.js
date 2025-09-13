import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star, Stethoscope, FlaskConical, Apple, Dumbbell, CheckCircle, X, Calendar, Clock, ChevronRight
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const ActionPlan = ({ userReport, onPrev, goToPage }) => {
  const { t, language } = useLanguage();
  const [actionPlan, setActionPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completedItems, setCompletedItems] = useState({});
  const [showNutritionModal, setShowNutritionModal] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);

  useEffect(() => {
    const fetchActionPlan = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/reports/action-plan?reportId=${userReport?.report?.report_id}&language=${language}`, {
          method: "POST"
        });
        const data = await response.json();
        console.log('Action plan response:', data);
        setActionPlan(data);
        if (data.error && data.error.includes('Report or risk assessment not found')) {
          setError('Kindly take the risk assessment tests on the previous page to create an action plan.');
          return;
        }
      } catch {
        setError("Failed to fetch action plan. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    if (userReport?.report?.report_id) fetchActionPlan();
  }, [userReport?.report?.report_id, language]);

  const getBadgeStyle = (type) => {
    if (type === 'urgent') return 'bg-red-100 text-red-700';
    return 'bg-blue-100 text-[#174798]';
  };

  const toggleCompletion = (itemId) => {
    setCompletedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };


  // --- Modal Components ---
  const Modal = ({ isOpen, onClose, title, children }) => (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="flex items-center justify-center min-h-screen p-4">
            <motion.div
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={onClose}
            />
            <motion.div
              className="relative bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                {children}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

// --- Nutrition Modal Content ---
const NutritionModalContent = () => {
  const topRef = useRef(null);
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'auto' });
  }, []);
  const plan = actionPlan?.Section_3?.Nutrition_Plan;
  if (!plan) return <div>No nutrition plan found.</div>;
  const recommendations = Array.isArray(plan.Recommendations)
    ? plan.Recommendations
    : Object.values(plan);
  return (
    <div ref={topRef}>
      <h3 className="text-xl font-bold mb-3">{plan.Focus || t('actionPlan.nutritionPlan')}</h3>
      <ul className="space-y-2">
        {recommendations.map((rec, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-[#174798]">
            <CheckCircle className="w-4 h-4 text-[#174798] mt-0.5" />
            <span>{rec}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// --- Exercise Modal Content ---
const ExerciseModalContent = () => {
  const topRef = useRef(null);
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'auto' });
  }, []);
  const plan = actionPlan?.Section_4?.Exercise_Routine;
  if (!plan) return <div>No exercise plan found.</div>;
  const recommendations = Array.isArray(plan.Recommendations)
    ? plan.Recommendations
    : Object.values(plan);
  return (
    <div ref={topRef}>
      <h3 className="text-xl font-bold mb-3">{plan.Focus || t('actionPlan.exerciseRoutine')}</h3>
      <ul className="space-y-2">
        {recommendations.map((rec, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-[#174798]">
            <CheckCircle className="w-4 h-4 text-[#174798] mt-0.5" />
            <span>{rec}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

    const renderConsultationCards = () => {
    const section = actionPlan?.Section_1;
    if (!section) return null;
    return Object.entries(section).map(([key, obj], idx) => (
      <div key={key} className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-3">
        <div className="flex justify-between items-start mb-3">
          <h4 className="font-semibold text-gray-900 flex-1">
            {/* Extract the specialty from the key, e.g., "Endocrinologist" */}
            {key.replace(/^Consultation_/, '').replace(/_\d+$/, '').replace(/([A-Z])/g, ' $1').trim()}
          </h4>
          <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${getBadgeStyle('urgent')}`}>
            {obj[`Consultation_Timespan_${idx + 1}`]}
          </span>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          {obj[`Consultation_Summary_${idx + 1}`]}
        </p>
        <button
          onClick={() => toggleCompletion(`consultation-${key}`)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
            completedItems[`consultation-${key}`]
              ? 'bg-white border-2 border-[#174798] text-[#174798] hover:bg-blue-50'
              : 'bg-[#174798] hover:bg-[#0f2d52] text-white'
          }`}
        >
          {completedItems[`consultation-${key}`] && <CheckCircle className="w-4 h-4" />}
          {completedItems[`consultation-${key}`] ? t('actionPlan.completed') : t('actionPlan.markAsComplete')}
        </button>
      </div>
    ));
  };
  
  const renderTestCards = () => {
    const section = actionPlan?.Section_2;
    if (!section) return null;
    return Object.entries(section).map(([key, obj], idx) => (
      <div key={key} className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-3">
        <div className="flex justify-between items-start mb-3">
          <h4 className="font-semibold text-gray-900 flex-1">
            {/* Extract the test name from the key, e.g., "HbA1c" */}
            {key.replace(/^Test_/, '').replace(/_\d+$/, '').replace(/([A-Z])/g, ' $1').trim()}
          </h4>
          <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${getBadgeStyle('normal')}`}>
            {obj[`Test_Timespan_${idx + 1}`]}
          </span>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          {obj[`Test_Summary_${idx + 1}`]}
        </p>
        <button
          onClick={() => toggleCompletion(`test-${key}`)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
            completedItems[`test-${key}`]
              ? 'bg-white border-2 border-[#174798] text-[#174798] hover:bg-blue-50'
              : 'bg-[#174798] hover:bg-[#0f2d52] text-white'
          }`}
        >
          {completedItems[`test-${key}`] && <CheckCircle className="w-4 h-4" />}
          {completedItems[`test-${key}`] ? t('actionPlan.completed') : t('actionPlan.markAsComplete')}
        </button>
      </div>
    ));
  };
  // --- UI ---
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="mb-4">
          <Star className="animate-spin w-8 h-8 text-amber-500" />
        </motion.div>
        <span className="text-gray-600">{t('actionPlan.generatingPlan')}</span>
      </div>
    );
  }

  if (error) {
    // Special UI for HRA not completed
    if (error.includes('risk assessment tests')) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-6 flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl w-full"
          >
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              {/* Icon */}
              <div className="mb-6 flex justify-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                  <FlaskConical className="w-10 h-10 text-[#174798]" />
                </div>
              </div>
              
              {/* Title */}
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('actionPlan.completeAssessmentTitle') || 'Complete Your Health Risk Assessment'}
              </h2>
              
              {/* Message */}
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                {t('actionPlan.completeAssessmentMessage') || 'To create your personalized action plan, please complete the risk assessment tests on the previous page first.'}
              </p>
              
              {/* Benefits */}
              <div className="bg-blue-50 rounded-xl p-6 mb-8 text-left max-w-md mx-auto">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Star className="w-5 h-5 text-yellow-500 mr-2" />
                  {t('actionPlan.whyAssessmentTitle') || 'Why complete the assessment?'}
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span>{t('actionPlan.benefit1') || 'Get personalized health recommendations'}</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span>{t('actionPlan.benefit2') || 'Understand your risk factors better'}</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span>{t('actionPlan.benefit3') || 'Receive targeted action steps for improvement'}</span>
                  </li>
                </ul>
              </div>
              
              {/* Action Button */}
              <button
                onClick={() => {
                  // If goToPage is available, go directly to Risk Assessment (page 3)
                  // Otherwise use onPrev to go back one page
                  if (goToPage) {
                    goToPage(3); // Risk Assessment is page 3
                  } else if (onPrev) {
                    onPrev(); // Go back one page
                  } else {
                    window.history.back(); // Fallback
                  }
                }}
                className="inline-flex items-center px-6 py-3 bg-[#174798] text-white font-medium rounded-lg hover:bg-[#0f3470] transition-colors"
              >
                <ChevronRight className="w-5 h-5 mr-2 rotate-180" />
                {t('actionPlan.goToAssessment') || 'Go to Risk Assessment'}
              </button>
            </div>
          </motion.div>
        </div>
      );
    }
    
    // Generic error UI
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white p-6 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md"
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t('actionPlan.errorTitle') || 'Something went wrong'}
          </h3>
          <p className="text-gray-600">{error}</p>
        </motion.div>
      </div>
    );
  }

  if (!actionPlan) return null;

  return (
    <div className="page action-plan min-h-screen bg-white">
      {/* Header */}
      <header className="flex justify-between items-center p-6 pr-20 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">{t('actionPlan.title')}</h1>
      </header>
      <main className="p-6 pb-24">
        {/* Action Plan Header */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl font-black text-gray-900 mb-2">
            {t('actionPlan.pathToBetterHealth')}
          </h2>
          <p className="text-gray-600">
            {t('actionPlan.personalizedRecommendations')}
          </p>
        </motion.div>

        {/* Disclaimer */}
          <div className="bg-[#174798]/10 border-l-4 border-[#174798] text-[#174798] px-4 py-3 mb-6 rounded-md flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400" />
            <span>
              {t('actionPlan.AIdisclaimer')}
            </span>
          </div>

        {/* Priority Badge */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="bg-gradient-to-r from-amber-100 to-amber-50 border-2 border-amber-200 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
              <Star className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 mb-1">{t('actionPlan.topPriority')}</h3>
              <p className="text-amber-800 font-medium">
                {t('actionPlan.focusOnBloodSugar')}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Consultations */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#174798] rounded-xl flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              {t('actionPlan.doctorConsultations')}
            </h3>
          </div>
          {renderConsultationCards()}
        </section>

        {/* Tests */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#174798] rounded-xl flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              {t('actionPlan.followUpTests')}
            </h3>
          </div>
          {renderTestCards()}
        </section>

        {/* Nutrition */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#174798] rounded-xl flex items-center justify-center">
              <Apple className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              {t('actionPlan.nutritionPlan')}
            </h3>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-3">
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-semibold text-gray-900 flex-1">
                {actionPlan?.Section_3?.Nutrition_Plan?.Focus || t('actionPlan.lowGlycemicDiet')}
              </h4>
              <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${getBadgeStyle('normal')}`}>
                {t('actionPlan.startImmediately')}
              </span>
            </div>
            <ul className="space-y-2 mb-4">
              {actionPlan?.Section_3?.Nutrition_Plan?.Recommendations?.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#174798]">
                  <CheckCircle className="w-4 h-4 text-[#174798] mt-0.5" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => setShowNutritionModal(true)}
                className="px-4 py-2 bg-[#174798] hover:bg-[#0f3470] text-white rounded-lg text-sm font-semibold transition-all duration-200"
              >
                {t('actionPlan.getMealPlan')}
              </button>
            </div>
          </div>
        </section>
        {/* Exercise */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#174798] rounded-xl flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              {t('actionPlan.exerciseRoutine')}
            </h3>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-3">
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-semibold text-gray-900 flex-1">
                {actionPlan?.Section_4?.Exercise_Routine?.Focus || t('actionPlan.150MinutesWeekly')}
              </h4>
              <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${getBadgeStyle('normal')}`}>
                {t('actionPlan.maintainCurrent')}
              </span>
            </div>
            <ul className="space-y-2 mb-4">
              {actionPlan?.Section_4?.Exercise_Routine?.Recommendations?.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-purple-800">
                  <CheckCircle className="w-4 h-4 text-purple-600 mt-0.5" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => setShowExerciseModal(true)}
                className="px-4 py-2 bg-[#174798] hover:bg-[#0f3470] text-white rounded-lg text-sm font-semibold transition-all duration-200"
              >
                {t('actionPlan.workoutPlans')}
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Nutrition Modal */}
      <Modal
        isOpen={showNutritionModal}
        onClose={() => setShowNutritionModal(false)}
        title={t('actionPlan.nutritionPlan')}
      >
        <NutritionModalContent />
      </Modal>

      {/* Exercise Modal */}
      <Modal
        isOpen={showExerciseModal}
        onClose={() => setShowExerciseModal(false)}
        title={t('actionPlan.exerciseRoutine')}
      >
        <ExerciseModalContent />
      </Modal>
    </div>
  );
};

export default ActionPlan;