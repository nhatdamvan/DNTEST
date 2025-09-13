const express = require('express');
const router = express.Router();
const riskController = require('../controller/riskController');
const reportController = require('../controller/reportController');
const authMiddleware = require('../middleware/auth');
const fetch = require('node-fetch');

const db = require('../config/database');

// Temporarily disable auth for testing averages
router.get('/test/user/:userId', reportController.getUserReport);
router.get('/user/:userId', authMiddleware, reportController.getUserReport);
router.get('/user/:userId/all', authMiddleware, reportController.getAllUserReports);
router.get('/user/:userId/report/:reportId', authMiddleware, reportController.getUserReportById);
router.get('/parameters/:reportId', authMiddleware, async (req, res) => {
  try {
    const { reportId } = req.params;
    
    // Get lab parameters
    const parametersResult = await db.query(
      'SELECT parameter_name, parameter_value, unit FROM lab_parameters WHERE report_id = $1',
      [reportId]
    );
    
    // Get report date
    const reportResult = await db.query(
      'SELECT created_at FROM user_reports WHERE report_id = $1',
      [reportId]
    );
    
    res.json({
      parameters: parametersResult.rows,
      reportDate: reportResult.rows[0]?.created_at || null
    });
  } catch (error) {
    console.error('Error fetching lab parameters:', error);
    res.status(500).json({ error: 'Failed to fetch lab parameters' });
  }
});
router.post('/risk/points', authMiddleware, riskController.getRiskPoints);
router.get('/risk/previous', authMiddleware, riskController.getPreviousRiskAssessments);
router.post('/action-plan', async (req, res) => {
  const { reportId, language } = req.query;
  if (!reportId) return res.status(400).json({ error: 'Missing reportId' });

  // Fetch report and risk_assessment from your DB
//   const reportResult = await db.query('SELECT * FROM reports WHERE report_id = $1', [reportId]);
  const riskResult = await db.query('SELECT * FROM risk_assessments WHERE report_id = $1', [reportId]);

  if (!riskResult.rows.length) {
    return res.status(404).json({ error: 'Report or risk assessment not found' });
  }
  console.log('Risk assessment data:', riskResult.rows);
  const risk = riskResult.rows[0];
  console.log('Risk assessment:', risk);

  // Compose healthReport from report and risk
  const healthReport = {
    ...risk // merge risk assessment fields
  };

  const SYSTEM_PROMPT = `
You are a medical assistant AI. Based on the user's Annual Health Check report provided below, generate a structured Action Plan with the following four sections:

1. Section_1: Doctor Consultations
2. Section_2: Follow-up Tests
3. Section_3: Nutrition Plan
4. Section_4: Exercise Routine

Follow this strict format:
- Use keys like Consultation_SpecialityName_1, Consultation_Timespan_1, Consultation_Summary_1, and similarly for tests (Test_Name_1, etc.)
- For Nutrition and Exercise Plans, do not use numbered suffixes but use clearly labeled sections and subsections.
- Recommend a max of 3 consultations and 3 tests in order of importance.
- If all parameters are normal, still recommend general checkups and plans.
- Ensure all output is in valid, parsable JSON format.
${language === 'vi' ? '\nIMPORTANT: Generate all content in Vietnamese language.' : ''}
Here is the user's health report data:
`;

  // Call OpenAI
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: JSON.stringify(healthReport, null, 2) }
  ];
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages,
      max_tokens: 1200,
      temperature: 0.2
    })
  });
  const data = await response.json();
  let planText = data.choices?.[0]?.message?.content || "";
  planText = planText.replace(/```json|```/g, "").trim();
  let plan = {};
  try {
    plan = JSON.parse(planText);
  } catch (e) {
    return res.status(500).json({ error: 'Invalid OpenAI response' });
  }
  res.json(plan);
});


module.exports = router;

