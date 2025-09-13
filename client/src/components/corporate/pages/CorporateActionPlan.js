import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar,
  Target,
  Users,
  Clock,
  ChevronRight,
  Activity,
  Heart,
  Brain,
  Coffee,
  Utensils,
  Dumbbell,
  FileText,
  Building,
  Info,
  Check,
  AlertCircle,
  Gift,
  Sparkles,
  Trophy,
  Leaf,
  Sun,
  Moon,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Music,
  Smile,
  Droplets,
  TrendingUp,
  CheckCircle,
  Stethoscope,
  FlaskConical,
  Apple,
  Star,
  Loader2,
  TrendingDown,
  Shield,
  LineChart,
  Zap
} from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';

const CorporateActionPlan = ({ dashboardData }) => {
  const { t, language } = useLanguage();
  const [expandedSections, setExpandedSections] = useState({});
  const [completedItems, setCompletedItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [apiData, setApiData] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  

  // Fetch action plan data from API
  // useEffect(() => {
  //   const fetchActionPlan = async () => {
  //     setLoading(true);
  //     try {
  //       const res = await fetch('/api/corporate/action-plan', {
  //         method: 'POST',
  //         headers: {
  //           Authorization: `Bearer ${localStorage.getItem('corporateToken')}`,
  //           'Content-Type': 'application/json'
  //         }
  //       });
  //       const data = await res.json();
  //       setApiData(data);
  //     } catch (err) {
  //       setApiData(null);
  //     }
  //     setLoading(false);
  //   };
  //   fetchActionPlan();
  // }, []);

  // Simulate loading progress
  const simulateProgress = () => {
    const messages = language === 'vi' ? [
      { progress: 10, text: 'Đang phân tích dữ liệu sức khỏe tổ chức...' },
      { progress: 25, text: 'Đang xác định nhóm rủi ro sức khỏe...' },
      { progress: 40, text: 'Đang tạo khuyến nghị dinh dưỡng theo ẩm thực Việt Nam...' },
      { progress: 55, text: 'Đang lập kế hoạch kiểm tra sức khỏe định kỳ...' },
      { progress: 70, text: 'Đang thiết kế chương trình thể dục phù hợp...' },
      { progress: 85, text: 'Đang hoàn thiện kế hoạch hành động...' },
      { progress: 95, text: 'Sắp xong...' }
    ] : [
      { progress: 10, text: 'Analyzing organizational health data...' },
      { progress: 25, text: 'Identifying health risk groups...' },
      { progress: 40, text: 'Creating Vietnamese cuisine nutrition recommendations...' },
      { progress: 55, text: 'Planning health screening programs...' },
      { progress: 70, text: 'Designing fitness initiatives...' },
      { progress: 85, text: 'Finalizing action plan...' },
      { progress: 95, text: 'Almost ready...' }
    ];

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < messages.length) {
        setLoadingProgress(messages[currentIndex].progress);
        setLoadingMessage(messages[currentIndex].text);
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 800);

    return () => clearInterval(interval);
  };

  const fetchActionPlan = async () => {
  setLoading(true);
  setLoadingProgress(0);
  setLoadingMessage(language === 'vi' ? 'Đang khởi tạo...' : 'Initializing...');
  
  // Start progress simulation
  const clearProgress = simulateProgress();
  
  try {
    const res = await fetch(`/api/corporate/action-plan?language=${language}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('corporateToken')}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await res.json();
    
    // Check if we need to regenerate in the correct language
    if (data.needsRegeneration) {
      console.log(`Action plan exists in ${data.currentLanguage}, but user needs ${data.requestedLanguage}. Auto-regenerating...`);
      // Automatically regenerate in the correct language
      await regenerateActionPlan();
      return;
    }
    
    setLoadingProgress(100);
    setLoadingMessage(language === 'vi' ? 'Hoàn tất!' : 'Complete!');
    
    // Small delay to show completion
    setTimeout(() => {
      setApiData(data);
      setLoading(false);
    }, 500);
  } catch (err) {
    setApiData(null);
    setLoading(false);
  }
};

const regenerateActionPlan = async () => {
  setLoading(true);
  setLoadingProgress(0);
  setLoadingMessage(language === 'vi' ? 'Đang tạo kế hoạch mới...' : 'Generating new plan...');
  
  // Start progress simulation
  const clearProgress = simulateProgress();
  
  try {
    const res = await fetch(`/api/corporate/action-plan?language=${language}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('corporateToken')}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await res.json();
    
    setLoadingProgress(100);
    setLoadingMessage(language === 'vi' ? 'Hoàn tất!' : 'Complete!');
    
    // Small delay to show completion
    setTimeout(() => {
      setApiData(data);
      setLoading(false);
    }, 500);
  } catch (err) {
    setApiData(null);
    setLoading(false);
  }
};

useEffect(() => {
  fetchActionPlan();
}, [language]);
  // Toggle completion status
  const toggleCompletion = (itemId) => {
    setCompletedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Toggle section expansion
  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  console.log('API Data:', apiData);
  console.log('Target Groups raw:', apiData?.Target_Groups);

  // Map API data to UI structure
  // Handle both array and object formats from API
  let targetGroupsArray = [];
  if (Array.isArray(apiData?.Target_Groups)) {
    targetGroupsArray = apiData.Target_Groups;
  } else if (apiData?.Target_Groups && typeof apiData.Target_Groups === 'object') {
    // Convert object format to array
    const groups = [];
    for (let i = 1; i <= 3; i++) {
      if (apiData.Target_Groups[`Group_Name_${i}`]) {
        groups.push({
          [`Group_Name_${i}`]: apiData.Target_Groups[`Group_Name_${i}`],
          [`Group_Definition_${i}`]: apiData.Target_Groups[`Group_Definition_${i}`],
          [`Group_Count_${i}`]: apiData.Target_Groups[`Group_Count_${i}`],
          [`Group_Percentage_${i}`]: apiData.Target_Groups[`Group_Percentage_${i}`]
        });
      }
    }
    targetGroupsArray = groups;
  }

  const focusGroups = targetGroupsArray.map((group, idx) => {
        // Get the correct values based on index
        const groupNumber = idx + 1;
        const name = group[`Group_Name_${groupNumber}`];
        const definition = group[`Group_Definition_${groupNumber}`];
        const count = group[`Group_Count_${groupNumber}`] || 0;
        const percentage = group[`Group_Percentage_${groupNumber}`] || 0;
        
        console.log(`Group ${groupNumber}:`, { name, definition, count, percentage, fullGroup: group });
        
        // Determine icon and colors based on group name
        let icon = Heart, color = 'from-red-500 to-rose-600', bgColor = 'bg-red-50', borderColor = 'border-red-200', severity = 'high';
        
        if (name?.toLowerCase().includes('diabetes') || name?.toLowerCase().includes('glucose')) {
          icon = Droplets; color = 'from-[#174798]/70 to-[#174798]/50'; bgColor = 'bg-[#174798]/5'; borderColor = 'border-[#174798]/20';
        }
        if (name?.toLowerCase().includes('vitamin') || name?.toLowerCase().includes('deficiency')) {
          icon = Sun; color = 'from-yellow-500 to-orange-500'; bgColor = 'bg-yellow-50'; borderColor = 'border-yellow-200'; severity = 'medium';
        }
        if (name?.toLowerCase().includes('blood pressure') || name?.toLowerCase().includes('hypertension')) {
          icon = Activity; color = 'from-[#174798] to-[#174798]/80'; bgColor = 'bg-[#174798]/5'; borderColor = 'border-[#174798]/20';
        }
        if (name?.toLowerCase().includes('cholesterol') || name?.toLowerCase().includes('lipid')) {
          icon = Heart; color = 'from-red-500 to-rose-600'; bgColor = 'bg-red-50'; borderColor = 'border-red-200'; severity = 'high';
        }
        
        return {
          id: `group-${idx}`,
          name: name,
          condition: definition,
          count: count,
          percentage: percentage,
          severity,
          icon,
          color,
          bgColor,
          borderColor
        };
      }).filter(g => g.name);
    // : [
    //   // fallback if API fails
    //   {
    //     id: 'cholesterol',
    //     name: t('corporate.actionPlan.highCholesterolGroup'),
    //     condition: t('corporate.actionPlan.cholesterolCondition'),
    //     count: 0,
    //     percentage: 0,
    //     severity: 'high',
    //     icon: Heart,
    //     color: 'from-red-500 to-rose-600',
    //     bgColor: 'bg-red-50',
    //     borderColor: 'border-red-200'
    //   }
    // ];

  // Map API data to action categories
  const actionCategories = [
    {
      id: 'consultations',
      title: t('corporate.actionPlan.healthScreenings'),
      icon: Stethoscope,
      color: 'bg-red-600',
      badgeColor: 'bg-red-100 text-red-700',
      actions: [
        ...(apiData?.Health_Screenings_Consultations?.HealthCamp_Summary
          ? [{
              id: 'annual-health-camp',
              title: t('corporate.actionPlan.annualHealthCamp'),
              badge: apiData.Health_Screenings_Consultations.HealthCamp_Frequency || t('corporate.actionPlan.annual'),
              badgeType: 'urgent',
              description: apiData.Health_Screenings_Consultations.HealthCamp_Summary,
              expandable: true,
              details: {
                activities: Array.isArray(apiData.Health_Screenings_Consultations.HealthCamp_Activities) 
                  ? apiData.Health_Screenings_Consultations.HealthCamp_Activities 
                  : [apiData.Health_Screenings_Consultations.HealthCamp_Activities].filter(Boolean),
                targetGroups: focusGroups.map(g => g.id),
                expectedOutcome: apiData.Health_Screenings_Consultations.HealthCamp_Outcome || ''
              }
            }]
          : []),
        ...(apiData?.Health_Screenings_Consultations?.SpecialistPrograms
          ? apiData.Health_Screenings_Consultations.SpecialistPrograms.map((sp, idx) => ({
              id: `specialist-visits-${idx}`,
              title: sp.Specialist_Name || t('corporate.actionPlan.specialistVisitProgram'),
              badge: sp.Frequency || t('corporate.actionPlan.quarterly'),
              badgeType: 'normal',
              description: sp.Justification || t('corporate.actionPlan.specialistVisitDesc'),
              expandable: true,
              details: {
                activities: [
                  sp.Mode || '',
                  sp.Justification || ''
                ].filter(Boolean),
                targetGroups: focusGroups.map(g => g.id),
                expectedOutcome: ''
              }
            }))
          : [])
      ]
    },
    {
      id: 'wellness-programs',
      title: t('corporate.actionPlan.wellnessInitiatives'),
      icon: Heart,
      color: 'bg-[#174798]',
      badgeColor: 'bg-[#174798]/10 text-[#174798]',
      actions: [
        ...(apiData?.Health_Screenings_Consultations?.HealthAwarenessEvents
          ? apiData.Health_Screenings_Consultations.HealthAwarenessEvents.map((event, idx) => ({
              id: `wellness-event-${idx}`,
              title: event.Event_Name || t('corporate.actionPlan.heartHealthMonth'),
              badge: event.Month || t('corporate.actionPlan.september2025'),
              badgeType: 'normal',
              description: event.Event_Details || t('corporate.actionPlan.heartHealthDesc'),
              expandable: true,
              details: {
                activities: [event.Event_Details, event.Justification].filter(Boolean),
                targetGroups: focusGroups.map(g => g.id),
                expectedOutcome: ''
              }
            }))
          : [])
      ]
    },
    {
      id: 'nutrition',
      title: t('corporate.actionPlan.nutritionTransformation'),
      icon: Apple,
      color: 'bg-[#174798]',
      badgeColor: 'bg-[#174798]/10 text-[#174798]',
      actions: [
        ...(apiData?.Nutrition_Cafeteria?.CafeteriaMenu_Week_1
          ? [{
              id: 'cafeteria-makeover',
              title: t('corporate.actionPlan.cafeteriaMakeover'),
              badge: t('corporate.actionPlan.ongoing'),
              badgeType: 'normal',
              description: apiData.Nutrition_Cafeteria.RecommendedItems || t('corporate.actionPlan.cafeteriaMakeoverDesc'),
              expandable: true,
              details: {
                phases: [
                  {
                    title: t('corporate.actionPlan.phase1'),
                    items: apiData.Nutrition_Cafeteria.CafeteriaMenu_Week_1 || []
                  },
                  {
                    title: t('corporate.actionPlan.phase2'),
                    items: apiData.Nutrition_Cafeteria.CafeteriaMenu_Week_2 || []
                  }
                ],
                expectedOutcome: ''
              }
            }]
          : []),
        ...(apiData?.Nutrition_Cafeteria?.NutritionEducationPrograms
          ? apiData.Nutrition_Cafeteria.NutritionEducationPrograms.map((prog, idx) => ({
              id: `nutrition-education-${idx}`,
              title: t('corporate.actionPlan.nutritionEducation'),
              badge: t('corporate.actionPlan.weekly'),
              badgeType: 'normal',
              description: prog.One_Line_Summary || t('corporate.actionPlan.nutritionEducationDesc'),
              expandable: true,
              details: {
                activities: [prog.Detailed_Content].filter(Boolean),
                targetGroups: focusGroups.map(g => g.id),
                expectedOutcome: ''
              }
            }))
          : [])
      ]
    },
    {
      id: 'fitness',
      title: t('corporate.actionPlan.fitnessPrograms'),
      icon: Dumbbell,
      color: 'bg-[#174798]/80',
      badgeColor: 'bg-[#174798]/10 text-[#174798]/80',
      actions: [
        ...(apiData?.Physical_Activity_Fitness?.FitnessPrograms
          ? apiData.Physical_Activity_Fitness.FitnessPrograms.map((prog, idx) => ({
              id: `fitness-program-${idx}`,
              title: prog.One_Line_Summary || t('corporate.actionPlan.activeWorkplace'),
              badge: t('corporate.actionPlan.immediate'),
              badgeType: 'urgent',
              description: prog.Detailed_Content || t('corporate.actionPlan.activeWorkplaceDesc'),
              expandable: true,
              details: {
                activities: [prog.Detailed_Content].filter(Boolean),
                targetGroups: focusGroups.map(g => g.id),
                expectedOutcome: ''
              }
            }))
          : [])
      ]
    }
  ];

  const getBadgeStyle = (type) => {
    if (type === 'urgent') {
      return 'bg-red-100 text-red-700';
    }
    return 'bg-emerald-100 text-emerald-700';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-6">
        <div className="max-w-4xl mx-auto pt-20">
          {/* Main Loading Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header Section */}
            <div className="bg-gradient-to-r from-[#174798] to-[#174798]/80 p-8 text-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-3xl font-bold mb-2">
                    {language === 'vi' ? 'Đang Tạo Kế Hoạch Hành Động' : 'Creating Your Action Plan'}
                  </h2>
                  <p className="text-white/90">
                    {language === 'vi' 
                      ? 'AI đang phân tích dữ liệu sức khỏe của tổ chức...' 
                      : 'AI is analyzing your organization\'s health data...'}
                  </p>
                </div>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="w-12 h-12 text-white/80" />
                </motion.div>
              </div>

              {/* Progress Bar */}
              <div className="mt-6">
                <div className="flex justify-between text-sm mb-2">
                  <span>{loadingMessage}</span>
                  <span>{loadingProgress}%</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-white to-emerald-300 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${loadingProgress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </div>

            {/* What to Expect Section */}
            <div className="p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <Star className="w-6 h-6 text-yellow-500 mr-2" />
                {language === 'vi' ? 'Kế hoạch của bạn sẽ bao gồm:' : 'Your plan will include:'}
              </h3>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Feature Cards */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-start space-x-4"
                >
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Target className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">
                      {language === 'vi' ? 'Nhóm Mục Tiêu' : 'Target Groups'}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {language === 'vi' 
                        ? 'Xác định 3 nhóm rủi ro sức khỏe chính cần can thiệp'
                        : 'Identify top 3 health risk groups needing intervention'}
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-start space-x-4"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Stethoscope className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">
                      {language === 'vi' ? 'Khám Sức Khỏe' : 'Health Screenings'}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {language === 'vi'
                        ? 'Lịch khám định kỳ và chương trình tư vấn chuyên khoa'
                        : 'Periodic checkups and specialist consultation programs'}
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-start space-x-4"
                >
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Apple className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">
                      {language === 'vi' ? 'Dinh Dưỡng Việt Nam' : 'Vietnamese Nutrition'}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {language === 'vi'
                        ? 'Thực đơn 2 tuần với món ăn Việt Nam lành mạnh'
                        : '2-week menu with healthy Vietnamese cuisine'}
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-start space-x-4"
                >
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Dumbbell className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">
                      {language === 'vi' ? 'Hoạt Động Thể Chất' : 'Physical Activities'}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {language === 'vi'
                        ? 'Chương trình thể dục buổi sáng và hoạt động thể thao'
                        : 'Morning exercises and sports activities programs'}
                    </p>
                  </div>
                </motion.div>
              </div>

              {/* Additional Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mt-8 p-6 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl border border-amber-200"
              >
                <div className="flex items-start space-x-3">
                  <Zap className="w-6 h-6 text-amber-600 mt-1" />
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">
                      {language === 'vi' ? 'Được hỗ trợ bởi AI' : 'Powered by AI'}
                    </h4>
                    <p className="text-sm text-gray-700">
                      {language === 'vi'
                        ? 'Kế hoạch được tạo bằng GPT-4o, tùy chỉnh riêng cho công ty Việt Nam với ẩm thực và văn hóa địa phương'
                        : 'Plan generated using GPT-4o, customized for Vietnamese companies with local cuisine and culture'}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Loading Animation */}
              <div className="flex justify-center mt-8">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="flex space-x-2"
                >
                  <div className="w-3 h-3 bg-[#174798] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-3 h-3 bg-[#174798] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-3 h-3 bg-[#174798] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Time Estimate */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center mt-6 text-gray-600"
          >
            <Clock className="w-5 h-5 inline-block mr-2" />
            <span className="text-sm">
              {language === 'vi' 
                ? 'Thời gian ước tính: 10-15 giây' 
                : 'Estimated time: 10-15 seconds'}
            </span>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!apiData || apiData.error) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('corporate.actionPlan.noPlanTitle') || 'No Action Plan Found'}</h2>
      <p className="text-gray-600 mb-8">{t('corporate.actionPlan.noPlanDesc') || 'Click below to generate your first action plan.'}</p>
      <button
        className="px-6 py-3 bg-[#174798] text-white rounded-lg font-semibold"
        onClick={regenerateActionPlan}
        disabled={loading}
      >
        {loading ? (language === 'vi' ? 'Đang tạo...' : 'Generating...') : 
         (language === 'vi' ? 'Tạo Kế Hoạch Hành Động' : 'Generate Action Plan')}
      </button>
    </div>
  );
}

  return (
    <div className="page action-plan min-h-screen bg-white">
      {/* Header */}
      <header className="p-6 border-b border-gray-100">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{t('corporate.actionPlan.title')}</h1>
            <p className="text-gray-600 mt-2">{t('corporate.actionPlan.subtitle')}</p>
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
              <Sparkles className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-blue-800 font-medium">
                  {language === 'vi' 
                    ? 'Kế hoạch này được tạo bởi AI dựa trên dữ liệu sức khỏe của tổ chức'
                    : 'This plan is AI-generated based on your organization\'s health data'}
                </p>
                <p className="text-blue-700 mt-1">
                  {language === 'vi'
                    ? 'Vui lòng tham khảo ý kiến chuyên gia y tế trước khi thực hiện'
                    : 'Please consult healthcare professionals before implementation'}
                </p>
              </div>
            </div>
          </div>
          <button
            className="ml-4 px-4 py-2 bg-[#174798] text-white rounded-lg font-semibold flex items-center gap-2"
            onClick={regenerateActionPlan}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('corporate.actionPlan.regenerating') : t('corporate.actionPlan.regenerateActionPlan')}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 pb-24">
        {/* Priority Badge */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="bg-gradient-to-r from-amber-100 to-amber-50 border-2 border-amber-200 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
              <Star className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 mb-1">{t('corporate.actionPlan.topPriority')}</h3>
              <p className="text-amber-800 font-medium">
                {apiData?.Top_Priority_Summary || t('corporate.actionPlan.topPriorityDesc')}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Target Groups */}
        <section className="mb-10">
          <div className="flex items-center mb-6">
            <Target className="w-6 h-6 text-gray-700 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">
              {t('corporate.actionPlan.targetGroups')}
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {focusGroups.map((group) => {
              const Icon = group.icon;
              return (
                <motion.div
                  key={group.id}
                  whileHover={{ scale: 1.02, y: -4 }}
                  className={`relative overflow-hidden rounded-2xl border-2 ${group.borderColor} ${group.bgColor} p-6 shadow-lg hover:shadow-xl transition-all duration-300`}
                >
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${group.color} opacity-10 rounded-full -mr-16 -mt-16`} />
                  
                  <div className="relative z-10">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${group.color} flex items-center justify-center mb-4 shadow-lg`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    
                    <h4 className="font-bold text-gray-900 text-lg mb-2">{group.name}</h4>
                    <p className="text-sm text-gray-600 mb-4">{group.condition}</p>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-gray-900">{group.count}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          group.severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {group.percentage}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{t('corporate.actionPlan.employees')}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Action Categories */}
        <section>
          <h2 className="text-2xl font-black text-gray-900 mb-2 text-center">
            {t('corporate.actionPlan.pathToBetterHealth')}
          </h2>
          <p className="text-gray-600 text-center mb-8">
            {t('corporate.actionPlan.personalizedRecommendations')}
          </p>

          {actionCategories.map((category, categoryIndex) => (
            <motion.div
              key={category.id}
              className="mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + categoryIndex * 0.1, duration: 0.5 }}
            >
              {/* Category Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 ${category.color} rounded-xl flex items-center justify-center`}>
                  <category.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  {category.title}
                </h3>
              </div>

              {/* Action Cards */}
              {category.actions.map((action) => (
                <div
                  key={action.id}
                  className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-3"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-semibold text-gray-900 flex-1">
                      {action.title}
                    </h4>
                    <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${getBadgeStyle(action.badgeType)}`}>
                      {action.badge}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 leading-relaxed mb-4">
                    {action.description}
                  </p>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-3 flex-wrap">
                    {action.expandable && (
                      <button
                        onClick={() => toggleSection(action.id)}
                        className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2"
                      >
                        {expandedSections[action.id] ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            {t('corporate.actionPlan.hideDetails')}
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            {t('corporate.actionPlan.viewDetails')}
                          </>
                        )}
                      </button>
                    )}
                    
                    <button
                      onClick={() => toggleCompletion(action.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                        completedItems[action.id]
                          ? 'bg-white border-2 border-[#174798] text-[#174798] hover:bg-[#174798]/5'
                          : 'bg-[#174798] hover:bg-[#0f2d52] text-white'
                      }`}
                    >
                      {completedItems[action.id] && <CheckCircle className="w-4 h-4" />}
                      {completedItems[action.id] ? t('corporate.actionPlan.implemented') : t('corporate.actionPlan.markAsImplemented')}
                    </button>
                  </div>

                  {/* Expandable Details */}
                  <AnimatePresence>
                    {expandedSections[action.id] && action.details && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-4 pt-4 border-t border-gray-200"
                      >
                        {/* Activities or Phases */}
                        {action.details.activities && (
                          <div className="mb-4">
                            <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-600" />
                              {t('corporate.actionPlan.activities')}:
                            </h5>
                            <div className="space-y-2">
                              {action.details.activities.map((activity, index) => (
                                <div key={index} className="flex items-start gap-2">
                                  <Check className="w-4 h-4 text-[#174798] mt-0.5 flex-shrink-0" />
                                  <p className="text-sm text-gray-600">{activity}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Phases (for cafeteria) */}
                        {action.details.phases && (
                          <div className="mb-4">
                            <h5 className="font-semibold text-gray-900 mb-3">{t('corporate.actionPlan.implementationPhases')}:</h5>
                            <div className="space-y-4">
                              {action.details.phases.map((phase, index) => (
                                <div key={index} className="bg-white rounded-lg p-4">
                                  <h6 className="font-medium text-gray-900 mb-2">{phase.title}</h6>
                                  <ul className="space-y-1">
                                    {phase.items.map((item, itemIdx) => (
                                      <li key={itemIdx} className="text-sm text-gray-600 flex items-start gap-2">
                                        <ChevronRight className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                        {item}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Implementations (for active workplace) */}
                        {action.details.implementations && (
                          <div className="mb-4">
                            <h5 className="font-semibold text-gray-900 mb-3">{t('corporate.actionPlan.implementations')}:</h5>
                            <ul className="space-y-2">
                              {action.details.implementations.map((impl, index) => (
                                <li key={index} className="flex items-start gap-2">
                                  <Sparkles className="w-4 h-4 text-[#174798]/70 mt-0.5 flex-shrink-0" />
                                  <p className="text-sm text-gray-600">{impl}</p>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Quarters (for challenges) */}
                        {action.details.quarters && (
                          <div className="mb-4">
                            <h5 className="font-semibold text-gray-900 mb-3">{t('corporate.actionPlan.quarterlyThemes')}:</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {action.details.quarters.map((quarter, index) => (
                                <div key={index} className="bg-white rounded-lg p-4">
                                  <h6 className="font-medium text-gray-900 mb-2">{quarter.title}</h6>
                                  <ul className="space-y-1">
                                    {quarter.activities.map((activity, actIdx) => (
                                      <li key={actIdx} className="text-sm text-gray-600 flex items-start gap-2">
                                        <Activity className="w-3 h-3 text-[#174798] mt-0.5 flex-shrink-0" />
                                        {activity}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Target Groups */}
                        {action.details.targetGroups && (
                          <div className="mb-4">
                            <h5 className="font-semibold text-gray-900 mb-2">{t('corporate.actionPlan.targetingGroups')}:</h5>
                            <div className="flex flex-wrap gap-2">
                              {action.details.targetGroups.map((groupId) => {
                                const group = focusGroups.find(g => g.id === groupId);
                                if (!group) return null;
                                return (
                                  <span key={groupId} className={`px-3 py-1 rounded-full text-xs font-medium ${group.bgColor} ${
                                    group.severity === 'high' ? 'text-red-700' : 'text-yellow-700'
                                  }`}>
                                    {group.name}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Expected Outcome */}
                        {action.details.expectedOutcome && (
                          <div className="mt-4 p-3 bg-[#174798]/5 rounded-lg">
                            <p className="text-sm font-medium text-[#174798] mb-1">{t('corporate.actionPlan.expectedOutcome')}:</p>
                            <p className="text-sm text-[#174798]/90">{action.details.expectedOutcome}</p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </motion.div>
          ))}
        </section>

        {/* Implementation Timeline
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-10"
        >
          <div className="bg-gradient-to-br from-[#174798] to-[#174798]/70 rounded-2xl p-8 text-white shadow-xl">
            <h3 className="text-2xl font-bold mb-6">{t('corporate.actionPlan.implementationTimeline')}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-lg mb-2">{t('corporate.actionPlan.immediate')}</h4>
                <p className="text-sm text-white/80 mb-3">{t('corporate.actionPlan.within2Weeks')}</p>
                <ul className="space-y-2">
                  <li className="text-sm flex items-start gap-2">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {t('corporate.actionPlan.setupHealthCorner')}
                  </li>
                  <li className="text-sm flex items-start gap-2">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {t('corporate.actionPlan.launchAwareness')}
                  </li>
                </ul>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                  <Target className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-lg mb-2">{t('corporate.actionPlan.shortTerm')}</h4>
                <p className="text-sm text-white/80 mb-3">{t('corporate.actionPlan.months13')}</p>
                <ul className="space-y-2">
                  <li className="text-sm flex items-start gap-2">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {t('corporate.actionPlan.monthlyHealthDays')}
                  </li>
                  <li className="text-sm flex items-start gap-2">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {t('corporate.actionPlan.weeklyPrograms')}
                  </li>
                </ul>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                  <Trophy className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-lg mb-2">{t('corporate.actionPlan.longTerm')}</h4>
                <p className="text-sm text-white/80 mb-3">{t('corporate.actionPlan.months36')}</p>
                <ul className="space-y-2">
                  <li className="text-sm flex items-start gap-2">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {t('corporate.actionPlan.quarterlyAssessments')}
                  </li>
                  <li className="text-sm flex items-start gap-2">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {t('corporate.actionPlan.annualHealthWeek')}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div> */}

      </main>
    </div>
  );
};

export default CorporateActionPlan;






















// import React, { useState } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
// import { 
//   Calendar,
//   Target,
//   Users,
//   Clock,
//   ChevronRight,
//   Activity,
//   Heart,
//   Brain,
//   Coffee,
//   Utensils,
//   Dumbbell,
//   FileText,
//   Building,
//   Info,
//   Check,
//   AlertCircle,
//   Gift,
//   Sparkles,
//   Trophy,
//   Leaf,
//   Sun,
//   Moon,
//   ChevronDown,
//   ChevronUp,
//   BookOpen,
//   Music,
//   Smile,
//   Droplets,
//   TrendingUp,
//   CheckCircle,
//   Stethoscope,
//   FlaskConical,
//   Apple,
//   Star
// } from 'lucide-react';
// import { useLanguage } from '../../../contexts/LanguageContext';

// const CorporateActionPlan = ({ dashboardData }) => {
//   const { t } = useLanguage();
//   const [expandedSections, setExpandedSections] = useState({});
//   const [completedItems, setCompletedItems] = useState({});

//   // Toggle completion status
//   const toggleCompletion = (itemId) => {
//     setCompletedItems(prev => ({
//       ...prev,
//       [itemId]: !prev[itemId]
//     }));
//   };

//   // Toggle section expansion
//   const toggleSection = (sectionId) => {
//     setExpandedSections(prev => ({
//       ...prev,
//       [sectionId]: !prev[sectionId]
//     }));
//   };

//   // Focus groups based on health data - Updated with blood pressure instead of stress
//   const focusGroups = [
//     { 
//       id: 'cholesterol',
//       name: t('corporate.actionPlan.highCholesterolGroup'),
//       condition: t('corporate.actionPlan.cholesterolCondition'),
//       count: 296,
//       percentage: 72,
//       severity: 'high',
//       icon: Heart,
//       color: 'from-red-500 to-rose-600',
//       bgColor: 'bg-red-50',
//       borderColor: 'border-red-200'
//     },
//     {
//       id: 'prediabetic',
//       name: t('corporate.actionPlan.preDiabeticGroup'),
//       condition: t('corporate.actionPlan.diabetesCondition'),
//       count: 74,
//       percentage: 18,
//       severity: 'high',
//       icon: Droplets,
//       color: 'from-orange-500 to-amber-600',
//       bgColor: 'bg-orange-50',
//       borderColor: 'border-orange-200'
//     },
//     {
//       id: 'vitaminD',
//       name: t('corporate.actionPlan.vitaminDGroup'),
//       condition: t('corporate.actionPlan.vitaminDCondition'),
//       count: 99,
//       percentage: 24,
//       severity: 'medium',
//       icon: Sun,
//       color: 'from-yellow-500 to-orange-500',
//       bgColor: 'bg-yellow-50',
//       borderColor: 'border-yellow-200'
//     },
//     {
//       id: 'bloodPressure',
//       name: t('corporate.actionPlan.bloodPressureGroup'),
//       condition: t('corporate.actionPlan.bloodPressureCondition'),
//       count: 90,
//       percentage: 22,
//       severity: 'high',
//       icon: Activity,
//       color: 'from-blue-500 to-indigo-600',
//       bgColor: 'bg-blue-50',
//       borderColor: 'border-blue-200'
//     }
//   ];

//   // Action categories with detailed plans
//   const actionCategories = [
//     {
//       id: 'consultations',
//       title: t('corporate.actionPlan.healthScreenings'),
//       icon: Stethoscope,
//       color: 'bg-red-600',
//       badgeColor: 'bg-red-100 text-red-700',
//       actions: [
//         {
//           id: 'annual-health-camp',
//           title: t('corporate.actionPlan.annualHealthCamp'),
//           badge: t('corporate.actionPlan.quarterly'),
//           badgeType: 'urgent',
//           description: t('corporate.actionPlan.annualHealthCampDesc'),
//           expandable: true,
//           details: {
//             activities: [
//               t('corporate.actionPlan.fullBodyCheckup'),
//               t('corporate.actionPlan.specialistConsultations'),
//               t('corporate.actionPlan.onSiteBloodTests'),
//               t('corporate.actionPlan.healthRiskAssessment')
//             ],
//             targetGroups: ['cholesterol', 'prediabetic', 'bloodPressure'],
//             expectedOutcome: t('corporate.actionPlan.healthCampOutcome')
//           }
//         },
//         {
//           id: 'specialist-visits',
//           title: t('corporate.actionPlan.specialistVisitProgram'),
//           badge: t('corporate.actionPlan.monthly'),
//           badgeType: 'normal',
//           description: t('corporate.actionPlan.specialistVisitDesc'),
//           expandable: true,
//           details: {
//             activities: [
//               t('corporate.actionPlan.cardiologistSessions'),
//               t('corporate.actionPlan.endocrinologistConsults'),
//               t('corporate.actionPlan.nutritionistGuidance')
//             ],
//             targetGroups: ['cholesterol', 'prediabetic'],
//             expectedOutcome: t('corporate.actionPlan.specialistOutcome')
//           }
//         }
//       ]
//     },
//     {
//       id: 'wellness-programs',
//       title: t('corporate.actionPlan.wellnessInitiatives'),
//       icon: Heart,
//       color: 'bg-blue-600',
//       badgeColor: 'bg-blue-100 text-blue-700',
//       actions: [
//         {
//           id: 'heart-health-month',
//           title: t('corporate.actionPlan.heartHealthMonth'),
//           badge: t('corporate.actionPlan.september2025'),
//           badgeType: 'normal',
//           description: t('corporate.actionPlan.heartHealthDesc'),
//           expandable: true,
//           details: {
//             activities: [
//               t('corporate.actionPlan.cholesterolScreening'),
//               t('corporate.actionPlan.heartHealthyPho'),
//               t('corporate.actionPlan.stairChallenge'),
//               t('corporate.actionPlan.stressWorkshops')
//             ],
//             targetGroups: ['cholesterol', 'bloodPressure'],
//             expectedOutcome: t('corporate.actionPlan.heartHealthOutcome')
//           }
//         },
//         {
//           id: 'diabetes-prevention',
//           title: t('corporate.actionPlan.diabetesPreventionProgram'),
//           badge: t('corporate.actionPlan.november2025'),
//           badgeType: 'normal',
//           description: t('corporate.actionPlan.diabetesPreventionDesc'),
//           expandable: true,
//           details: {
//             activities: [
//               t('corporate.actionPlan.sugarSmartChallenge'),
//               t('corporate.actionPlan.hba1cScreening'),
//               t('corporate.actionPlan.lunchLearnSeries'),
//               t('corporate.actionPlan.familyHealthDay')
//             ],
//             targetGroups: ['prediabetic'],
//             expectedOutcome: t('corporate.actionPlan.diabetesOutcome')
//           }
//         }
//       ]
//     },
//     {
//       id: 'nutrition',
//       title: t('corporate.actionPlan.nutritionTransformation'),
//       icon: Apple,
//       color: 'bg-green-600',
//       badgeColor: 'bg-green-100 text-green-700',
//       actions: [
//         {
//           id: 'cafeteria-makeover',
//           title: t('corporate.actionPlan.cafeteriaMakeover'),
//           badge: t('corporate.actionPlan.ongoing'),
//           badgeType: 'normal',
//           description: t('corporate.actionPlan.cafeteriaMakeoverDesc'),
//           expandable: true,
//           details: {
//             phases: [
//               {
//                 title: t('corporate.actionPlan.phase1'),
//                 items: [
//                   t('corporate.actionPlan.brownRiceOption'),
//                   t('corporate.actionPlan.freshFruitStation'),
//                   t('corporate.actionPlan.infusedWaterStations'),
//                   t('corporate.actionPlan.calorieLabeling')
//                 ]
//               },
//               {
//                 title: t('corporate.actionPlan.phase2'),
//                 items: [
//                   t('corporate.actionPlan.lowSodiumPho'),
//                   t('corporate.actionPlan.grilledOptions'),
//                   t('corporate.actionPlan.freshSpringRolls'),
//                   t('corporate.actionPlan.omega3Fish')
//                 ]
//               }
//             ],
//             expectedOutcome: t('corporate.actionPlan.cafeteriaOutcome')
//           }
//         },
//         {
//           id: 'nutrition-education',
//           title: t('corporate.actionPlan.nutritionEducation'),
//           badge: t('corporate.actionPlan.weekly'),
//           badgeType: 'normal',
//           description: t('corporate.actionPlan.nutritionEducationDesc'),
//           expandable: true,
//           details: {
//             activities: [
//               t('corporate.actionPlan.readingFoodLabels'),
//               t('corporate.actionPlan.healthyCookingDemos'),
//               t('corporate.actionPlan.portionControlWorkshops'),
//               t('corporate.actionPlan.mealPlanningGuides')
//             ],
//             targetGroups: ['cholesterol', 'prediabetic', 'bloodPressure'],
//             expectedOutcome: t('corporate.actionPlan.nutritionEducationOutcome')
//           }
//         }
//       ]
//     },
//     {
//       id: 'fitness',
//       title: t('corporate.actionPlan.fitnessPrograms'),
//       icon: Dumbbell,
//       color: 'bg-purple-600',
//       badgeColor: 'bg-purple-100 text-purple-700',
//       actions: [
//         {
//           id: 'active-workplace',
//           title: t('corporate.actionPlan.activeWorkplace'),
//           badge: t('corporate.actionPlan.immediate'),
//           badgeType: 'urgent',
//           description: t('corporate.actionPlan.activeWorkplaceDesc'),
//           expandable: true,
//           details: {
//             implementations: [
//               t('corporate.actionPlan.standingDesks'),
//               t('corporate.actionPlan.walkingMeetings'),
//               t('corporate.actionPlan.centralizedPrinters'),
//               t('corporate.actionPlan.fitnessEquipment')
//             ],
//             targetGroups: ['cholesterol', 'bloodPressure', 'prediabetic'],
//             expectedOutcome: t('corporate.actionPlan.activeWorkplaceOutcome')
//           }
//         },
//         {
//           id: 'wellness-challenges',
//           title: t('corporate.actionPlan.wellnessChallenges'),
//           badge: t('corporate.actionPlan.yearRound'),
//           badgeType: 'normal',
//           description: t('corporate.actionPlan.wellnessChallengesDesc'),
//           expandable: true,
//           details: {
//             quarters: [
//               {
//                 title: t('corporate.actionPlan.q1MoveMore'),
//                 activities: [
//                   t('corporate.actionPlan.stepCounting'),
//                   t('corporate.actionPlan.activeCommute'),
//                   t('corporate.actionPlan.sportsTournaments')
//                 ]
//               },
//               {
//                 title: t('corporate.actionPlan.q2EatSmart'),
//                 activities: [
//                   t('corporate.actionPlan.healthyLunchPhotos'),
//                   t('corporate.actionPlan.sugarReduction'),
//                   t('corporate.actionPlan.portionControl')
//                 ]
//               }
//             ],
//             expectedOutcome: t('corporate.actionPlan.challengesOutcome')
//           }
//         }
//       ]
//     }
//   ];

//   const getBadgeStyle = (type) => {
//     if (type === 'urgent') {
//       return 'bg-red-100 text-red-700';
//     }
//     return 'bg-emerald-100 text-emerald-700';
//   };

//   return (
//     <div className="page action-plan min-h-screen bg-white">
//       {/* Header */}
//       <header className="p-6 border-b border-gray-100">
//         <h1 className="text-2xl font-bold text-gray-900">{t('corporate.actionPlan.title')}</h1>
//         <p className="text-gray-600 mt-2">{t('corporate.actionPlan.subtitle')}</p>
//       </header>

//       {/* Main Content */}
//       <main className="p-6 pb-24">
//         {/* Priority Badge */}
//         <motion.div 
//           className="mb-8"
//           initial={{ opacity: 0, scale: 0.9 }}
//           animate={{ opacity: 1, scale: 1 }}
//           transition={{ duration: 0.5 }}
//         >
//           <div className="bg-gradient-to-r from-amber-100 to-amber-50 border-2 border-amber-200 rounded-2xl p-5 flex items-center gap-4">
//             <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
//               <Star className="w-6 h-6 text-white" />
//             </div>
//             <div className="flex-1">
//               <h3 className="font-bold text-gray-900 mb-1">{t('corporate.actionPlan.topPriority')}</h3>
//               <p className="text-amber-800 font-medium">
//                 {t('corporate.actionPlan.topPriorityDesc')}
//               </p>
//             </div>
//           </div>
//         </motion.div>

//         {/* Target Groups */}
//         <section className="mb-10">
//           <div className="flex items-center mb-6">
//             <Target className="w-6 h-6 text-gray-700 mr-2" />
//             <h2 className="text-xl font-semibold text-gray-900">
//               {t('corporate.actionPlan.targetGroups')}
//             </h2>
//           </div>
          
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
//             {focusGroups.map((group) => {
//               const Icon = group.icon;
//               return (
//                 <motion.div
//                   key={group.id}
//                   whileHover={{ scale: 1.02, y: -4 }}
//                   className={`relative overflow-hidden rounded-2xl border-2 ${group.borderColor} ${group.bgColor} p-6 shadow-lg hover:shadow-xl transition-all duration-300`}
//                 >
//                   <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${group.color} opacity-10 rounded-full -mr-16 -mt-16`} />
                  
//                   <div className="relative z-10">
//                     <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${group.color} flex items-center justify-center mb-4 shadow-lg`}>
//                       <Icon className="w-7 h-7 text-white" />
//                     </div>
                    
//                     <h4 className="font-bold text-gray-900 text-lg mb-2">{group.name}</h4>
//                     <p className="text-sm text-gray-600 mb-4">{group.condition}</p>
                    
//                     <div className="space-y-2">
//                       <div className="flex items-center justify-between">
//                         <span className="text-2xl font-bold text-gray-900">{group.count}</span>
//                         <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
//                           group.severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
//                         }`}>
//                           {group.percentage}%
//                         </span>
//                       </div>
//                       <p className="text-xs text-gray-500">{t('corporate.actionPlan.employees')}</p>
//                     </div>
//                   </div>
//                 </motion.div>
//               );
//             })}
//           </div>
//         </section>

//         {/* Action Categories */}
//         <section>
//           <h2 className="text-2xl font-black text-gray-900 mb-2 text-center">
//             {t('corporate.actionPlan.pathToBetterHealth')}
//           </h2>
//           <p className="text-gray-600 text-center mb-8">
//             {t('corporate.actionPlan.personalizedRecommendations')}
//           </p>

//           {actionCategories.map((category, categoryIndex) => (
//             <motion.div
//               key={category.id}
//               className="mb-8"
//               initial={{ opacity: 0, y: 20 }}
//               animate={{ opacity: 1, y: 0 }}
//               transition={{ delay: 0.1 + categoryIndex * 0.1, duration: 0.5 }}
//             >
//               {/* Category Header */}
//               <div className="flex items-center gap-3 mb-4">
//                 <div className={`w-10 h-10 ${category.color} rounded-xl flex items-center justify-center`}>
//                   <category.icon className="w-5 h-5 text-white" />
//                 </div>
//                 <h3 className="text-lg font-bold text-gray-900">
//                   {category.title}
//                 </h3>
//               </div>

//               {/* Action Cards */}
//               {category.actions.map((action) => (
//                 <div
//                   key={action.id}
//                   className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-3"
//                 >
//                   <div className="flex justify-between items-start mb-3">
//                     <h4 className="font-semibold text-gray-900 flex-1">
//                       {action.title}
//                     </h4>
//                     <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${getBadgeStyle(action.badgeType)}`}>
//                       {action.badge}
//                     </span>
//                   </div>
                  
//                   <p className="text-sm text-gray-600 leading-relaxed mb-4">
//                     {action.description}
//                   </p>
                  
//                   {/* Action Buttons */}
//                   <div className="flex gap-3 flex-wrap">
//                     {action.expandable && (
//                       <button
//                         onClick={() => toggleSection(action.id)}
//                         className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2"
//                       >
//                         {expandedSections[action.id] ? (
//                           <>
//                             <ChevronUp className="w-4 h-4" />
//                             {t('corporate.actionPlan.hideDetails')}
//                           </>
//                         ) : (
//                           <>
//                             <ChevronDown className="w-4 h-4" />
//                             {t('corporate.actionPlan.viewDetails')}
//                           </>
//                         )}
//                       </button>
//                     )}
                    
//                     <button
//                       onClick={() => toggleCompletion(action.id)}
//                       className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
//                         completedItems[action.id]
//                           ? 'bg-white border-2 border-green-600 text-green-600 hover:bg-green-50'
//                           : 'bg-green-600 hover:bg-green-700 text-white'
//                       }`}
//                     >
//                       {completedItems[action.id] && <CheckCircle className="w-4 h-4" />}
//                       {completedItems[action.id] ? t('corporate.actionPlan.implemented') : t('corporate.actionPlan.markAsImplemented')}
//                     </button>
//                   </div>

//                   {/* Expandable Details */}
//                   <AnimatePresence>
//                     {expandedSections[action.id] && action.details && (
//                       <motion.div
//                         initial={{ opacity: 0, height: 0 }}
//                         animate={{ opacity: 1, height: 'auto' }}
//                         exit={{ opacity: 0, height: 0 }}
//                         transition={{ duration: 0.3 }}
//                         className="mt-4 pt-4 border-t border-gray-200"
//                       >
//                         {/* Activities or Phases */}
//                         {action.details.activities && (
//                           <div className="mb-4">
//                             <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
//                               <Calendar className="w-4 h-4 text-gray-600" />
//                               {t('corporate.actionPlan.activities')}:
//                             </h5>
//                             <div className="space-y-2">
//                               {action.details.activities.map((activity, index) => (
//                                 <div key={index} className="flex items-start gap-2">
//                                   <Check className="w-4 h-4 text-[#174798] mt-0.5 flex-shrink-0" />
//                                   <p className="text-sm text-gray-600">{activity}</p>
//                                 </div>
//                               ))}
//                             </div>
//                           </div>
//                         )}

//                         {/* Phases (for cafeteria) */}
//                         {action.details.phases && (
//                           <div className="mb-4">
//                             <h5 className="font-semibold text-gray-900 mb-3">{t('corporate.actionPlan.implementationPhases')}:</h5>
//                             <div className="space-y-4">
//                               {action.details.phases.map((phase, index) => (
//                                 <div key={index} className="bg-white rounded-lg p-4">
//                                   <h6 className="font-medium text-gray-900 mb-2">{phase.title}</h6>
//                                   <ul className="space-y-1">
//                                     {phase.items.map((item, itemIdx) => (
//                                       <li key={itemIdx} className="text-sm text-gray-600 flex items-start gap-2">
//                                         <ChevronRight className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
//                                         {item}
//                                       </li>
//                                     ))}
//                                   </ul>
//                                 </div>
//                               ))}
//                             </div>
//                           </div>
//                         )}

//                         {/* Implementations (for active workplace) */}
//                         {action.details.implementations && (
//                           <div className="mb-4">
//                             <h5 className="font-semibold text-gray-900 mb-3">{t('corporate.actionPlan.implementations')}:</h5>
//                             <ul className="space-y-2">
//                               {action.details.implementations.map((impl, index) => (
//                                 <li key={index} className="flex items-start gap-2">
//                                   <Sparkles className="w-4 h-4 text-[#174798]/70 mt-0.5 flex-shrink-0" />
//                                   <p className="text-sm text-gray-600">{impl}</p>
//                                 </li>
//                               ))}
//                             </ul>
//                           </div>
//                         )}

//                         {/* Quarters (for challenges) */}
//                         {action.details.quarters && (
//                           <div className="mb-4">
//                             <h5 className="font-semibold text-gray-900 mb-3">{t('corporate.actionPlan.quarterlyThemes')}:</h5>
//                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                               {action.details.quarters.map((quarter, index) => (
//                                 <div key={index} className="bg-white rounded-lg p-4">
//                                   <h6 className="font-medium text-gray-900 mb-2">{quarter.title}</h6>
//                                   <ul className="space-y-1">
//                                     {quarter.activities.map((activity, actIdx) => (
//                                       <li key={actIdx} className="text-sm text-gray-600 flex items-start gap-2">
//                                         <Activity className="w-3 h-3 text-[#174798] mt-0.5 flex-shrink-0" />
//                                         {activity}
//                                       </li>
//                                     ))}
//                                   </ul>
//                                 </div>
//                               ))}
//                             </div>
//                           </div>
//                         )}

//                         {/* Target Groups */}
//                         {action.details.targetGroups && (
//                           <div className="mb-4">
//                             <h5 className="font-semibold text-gray-900 mb-2">{t('corporate.actionPlan.targetingGroups')}:</h5>
//                             <div className="flex flex-wrap gap-2">
//                               {action.details.targetGroups.map((groupId) => {
//                                 const group = focusGroups.find(g => g.id === groupId);
//                                 if (!group) return null;
//                                 return (
//                                   <span key={groupId} className={`px-3 py-1 rounded-full text-xs font-medium ${group.bgColor} ${
//                                     group.severity === 'high' ? 'text-red-700' : 'text-yellow-700'
//                                   }`}>
//                                     {group.name}
//                                   </span>
//                                 );
//                               })}
//                             </div>
//                           </div>
//                         )}

//                         {/* Expected Outcome */}
//                         {action.details.expectedOutcome && (
//                           <div className="mt-4 p-3 bg-blue-50 rounded-lg">
//                             <p className="text-sm font-medium text-blue-900 mb-1">{t('corporate.actionPlan.expectedOutcome')}:</p>
//                             <p className="text-sm text-blue-800">{action.details.expectedOutcome}</p>
//                           </div>
//                         )}
//                       </motion.div>
//                     )}
//                   </AnimatePresence>
//                 </div>
//               ))}
//             </motion.div>
//           ))}
//         </section>

//         {/* Implementation Timeline */}
//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ delay: 0.6 }}
//           className="mt-10"
//         >
//           <div className="bg-gradient-to-br from-[#174798] to-[#174798]/70 rounded-2xl p-8 text-white shadow-xl">
//             <h3 className="text-2xl font-bold mb-6">{t('corporate.actionPlan.implementationTimeline')}</h3>
            
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//               <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
//                 <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
//                   <Calendar className="w-6 h-6" />
//                 </div>
//                 <h4 className="font-semibold text-lg mb-2">{t('corporate.actionPlan.immediate')}</h4>
//                 <p className="text-sm text-white/80 mb-3">{t('corporate.actionPlan.within2Weeks')}</p>
//                 <ul className="space-y-2">
//                   <li className="text-sm flex items-start gap-2">
//                     <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
//                     {t('corporate.actionPlan.setupHealthCorner')}
//                   </li>
//                   <li className="text-sm flex items-start gap-2">
//                     <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
//                     {t('corporate.actionPlan.launchAwareness')}
//                   </li>
//                 </ul>
//               </div>

//               <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
//                 <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
//                   <Target className="w-6 h-6" />
//                 </div>
//                 <h4 className="font-semibold text-lg mb-2">{t('corporate.actionPlan.shortTerm')}</h4>
//                 <p className="text-sm text-white/80 mb-3">{t('corporate.actionPlan.months13')}</p>
//                 <ul className="space-y-2">
//                   <li className="text-sm flex items-start gap-2">
//                     <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
//                     {t('corporate.actionPlan.monthlyHealthDays')}
//                   </li>
//                   <li className="text-sm flex items-start gap-2">
//                     <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
//                     {t('corporate.actionPlan.weeklyPrograms')}
//                   </li>
//                 </ul>
//               </div>

//               <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
//                 <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
//                   <Trophy className="w-6 h-6" />
//                 </div>
//                 <h4 className="font-semibold text-lg mb-2">{t('corporate.actionPlan.longTerm')}</h4>
//                 <p className="text-sm text-white/80 mb-3">{t('corporate.actionPlan.months36')}</p>
//                 <ul className="space-y-2">
//                   <li className="text-sm flex items-start gap-2">
//                     <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
//                     {t('corporate.actionPlan.quarterlyAssessments')}
//                   </li>
//                   <li className="text-sm flex items-start gap-2">
//                     <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
//                     {t('corporate.actionPlan.annualHealthWeek')}
//                   </li>
//                 </ul>
//               </div>
//             </div>
//           </div>
//         </motion.div>

//       </main>
//     </div>
//   );
// };

// export default CorporateActionPlan;