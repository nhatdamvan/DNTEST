import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, RefreshCw, X, ChevronLeft, ChevronRight, Heart, Activity, Droplets, Brain } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const HRA_QUESTIONS = [
  {
    id: 'smoking',
    questionKey: 'riskAssessment.questions.smoking.question',
    optionKeys: ['common.yes', 'common.no'],
    parameterName: 'isSmoker',
    values: [true, false],
    requiredFor: ['framingham', 'who_ish', 'ascvd']
  },
  {
    id: 'bpMeds',
    questionKey: 'riskAssessment.questions.bpMeds.question',
    optionKeys: ['common.yes', 'common.no'],
    parameterName: 'onBPMeds',
    values: [true, false],
    requiredFor: ['framingham', 'ascvd']  // Remove from findrisc as it uses different param name
  },
  {
    id: 'totalCholesterol',
    questionKey: 'riskAssessment.questions.totalCholesterol.question',
    type: 'number',
    parameterName: 'totalCholesterol',
    requiredFor: ['framingham'],
    unit: 'mg/dL',
    prefilledFromLab: true
  },
  {
    id: 'hdlCholesterol',
    questionKey: 'riskAssessment.questions.hdlCholesterol.question',
    type: 'number',
    parameterName: 'hdl',
    requiredFor: ['framingham'],
    unit: 'mg/dL',
    prefilledFromLab: true
  },
  {
    id: 'systolicBP',
    questionKey: 'riskAssessment.questions.systolicBP.question',
    type: 'number',
    parameterName: 'systolicBP',
    requiredFor: ['framingham'],
    unit: 'mmHg',
    prefilledFromLab: true
  },
  {
    id: 'bloodPressureMeds',
    questionKey: 'riskAssessment.questions.bpMeds.question',
    optionKeys: ['common.yes', 'common.no'],
    parameterName: 'bloodPressureMeds',  // Correct param name for FINDRISC
    values: [true, false],
    requiredFor: ['findrisc']
  },
  {
    id: 'physicalActivity',
    questionKey: 'riskAssessment.questions.physicalActivity.question',
    optionKeys: ['common.yes', 'common.no'],
    parameterName: 'physicalActivity',
    values: [true, false],
    requiredFor: ['findrisc']
  },
  {
    id: 'dailyVegetables',
    questionKey: 'riskAssessment.questions.dailyVegetables.question',
    optionKeys: ['common.yes', 'common.no'],
    parameterName: 'dailyVegetables',
    values: [true, false],
    requiredFor: ['findrisc']
  },
  {
    id: 'historyHighGlucose',
    questionKey: 'riskAssessment.questions.historyHighGlucose.question',
    optionKeys: ['common.yes', 'common.no'],
    parameterName: 'historyHighGlucose',
    values: [true, false],
    requiredFor: ['findrisc']
  },
  {
    id: 'familyHistoryDiabetes',
    questionKey: 'riskAssessment.questions.familyHistoryDiabetes.question',
    optionKeys: [
      'riskAssessment.questions.familyHistoryDiabetes.option1',
      'riskAssessment.questions.familyHistoryDiabetes.option2',
      'riskAssessment.questions.familyHistoryDiabetes.option3',
      'riskAssessment.questions.familyHistoryDiabetes.option4'
    ],
    parameterName: 'familyHistoryDiabetes',
    values: ['none', 'second_degree', 'first_degree', 'both'],
    requiredFor: ['findrisc']
  },
  {
    id: 'waistCircumference',
    questionKey: 'riskAssessment.questions.waistCircumference.question',
    type: 'number',
    parameterName: 'waistCircumference',
    requiredFor: ['findrisc']
  },
  {
    id: 'hasDiabetes',
    questionKey: 'riskAssessment.questions.hasDiabetes.question',
    optionKeys: ['common.yes', 'common.no'],
    parameterName: 'hasDiabetes',
    values: [true, false],
    requiredFor: ['who_ish', 'ascvd']
  },
  {
    id: 'bmi',
    questionKey: 'riskAssessment.questions.bmi.question',
    type: 'number',
    parameterName: 'bmi',
    requiredFor: ['findrisc'],
    unit: 'kg/m²',
    prefilledFromLab: true
  },
  {
    id: 'phq9_q1',
    questionKey: 'riskAssessment.questions.phq9_q1.question',
    optionKeys: [
      'riskAssessment.questions.phq9.option1',
      'riskAssessment.questions.phq9.option2',
      'riskAssessment.questions.phq9.option3',
      'riskAssessment.questions.phq9.option4'
    ],
    values: [0, 1, 2, 3],
    requiredFor: ['phq9']
  },
  {
    id: 'phq9_q2',
    questionKey: 'riskAssessment.questions.phq9_q2.question',
    optionKeys: [
      'riskAssessment.questions.phq9.option1',
      'riskAssessment.questions.phq9.option2',
      'riskAssessment.questions.phq9.option3',
      'riskAssessment.questions.phq9.option4'
    ],
    values: [0, 1, 2, 3],
    requiredFor: ['phq9']
  },
  {
    id: 'phq9_q3',
    questionKey: 'riskAssessment.questions.phq9_q3.question',
    optionKeys: [
      'riskAssessment.questions.phq9.option1',
      'riskAssessment.questions.phq9.option2',
      'riskAssessment.questions.phq9.option3',
      'riskAssessment.questions.phq9.option4'
    ],
    values: [0, 1, 2, 3],
    requiredFor: ['phq9']
  },
  {
    id: 'phq9_q4',
    questionKey: 'riskAssessment.questions.phq9_q4.question',
    optionKeys: [
      'riskAssessment.questions.phq9.option1',
      'riskAssessment.questions.phq9.option2',
      'riskAssessment.questions.phq9.option3',
      'riskAssessment.questions.phq9.option4'
    ],
    values: [0, 1, 2, 3],
    requiredFor: ['phq9']
  },
  {
    id: 'phq9_q5',
    questionKey: 'riskAssessment.questions.phq9_q5.question',
    optionKeys: [
      'riskAssessment.questions.phq9.option1',
      'riskAssessment.questions.phq9.option2',
      'riskAssessment.questions.phq9.option3',
      'riskAssessment.questions.phq9.option4'
    ],
    values: [0, 1, 2, 3],
    requiredFor: ['phq9']
  },
  {
    id: 'phq9_q6',
    questionKey: 'riskAssessment.questions.phq9_q6.question',
    optionKeys: [
      'riskAssessment.questions.phq9.option1',
      'riskAssessment.questions.phq9.option2',
      'riskAssessment.questions.phq9.option3',
      'riskAssessment.questions.phq9.option4'
    ],
    values: [0, 1, 2, 3],
    requiredFor: ['phq9']
  },
  {
    id: 'phq9_q7',
    questionKey: 'riskAssessment.questions.phq9_q7.question',
    optionKeys: [
      'riskAssessment.questions.phq9.option1',
      'riskAssessment.questions.phq9.option2',
      'riskAssessment.questions.phq9.option3',
      'riskAssessment.questions.phq9.option4'
    ],
    values: [0, 1, 2, 3],
    requiredFor: ['phq9']
  },
  {
    id: 'phq9_q8',
    questionKey: 'riskAssessment.questions.phq9_q8.question',
    optionKeys: [
      'riskAssessment.questions.phq9.option1',
      'riskAssessment.questions.phq9.option2',
      'riskAssessment.questions.phq9.option3',
      'riskAssessment.questions.phq9.option4'
    ],
    values: [0, 1, 2, 3],
    requiredFor: ['phq9']
  },
  {
    id: 'phq9_q9',
    questionKey: 'riskAssessment.questions.phq9_q9.question',
    optionKeys: [
      'riskAssessment.questions.phq9.option1',
      'riskAssessment.questions.phq9.option2',
      'riskAssessment.questions.phq9.option3',
      'riskAssessment.questions.phq9.option4'
    ],
    values: [0, 1, 2, 3],
    requiredFor: ['phq9']
  }
];

const RiskAssessment = ({ user, userReport, onNext, onPrev }) => {
  const { t } = useLanguage();
  const [assessmentData, setAssessmentData] = useState({});
  const [activeAssessment, setActiveAssessment] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [labParameters, setLabParameters] = useState({});
  const [reportDate, setReportDate] = useState(null);

  // Format date function
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Define assessmentInfo inside component to use translations
  const assessmentInfo = {
    findrisc: {
      name: t('riskAssessment.type2Diabetes'),
      icon: Activity,
      color: 'bg-[#174799]',
      lightColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      timeframe: t('riskAssessment.next10Years')
    },
    framingham: {
      name: t('riskAssessment.cardiovascularDisease'),
      icon: Heart,
      color: 'bg-[#174799]',
      lightColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      timeframe: t('riskAssessment.next10Years')
    },
    phq9: {
      name: t('riskAssessment.phq9'),
      icon: Brain,
      color: 'bg-[#174799]',
      lightColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      timeframe: t('riskAssessment.last2Weeks')
    }
  };

  const keyMap = {
  CVD: 'framingham',
  Diabetes: 'findrisc',
  Hypertension: 'phq9'
};

  useEffect(() => {
    const fetchRiskAssessments = async () => {
      try {
        console.log('Fetching risk assessments for user:', userReport);
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/reports/risk/previous?reportId=${userReport.report.report_id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return;
        const data = await response.json();
        console.log('[DEBUG] Previous risk assessments from backend:', data);
        
        // data should be an object like { Diabetes: { percentage: 23, ... }, CVD: {...}, ... }
        const loadedData = {};
        Object.entries(data).forEach(([type, result]) => {
          const frontendKey = keyMap[type] || type;
          console.log(`[DEBUG] Mapping ${type} → ${frontendKey}, score: ${result.percentage ?? result.points ?? result.score}`);
          loadedData[frontendKey] = {
            completed: true,
            score: result.percentage ?? result.points ?? result.score ?? null,
            lastTaken: result.lastTaken || '',
            backendResult: result
          };
        });
        console.log('[DEBUG] Loaded assessment data:', loadedData);
        setAssessmentData(loadedData);
      } catch (err) {
        // Optionally handle error
      }
    };
    if (user?.user_id) fetchRiskAssessments();
  }, [user?.user_id]);

  // Fetch lab parameters for prefilling
  useEffect(() => {
    const fetchLabParameters = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/reports/parameters/${userReport.report.report_id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
          console.error('Failed to fetch lab parameters:', response.status);
          return;
        }
        const data = await response.json();
        console.log('[DEBUG] Raw response from API:', data);
        
        // Extract parameters and date from response
        const labParams = data.parameters || data; // Handle both old and new format
        const dateFromAPI = data.reportDate;
        
        // Map lab parameters to our needed values
        const params = {};
        if (Array.isArray(labParams)) {
          labParams.forEach(param => {
            // Check for exact matches (from database)
            if (param.parameter_name === 'Total Cholesterol') {
              params.totalCholesterol = parseFloat(param.parameter_value);
            } else if (param.parameter_name === 'HDL Cholesterol') {
              params.hdl = parseFloat(param.parameter_value);
            } else if (param.parameter_name === 'Systolic BP' || param.parameter_name === 'Systolic Blood Pressure') {
              params.systolicBP = parseFloat(param.parameter_value);
            } else if (param.parameter_name === 'BMI' || param.parameter_name === 'Body Mass Index') {
              params.bmi = parseFloat(param.parameter_value);
            }
          });
        }
        
        setLabParameters(params);
        // Use date from API response, fallback to userReport if available
        const reportDate = dateFromAPI || userReport?.report?.created_at || userReport?.created_at;
        setReportDate(reportDate);
        console.log('[DEBUG] Mapped lab parameters:', params);
        console.log('[DEBUG] Report date set to:', reportDate);
      } catch (err) {
        console.error('Error fetching lab parameters:', err);
      }
    };
    
    if (userReport?.report?.report_id) {
      fetchLabParameters();
    }
  }, [userReport?.report?.report_id]);

  const getQuestionsForAssessment = (type) => {
    if (type === 'findrisc') {
      return HRA_QUESTIONS.filter(q => q.requiredFor.includes('findrisc'));
    }
    if (type === 'framingham') {
      return HRA_QUESTIONS.filter(q => q.requiredFor.includes('framingham'));
    }
    if (type === 'phq9') {
      return HRA_QUESTIONS.filter(q => q.requiredFor.includes('phq9'));
    }
    return [];
  };

  const startAssessment = (type) => {
    setActiveAssessment(type);
    setCurrentQuestion(0);
    setAnswers({});
  };

  const handleAnswer = (answer) => {
  if (answer === undefined || answer === null || answer === '' || isNaN(answer)) {
    alert('Please enter a valid number to continue.');
    return;
  }
  const newAnswers = { ...answers, [currentQuestion]: answer };
  setAnswers(newAnswers);

  // Only auto-advance for non-number questions
  const currentQ = getQuestionsForAssessment(activeAssessment)[currentQuestion];
  if (currentQ.type !== 'number') {
    setTimeout(() => {
      if (currentQuestion < getQuestionsForAssessment(activeAssessment).length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        completeAssessment(newAnswers);
      }
    }, 300);
  }
};
  
  // Map answers to backend format and send to /risk/points
  const completeAssessment = async (finalAnswers) => {
    const questions = getQuestionsForAssessment(activeAssessment);
    const token = localStorage.getItem('token'); 

    let fetchBody;

    if (activeAssessment === 'phq9') {
      // For PHQ-9, send an array of answers (0-3)
      const phq9Responses = questions.map((q, idx) => q.values[finalAnswers[idx]]);
      fetchBody = {
        userId: user.user_id,
        type: activeAssessment,
        responses: phq9Responses
      };
    } else {
      let lifestyle = {};
      questions.forEach((q, idx) => {
        if (q.type === 'number') {
          lifestyle[q.parameterName] = Number(finalAnswers[idx]);
        } else if (q.values) {
          lifestyle[q.parameterName] = q.values[finalAnswers[idx]];
        } else {
          lifestyle[q.parameterName] = finalAnswers[idx];
        }
      });
      
      // DEBUG: Log the data being sent for FINDRISC and Framingham
      console.log(`[DEBUG] ${activeAssessment.toUpperCase()} Assessment Data:`, {
        type: activeAssessment,
        userId: user.user_id,
        lifestyle,
        finalAnswers,
        questions: questions.map(q => ({ 
          param: q.parameterName, 
          value: lifestyle[q.parameterName],
          type: q.type,
          questionId: q.id
        }))
      });
      
      // Special debug for waist circumference
      if (activeAssessment === 'findrisc') {
        const waistQuestion = questions.find(q => q.parameterName === 'waistCircumference');
        console.log('[DEBUG] Waist Circumference Question:', waistQuestion);
        console.log('[DEBUG] Waist Value in lifestyle:', lifestyle.waistCircumference);
        console.log('[DEBUG] Type of waist value:', typeof lifestyle.waistCircumference);
      }
      
      fetchBody = {
        userId: user.user_id,
        type: activeAssessment,
        lifestyle
      };
    }

    try {
      console.log('[DEBUG] Sending request to /api/reports/risk/points:', fetchBody);
      
      const response = await fetch('/api/reports/risk/points', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },

        body: JSON.stringify(fetchBody)
      });
      const result = await response.json();
      console.log('[DEBUG] Risk assessment result:', result);
      console.log(`[DEBUG] ${activeAssessment} Score:`, 
        activeAssessment === 'phq9' ? result.totalScore : (result.percentage || result.points || result.score));

      const newScore = activeAssessment === 'phq9'
        ? Math.round((result.totalScore / 27) * 100)
        : (result.percentage || result.points || result.score || null);
        
      console.log(`[DEBUG] New ${activeAssessment} score: ${newScore}`);
      console.log('[DEBUG] Current assessment data before update:', assessmentData);
      
      const newData = {
        ...assessmentData,
        [activeAssessment]: {
          completed: true,
          score: newScore,
          lastTaken: new Date().toISOString(),
          backendResult: result
        }
      };
      
      console.log('[DEBUG] Updated assessment data:', newData);
      setAssessmentData(newData);
      setActiveAssessment(null);
    } catch (error) {
      alert('Failed to calculate risk. Please try again.');
      console.log('Error:', error);
      setActiveAssessment(null);
    }
  };

  const closeAssessment = () => {
    if (currentQuestion > 0) {
      if (window.confirm("Your progress will be lost. Are you sure you want to exit?")) {
        setActiveAssessment(null);
        setCurrentQuestion(0);
        setAnswers({});
      }
    } else {
      setActiveAssessment(null);
    }
  };

  const getRiskLevel = (score, assessmentType) => {
    // Different assessments have different risk thresholds
    if (assessmentType === 'findrisc') {
      // FINDRISC uses percentage values: 1%, 4%, 17%, 33%, 50%
      if (score < 4) return { text: t('riskAssessment.lowRisk'), color: 'text-green-600' };
      if (score < 17) return { text: t('riskAssessment.slightlyElevatedRisk') || 'Slightly Elevated', color: 'text-yellow-600' };
      if (score < 33) return { text: t('riskAssessment.moderateRisk'), color: 'text-orange-600' };
      if (score < 50) return { text: t('riskAssessment.highRisk'), color: 'text-red-600' };
      return { text: t('riskAssessment.veryHighRisk') || 'Very High Risk', color: 'text-red-800' };
    }
    
    // Default for other assessments (PHQ-9, Framingham)
    if (score < 20) return { text: t('riskAssessment.lowRisk'), color: 'text-green-600' };
    if (score < 50) return { text: t('riskAssessment.moderateRisk'), color: 'text-orange-600' };
    return { text: t('riskAssessment.highRisk'), color: 'text-red-600' };
  };

  const bioAge = userReport?.report?.biological_age;
  const actualAge = userReport?.user?.age;
  let ageMessage = '';
  if (typeof bioAge === 'number' && typeof actualAge === 'number') {
    const diff = bioAge - actualAge;
    if (diff < 0) {
      ageMessage = `🎉 ${t('riskAssessment.body')} ${Math.abs(diff)} ${t('riskAssessment.younger')}`;
    } else if (diff > 0) {
      ageMessage = `⚠️ ${t('riskAssessment.body')} ${diff} ${t('riskAssessment.older')}`;
    } else {
      ageMessage = `${t('riskAssessment.matchedAge')}`;
    }
  } else {
    ageMessage = t('riskAssessment.bodyYounger');
  }


  return (
    <div className="page risk-assessment min-h-screen bg-white">
      {/* Header */}
      <header className="flex justify-between items-center p-6 pr-20 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">{t('riskAssessment.title')}</h1>
      </header>

      {/* Main Content */}
      <main className="p-6 pb-24">
        {/* Risk Overview */}
        <motion.div 
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('riskAssessment.yourHealthRiskAnalysis')}
          </h2>
          <p className="text-gray-600">{t('riskAssessment.basedOnMetrics')}</p>
        </motion.div>


      {/* Risk Cards */}
      <section className="space-y-4">
        {Object.entries(assessmentInfo).map(([key, info], index) => {
          const data = assessmentData[key] || {};
          const Icon = info.icon;
          const riskLevel = data.completed ? getRiskLevel(data.score, key) : null;

          return (
            <motion.div
              key={key}
              className={`${info.lightColor} ${info.borderColor} border-2 rounded-2xl p-6`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 ${info.color} rounded-xl flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{info.name}</h3>
                    <p className="text-sm text-gray-600">{info.timeframe}</p>
                  </div>
                </div>
              </div>

              {data.completed ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className={`text-3xl font-black ${riskLevel.color}`}>
                        {data.score}%
                      </span>
                      <span className={`text-sm font-semibold ${riskLevel.color}`}>
                        {riskLevel.text}
                      </span>
                    </div>
                    <button
                      onClick={() => startAssessment(key)}
                      className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg text-sm font-medium text-[#174799] hover:bg-blue-50 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      {t('riskAssessment.retake')}
                    </button>
                  </div>
                  <div className="text-xs text-gray-500">
                    {t('riskAssessment.lastTaken')}: {formatDate(data.lastTaken)}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-600 font-medium">{t('riskAssessment.assessmentNotTaken')}</span>
                  </div>
                  <button
                    onClick={() => startAssessment(key)}
                    className={`px-4 py-2 ${info.color} text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity`}
                  >
                    {t('riskAssessment.startAssessment')}
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
      </section>

      {/* Biological Age Section */}
        <section className="mt-12 bg-[#174799] rounded-2xl px-6 py-8 text-white text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            <h3 className="text-xl font-bold mb-6">{t('riskAssessment.biologicalVsChronological')}</h3>
            
            <div className="flex justify-center gap-12 mb-6">
              <div className="text-center">
                <div className="text-4xl font-black mb-2">
                  {userReport?.user?.age ?? '--'}
                </div>
                <div className="text-sm opacity-80">{t('riskAssessment.actualAge')}</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-black mb-2">
                  {userReport?.report?.biological_age ?? '--'}
                </div>
                <div className="text-sm opacity-80">{t('riskAssessment.biologicalAge')}</div>
              </div>
            </div>
            
            <div className="bg-white bg-opacity-20 inline-block px-4 py-2 rounded-full">
              {ageMessage}
            </div>
          </motion.div>
        </section>
      </main>

      {/* Assessment Modal */}
      <AnimatePresence>
        {activeAssessment && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div 
              className="absolute inset-0 bg-black bg-opacity-50"
              onClick={closeAssessment}
            />
            <motion.div
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-xl max-h-[90vh] flex flex-col"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
                <h3 className="text-lg font-bold text-gray-900">
                  {assessmentInfo[activeAssessment].name} Assessment
                </h3>
                <button
                  onClick={closeAssessment}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Question Content */}
              <div className="p-6 overflow-y-auto flex-1">
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Question {currentQuestion + 1} of {getQuestionsForAssessment(activeAssessment).length}</span>
                    <span>{Math.round((currentQuestion + 1) / getQuestionsForAssessment(activeAssessment).length * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <motion.div
                      className={`h-full ${assessmentInfo[activeAssessment].color} rounded-full`}
                      initial={{ width: 0 }}
                      animate={{ width: `${((currentQuestion + 1) / getQuestionsForAssessment(activeAssessment).length) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                {/* Question */}
                <motion.div
                  key={currentQuestion}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h4 className="text-lg font-semibold text-gray-900 mb-6">
                    {t(getQuestionsForAssessment(activeAssessment)[currentQuestion].questionKey)}
                  </h4>

                  <div className="space-y-3">
                    {getQuestionsForAssessment(activeAssessment)[currentQuestion].type === 'number' ? (
                      <>
                        {(() => {
                          const currentQ = getQuestionsForAssessment(activeAssessment)[currentQuestion];
                          const prefilledValue = currentQ.prefilledFromLab && labParameters[currentQ.parameterName];
                          const hasPrefilledValue = prefilledValue !== undefined && prefilledValue !== null;
                          
                          // Initialize with prefilled value if not already set
                          if (hasPrefilledValue && answers[currentQuestion] === undefined) {
                            setAnswers({ ...answers, [currentQuestion]: prefilledValue });
                          }
                          
                          return (
                            <>
                              {hasPrefilledValue && (
                                <div className="mb-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                                  <span className="font-medium">Prefilled from report dated: </span>
                                  {formatDate(reportDate)}
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  className="flex-1 p-4 text-left bg-gray-50 rounded-xl border border-gray-200"
                                  value={answers[currentQuestion] ?? prefilledValue ?? ''}
                                  onChange={e => {
                                    const value = e.target.value;
                                    setAnswers({ ...answers, [currentQuestion]: value });
                                  }}
                                  placeholder={`Enter value${currentQ.unit ? ` (${currentQ.unit})` : ''}`}
                                  required
                                />
                                {currentQ.unit && (
                                  <span className="text-gray-600 font-medium">{currentQ.unit}</span>
                                )}
                              </div>
                            </>
                          );
                        })()}
                        <button
                          className="mt-4 px-4 py-2 bg-[#174799] text-white rounded-lg font-semibold"
                          onClick={() => {
                            const value = answers[currentQuestion];
                            if (value === '' || value === undefined || isNaN(Number(value))) {
                              alert('Please enter a valid number to continue.');
                              return;
                            }
                            const numValue = Number(value);
                            const newAnswers = { ...answers, [currentQuestion]: numValue };
                            if (currentQuestion < getQuestionsForAssessment(activeAssessment).length - 1) {
                              setCurrentQuestion(currentQuestion + 1);
                            } else {
                              completeAssessment(newAnswers);
                            }
                          }}
                        >
                          Next
                        </button>
                      </>
                    ) : (
                      getQuestionsForAssessment(activeAssessment)[currentQuestion].optionKeys.map((optionKey, index) => (
                        <button
                          key={index}
                          onClick={() => handleAnswer(index)}
                          className="w-full p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200 hover:border-gray-300"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                            <span className="text-gray-700">{t(optionKey)}</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>

                {/* Navigation */}
                <div className="flex justify-between mt-8">
                  <button
                    onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                    disabled={currentQuestion === 0}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      currentQuestion === 0 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  {currentQuestion < getQuestionsForAssessment(activeAssessment).length - 1 && (
                    <span className="text-sm text-gray-500">
                      Select an answer to continue
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RiskAssessment;