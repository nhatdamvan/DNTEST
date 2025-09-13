const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const axios = require('axios');

const router = express.Router();

// Generate JWT token for corporate users
const generateCorporateToken = (userId, companyId) => {
  return jwt.sign(
    { userId, companyId, type: 'corporate' },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );
};

function authenticateCorporate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Corporate access required' });
  }
  const token = authHeader.split(' ')[1];
  try {
    console.log('Received token:', token);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log('Decoded token:', decoded);
    if (decoded.type !== 'corporate') {
      return res.status(401).json({ error: 'Invalid corporate token' });
    }
    req.corporate = decoded;
    next();
  } catch (err) {
    console.error('JWT verification error:', err);
    return res.status(401).json({ error: 'Invalid corporate token' });
  }
}


// POST /api/corporate/login - Corporate user login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // First, check if this is a demo login request
    if (username === 'techcorp_hr' && password === 'password123') {
      // Check if demo user exists, if not create it
      let userResult = await query(`
        SELECT * FROM corporate_users 
        WHERE username = $1
      `, [username]);

      if (userResult.rows.length === 0) {
        // Create demo corporate user
        const hashedPassword = await bcrypt.hash('password123', 10);
        
        // First ensure the company exists
        const companyCheck = await query(
          "SELECT company_id FROM companies WHERE company_id = 'CUG001'"
        );
        
        if (companyCheck.rows.length === 0) {
          await query(`
            INSERT INTO companies (company_id, company_name, contact_email)
            VALUES ('CUG001', 'TechCorp Solutions', 'hr@techcorp.com')
          `);
        }
        
        userResult = await query(`
          INSERT INTO corporate_users 
          (username, password_hash, company_id, company_name, full_name, email, phone, created_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `, [
          'techcorp_hr',
          hashedPassword,
          'CUG001',
          'TechCorp Solutions',
          'HR Manager',
          'hr@techcorp.com',
          '+84912345678',
          'system'
        ]);
      }

      const user = userResult.rows[0];
      
      // Update last login
      await query(`
        UPDATE corporate_users 
        SET last_login = CURRENT_TIMESTAMP 
        WHERE id = $1
      `, [user.id]);

      const token = generateCorporateToken(user.id, user.company_id);
      
      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          company_id: user.company_id,
          company_name: user.company_name,
          email: user.email
        }
      });
    }

    // For non-demo users, find corporate user
    const userResult = await query(`
      SELECT * FROM corporate_users 
      WHERE username = $1 AND is_active = true
    `, [username]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];
    
    // Verify password with bcrypt
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await query(`
      UPDATE corporate_users 
      SET last_login = CURRENT_TIMESTAMP 
      WHERE id = $1
    `, [user.id]);

    const token = generateCorporateToken(user.id, user.company_id);
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        company_id: user.company_id,
        company_name: user.company_name,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Corporate login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/corporate/dashboard-data - Get corporate dashboard data with demo fallback
router.get('/dashboard-data', authenticateCorporate, async (req, res) => {
  try {
    const { companyId } = req.corporate;
    const { location, ageGroup, gender, year } = req.query;
    
    console.log('[Corporate Dashboard] Request params:', { companyId, location, ageGroup, gender, year });

    const companyNameResult = await query(`
      SELECT company_name FROM companies WHERE company_id = $1
    `, [companyId]);
    const companyName = companyNameResult.rows[0]?.company_name;

    // Build filter conditions
    let filterConditions = ['u.company_id = $1'];
    let filterParams = [companyId];
    let paramIndex = 2;
    
    if (location && location !== 'all') {
      filterConditions.push(`u.location = $${paramIndex}`);
      filterParams.push(location);
      paramIndex++;
    }
    
    if (gender && gender !== 'all') {
      filterConditions.push(`u.gender = $${paramIndex}`);
      filterParams.push(gender);
      paramIndex++;
    }
    
    const whereClause = filterConditions.join(' AND ');
    
    // Get corporate health metrics
    let metricsResult = await query(`
      SELECT * FROM corporate_health_metrics 
      WHERE company_id = $1 
      ORDER BY metric_date DESC 
      LIMIT 1
    `, [companyId]);
    
    // If no metrics exist, create demo data
    if (metricsResult.rows.length === 0) {
      await query(`
        INSERT INTO corporate_health_metrics 
        (company_id, total_employees, employees_tested, employees_consulted, 
         chq_score, cvd_risk_percentage, diabetes_risk_percentage, hypertension_risk_percentage)
        VALUES ($1, 250, 187, 45, 73, 18.5, 22.3, 15.7)
        RETURNING *
      `, [companyId]);
      
      metricsResult = await query(`
        SELECT * FROM corporate_health_metrics 
        WHERE company_id = $1 
        ORDER BY metric_date DESC 
        LIMIT 1
      `, [companyId]);
    }
    
    // Get participation stats with filters for selected year
    const selectedYear = year ? parseInt(year) : new Date().getFullYear();
    console.log('[Corporate Dashboard] Using year:', selectedYear);
    
    // Get employee count for the selected year
    const employeeCountResult = await query(
      `SELECT total_employees FROM company_year_employees 
       WHERE company_id = $1 AND year = $2`,
      [companyId, selectedYear]
    );
    
    const companyEmployeeCount = employeeCountResult.rows[0]?.total_employees || 0;
    
    filterParams.push(selectedYear);
    const participationResult = await query(`
      SELECT 
        COUNT(DISTINCT u.user_id) as total_users,
        COUNT(DISTINCT CASE WHEN ur.user_id IS NOT NULL AND EXTRACT(YEAR FROM ur.test_date) = $${paramIndex} THEN u.user_id END) as employees_tested,
        SUM(CASE WHEN ur.user_id IS NOT NULL AND EXTRACT(YEAR FROM ur.test_date) = $${paramIndex} THEN 1 ELSE 0 END) as total_tests
      FROM users u
      LEFT JOIN user_reports ur ON u.user_id = ur.user_id
      WHERE ${whereClause}
    `, filterParams);
    
    console.log('[Corporate Dashboard] Participation result:', participationResult.rows[0]);
    
    // If no data, provide demo data
    const participation = participationResult.rows[0];
    // Use company employee count for the year instead of user count
    participation.total_employees = companyEmployeeCount || participation.total_users || 0;
    
    // If still no employee count, get from companies table as fallback
    if (!participation.total_employees) {
      const companyEmployeeResult = await query(
        `SELECT employee_count FROM companies WHERE company_id = $1`,
        [companyId]
      );
      participation.total_employees = companyEmployeeResult.rows[0]?.employee_count || metricsResult.rows[0]?.total_employees || 250;
    }
    
    if (!participation.employees_tested || participation.employees_tested === 0) {
      participation.employees_tested = metricsResult.rows[0]?.employees_tested || 0;
      participation.total_tests = participation.employees_tested;
    }
    
    console.log('[Dashboard Data] Participation:', { 
      companyId, 
      selectedYear, 
      companyEmployeeCount,
      total_employees: participation.total_employees,
      employees_tested: participation.employees_tested 
    });
    
    // Get demographic breakdown for selected year WITH FILTERS APPLIED
    // Build the demographics query with the same filters as other queries
    const demographicsFilterParams = [...filterParams]; // Copy the filter params
    demographicsFilterParams.push(selectedYear); // Add year as last param
    const demographicsParamIndex = filterParams.length + 1;
    
    const demographicsResult = await query(`
      SELECT 
        u.location,
        u.gender,
        CASE 
          WHEN EXTRACT(YEAR FROM AGE(u.date_of_birth)) < 30 THEN '20-30'
          WHEN EXTRACT(YEAR FROM AGE(u.date_of_birth)) < 40 THEN '30-40'
          WHEN EXTRACT(YEAR FROM AGE(u.date_of_birth)) < 50 THEN '40-50'
          WHEN EXTRACT(YEAR FROM AGE(u.date_of_birth)) < 60 THEN '50-60'
          ELSE '60+'
        END as age_group,
        COUNT(DISTINCT u.user_id) as employee_count,
        COUNT(DISTINCT CASE WHEN ur.user_id IS NOT NULL AND EXTRACT(YEAR FROM ur.test_date) = $${demographicsParamIndex} THEN u.user_id END) as tested_count
      FROM users u
      LEFT JOIN user_reports ur ON u.user_id = ur.user_id
      WHERE ${whereClause}
      GROUP BY u.location, u.gender, age_group
    `, demographicsFilterParams);
    
    // If no demographics data, provide demo data
    let demographics = demographicsResult.rows;
    // if (demographics.length === 0) {
    //   demographics = [
    //     { location: 'Hanoi', gender: 'Male', age_group: '30-40', employee_count: 80, tested_count: 65 },
    //     { location: 'Hanoi', gender: 'Female', age_group: '30-40', employee_count: 50, tested_count: 40 },
    //     { location: 'Ho Chi Minh City', gender: 'Male', age_group: '20-30', employee_count: 60, tested_count: 45 },
    //     { location: 'Ho Chi Minh City', gender: 'Female', age_group: '20-30', employee_count: 40, tested_count: 30 },
    //     { location: 'Da Nang', gender: 'Male', age_group: '40-50', employee_count: 20, tested_count: 7 }
    //   ];
    // }
    
    // Get top health concerns for current year
    const concernsResult = await query(`
      SELECT 
        lp.parameter_name,
        COUNT(CASE WHEN lp.status IN ('Normal', 'Severe', 'Borderline') THEN 1 END) as affected_count,
        COUNT(*) as total_count,
        ROUND(COUNT(CASE WHEN lp.status IN ('Normal', 'Severe', 'Borderline') THEN 1 END)::numeric / COUNT(*)::numeric * 100, 1) as percentage
      FROM users u
      JOIN user_reports ur ON u.user_id = ur.user_id
      JOIN lab_parameters lp ON ur.report_id = lp.report_id
      WHERE ${whereClause} AND EXTRACT(YEAR FROM ur.test_date) = $${paramIndex}
      GROUP BY lp.parameter_name
      HAVING COUNT(CASE WHEN lp.status IN ('Normal', 'Severe', 'Borderline') THEN 1 END) > 0
      ORDER BY percentage DESC
      LIMIT 10
    `, filterParams);
    
    // If no concerns data, provide demo data
    let concerns = concernsResult.rows;
    // if (concerns.length === 0) {
    //   concerns = [
    //     { parameter_name: 'Cholesterol', affected_count: 52, total_count: 187, percentage: 27.8 },
    //     { parameter_name: 'Blood Pressure', affected_count: 41, total_count: 187, percentage: 21.9 },
    //     { parameter_name: 'HbA1c', affected_count: 34, total_count: 187, percentage: 18.2 },
    //     { parameter_name: 'Triglycerides', affected_count: 28, total_count: 187, percentage: 15.0 },
    //     { parameter_name: 'Vitamin D', affected_count: 65, total_count: 187, percentage: 34.8 }
    //   ];
    // }
    
    // Get health wins (normal parameters) for current year
    const winsResult = await query(`
      SELECT 
        lp.parameter_name,
        COUNT(CASE WHEN lp.status = 'Normal' THEN 1 END) as normal_count,
        COUNT(*) as total_count,
        ROUND(COUNT(CASE WHEN lp.status = 'Normal' THEN 1 END)::numeric / COUNT(*)::numeric * 100, 1) as percentage
      FROM users u
      JOIN user_reports ur ON u.user_id = ur.user_id
      JOIN lab_parameters lp ON ur.report_id = lp.report_id
      WHERE ${whereClause} AND EXTRACT(YEAR FROM ur.test_date) = $${paramIndex}
      GROUP BY lp.parameter_name
      HAVING COUNT(CASE WHEN lp.status = 'Normal' THEN 1 END) > 0
      ORDER BY percentage DESC
      LIMIT 10
    `, filterParams);
    
    // If no wins data, provide demo data
    let wins = winsResult.rows;
    // if (wins.length === 0) {
    //   wins = [
    //     { parameter_name: 'Hemoglobin', normal_count: 160, total_count: 187, percentage: 85.6 },
    //     { parameter_name: 'Creatinine', normal_count: 150, total_count: 187, percentage: 80.2 },
    //     { parameter_name: 'Liver Enzymes', normal_count: 140, total_count: 187, percentage: 74.9 },
    //     { parameter_name: 'Thyroid', normal_count: 165, total_count: 187, percentage: 88.2 },
    //     { parameter_name: 'Blood Sugar', normal_count: 120, total_count: 187, percentage: 64.2 }
    //   ];
    // }
    
    // Get age analysis for current year
    const ageAnalysisResult = await query(`
      SELECT 
        u.gender,
        CASE 
          WHEN EXTRACT(YEAR FROM AGE(u.date_of_birth)) < 30 THEN '20-30'
          WHEN EXTRACT(YEAR FROM AGE(u.date_of_birth)) < 40 THEN '30-40'
          WHEN EXTRACT(YEAR FROM AGE(u.date_of_birth)) < 50 THEN '40-50'
          WHEN EXTRACT(YEAR FROM AGE(u.date_of_birth)) < 60 THEN '50-60'
          ELSE '60+'
        END as age_group,
        AVG(EXTRACT(YEAR FROM AGE(u.date_of_birth))) as actual_age,
        AVG(ur.biological_age) as biological_age
      FROM users u
      JOIN user_reports ur ON u.user_id = ur.user_id
      WHERE ${whereClause} AND EXTRACT(YEAR FROM ur.test_date) = $${paramIndex}
      GROUP BY u.gender, age_group
    `, filterParams);
    
    // If no age analysis data, provide demo data
    let ageAnalysis = ageAnalysisResult.rows;
    // if (ageAnalysis.length === 0) {
    //   ageAnalysis = [
    //     { gender: 'Male', age_group: '20-30', actual_age: 26, biological_age: 25 },
    //     { gender: 'Male', age_group: '30-40', actual_age: 35, biological_age: 37 },
    //     { gender: 'Male', age_group: '40-50', actual_age: 45, biological_age: 49 },
    //     { gender: 'Female', age_group: '20-30', actual_age: 26, biological_age: 25 },
    //     { gender: 'Female', age_group: '30-40', actual_age: 35, biological_age: 35 },
    //     { gender: 'Female', age_group: '40-50', actual_age: 45, biological_age: 47 }
    //   ];
    // }
    
    // Transform demographics data into the format expected by frontend
    // IMPORTANT: When filters are applied, we want to show FILTERED counts
    // The frontend expects 'tested' field to contain the count to display
    
    // Group by gender for gender chart
    const genderData = demographics.reduce((acc, row) => {
      const existing = acc.find(g => g.name === row.gender);
      if (existing) {
        // For filtered data, tested_count is what we want to show
        existing.tested += parseInt(row.tested_count) || 0;
        existing.total += parseInt(row.employee_count) || 0;
      } else {
        acc.push({
          name: row.gender,
          // 'tested' is what gets displayed in the UI (the filtered count)
          tested: parseInt(row.tested_count) || 0,
          total: parseInt(row.employee_count) || 0
        });
      }
      return acc;
    }, []);
    
    // Calculate percentages for gender data based on filtered tested count
    const totalTested = genderData.reduce((sum, g) => sum + g.tested, 0);
    genderData.forEach(g => {
      g.percentage = totalTested > 0 ? parseFloat(((g.tested / totalTested) * 100).toFixed(1)) : 0;
    });
    
    // COMPREHENSIVE DEBUG LOG
    console.log('[=== DEMOGRAPHICS DEBUG START ===]');
    console.log('[1. Raw Demographics Data]:', JSON.stringify(demographics, null, 2));
    console.log('[2. Filter Conditions]:', {
      whereClause,
      filterParams,
      filters: { 
        location: filters.location, 
        ageGroup: filters.ageGroup, 
        gender: filters.gender 
      }
    });
    console.log('[3. Gender Data Processing]:', {
      rawDemographicsCount: demographics.length,
      genderDataBeforePercentage: JSON.stringify(genderData, null, 2),
      totalTested,
      totalEmployees: genderData.reduce((sum, g) => sum + g.total, 0)
    });
    console.log('[4. Individual Gender Calculations]:');
    genderData.forEach(g => {
      console.log(`  - ${g.name}: tested=${g.tested}, total=${g.total}, percentage=${g.percentage}%, calc=(${g.tested}/${totalTested})*100=${(g.tested/totalTested)*100}`);
    });
    console.log('[5. Final Gender Data]:', JSON.stringify(genderData, null, 2));
    console.log('[=== DEMOGRAPHICS DEBUG END ===]');
    
    // Group by age for age chart
    const ageData = demographics.reduce((acc, row) => {
      const existing = acc.find(a => a.range === row.age_group);
      if (existing) {
        existing.tested += parseInt(row.tested_count) || 0;
        existing.total += parseInt(row.employee_count) || 0;
      } else {
        acc.push({
          range: row.age_group,
          tested: parseInt(row.tested_count) || 0,
          total: parseInt(row.employee_count) || 0
        });
      }
      return acc;
    }, []);
    
    // Calculate percentages for age data
    ageData.forEach(a => {
      a.percentage = totalTested > 0 ? parseFloat(((a.tested / totalTested) * 100).toFixed(1)) : 0;
    });
    
    // Sort age groups
    const ageOrder = ['20-30', '30-40', '40-50', '50-60', '60+'];
    ageData.sort((a, b) => ageOrder.indexOf(a.range) - ageOrder.indexOf(b.range));
    
    const responseData = {
      companyInfo: {
        companyName: companyName
      },
      metrics: {
        ...metricsResult.rows[0] || {},
        employeesTested: participation.employees_tested // Update with filtered count
      },
      participation,
      demographics: {
        gender: genderData,
        age: ageData,
        raw: demographics // Keep raw data for debugging
      },
      concerns,
      wins,
      ageAnalysis,
      lastUpdated: new Date().toISOString(),
      debugInfo: {
        selectedYear,
        totalEmployees: participation.total_employees,
        employeesTested: participation.employees_tested,
        concernsCount: concerns.length,
        winsCount: wins.length,
        demographicsCount: demographics.length,
        genderDataCount: genderData.length,
        ageDataCount: ageData.length
      }
    };
    
    console.log('[Corporate Dashboard] Sending response with debug info:', responseData.debugInfo);
    res.json(responseData);
    
  } catch (error) {
    console.error('Error fetching corporate dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// GET /api/corporate/locations - Get available locations
router.get('/locations', authenticateCorporate, async (req, res) => {
  try {
    const { companyId } = req.corporate;
    
    const result = await query(`
      SELECT DISTINCT location, COUNT(*) as employee_count
      FROM users
      WHERE company_id = $1 AND location IS NOT NULL
      GROUP BY location
      ORDER BY location
    `, [companyId]);
    
    // If no locations, return demo locations
    if (result.rows.length === 0) {
      return res.json([
        { location: 'Hanoi', employee_count: 130 },
        { location: 'Ho Chi Minh City', employee_count: 100 },
        { location: 'Da Nang', employee_count: 20 }
      ]);
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// GET /api/corporate/parameter-trends - Get parameter trends over time
router.get('/parameter-trends', authenticateCorporate, async (req, res) => {
  try {
    const { companyId } = req.corporate;
    const { parameter, period = '3months' } = req.query;
    
    // For demo, return dummy trend data
    const trends = {
      labels: ['Jan', 'Feb', 'Mar'],
      datasets: [
        {
          label: 'Average Value',
          data: [185, 182, 178],
          borderColor: '#10b981',
          tension: 0.1
        }
      ]
    };
    
    res.json(trends);
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

// Admin endpoints for managing corporate users
// POST /api/corporate/admin/create-user - Create corporate user (admin only)
router.post('/admin/create-user', async (req, res) => {
  try {
    const { username, password, company_id, company_name, full_name, email, phone, employee_count } = req.body;
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    const companyCheck = await query(`
      SELECT company_id FROM companies WHERE company_id = $1
    `, [company_id]);

    if (companyCheck.rows.length === 0) {
      await query(`
        INSERT INTO companies (company_id, company_name, contact_email, created_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        RETURNING company_id
      `, [company_id, company_name, email]);
    }

    const result = await query(`
      INSERT INTO corporate_users 
      (username, password_hash, company_id, company_name, full_name, email, phone, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, username, company_id, company_name, full_name, email
    `, [username, passwordHash, company_id, company_name, full_name, email, phone, 'superadmin']);
    
    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating corporate user:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'Username or email already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
});

// GET /api/corporate/admin/users - List all corporate users (admin only)
router.get('/admin/users', async (req, res) => {
  try {
    const result = await query(`
      SELECT cu.id, cu.username, cu.company_id, cu.company_name, cu.full_name, cu.email, cu.phone, 
       cu.is_active, cu.created_at, cu.last_login, c.employee_count
        FROM corporate_users cu
        LEFT JOIN companies c ON cu.company_id = c.company_id
        ORDER BY cu.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching corporate users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PUT /api/corporate/admin/users/:id - Update corporate user (admin only)
router.put('/admin/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, phone, is_active, company_id, company_name, employee_count, password } = req.body;

    // Build the update query dynamically based on whether password is provided
    let updateQuery;
    let queryParams;
    
    if (password && password.trim() !== '') {
      // If password is provided, hash it and include it in the update
      const passwordHash = await bcrypt.hash(password, 10);
      updateQuery = `
        UPDATE corporate_users
        SET full_name = $2, email = $3, phone = $4, is_active = $5, company_id = $6, company_name = $7, password_hash = $8, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, username, company_id, company_name, full_name, email, is_active
      `;
      queryParams = [id, full_name, email, phone, is_active, company_id, company_name, passwordHash];
    } else {
      // No password change, update other fields only
      updateQuery = `
        UPDATE corporate_users
        SET full_name = $2, email = $3, phone = $4, is_active = $5, company_id = $6, company_name = $7, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, username, company_id, company_name, full_name, email, is_active
      `;
      queryParams = [id, full_name, email, phone, is_active, company_id, company_name];
    }

    const result = await query(updateQuery, queryParams);

    // Update company employee count if provided
    if (employee_count !== undefined) {
      const countUpdate = await query(`
        UPDATE companies
        SET employee_count = $2
        WHERE company_id = $1
      `, [company_id, employee_count]);
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating corporate user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/corporate/admin/users/:id - Delete corporate user (admin only)
router.delete('/admin/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // First check if user exists
    const checkResult = await query(
      'SELECT username FROM corporate_users WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Delete the user
    await query('DELETE FROM corporate_users WHERE id = $1', [id]);
    
    res.json({ 
      success: true, 
      message: `User "${checkResult.rows[0].username}" deleted successfully` 
    });
  } catch (error) {
    console.error('Error deleting corporate user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// GET /api/corporate/cover-data - Corporate cover page summary
router.get('/cover-data', authenticateCorporate, async (req, res) => {
  try {
    const { companyId } = req.corporate;
    const { year } = req.query;

    // Fetch company info
    const companyResult = await query(
      `SELECT company_id, company_name FROM companies WHERE company_id = $1 LIMIT 1`,
      [companyId]
    );
    const company = companyResult.rows[0] || {};

    console.log('Company Info:', company);

    // Fetch latest test date (if available)
    // const testDateResult = await query(
    //   `SELECT MAX(test_date) as test_date FROM batch_records WHERE company_id = $1`,
    //   [companyId]
    // );
    // const testDate = testDateResult.rows[0]?.test_date;

    // console.log('Latest Test Date:', testDate);

    // Fetch last updated (latest report or metric)
    const lastUpdatedResult = await query(
      `SELECT MAX(last_updated) as last_updated FROM corporate_health_metrics WHERE company_id = $1`,
      [companyId]
    );
    const lastUpdated = lastUpdatedResult.rows[0]?.last_updated;

    console.log('Last Updated:', lastUpdated);

    // Fetch metrics
    const metricsResult = await query(
      `SELECT * FROM corporate_health_metrics WHERE company_id = $1 ORDER BY metric_date DESC LIMIT 1`,
      [companyId]
    );
    const metricsRow = metricsResult.rows[0] || {};

    console.log('Metrics Row:', metricsRow);

    // Calculate participation and consultation rates
    const currentYear = year ? parseInt(year) : new Date().getFullYear();
    
    // Get employee count for the selected year
    const employeeCountResult = await query(
      `SELECT total_employees FROM company_year_employees 
       WHERE company_id = $1 AND year = $2`,
      [companyId, currentYear]
    );
    
    // If no year-specific count, try to get from companies table
    let totalEmployees = 0;
    if (employeeCountResult.rows[0]?.total_employees) {
      totalEmployees = employeeCountResult.rows[0].total_employees;
    } else {
      // Fallback to company table
      const companyEmployeeResult = await query(
        `SELECT employee_count FROM companies WHERE company_id = $1`,
        [companyId]
      );
      totalEmployees = companyEmployeeResult.rows[0]?.employee_count || metricsRow.total_employees || 250;
    }
    
    console.log('[Cover Data] Employee count:', { companyId, currentYear, totalEmployees });

    const employeesTestedResult = await query(
      `SELECT COUNT(DISTINCT u.user_id) as employees_tested
      FROM users u
      JOIN user_reports ur ON u.user_id = ur.user_id
      WHERE u.company_id = $1 AND EXTRACT(YEAR FROM ur.test_date) = $2`,
      [companyId, currentYear]
      );
    const employeesTested = Number(employeesTestedResult.rows[0]?.employees_tested || 0);

    const employeesConsulted = metricsRow.employees_consulted || 0;
    // const smartReportsAccessed = metricsRow.smart_reports_accessed || 0;

    const smartReportsAccessedResult = await query(
      `SELECT COUNT(DISTINCT user_id) as smart_reports_accessed FROM users WHERE company_id = $1 AND last_login IS NOT NULL`,
      [companyId]
    );
    const smartReportsAccessed = Number(smartReportsAccessedResult.rows[0]?.smart_reports_accessed || 0);

    const participationRate = totalEmployees ? Number(((employeesTested / totalEmployees) * 100).toFixed(1)) : 0;
    const consultationRate = employeesTested ? Number(((employeesConsulted / employeesTested) * 100).toFixed(1)) : 0;
    const smartReportsRate = employeesTested ? Number(((smartReportsAccessed / employeesTested) * 100).toFixed(1)) : 0;

    const chqScoreResult = await query(
      `SELECT AVG(health_score) FROM user_reports
      JOIN users ON user_reports.user_id = users.user_id
      WHERE users.company_id = $1 AND EXTRACT(YEAR FROM user_reports.test_date) = $2`,
      [companyId, currentYear]
    );
    const chqScore = Math.round(Number(chqScoreResult.rows[0]?.avg || 0));

    console.log('Participation Rate:', participationRate);

    console.log('Corporate Cover Data:', {
      companyId: company.company_id,
      companyName: company.company_name,
      // totalEmployees,
      lastUpdated,
      metrics: {
        chqScore,
        // chqLevel: metricsRow.chq_level || '',
        totalEmployees,
        employeesTested,
        participationRate,
        // employeesConsulted,
        // consultationRate,
        smartReportsAccessed,
        smartReportsRate
      }
    });
    res.json({
      companyInfo: {
        companyId: company.company_id,
        companyName: company.company_name,
        lastUpdated
      },
      metrics: {
        chqScore, 
        // chqLevel: metricsRow.chq_level || '',
        totalEmployees,
        employeesTested,
        participationRate,
        // employeesConsulted,
        // consultationRate,
        smartReportsAccessed,
        smartReportsRate
      }
    });
  } catch (error) {
    console.error('Error fetching cover data:', error);
    res.status(500).json({ error: 'Failed to fetch cover data' });
  }
});

// Get available years for the company
router.get('/available-years', authenticateCorporate, async (req, res) => {
  try {
    const { companyId } = req.corporate;
    
    const result = await query(
      `SELECT DISTINCT EXTRACT(YEAR FROM test_date)::integer as year 
       FROM user_reports ur
       JOIN users u ON ur.user_id = u.user_id
       WHERE u.company_id = $1 
       ORDER BY year DESC`,
      [companyId]
    );
    
    const years = result.rows.map(row => row.year);
    
    console.log('[Available Years] Company:', companyId, 'Years:', years);
    
    res.json({ years });
  } catch (error) {
    console.error('[Available Years] Error:', error);
    res.status(500).json({ error: 'Failed to fetch available years' });
  }
});

router.post('/overview-data', authenticateCorporate, async (req, res) => {
  try {
    const { companyId } = req.corporate;
    const { filters = {}, year } = req.body;
    
    const selectedYear = year ? parseInt(year) : new Date().getFullYear();
    console.log('[Overview Data] Using year:', selectedYear);

    // Build filter conditions
    let filterConditions = ['u.company_id = $1'];
    let filterParams = [companyId];
    let paramIndex = 2;

    console.log('Received Filters:', filters);

    if (filters.location && filters.location !== 'all') {
      filterConditions.push(`u.location = $${paramIndex}`);
      filterParams.push(filters.location);
      paramIndex++;
    }
      if (filters.gender && filters.gender !== 'all') {
      filterConditions.push(`LOWER(u.gender) = $${paramIndex}`);
      filterParams.push(filters.gender.toLowerCase());
      paramIndex++;
    }
    if (filters.ageGroup && filters.ageGroup !== 'all') {
      filterConditions.push(`EXTRACT(YEAR FROM AGE(u.date_of_birth)) >= $${paramIndex} AND EXTRACT(YEAR FROM AGE(u.date_of_birth)) < $${paramIndex + 1}`);
      if (filters.ageGroup === '20-30') filterParams.push(20, 30);
      else if (filters.ageGroup === '30-40') filterParams.push(30, 40);
      else if (filters.ageGroup === '40-50') filterParams.push(40, 50);
      else if (filters.ageGroup === '50-60') filterParams.push(50, 60);
      else if (filters.ageGroup === '60+') filterParams.push(60, 200);
      paramIndex += 2;
    }
    const whereClause = filterConditions.join(' AND ');

    console.log('Filter Conditions:', whereClause, filterParams);

    // Company Info (not filtered)
    const companyInfoResult = await query(
      `SELECT company_id, company_name FROM companies WHERE company_id = $1 LIMIT 1`,
      [companyId]
    );
    const companyInfo = companyInfoResult.rows[0] || {};

    // Always get all filter options for the company (not filtered)
    const allLocationsResult = await query(
      `SELECT DISTINCT location FROM users WHERE company_id = $1`,
      [companyId]
    );
    const locations = allLocationsResult.rows.map(row => row.location);
    
    const allGendersResult = await query(
      `SELECT DISTINCT gender FROM users WHERE company_id = $1`,
      [companyId]
    );
    const genders = allGendersResult.rows.map(row => row.gender);
    
    const ageGroupResult = await query(
      `SELECT DISTINCT age_group FROM demographic_averages WHERE company_id = $1 ORDER BY age_group`,
      [companyId]
    );
    const ageGroups = ageGroupResult.rows.map(row => row.age_group);
    
    const locationsWithAll = ['All Locations', ...locations];
    const ageGroupsWithAll = ['All Ages', ...ageGroups];
    const gendersWithAll = ['All', ...genders];

    // Metrics (not filtered)
    const metricsResult = await query(
      `SELECT * FROM corporate_health_metrics WHERE company_id = $1 ORDER BY metric_date DESC LIMIT 1`,
      [companyId]
    );
    const metricsRow = metricsResult.rows[0] || {};

    // Participation (filtered) for selected year
    filterParams.push(selectedYear);
    const employeesTestedResult = await query(
      `SELECT COUNT(DISTINCT u.user_id) as employees_tested 
       FROM users u 
       JOIN user_reports ur ON u.user_id = ur.user_id
       WHERE ${whereClause} AND EXTRACT(YEAR FROM ur.test_date) = $${paramIndex}`,
      filterParams
    );
    const employeesTested = Number(employeesTestedResult.rows[0]?.employees_tested || 0);

    const employeesConsulted = metricsRow.employees_consulted || 0;

    const smartReportsAccessedResult = await query(
      `SELECT COUNT(DISTINCT u.user_id) as smart_reports_accessed FROM users u WHERE u.company_id = $1 AND u.last_login IS NOT NULL`,
      [companyId]
    );
    const smartReportsAccessed = Number(smartReportsAccessedResult.rows[0]?.smart_reports_accessed || 0);
    
    // Get employee count for the selected year
    const employeeCountResult = await query(
      `SELECT total_employees FROM company_year_employees 
       WHERE company_id = $1 AND year = $2`,
      [companyId, selectedYear]
    );
    
    // If no year-specific count, try to get from companies table
    let totalEmployees = employeeCountResult.rows[0]?.total_employees || 0;
    if (!totalEmployees) {
      const companyEmployeeResult = await query(
        `SELECT employee_count FROM companies WHERE company_id = $1`,
        [companyId]
      );
      totalEmployees = companyEmployeeResult.rows[0]?.employee_count || metricsRow.total_employees || 250;
    }
    
    console.log('[Overview Data] Employee count:', { companyId, selectedYear, totalEmployees });
    const participationRate = totalEmployees ? Number(((employeesTested / totalEmployees) * 100).toFixed(1)) : 0;
    const consultationRate = employeesTested ? Number(((employeesConsulted / employeesTested) * 100).toFixed(1)) : 0;
    const smartReportsRate = employeesTested ? Number(((smartReportsAccessed / employeesTested) * 100).toFixed(1)) : 0;

    // CHQ Score (filtered) for current year
    const chqScoreResult = await query(
      `SELECT AVG(ur.health_score) FROM user_reports ur 
       JOIN users u ON ur.user_id = u.user_id 
       WHERE ${whereClause} AND EXTRACT(YEAR FROM ur.test_date) = $${paramIndex}`,
      filterParams
    );
    const chqScore = Math.round(Number(chqScoreResult.rows[0]?.avg || 0));

    // Demographic breakdown (MUST USE FILTERS!)
    // Use the same filterParams that we've been using for other queries
    const locationAvgResult = await query(`
      SELECT u.location, COUNT(DISTINCT u.user_id) as sample_size
      FROM users u
      JOIN user_reports ur ON u.user_id = ur.user_id
      WHERE ${whereClause} AND EXTRACT(YEAR FROM ur.test_date) = $${paramIndex}
      GROUP BY u.location
    `, filterParams);

    const genderAvgResult = await query(`
      SELECT u.gender, COUNT(DISTINCT u.user_id) as sample_size
      FROM users u
      JOIN user_reports ur ON u.user_id = ur.user_id
      WHERE ${whereClause} AND EXTRACT(YEAR FROM ur.test_date) = $${paramIndex}
      GROUP BY u.gender
    `, filterParams);

    const ageGroupAvgResult = await query(`
      SELECT
        CASE
          WHEN EXTRACT(YEAR FROM AGE(u.date_of_birth)) < 30 THEN '20-30'
          WHEN EXTRACT(YEAR FROM AGE(u.date_of_birth)) < 40 THEN '30-40'
          WHEN EXTRACT(YEAR FROM AGE(u.date_of_birth)) < 50 THEN '40-50'
          WHEN EXTRACT(YEAR FROM AGE(u.date_of_birth)) < 60 THEN '50-60'
          ELSE '60+'
        END AS age_group,
        COUNT(DISTINCT u.user_id) AS total
      FROM users u
      JOIN user_reports ur ON u.user_id = ur.user_id
      WHERE ${whereClause} AND EXTRACT(YEAR FROM ur.test_date) = $${paramIndex}
      GROUP BY age_group
      ORDER BY age_group
    `, filterParams);

    const locationRaw = locationAvgResult.rows;
    const genderRaw = genderAvgResult.rows;
    const ageRaw = ageGroupAvgResult.rows;

    console.log(`[Demographics] Year: ${selectedYear}, Location count: ${locationRaw.length}, Gender count: ${genderRaw.length}, Age count: ${ageRaw.length}`);

    // Map locations
    const locationArr = locationRaw.map(row => ({
      name: row.location,
      total: employeesTested,
      tested: Number(row.sample_size),
      percentage: employeesTested ? Number(((Number(row.sample_size) / employeesTested) * 100).toFixed(1)) : 0
    }));

    // Map genders
    const genderArr = genderRaw.map(row => ({
      name: row.gender,
      total: employeesTested,
      tested: Number(row.sample_size),
      percentage: employeesTested ? Number(((Number(row.sample_size) / employeesTested) * 100).toFixed(1)) : 0
    }));

    console.log('Gender Array:', genderArr);
    // Map ages
    const ageArr = ageRaw.map(row => ({
      range: row.age_group,
      total: employeesTested,
      tested: Number(row.total),
      percentage: employeesTested ? Number(((Number(row.total) / employeesTested) * 100).toFixed(1)) : 0
    }));

    // Risk predictions (filtered) for current year
    const riskResult = await query(`
      SELECT 
        ra.risk_type, 
        COUNT(*) FILTER (WHERE ra.risk_level IN ('high')) as high_risk_count,
        ROUND(100.0 * COUNT(*) FILTER (WHERE ra.risk_level IN ('high')) / NULLIF(COUNT(*),0), 1) as high_risk_percentage,
        COUNT(DISTINCT ur.user_id) as user_count
      FROM risk_assessments ra
      JOIN user_reports ur ON ra.report_id = ur.report_id
      JOIN users u ON ur.user_id = u.user_id
      WHERE ${whereClause} AND EXTRACT(YEAR FROM ur.test_date) = $${paramIndex}
      GROUP BY ra.risk_type
    `, filterParams);

    // const riskResult = await query(`
    //   SELECT
    //     ra.risk_type,
    //     ROUND(AVG(ra.risk_percentage), 1) AS avg_risk_percentage,
    //     COUNT(DISTINCT ur.user_id) AS user_count
    //   FROM risk_assessments ra
    //   JOIN user_reports ur ON ra.report_id = ur.report_id
    //   JOIN users u ON ur.user_id = u.user_id
    //   WHERE ${whereClause}
    //   GROUP BY ra.risk_type
    // `, filterParams);

    console.log('Risk Result:', riskResult.rows);

    const mostAffectedResult = await query(`
      SELECT 
        ra.risk_type,
        CASE 
          WHEN EXTRACT(YEAR FROM AGE(u.date_of_birth)) < 30 THEN '20-30 yr'
          WHEN EXTRACT(YEAR FROM AGE(u.date_of_birth)) < 40 THEN '30-40 yr'
          WHEN EXTRACT(YEAR FROM AGE(u.date_of_birth)) < 50 THEN '40-50 yr'
          WHEN EXTRACT(YEAR FROM AGE(u.date_of_birth)) < 60 THEN '50-60 yr'
          ELSE '60+ yr'
        END AS age_group,
        u.gender,
        u.location,
        COUNT(*) as affected_count
      FROM risk_assessments ra
      JOIN user_reports ur ON ra.report_id = ur.report_id
      JOIN users u ON ur.user_id = u.user_id
      WHERE ${whereClause} AND ra.risk_level = 'high' AND EXTRACT(YEAR FROM ur.test_date) = $${paramIndex}
      GROUP BY ra.risk_type, age_group, u.gender, u.location
    `, filterParams);

    const mostAffectedMap = {};
    mostAffectedResult.rows.forEach(row => {
      const key = row.risk_type.toLowerCase();
      if (!mostAffectedMap[key] || row.affected_count > mostAffectedMap[key].affected_count) {
        mostAffectedMap[key] = row;
      }
    });

    const hraRequired = 5; // threshold

    const riskPredictions = {};
    riskResult.rows.forEach(row => {
    const key = row.risk_type.toLowerCase();

      const userCount = Number(row.user_count);
      const highRiskCount = Number(row.high_risk_count);
      const highRiskPercentage = Number(row.high_risk_percentage);
      // const highRiskPercentage = Number(row.avg_risk_percentage);

      const most = mostAffectedMap[key];

      if (userCount >= hraRequired) {
        // Unlocked
        riskPredictions[key] = {
          highRiskPercentage,
          highRiskCount,
          status: "unlocked",
          hraProgress: userCount,
          mostAffected: most
            ? {
                demographic: `${most.gender}, ${most.age_group}`,
                percentage: Number(((most.affected_count / userCount) * 100).toFixed(1)),
                location: most.location
              }
            : {
                demographic: "N/A",
                percentage: 0,
                location: "N/A"
              }
        };
      } else {
        // Locked
        riskPredictions[key] = {
          highRiskPercentage: highRiskPercentage || 0,
          highRiskCount,
          status: "locked",
          hraProgress: userCount,
          hraRequired,
          message: `Need ${Math.max(hraRequired - userCount, 0)} more HRA participation${hraRequired - userCount === 1 ? '' : 's'} to unlock`
        };
      }
    });


    // Health Concerns (filtered, current year only)
    const concernsResult = await query(`
      SELECT 
        lp.parameter_name AS name,
        COUNT(CASE WHEN lp.status IN ('Severe') THEN 1 END) AS affected,
        COUNT(*) AS total,
        ROUND(COUNT(CASE WHEN lp.status IN ('Severe') THEN 1 END)::numeric / COUNT(*)::numeric * 100, 1) AS percentage
      FROM users u
      JOIN user_reports ur ON u.user_id = ur.user_id
      JOIN lab_parameters lp ON ur.report_id = lp.report_id
      WHERE ${whereClause} AND EXTRACT(YEAR FROM ur.test_date) = $${paramIndex}
      GROUP BY lp.parameter_name
      HAVING COUNT(CASE WHEN lp.status IN ('Severe') THEN 1 END) > 0
      ORDER BY percentage DESC
      LIMIT 10
    `, filterParams);

    // Health Wins (filtered, current year only)
    const winsResult = await query(`
      SELECT 
        lp.parameter_name AS name,
        COUNT(CASE WHEN lp.status = 'Normal' THEN 1 END) AS normal,
        COUNT(*) AS total,
        ROUND(COUNT(CASE WHEN lp.status = 'Normal' THEN 1 END)::numeric / COUNT(*)::numeric * 100, 1) AS percentage
      FROM users u
      JOIN user_reports ur ON u.user_id = ur.user_id
      JOIN lab_parameters lp ON ur.report_id = lp.report_id
      WHERE ${whereClause} AND EXTRACT(YEAR FROM ur.test_date) = $${paramIndex}
      GROUP BY lp.parameter_name
      HAVING COUNT(CASE WHEN lp.status = 'Normal' THEN 1 END) > 0
      ORDER BY percentage DESC
      LIMIT 10
    `, filterParams);

    // Age Analysis (filtered, current year only)
    const ageAnalysisResult = await query(`
      SELECT 
        u.gender,
        CASE 
          WHEN EXTRACT(YEAR FROM AGE(u.date_of_birth)) < 30 THEN '20-30'
          WHEN EXTRACT(YEAR FROM AGE(u.date_of_birth)) < 40 THEN '30-40'
          WHEN EXTRACT(YEAR FROM AGE(u.date_of_birth)) < 50 THEN '40-50'
          WHEN EXTRACT(YEAR FROM AGE(u.date_of_birth)) < 60 THEN '50-60'
          ELSE '60+'
        END as age_group,
        AVG(EXTRACT(YEAR FROM AGE(u.date_of_birth))) as actual_age,
        AVG(ur.biological_age) as biological_age
      FROM users u
      JOIN user_reports ur ON u.user_id = ur.user_id
      WHERE ${whereClause} AND EXTRACT(YEAR FROM ur.test_date) = $${paramIndex}
      GROUP BY u.gender, age_group
    `, filterParams);

    console.log('[Overview Data] Results:', {
      selectedYear,
      companyId: companyInfo.company_id,
      companyName: companyInfo.company_name,
      metrics: {
        chqScore,
        totalEmployees,
        employeesTested,
        participationRate,
        smartReportsAccessed,
        smartReportsRate
      }, 
      filters: {
        locations: locationsWithAll,
        ageGroups: ageGroupsWithAll,
        genders: gendersWithAll
      },
      demographics: {
        location: locationArr,
        gender: genderArr,
        age: ageArr
      }, 
      riskPredictions,
      healthConcerns: concernsResult.rows,
      healthWins: winsResult.rows,
      ageAnalysis: ageAnalysisResult.rows
    });

    res.json({
      companyInfo: {
        companyId: companyInfo.company_id,
        companyName: companyInfo.company_name,
      },
      metrics: {
        chqScore,
        totalEmployees,
        employeesTested,
        participationRate,
        smartReportsAccessed,
        smartReportsRate
      },
      filters: {
        locations: locationsWithAll,
        ageGroups: ageGroupsWithAll,
        genders: gendersWithAll
      },
      demographics: {
        location: locationArr,
        gender: genderArr,
        age: ageArr
      },
      riskPredictions,
      healthConcerns: concernsResult.rows,
      healthWins: winsResult.rows,
      ageAnalysis: ageAnalysisResult.rows
    });
  } catch (error) {
    console.error('Error fetching overview data:', error);
    res.status(500).json({ error: 'Failed to fetch overview data' });
  }
});


// New endpoint to get all categories with their parameters
router.get('/categories-with-parameters', authenticateCorporate, async (req, res) => {
  try {
    // Get all active categories with parameter counts
    const categoriesResult = await query(
      `SELECT 
        pc.id, 
        pc.category_key, 
        pc.category_name,
        pc.category_name_vi, 
        pc.icon, 
        pc.color,
        COUNT(pcm.parameter_id) as param_count
      FROM parameter_categories pc
      LEFT JOIN parameter_category_mappings pcm ON pc.id = pcm.category_id
      WHERE pc.is_active = true
      GROUP BY pc.id
      HAVING COUNT(pcm.parameter_id) > 0
      ORDER BY pc.display_order`
    );

    // For each category, get its parameters
    const categoriesWithParams = await Promise.all(
      categoriesResult.rows.map(async (category) => {
        const paramsResult = await query(
          `SELECT 
            pm.parameter_id,
            pm.parameter_key,
            pm.parameter_key_vi,
            pm.unit,
            pm.reference_min,
            pm.reference_max,
            pm.reference_min_male,
            pm.reference_max_male,
            pm.reference_min_female,
            pm.reference_max_female
          FROM parameter_category_mappings pcm
          JOIN parameter_master pm ON pcm.parameter_id = pm.parameter_id
          WHERE pcm.category_id = $1
          ORDER BY pcm.display_order, pm.parameter_priority`,
          [category.id]
        );

        return {
          ...category,
          parameters: paramsResult.rows
        };
      })
    );

    res.json({ categories: categoriesWithParams });
  } catch (error) {
    console.error('Error fetching categories with parameters:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.get('/comparison-data', authenticateCorporate, async (req, res) => {
  try {
    const { companyId } = req.corporate;
    const { category, year } = req.query;

    console.log('Received Category:', category);

    // 1. Fetch category and its parameters
    const categoryResult = await query(
      `SELECT id, category_name FROM parameter_categories WHERE LOWER(category_key) = LOWER($1) LIMIT 1`,
      [category]
    );
    if (!categoryResult.rows.length) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    console.log('Category Result:', categoryResult.rows[0]);

    const categoryId = categoryResult.rows[0].id;
    const categoryName = categoryResult.rows[0].category_name;

    const paramResult = await query(
      `SELECT pm.parameter_key, pm.parameter_key_vi, pm.reference_min, pm.reference_max,
              pm.reference_min_male, pm.reference_max_male,
              pm.reference_min_female, pm.reference_max_female
       FROM parameter_category_mappings pcm
       JOIN parameter_master pm ON pcm.parameter_id = pm.parameter_id
       WHERE pcm.category_id = $1`,
      [categoryId]
    );
    const parameters = paramResult.rows.map(r => r.parameter_key);
    
    // Create translation mapping for parameters
    const parameterTranslations = {};
    paramResult.rows.forEach(row => {
      parameterTranslations[row.parameter_key] = {
        en: row.parameter_key,
        vi: row.parameter_key_vi || row.parameter_key
      };
    });

    // 2. Parameter-level comparison (selected year vs previous year)
    const selectedYear = year ? parseInt(year) : new Date().getFullYear();
    const previousYear = selectedYear - 1;
    
    console.log('[Comparison] Using years:', { selectedYear, previousYear });
    
    const currentYearParams = await query(
      `SELECT lp.parameter_name, AVG(CAST(lp.parameter_value AS FLOAT)) AS avg_value
       FROM lab_parameters lp
       JOIN user_reports ur ON lp.report_id = ur.report_id
       JOIN users u ON ur.user_id = u.user_id
       WHERE u.company_id = $1 AND lp.parameter_name = ANY($2) AND EXTRACT(YEAR FROM ur.test_date) = $3
       GROUP BY lp.parameter_name`,
      [companyId, parameters, selectedYear]
    );
    // Fetch BOTH previous year data (for trends) AND demographic averages (for national comparison)
    
    // 1. Get previous year data for yearly trends
    const previousYearParams = await query(
      `SELECT lp.parameter_name, AVG(CAST(lp.parameter_value AS FLOAT)) AS avg_value
       FROM lab_parameters lp
       JOIN user_reports ur ON lp.report_id = ur.report_id
       JOIN users u ON ur.user_id = u.user_id
       WHERE u.company_id = $1 AND lp.parameter_name = ANY($2) AND EXTRACT(YEAR FROM ur.test_date) = $3
       GROUP BY lp.parameter_name`,
      [companyId, parameters, previousYear]
    );
    
    // 2. Get company location from users table (since companies table doesn't have location)
    const companyInfoResult = await query(
      `SELECT DISTINCT location FROM users WHERE company_id = $1 LIMIT 1`,
      [companyId]
    );
    const companyLocation = companyInfoResult.rows[0]?.location || 'Singapore';
    
    // 3. Get demographic averages for national comparison (average across all age groups and genders)
    const demographicAveragesResult = await query(
      `SELECT da.parameter_key, 
              AVG(da.average_value) as average_value,
              SUM(da.sample_size) as total_samples
       FROM demographic_averages da
       WHERE da.company_id = $1 
       AND da.location = $2
       AND da.parameter_key = ANY($3)
       GROUP BY da.parameter_key`,
      [companyId, companyLocation, parameters]
    );
    
    console.log('[Corporate Comparison] Data fetched:', {
      companyId,
      location: companyLocation,
      parameters,
      currentYearResults: currentYearParams.rows.length,
      previousYearResults: previousYearParams.rows.length,
      demographicResults: demographicAveragesResult.rows.length,
      demographicAverages: demographicAveragesResult.rows
    });
    
    // Create maps for easy lookup
    const currentYearMap = Object.fromEntries(currentYearParams.rows.map(r => [r.parameter_name, Number(r.avg_value)]));
    const previousYearMap = Object.fromEntries(previousYearParams.rows.map(r => [r.parameter_name, Number(r.avg_value)]));
    const demographicAvgMap = Object.fromEntries(demographicAveragesResult.rows.map(r => [r.parameter_key, Number(r.average_value)]));

    let parameterComparison = [];
    let parameterComparisonError = null;

    if (!parameters.length) {
      parameterComparisonError = 'No parameters found for this category';
    } else {
      parameterComparison = parameters.map(p => ({
        name: p,
        nameEn: parameterTranslations[p]?.en || p,
        nameVi: parameterTranslations[p]?.vi || p,
        ideal: {
          min: paramResult.rows.find(r => r.parameter_key === p)?.reference_min,
          max: paramResult.rows.find(r => r.parameter_key === p)?.reference_max
        },
        company: currentYearMap[p] != null ? Number(currentYearMap[p].toFixed(1)) : null,
        nationalAverage: demographicAvgMap[p] != null ? Number(demographicAvgMap[p].toFixed(1)) : null,  // For parameter comparison
        previousYear: previousYearMap[p] != null ? Number(previousYearMap[p].toFixed(1)) : null,  // For yearly trends
        // Keep allData for backward compatibility, use nationalAverage
        allData: demographicAvgMap[p] != null ? Number(demographicAvgMap[p].toFixed(1)) : null
      }));
    }

    console.log('Parameters:', parameters);
    console.log('Parameter Comparison:', parameterComparison);
    const yearlyTrendsResult = await query(
      `SELECT 
        lp.parameter_name,
        EXTRACT(YEAR FROM ur.test_date) AS year,
        AVG(CAST(lp.parameter_value AS FLOAT)) AS avg_value
      FROM lab_parameters lp
      JOIN user_reports ur ON lp.report_id = ur.report_id
      JOIN users u ON ur.user_id = u.user_id
      WHERE u.company_id = $1 AND lp.parameter_name = ANY($2) 
        AND EXTRACT(YEAR FROM ur.test_date) IN ($3, $4)
      GROUP BY lp.parameter_name, year
      ORDER BY lp.parameter_name, year`,
      [companyId, parameters, selectedYear, previousYear]
    );
    // Structure: { parameter_name: { [year]: avg_value, ... }, ... }
    const yearlyTrends = {};
    const yearlyTrendsWithTranslations = {};
    yearlyTrendsResult.rows.forEach(row => {
      const pname = row.parameter_name;
      const year = Math.floor(row.year);
      if (!yearlyTrends[pname]) yearlyTrends[pname] = {};
      yearlyTrends[pname][year] = row.avg_value != null ? Number(Number(row.avg_value).toFixed(1)) : null;
      
      // Create structure with translations
      if (!yearlyTrendsWithTranslations[pname]) {
        yearlyTrendsWithTranslations[pname] = {
          nameEn: parameterTranslations[pname]?.en || pname,
          nameVi: parameterTranslations[pname]?.vi || pname,
          years: {}
        };
      }
      yearlyTrendsWithTranslations[pname].years[year] = row.avg_value != null ? Number(Number(row.avg_value).toFixed(1)) : null;
    });

    // 4. Top 10 current issues (for selected year only)
    // Using a subquery to ensure we only get reports from the selected year
    const currentYearIssues = await query(
      `WITH year_reports AS (
        SELECT DISTINCT ur.report_id
        FROM user_reports ur
        JOIN users u ON ur.user_id = u.user_id
        WHERE u.company_id = $1 
          AND EXTRACT(YEAR FROM ur.test_date) = $2
          AND ur.test_date IS NOT NULL
      )
      SELECT 
        lp.parameter_name AS issue,
        ROUND(COUNT(CASE WHEN lp.status IN ('Severe', 'Borderline') THEN 1 END)::numeric / COUNT(*)::numeric * 100, 1) AS percentage,
        COUNT(CASE WHEN lp.status IN ('Severe', 'Borderline') THEN 1 END)::text || '/' || COUNT(*)::text AS count
      FROM lab_parameters lp
      JOIN year_reports yr ON lp.report_id = yr.report_id
      GROUP BY lp.parameter_name
      HAVING COUNT(CASE WHEN lp.status IN ('Severe', 'Borderline') THEN 1 END) > 0
      ORDER BY percentage DESC
      LIMIT 10`,
      [companyId, selectedYear]
    );
    
    // Debug log to check the data
    console.log(`[Top Issues Debug] Company: ${companyId}, Year: ${selectedYear}`);
    console.log('[Top Issues Debug] Results:', currentYearIssues.rows.slice(0, 3));
    
    // const companyIssues = await query(
    //   `SELECT 
    //      lp.parameter_name AS issue,
    //      ROUND(COUNT(CASE WHEN lp.status IN ('Severe', 'Borderline') THEN 1 END)::numeric / COUNT(*)::numeric * 100, 1) AS company,
    //      COUNT(CASE WHEN lp.status IN ('Severe', 'Borderline') THEN 1 END)::text || '/' || COUNT(*)::text AS count
    //    FROM lab_parameters lp
    //    JOIN user_reports ur ON lp.report_id = ur.report_id
    //    JOIN users u ON ur.user_id = u.user_id
    //    WHERE u.company_id = $1
    //    GROUP BY lp.parameter_name
    //    HAVING COUNT(CASE WHEN lp.status IN ('Severe', 'Borderline') THEN 1 END) > 0
    //    ORDER BY company DESC
    //    LIMIT 10`,
    //   [companyId]
    // Calculate national average for top issues across ALL companies (all years)
    const nationalIssuesAverage = await query(
      `SELECT 
         lp.parameter_name AS issue,
         ROUND(AVG(company_percentages.percentage), 1) AS avg_percentage
       FROM (
         SELECT 
           u.company_id,
           lp.parameter_name,
           ROUND(COUNT(CASE WHEN lp.status IN ('Severe', 'Borderline') THEN 1 END)::numeric / COUNT(*)::numeric * 100, 1) AS percentage
         FROM users u
         JOIN user_reports ur ON u.user_id = ur.user_id
         JOIN lab_parameters lp ON ur.report_id = lp.report_id
         -- No year filter - using all available data for Vietnam average
         GROUP BY u.company_id, lp.parameter_name
       ) AS company_percentages
       JOIN lab_parameters lp ON lp.parameter_name = company_percentages.parameter_name
       GROUP BY lp.parameter_name`
    );
    
    // Merge issues with national averages
    const nationalIssuesMap = Object.fromEntries(nationalIssuesAverage.rows.map(r => [r.issue, Number(r.avg_percentage)]));
    const topIssuesComparison = currentYearIssues.rows.map(row => ({
      issue: row.issue,
      issueEn: parameterTranslations[row.issue]?.en || row.issue,
      issueVi: parameterTranslations[row.issue]?.vi || row.issue,
      company: Number(row.percentage), // Current company percentage
      allData: nationalIssuesMap[row.issue] ?? null, // National average across all companies
      count: row.count,
      severity: row.percentage > 40 ? 'high' : row.percentage > 25 ? 'medium' : 'low'
    }));

    // 5. Risk Comparison - Current company vs National average across all companies
    const currentYearRisk = await query(
      `SELECT 
         risk_type,
         ROUND(100.0 * COUNT(*) FILTER (WHERE risk_level = 'high') / NULLIF(COUNT(*),0), 1) as percentage,
         COUNT(DISTINCT ur.user_id) as user_count
       FROM risk_assessments ra
       JOIN user_reports ur ON ra.report_id = ur.report_id
       JOIN users u ON ur.user_id = u.user_id
       WHERE u.company_id = $1 AND EXTRACT(YEAR FROM ur.test_date) = $2
       GROUP BY risk_type`,
      [companyId, selectedYear]
    );
    
    // Calculate national average for risk projections across ALL companies
    const nationalRiskAverage = await query(
      `SELECT 
         risk_type,
         ROUND(AVG(company_risk.percentage), 1) as avg_percentage
       FROM (
         SELECT 
           u.company_id,
           ra.risk_type,
           ROUND(100.0 * COUNT(*) FILTER (WHERE ra.risk_level = 'high') / NULLIF(COUNT(*),0), 1) as percentage
         FROM risk_assessments ra
         JOIN user_reports ur ON ra.report_id = ur.report_id
         JOIN users u ON ur.user_id = u.user_id
         WHERE EXTRACT(YEAR FROM ur.test_date) = $1
         GROUP BY u.company_id, ra.risk_type
       ) AS company_risk
       GROUP BY risk_type`,
      [selectedYear]
    );
    
    const riskComparison = {};
    const nationalRiskMap = Object.fromEntries(nationalRiskAverage.rows.map(r => [r.risk_type.toLowerCase(), Number(r.avg_percentage)]));
    const hraRequired = 5; // threshold for HRA participation
    
    // Create a map of current year risk data
    const currentRiskMap = {};
    currentYearRisk.rows.forEach(row => {
      currentRiskMap[row.risk_type.toLowerCase()] = {
        percentage: Number(row.percentage) || 0,
        user_count: row.user_count || 0
      };
    });
    
    // Always include all three risk types, even if no data
    const riskTypes = ['cvd', 'diabetes', 'hypertension'];
    
    riskTypes.forEach(key => {
      const currentData = currentRiskMap[key];
      const userCount = currentData?.user_count || 0;
      const current = currentData?.percentage || 0;
      const national = nationalRiskMap[key] || 0;
      
      if (userCount >= hraRequired) {
        // Unlocked - sufficient HRA participation
        riskComparison[key] = {
          company: current, // Current company
          allData: national, // National average
          improvement: current < national,
          status: 'unlocked',
          hraProgress: userCount,
          hraRequired
        };
      } else {
        // Locked - insufficient HRA participation
        riskComparison[key] = {
          company: null,
          allData: null,
          improvement: null,
          status: 'locked',
          hraProgress: userCount,
          hraRequired,
          message: `Need ${hraRequired - userCount} more HRA participation${hraRequired - userCount === 1 ? '' : 's'} to unlock`
        };
      }
    });

    // 6. Biological Age (current year vs national average)
    const currentYearBio = await query(
      `SELECT 
         gender,
         AVG(EXTRACT(YEAR FROM AGE(u.date_of_birth))) as chronological,
         AVG(ur.biological_age) as biological
       FROM users u
       JOIN user_reports ur ON u.user_id = ur.user_id
       WHERE u.company_id = $1 AND EXTRACT(YEAR FROM ur.test_date) = $2
       GROUP BY gender`,
      [companyId, selectedYear]
    );
    
    // Calculate national average biological age across ALL companies
    const nationalBioAverage = await query(
      `SELECT 
         gender,
         AVG(EXTRACT(YEAR FROM AGE(u.date_of_birth))) as chronological,
         AVG(ur.biological_age) as biological
       FROM users u
       JOIN user_reports ur ON u.user_id = ur.user_id
       WHERE EXTRACT(YEAR FROM ur.test_date) = $1
       GROUP BY gender`,
      [selectedYear]
    );
    function formatBio(rows) {
      const out = {};
      let sumChron = 0, sumBio = 0, count = 0;
      rows.forEach(row => {
        if (!row.gender) return;
        out[row.gender.toLowerCase()] = {
          chronological: Math.round(Number(row.chronological || 0)),
          biological: Math.round(Number(row.biological || 0)),
          difference: Math.round(Number((row.biological || 0) - (row.chronological || 0)))
        };
        sumChron += Number(row.chronological || 0);
        sumBio += Number(row.biological || 0);
        count++;
      });
      out.overall = {
        chronological: count ? Math.round(sumChron / count) : 0,
        biological: count ? Math.round(sumBio / count) : 0,
        difference: count ? Math.round((sumBio - sumChron) / count) : 0
      };
      return out;
    }
    const biologicalAge = {
      company: formatBio(currentYearBio.rows), // Current year for company
      allData: formatBio(nationalBioAverage.rows) // National average across all companies
    };

    console.log('Top Issues Comparison:', topIssuesComparison);
    console.log('Risk Comparison:', riskComparison);

    // Final response
    res.json({
      category: categoryName,
      parameters,
      parameterComparison,
      parameterComparisonError,
      yearlyTrends,
      yearlyTrendsWithTranslations, 
      topIssuesComparison,
      riskComparison,
      biologicalAge
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch comparison data' });
  }
});

// Helper function to fetch and aggregate health data for the action plan
// Helper function to fetch and aggregate health data for the action plan (latest user_reports only)
async function getHealthData(companyId) {
  // 1. Metrics (latest report per user)
  const metricsResult = await query(
    `SELECT 
        COUNT(DISTINCT u.user_id) AS totalEmployees,
        COUNT(DISTINCT ur.user_id) AS employeesTested,
        ROUND(100.0 * COUNT(DISTINCT ur.user_id) / NULLIF(COUNT(DISTINCT u.user_id),0), 1) AS participationRate
     FROM users u
     LEFT JOIN (
       SELECT DISTINCT ON (user_id) user_id, report_id
       FROM user_reports
       ORDER BY user_id, created_at DESC
     ) ur ON u.user_id = ur.user_id
     WHERE u.company_id = $1`,
    [companyId]
  );
  const metrics = metricsResult.rows[0] || {};

  // 2. Top health concerns (abnormal parameters, latest report per user)
  const concernsResult = await query(
    `SELECT 
        lp.parameter_name,
        COUNT(*) AS affected_count,
        (SELECT COUNT(*) FROM lab_parameters lp2
          JOIN (
            SELECT DISTINCT ON (user_id) user_id, report_id
            FROM user_reports
            ORDER BY user_id, created_at DESC
          ) ur2 ON lp2.report_id = ur2.report_id
          JOIN users u2 ON ur2.user_id = u2.user_id
          WHERE u2.company_id = $1 AND lp2.parameter_name = lp.parameter_name
        ) AS total_count,
        ROUND(100.0 * COUNT(*) / NULLIF(
          (SELECT COUNT(*) FROM lab_parameters lp2
            JOIN (
              SELECT DISTINCT ON (user_id) user_id, report_id
              FROM user_reports
              ORDER BY user_id, created_at DESC
            ) ur2 ON lp2.report_id = ur2.report_id
            JOIN users u2 ON ur2.user_id = u2.user_id
            WHERE u2.company_id = $1 AND lp2.parameter_name = lp.parameter_name
          ), 0), 1) AS percentage
     FROM lab_parameters lp
     JOIN (
       SELECT DISTINCT ON (user_id) user_id, report_id
       FROM user_reports
       ORDER BY user_id, created_at DESC
     ) ur ON lp.report_id = ur.report_id
     JOIN users u ON ur.user_id = u.user_id
     WHERE u.company_id = $1 AND lp.status IN ('Severe', 'Borderline', 'High', 'Low', 'Abnormal')
     GROUP BY lp.parameter_name
     ORDER BY percentage DESC
     LIMIT 5`,
    [companyId]
  );
  const concerns = concernsResult.rows;

  // 3. Health wins (parameters with most normal results, latest report per user)
  const winsResult = await query(
    `SELECT 
        lp.parameter_name,
        COUNT(*) AS normal_count,
        (SELECT COUNT(*) FROM lab_parameters lp2
          JOIN (
            SELECT DISTINCT ON (user_id) user_id, report_id
            FROM user_reports
            ORDER BY user_id, created_at DESC
          ) ur2 ON lp2.report_id = ur2.report_id
          JOIN users u2 ON ur2.user_id = u2.user_id
          WHERE u2.company_id = $1 AND lp2.parameter_name = lp.parameter_name
        ) AS total_count,
        ROUND(100.0 * COUNT(*) / NULLIF(
          (SELECT COUNT(*) FROM lab_parameters lp2
            JOIN (
              SELECT DISTINCT ON (user_id) user_id, report_id
              FROM user_reports
              ORDER BY user_id, created_at DESC
            ) ur2 ON lp2.report_id = ur2.report_id
            JOIN users u2 ON ur2.user_id = u2.user_id
            WHERE u2.company_id = $1 AND lp2.parameter_name = lp.parameter_name
          ), 0), 1) AS percentage
     FROM lab_parameters lp
     JOIN (
       SELECT DISTINCT ON (user_id) user_id, report_id
       FROM user_reports
       ORDER BY user_id, created_at DESC
     ) ur ON lp.report_id = ur.report_id
     JOIN users u ON ur.user_id = u.user_id
     WHERE u.company_id = $1 AND lp.status = 'Normal'
     GROUP BY lp.parameter_name
     ORDER BY percentage DESC
     LIMIT 5`,
    [companyId]
  );
  const wins = winsResult.rows;

  // 4. Risk predictions (latest report per user)
  const risksResult = await query(
    `SELECT 
        ra.risk_type,
        ROUND(100.0 * COUNT(*) FILTER (WHERE ra.risk_level = 'high') / NULLIF(COUNT(*),0), 1) AS high_risk_percent
     FROM risk_assessments ra
     JOIN (
       SELECT DISTINCT ON (user_id) user_id, report_id
       FROM user_reports
       ORDER BY user_id, created_at DESC
     ) ur ON ra.report_id = ur.report_id
     JOIN users u ON ur.user_id = u.user_id
     WHERE u.company_id = $1
     GROUP BY ra.risk_type`,
    [companyId]
  );
  const risks = risksResult.rows;

  // 5. Age and gender breakdown (latest report per user)
  const ageGenderResult = await query(
    `SELECT 
        u.gender,
        ROUND(AVG(EXTRACT(YEAR FROM AGE(u.date_of_birth))), 1) AS avg_age,
        COUNT(*) AS count
     FROM users u
     JOIN (
       SELECT DISTINCT ON (user_id) user_id, report_id
       FROM user_reports
       ORDER BY user_id, created_at DESC
     ) ur ON u.user_id = ur.user_id
     WHERE u.company_id = $1
     GROUP BY u.gender`,
    [companyId]
  );
  const ageGender = ageGenderResult.rows;

  // 6. Participation trend (latest report per user, by year)
  const participationTrendResult = await query(
    `SELECT 
        EXTRACT(YEAR FROM ur.created_at) AS year,
        COUNT(DISTINCT ur.user_id) AS tested
     FROM (
       SELECT DISTINCT ON (user_id) user_id, report_id, created_at
       FROM user_reports
       ORDER BY user_id, created_at DESC
     ) ur
     JOIN users u ON ur.user_id = u.user_id
     WHERE u.company_id = $1
     GROUP BY year
     ORDER BY year DESC
     LIMIT 3`,
    [companyId]
  );
  const participationTrend = participationTrendResult.rows;

  return {
    metrics,
    concerns,
    wins,
    risks,
    ageGender,
      participationTrend
  };
}

router.post('/action-plan', authenticateCorporate, async (req, res) => {
  try {
    const { companyId } = req.corporate;
    const { language } = req.query;
    const healthData = await getHealthData(companyId);

    console.log('Received Health Data:', healthData);

    const prompt = `
    You are a corporate wellness expert team made up of doctors, dietitians, and health coaches specializing in corporate health in Vietnam.

CONTEXT: This is for a company with employees in Vietnam. Consider local food culture, lifestyle, and workplace practices when making recommendations.

Based on the organisational health data provided below, generate a Strategic Corporate Wellness Action Plan that includes:

🟢 Top Priority Summary
Give a one-line summary stating the top wellness priority for the organisation. Use aggregate data (e.g. "Focus on cardiovascular health – 72% of employees have lipid abnormalities").

🟢 Target Groups (Max 3)
Identify up to three key health risk groups based on the data. 
Total employees in the data: ${healthData.totalEmployees || 500}

Return Target_Groups as an ARRAY of up to 3 objects, where each object has:
[
  {
    Group_Name_1: (e.g. "High Cholesterol Group"),
    Group_Definition_1: (e.g. "LDL > 130 mg/dL"),
    Group_Count_1: (number of employees, e.g. 430),
    Group_Percentage_1: (calculate as percentage of total employees, e.g. if 430 out of 500 employees, then 86)
  },
  {
    Group_Name_2: (second group name),
    Group_Definition_2: (second group definition),
    Group_Count_2: (number),
    Group_Percentage_2: (percentage)
  },
  {
    Group_Name_3: (third group name),
    Group_Definition_3: (third group definition),
    Group_Count_3: (number),
    Group_Percentage_3: (percentage)
  }
]

IMPORTANT: 
- Calculate percentages based on total employees (${healthData.totalEmployees || 500})
- If health data shows employees are generally healthy, focus on PREVENTION and MAINTENANCE
- Round percentages to whole numbers
- Return as an ARRAY, not an object

🟢 Health Screenings & Consultations
Provide PRACTICAL and LOGICAL recommendations:

HealthCamp_Summary: (Brief description of annual health camp)
HealthCamp_Activities: [List 3-4 specific activities like "Comprehensive blood tests", "ECG screening", "Body composition analysis", "Individual health consultations"]
HealthCamp_Frequency: "Annual"

SpecialistPrograms: [
{
Specialist_Name: (e.g. "Cardiologist Consultation Session"),
Justification: (e.g. "Educational lunch session where cardiologist discusses heart-healthy lifestyle with employees"),
Frequency: (BE REALISTIC - e.g. "Quarterly" or "Semi-annual", NOT monthly for specialists),
Mode: (e.g. "Group educational session" or "Individual consultations for high-risk employees")
}, ...
]
HealthAwarenessEvents: [
{
Event_Name: (e.g. "World Diabetes Day"),
Month: (e.g. "November"),
Justification: (e.g. "High diabetes risk detected in 28% employees"),
Event_Details: (e.g. "Seminars, screenings, and diet workshops on managing blood sugar")
}, ...
]
HealthImprovementPrograms: [
{
Program_Name: (e.g. "Vitamin D Replenishment Program"),
One_Line_Summary: (e.g. "Boost Vitamin D levels in deficient employees"),
Program_Details: (e.g. "Supplementation drive, sun exposure education, retesting after 3 months")
}, ...
]
🟢 Nutrition & Cafeteria Program
Create a locally-appropriate food and nutrition plan:

CafeteriaMenu_Week_1: List of daily healthy food items. Example format:
- Monday: "Grilled chicken with brown rice, Fresh vegetable soup, Seasonal fruit"
- Tuesday: "Steamed fish with herbs, Mixed grain rice, Green salad"
- Focus on balanced, nutritious meals with local ingredients
CafeteriaMenu_Week_2: Different healthy menu items for week 2
RecommendedItems: (e.g. "Add whole grains, lean proteins, fresh vegetables, seasonal fruits")
NutritionEducationPrograms: [
{
One_Line_Summary: (e.g. "Heart-healthy eating awareness"),
Detailed_Content: (e.g. "Monthly nutrition workshops, healthy recipe demonstrations, cafeteria menu labeling")
}, ...
]
🟢 Physical Activity & Fitness Plan
Suggest practical workplace fitness strategies:

FitnessSummary: (e.g. "Promote daily physical activity and reduce sedentary behavior")
FitnessPrograms: [
{
One_Line_Summary: (DO NOT include translations or parentheses - just the activity name),
Detailed_Content: (Detailed description of the activity and implementation),
Frequency: (e.g. "Daily", "3 times per week", "Weekly")
},
{
One_Line_Summary: (e.g. "Lunchtime sports activities"),
Detailed_Content: (e.g. "Organize badminton and table tennis sessions during lunch breaks"),
Frequency: (e.g. "Daily")
},
{
One_Line_Summary: (e.g. "Walking club"),
Detailed_Content: (e.g. "Group walks in nearby areas before work or during breaks"),
Frequency: (e.g. "3 times per week")
}, ...
]
⚠️ Ensure all sections are structured as JSON and ready for parsing by a developer. Add relevant suggestions even if data is within normal range (e.g., recommend preventive screenings or general programs).

Respond ONLY with a single JSON object with these exact keys:
- Top_Priority_Summary
- Target_Groups
- Health_Screenings_Consultations
- Nutrition_Cafeteria
- Physical_Activity_Fitness

Do not include any markdown, explanation, or extra text. Only output valid JSON.

LANGUAGE INSTRUCTION: ${language === 'vi' 
  ? 'Generate ALL content in Vietnamese language (Tiếng Việt). This includes all text fields, descriptions, summaries, menu items, and recommendations.' 
  : 'Generate ALL content in English language.'}

Here is the corporate health data:
${JSON.stringify(healthData, null, 2)}
    `;


    let openaiRes;
    try {
      openaiRes = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (apiErr) {
      console.error('OpenAI API error:', apiErr?.response?.data || apiErr.message);
      return res.status(502).json({ error: 'Failed to fetch action plan from OpenAI' });
    }

    const text = openaiRes.data.choices[0].message.content;
    const jsonMatch = text.match(/```json([\s\S]*?)```/);
    let actionPlan;
    try {
      if (jsonMatch) {
        actionPlan = JSON.parse(jsonMatch[1]);
      } else {
        actionPlan = JSON.parse(text);
      }
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr, '\nRaw text:', text);
      return res.status(502).json({ error: 'Malformed JSON in OpenAI response' });
    }

    // Validate required keys
    const requiredKeys = [
      'Top_Priority_Summary',
      'Target_Groups',
      'Health_Screenings_Consultations',
      'Nutrition_Cafeteria',
      'Physical_Activity_Fitness'
    ];
    const missingKeys = requiredKeys.filter(key => !(key in actionPlan));
    if (missingKeys.length > 0) {
      console.error('Missing keys in action plan:', missingKeys);
      return res.status(502).json({ error: `Incomplete action plan from OpenAI. Missing: ${missingKeys.join(', ')}` });
    }

        // Delete any existing plan for this company IN THE SAME LANGUAGE
        await query(
          `DELETE FROM corporate_action_plans 
           WHERE company_id = $1 AND language = $2`,
          [companyId, language || 'en']
        );
        
        // Insert the new plan with language tag
        await query(
          `INSERT INTO corporate_action_plans (company_id, action_plan, language, generated_by)
           VALUES ($1, $2, $3, $4)`,
          [companyId, actionPlan, language || 'en', req.corporate.userId]
        );
        
        res.json(actionPlan);

  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).json({ error: 'Failed to generate action plan' });
  }
});

router.get('/action-plan', authenticateCorporate, async (req, res) => {
  try {
    const { companyId } = req.corporate;
    const { language } = req.query; // Get language from query params
    
    // First check if we have a plan for this company and language
    const result = await query(
      `SELECT action_plan, created_at, language FROM corporate_action_plans
       WHERE company_id = $1 AND language = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [companyId, language || 'en']
    );
    
    if (result.rows.length > 0) {
      // We have a plan in the requested language
      return res.json(result.rows[0].action_plan);
    }
    
    // Check if we have ANY plan for this company
    const anyPlanResult = await query(
      `SELECT action_plan, created_at, language FROM corporate_action_plans
       WHERE company_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [companyId]
    );
    
    if (anyPlanResult.rows.length === 0) {
      // No plan exists at all
      return res.status(404).json({ error: 'No action plan found' });
    }
    
    // We have a plan but in a different language
    // Return a special response to trigger regeneration in correct language
    res.status(200).json({ 
      needsRegeneration: true,
      currentLanguage: anyPlanResult.rows[0].language,
      requestedLanguage: language || 'en',
      message: 'Action plan exists but in different language'
    });
    
  } catch (error) {
    console.error('Error fetching action plan:', error);
    res.status(500).json({ error: 'Failed to fetch action plan' });
  }
});

module.exports = router;