const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const { query } = require('../config/database');

// CONTROLLER IMPORTS
const batchesController = require('../controller/batchController');
const excelController = require('../controller/excelController');
const dashboardController = require('../controller/dashboardController');
const parameterController = require('../controller/parameterMasterController');
const categoryController = require('../controller/categoryController');
const adminUserController = require('../controller/adminUserController');

// ROUTE IMPORTS
const healthIndexAdminRoutes = require('./healthIndexAdmin');

// AUTHENTICATION IMPORT
const authenticateAdmin = require('../middleware/auth');

const router = express.Router();
//---------------------------------------------

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.xlsx' && ext !== '.xls') {
      return cb(new Error('Only Excel files are allowed'));
    }
    cb(null, true);
  },
  // *NOTE : come from env variables
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Batch processing routes
router.get('/batches', authenticateAdmin, batchesController.getBatches);
router.get('/batches/:batchId', authenticateAdmin, batchesController.getBatchDetails);
router.post('/upload', authenticateAdmin, upload.single('file'), excelController.uploadBatch);
router.post('/batches/:batchId/approve', authenticateAdmin, batchesController.approveBatch);
router.post('/batches/:batchId/reject', authenticateAdmin, batchesController.rejectBatch);
router.delete('/batches/:batchId', authenticateAdmin, batchesController.deleteBatch);
router.get('/batches/:batchId/download', authenticateAdmin, batchesController.downloadBatchExcel);
router.get('/download-template', authenticateAdmin, excelController.downloadTemplate);

// Dashboard statistics route
router.get('/dashboard-stats', authenticateAdmin, dashboardController.getDashboardStats);

// Parameter Master routes
router.get('/parameter-master', authenticateAdmin, parameterController.getAllParameters);
router.post('/parameter-master', authenticateAdmin, parameterController.createParameter);
router.put('/parameter-master/:id', authenticateAdmin, parameterController.updateParameter);
router.delete('/parameter-master/:id', authenticateAdmin, parameterController.deleteParameter);

// Get parameter keys for manual entry dropdown
router.get('/parameter-keys', authenticateAdmin, parameterController.getParameterKeys);

// Get available priorities for parameter master
router.get('/parameter-priorities', authenticateAdmin, parameterController.getAvailablePriorities);

router.get('/parameter-category-mappings', authenticateAdmin, parameterController.getParameterCategoryMappings);
router.get('/parameter-categories', authenticateAdmin, parameterController.getAllCategories);

// Categories management routes
router.get('/categories', authenticateAdmin, categoryController.getAllCategories);
router.post('/categories', authenticateAdmin, categoryController.createCategory);
router.put('/categories/:id', authenticateAdmin, categoryController.updateCategory);
router.delete('/categories/:id', authenticateAdmin, categoryController.deleteCategory);
router.post('/categories/:id/add-parameter', authenticateAdmin, categoryController.addParameterToCategory);
router.delete('/categories/:id/remove-parameter/:parameterId', authenticateAdmin, categoryController.removeParameterFromCategory);
router.put('/categories/:id/reorder-parameters', authenticateAdmin, categoryController.reorderParametersInCategory);

// Admin Role Management routes
router.post('/admin-users', authenticateAdmin, adminUserController.createAdminUser);
router.get('/admin-users', authenticateAdmin, adminUserController.getAllAdminUsers);
router.get('/admin-users/:id', authenticateAdmin, adminUserController.getAdminUserById);
router.put('/admin-users/:id', authenticateAdmin, adminUserController.updateAdminUser);
router.delete('/admin-users/:id', authenticateAdmin, adminUserController.deleteAdminUser);

// Health Index Configuration routes
router.use('/health-index', authenticateAdmin, healthIndexAdminRoutes);

// Login route for admin users
router.post('/login', adminUserController.loginAdminUser);

// User Management routes
router.get('/companies', authenticateAdmin, async (req, res) => {
  const { query } = require('../config/database');
  console.log('[UserManagement API] Fetching companies list');
  
  try {
    const result = await query('SELECT company_id, company_name FROM companies ORDER BY company_name');
    console.log('[UserManagement API] Found companies:', result.rows.length);
    console.log('[UserManagement API] Companies:', result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error('[UserManagement API] Error fetching companies:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// Get companies with user count
router.get('/companies-with-users', authenticateAdmin, async (req, res) => {
  const { query } = require('../config/database');
  console.log('[CompanyManager API] Fetching companies with user count');
  
  try {
    const result = await query(`
      SELECT 
        c.company_id,
        c.company_name,
        c.contact_email,
        COUNT(DISTINCT u.user_id)::INTEGER as user_count
      FROM companies c
      LEFT JOIN users u ON c.company_id = u.company_id
      GROUP BY c.company_id, c.company_name, c.contact_email
      ORDER BY c.company_name
    `);
    
    console.log('[CompanyManager API] Found companies with user counts:', result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error('[CompanyManager API] Error fetching companies with user count:', error);
    res.status(500).json({ error: 'Failed to fetch companies with user count' });
  }
});

// Create new company
router.post('/companies', authenticateAdmin, async (req, res) => {
  const { query } = require('../config/database');
  const { company_id, company_name, contact_email } = req.body;
  
  try {
    // Validate required fields
    if (!company_id || !company_name) {
      return res.status(400).json({ error: 'Company ID and Name are required' });
    }
    
    // Check if company_id already exists
    const existingCompany = await query(
      'SELECT company_id FROM companies WHERE company_id = $1',
      [company_id]
    );
    
    if (existingCompany.rows.length > 0) {
      return res.status(400).json({ error: 'Company ID already exists' });
    }
    
    // Create the company
    const result = await query(
      'INSERT INTO companies (company_id, company_name, contact_email) VALUES ($1, $2, $3) RETURNING *',
      [company_id, company_name, contact_email || null]
    );
    
    console.log('[Company API] Company created:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[Company API] Error creating company:', error);
    res.status(500).json({ error: 'Failed to create company' });
  }
});

// Get company details with user count
router.get('/companies/:companyId', authenticateAdmin, async (req, res) => {
  const { query } = require('../config/database');
  const { companyId } = req.params;
  
  console.log('[Company API] GET /companies/:companyId - Request received');
  console.log('[Company API] Company ID:', companyId);
  console.log('[Company API] Admin user:', req.admin);
  
  try {
    // Get company details
    console.log('[Company API] Fetching company details for:', companyId);
    const companyResult = await query(
      'SELECT * FROM companies WHERE company_id = $1',
      [companyId]
    );
    
    console.log('[Company API] Company query result:', companyResult.rows);
    
    if (companyResult.rows.length === 0) {
      console.log('[Company API] Company not found:', companyId);
      return res.status(404).json({ error: 'Company not found' });
    }
    
    // Get user count for this company
    console.log('[Company API] Fetching user count for company:', companyId);
    const userCountResult = await query(
      'SELECT COUNT(*) as user_count FROM users WHERE company_id = $1',
      [companyId]
    );
    
    console.log('[Company API] User count result:', userCountResult.rows);
    
    const company = companyResult.rows[0];
    company.user_count = parseInt(userCountResult.rows[0].user_count);
    
    res.json(company);
  } catch (error) {
    console.error('[Company API] Error fetching company details:', error);
    res.status(500).json({ error: 'Failed to fetch company details' });
  }
});

// Update company details
router.put('/companies/:companyId', authenticateAdmin, async (req, res) => {
  const { query } = require('../config/database');
  const { companyId } = req.params;
  const { company_name, contact_email } = req.body;
  
  console.log('[Company API] Update request for company:', companyId);
  console.log('[Company API] New data:', { company_name, contact_email });
  
  try {
    // Check if company exists
    const existingCompany = await query(
      'SELECT company_id FROM companies WHERE company_id = $1',
      [companyId]
    );
    
    if (existingCompany.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (company_name !== undefined && company_name !== '') {
      updates.push(`company_name = $${paramCount}`);
      values.push(company_name);
      paramCount++;
    }
    
    if (contact_email !== undefined) {
      updates.push(`contact_email = $${paramCount}`);
      values.push(contact_email);
      paramCount++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    // Add company_id as the last parameter
    values.push(companyId);
    
    // Execute update
    const updateQuery = `
      UPDATE companies 
      SET ${updates.join(', ')}
      WHERE company_id = $${paramCount}
      RETURNING company_id, company_name, contact_email, created_at
    `;
    
    const result = await query(updateQuery, values);
    
    console.log('[Company API] Company updated successfully:', result.rows[0]);
    
    res.json({
      message: 'Company updated successfully',
      company: result.rows[0]
    });
  } catch (error) {
    console.error('[Company API] Error updating company:', error);
    res.status(500).json({ error: 'Failed to update company' });
  }
});

// Delete company (only if no users are associated)
router.delete('/companies/:companyId', authenticateAdmin, async (req, res) => {
  const { query, getClient } = require('../config/database');
  const { companyId } = req.params;
  
  console.log('[Company API] Delete request for company:', companyId);
  
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    // First check if company exists
    const companyCheck = await client.query(
      'SELECT company_id, company_name FROM companies WHERE company_id = $1',
      [companyId]
    );
    
    if (companyCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Company not found' });
    }
    
    // Check if there are any users associated with this company
    const userCountResult = await client.query(
      'SELECT COUNT(*) as count FROM users WHERE company_id = $1',
      [companyId]
    );
    
    const userCount = parseInt(userCountResult.rows[0].count);
    console.log('[Company API] User count for company:', userCount);
    
    if (userCount > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: `Cannot delete company. ${userCount} user(s) are still associated with this company.`,
        userCount: userCount 
      });
    }
    
    // Check for corporate users
    const corpUserCountResult = await client.query(
      'SELECT COUNT(*) as count FROM corporate_users WHERE company_id = $1',
      [companyId]
    );
    
    const corpUserCount = parseInt(corpUserCountResult.rows[0].count);
    if (corpUserCount > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: `Cannot delete company. ${corpUserCount} corporate user(s) are still associated with this company.`,
        corporateUserCount: corpUserCount 
      });
    }
    
    // Check for corporate health metrics
    await client.query(
      'DELETE FROM corporate_health_metrics WHERE company_id = $1',
      [companyId]
    );
    
    // Check for demographic averages
    await client.query(
      'DELETE FROM demographic_averages WHERE company_id = $1',
      [companyId]
    );
    
    // Finally delete the company
    await client.query(
      'DELETE FROM companies WHERE company_id = $1',
      [companyId]
    );
    
    await client.query('COMMIT');
    
    console.log('[Company API] Company deleted successfully:', companyId);
    res.json({ 
      message: 'Company deleted successfully',
      company_id: companyId,
      company_name: companyCheck.rows[0].company_name
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Company API] Error deleting company:', error);
    res.status(500).json({ error: 'Failed to delete company' });
  } finally {
    client.release();
  }
});

router.get('/users', authenticateAdmin, async (req, res) => {
  const { query } = require('../config/database');
  const { company_id } = req.query;
  
  console.log('[UserManagement API] Fetching users, company_id:', company_id);
  
  try {
    let queryText = `
      SELECT 
        u.user_id,
        u.uhid,
        u.email,
        u.phone,
        u.first_name,
        u.last_name,
        u.date_of_birth,
        u.gender,
        u.location,
        u.created_at,
        u.company_id,
        c.company_name,
        CONCAT(u.first_name, ' ', u.last_name) as full_name,
        COUNT(DISTINCT ur.report_id) as report_count
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.company_id
      LEFT JOIN user_reports ur ON u.user_id = ur.user_id
    `;
    
    const params = [];
    if (company_id) {
      queryText += ' WHERE u.company_id = $1';
      params.push(company_id);
    }
    
    queryText += ' GROUP BY u.user_id, u.uhid, u.email, u.phone, u.first_name, u.last_name, u.date_of_birth, u.gender, u.location, u.created_at, u.company_id, c.company_name';
    queryText += ' ORDER BY u.created_at DESC';
    
    console.log('[UserManagement API] Query:', queryText);
    console.log('[UserManagement API] Params:', params);
    
    const result = await query(queryText, params);
    console.log('[UserManagement API] Found users:', result.rows.length);
    
    // If no users found, let's check if there are any users in the database at all
    if (result.rows.length === 0 && company_id) {
      const allUsersResult = await query('SELECT COUNT(*) as total FROM users WHERE company_id = $1', [company_id]);
      console.log('[UserManagement API] Total users in company:', allUsersResult.rows[0].total);
      
      // Check if company exists
      const companyResult = await query('SELECT * FROM companies WHERE company_id = $1', [company_id]);
      console.log('[UserManagement API] Company exists:', companyResult.rows.length > 0);
      
      // Let's check data types and values
      const sampleUsers = await query('SELECT user_id, company_id FROM users LIMIT 5');
      console.log('[UserManagement API] Sample users:', sampleUsers.rows);
      
      // Check if company_id might be stored differently (as string vs number)
      const usersWithStringMatch = await query('SELECT COUNT(*) as total FROM users WHERE company_id::text = $1::text', [company_id]);
      console.log('[UserManagement API] Users with string match:', usersWithStringMatch.rows[0].total);
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('[UserManagement API] Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.put('/users/:userId/password', authenticateAdmin, async (req, res) => {
  const { query } = require('../config/database');
  const bcrypt = require('bcrypt');
  const { userId } = req.params;
  const { password } = req.body;
  
  try {
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [hashedPassword, userId]
    );
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

router.put('/users/:userId/email', authenticateAdmin, async (req, res) => {
  const { query } = require('../config/database');
  const { userId } = req.params;
  const { email } = req.body;
  
  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Check if email already exists for another user
    const existingUser = await query(
      'SELECT user_id FROM users WHERE email = $1 AND user_id != $2',
      [email, userId]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists for another user' });
    }
    
    // Update email
    await query(
      'UPDATE users SET email = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [email, userId]
    );
    
    res.json({ message: 'Email updated successfully' });
  } catch (error) {
    console.error('Error updating email:', error);
    res.status(500).json({ error: 'Failed to update email' });
  }
});

router.delete('/users/:userId', authenticateAdmin, async (req, res) => {
  const { query, getClient } = require('../config/database');
  const { userId } = req.params;
  const admin = req.admin;
  
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    // Get user details before deletion for audit log
    const userResult = await client.query(`
      SELECT u.user_id, u.identifier, u.email, u.company_id, c.company_name 
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.company_id
      WHERE u.user_id = $1
    `, [userId]);
    
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Delete related records first
    await client.query('DELETE FROM lab_parameters WHERE report_id IN (SELECT report_id FROM user_reports WHERE user_id = $1)', [userId]);
    await client.query('DELETE FROM user_reports WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM users WHERE user_id = $1', [userId]);
    
    // Log the deletion in audit table
    await client.query(`
      INSERT INTO user_deletion_audit (
        operation_type, 
        company_id, 
        company_name, 
        user_id, 
        user_email, 
        user_identifier,
        deleted_count,
        deleted_by_admin_id, 
        deleted_by_admin_email, 
        deleted_by_admin_name,
        ip_address,
        user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      'delete_single_user',
      user.company_id,
      user.company_name,
      user.user_id,
      user.email,
      user.identifier,
      1,
      admin.id,
      admin.email,
      admin.name,
      req.ip || req.connection.remoteAddress,
      req.headers['user-agent']
    ]);
    
    await client.query('COMMIT');
    
    console.log(`[User Deletion Audit] User ${userId} deleted by admin ${admin.email}`);
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  } finally {
    client.release();
  }
});

// Get single user details
router.get('/users/:userId', authenticateAdmin, async (req, res) => {
  const { query } = require('../config/database');
  const { userId } = req.params;
  
  try {
    const result = await query(`
      SELECT u.*, c.company_name 
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.company_id
      WHERE u.user_id = $1
    `, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

// Get user reports
router.get('/users/:userId/reports', authenticateAdmin, async (req, res) => {
  const { query } = require('../config/database');
  const { userId } = req.params;
  
  try {
    const result = await query(`
      SELECT report_id, health_score, biological_age, test_date, created_at
      FROM user_reports
      WHERE user_id = $1
      ORDER BY test_date DESC, created_at DESC
    `, [userId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user reports:', error);
    res.status(500).json({ error: 'Failed to fetch user reports' });
  }
});

// Get report lab parameters
router.get('/reports/:reportId/parameters', authenticateAdmin, async (req, res) => {
  const { query } = require('../config/database');
  const { reportId } = req.params;
  
  console.log(`[DEBUG] Fetching parameters for report ID: ${reportId}`);
  
  try {
    // First check if gender columns exist
    const columnCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'parameter_master' 
      AND column_name IN ('reference_min_male', 'reference_max_male', 'reference_min_female', 'reference_max_female')
    `);
    console.log(`[DEBUG] Gender columns found: ${columnCheck.rows.map(r => r.column_name).join(', ')}`);
    
    const result = await query(`
      SELECT lp.*, pm.parameter_key, pc.category_name as category,
             u.gender,
             CASE 
               WHEN u.gender = 'Male' AND pm.reference_min_male IS NOT NULL 
                 THEN pm.reference_min_male
               WHEN u.gender = 'Female' AND pm.reference_min_female IS NOT NULL 
                 THEN pm.reference_min_female
               ELSE lp.reference_min
             END as display_reference_min,
             CASE 
               WHEN u.gender = 'Male' AND pm.reference_max_male IS NOT NULL 
                 THEN pm.reference_max_male
               WHEN u.gender = 'Female' AND pm.reference_max_female IS NOT NULL 
                 THEN pm.reference_max_female
               ELSE lp.reference_max
             END as display_reference_max
      FROM lab_parameters lp
      LEFT JOIN parameter_master pm ON POSITION(lp.parameter_name IN pm.parameter_text_mapping) > 0
      LEFT JOIN parameter_category_mappings pcm ON pm.parameter_id = pcm.parameter_id
      LEFT JOIN parameter_categories pc ON pcm.category_id = pc.id
      LEFT JOIN user_reports ur ON lp.report_id = ur.report_id
      LEFT JOIN users u ON ur.user_id = u.user_id
      WHERE lp.report_id = $1
      ORDER BY pc.display_order, pcm.display_order, pm.parameter_priority
    `, [reportId]);
    
    console.log(`[DEBUG] Found ${result.rows.length} parameters for report ${reportId}`);
    if (result.rows.length > 0) {
      console.log(`[DEBUG] Sample parameter:`, {
        name: result.rows[0].parameter_name,
        value: result.rows[0].parameter_value,
        gender: result.rows[0].gender,
        display_min: result.rows[0].display_reference_min,
        display_max: result.rows[0].display_reference_max
      });
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('[ERROR] Error fetching lab parameters:', error);
    console.error('[ERROR] Stack trace:', error.stack);
    res.status(500).json({ error: 'Failed to fetch lab parameters', details: error.message });
  }
});

// Update lab parameter value
router.put('/lab-parameters/:paramId', authenticateAdmin, async (req, res) => {
  const { query, getClient } = require('../config/database');
  const { paramId } = req.params;
  const { parameter_value } = req.body;
  
  console.log(`[DEBUG] Updating parameter ID: ${paramId} with value: ${parameter_value}`);
  
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    if (!parameter_value || parameter_value.trim() === '') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Parameter value is required' });
    }
    
    // Update the parameter value
    const result = await client.query(`
      UPDATE lab_parameters 
      SET parameter_value = $1
      WHERE id = $2
      RETURNING *
    `, [parameter_value.trim(), paramId]);
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      console.error(`[ERROR] Parameter not found with ID: ${paramId}`);
      return res.status(404).json({ error: 'Parameter not found' });
    }
    
    console.log(`[DEBUG] Parameter updated successfully:`, result.rows[0]);
    const updatedParam = result.rows[0];
    const reportId = updatedParam.report_id;
    
    // Get user info and gender to determine appropriate reference range
    const userResult = await client.query(`
      SELECT u.user_id, u.gender, u.date_of_birth, ur.test_date,
             pm.reference_min, pm.reference_max,
             pm.reference_min_male, pm.reference_max_male,
             pm.reference_min_female, pm.reference_max_female
      FROM lab_parameters lp
      JOIN user_reports ur ON lp.report_id = ur.report_id
      JOIN users u ON ur.user_id = u.user_id
      LEFT JOIN parameter_master pm ON POSITION(lp.parameter_name IN pm.parameter_text_mapping) > 0
      WHERE lp.id = $1
    `, [paramId]);
    
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User or parameter master not found' });
    }
    
    const { user_id, gender, date_of_birth, test_date, reference_min, reference_max, 
            reference_min_male, reference_max_male,
            reference_min_female, reference_max_female } = userResult.rows[0];
    
    // Determine which reference range to use based on gender
    let min, max;
    if (gender && gender.toUpperCase() === 'MALE') {
      min = reference_min_male !== null ? parseFloat(reference_min_male) : parseFloat(reference_min);
      max = reference_max_male !== null ? parseFloat(reference_max_male) : parseFloat(reference_max);
    } else if (gender && gender.toUpperCase() === 'FEMALE') {
      min = reference_min_female !== null ? parseFloat(reference_min_female) : parseFloat(reference_min);
      max = reference_max_female !== null ? parseFloat(reference_max_female) : parseFloat(reference_max);
    } else {
      min = reference_min !== null ? parseFloat(reference_min) : null;
      max = reference_max !== null ? parseFloat(reference_max) : null;
    }
    
    // Update status based on gender-specific reference ranges
    const value = parseFloat(parameter_value);
    let status = 'Normal';
    
    if (!isNaN(value) && min !== null && max !== null) {
      const minVal = parseFloat(min);
      const maxVal = parseFloat(max);
      
      if (value < minVal || value > maxVal) {
        const range = maxVal - minVal;
        const lower10 = minVal - range * 0.1;
        const upper10 = maxVal + range * 0.1;
        const lower20 = minVal - range * 0.2;
        const upper20 = maxVal + range * 0.2;
        
        if ((value >= lower10 && value < minVal) || (value > maxVal && value <= upper10)) {
          status = 'Borderline';
        } else if ((value >= lower20 && value < lower10) || (value > upper10 && value <= upper20)) {
          status = 'Flagged';
        } else {
          status = 'Severe';
        }
      }
    }
    
    await client.query(
      'UPDATE lab_parameters SET status = $1 WHERE id = $2',
      [status, paramId]
    );
    
    // RECALCULATE HEALTH SCORE AND BIOLOGICAL AGE
    console.log(`[DEBUG] Recalculating health metrics for report: ${reportId}`);
    
    // Get all parameters for this report
    const allParamsResult = await client.query(`
      SELECT parameter_name, parameter_value
      FROM lab_parameters
      WHERE report_id = $1
    `, [reportId]);
    
    // Convert to format expected by calculation functions
    const parameters = {};
    for (const row of allParamsResult.rows) {
      parameters[row.parameter_name] = row.parameter_value;
    }
    
    // Import calculation functions
    const { calculateHealthScore, calculateBiologicalAge } = require('../service/healthCalculations');
    
    // Calculate user's chronological age
    const birthDate = new Date(date_of_birth);
    const testDateObj = new Date(test_date);
    const chronologicalAge = Math.floor((testDateObj - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
    
    // Calculate new health score (passing gender and user_id for V2 if available)
    const newHealthScore = await calculateHealthScore(parameters, gender, user_id);
    console.log(`[DEBUG] New health score: ${newHealthScore}`);
    
    // Calculate new biological age
    const newBiologicalAge = await calculateBiologicalAge(
      chronologicalAge,
      gender,
      parameters,
      test_date
    );
    console.log(`[DEBUG] New biological age: ${newBiologicalAge}`);
    
    // Update the report with new calculated values
    await client.query(`
      UPDATE user_reports 
      SET health_score = $1, 
          biological_age = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE report_id = $3
    `, [Math.round(newHealthScore), Math.round(newBiologicalAge), reportId]);
    
    await client.query('COMMIT');
    
    console.log(`[DEBUG] Successfully updated parameter and recalculated health metrics`);
    
    res.json({ 
      message: 'Parameter updated and health metrics recalculated successfully',
      updated: {
        parameter_value: parameter_value,
        status: status,
        health_score: Math.round(newHealthScore),
        biological_age: Math.round(newBiologicalAge)
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating parameter:', error);
    res.status(500).json({ error: 'Failed to update parameter' });
  } finally {
    client.release();
  }
});

// Delete report (with validation) - Also accepting POST as a workaround for proxy issues
router.post('/reports/:reportId/delete', authenticateAdmin, async (req, res) => {
  const { query, getClient } = require('../config/database');
  const { reportId } = req.params;
  
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    // Get user_id from the report
    const reportResult = await client.query(
      'SELECT user_id FROM user_reports WHERE report_id = $1',
      [reportId]
    );
    
    if (reportResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Report not found' });
    }
    
    const userId = reportResult.rows[0].user_id;
    
    // Check total reports for this user
    const countResult = await client.query(
      'SELECT COUNT(*) as count FROM user_reports WHERE user_id = $1',
      [userId]
    );
    
    const reportCount = parseInt(countResult.rows[0].count);
    
    if (reportCount <= 1) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot delete the last report. User must have at least one report.' });
    }
    
    // Delete lab parameters first
    await client.query('DELETE FROM lab_parameters WHERE report_id = $1', [reportId]);
    
    // Delete the report
    await client.query('DELETE FROM user_reports WHERE report_id = $1', [reportId]);
    
    await client.query('COMMIT');
    
    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting report:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  } finally {
    client.release();
  }
});

// Delete report (with validation) - Original DELETE endpoint
router.delete('/reports/:reportId', authenticateAdmin, async (req, res) => {
  const { query, getClient } = require('../config/database');
  const { reportId } = req.params;
  
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    // Get user_id from the report
    const reportResult = await client.query(
      'SELECT user_id FROM user_reports WHERE report_id = $1',
      [reportId]
    );
    
    if (reportResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Report not found' });
    }
    
    const userId = reportResult.rows[0].user_id;
    
    // Check total reports for this user
    const countResult = await client.query(
      'SELECT COUNT(*) as count FROM user_reports WHERE user_id = $1',
      [userId]
    );
    
    const reportCount = parseInt(countResult.rows[0].count);
    
    if (reportCount <= 1) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot delete the last report. User must have at least one report.' });
    }
    
    // Delete lab parameters first
    await client.query('DELETE FROM lab_parameters WHERE report_id = $1', [reportId]);
    
    // Delete the report
    await client.query('DELETE FROM user_reports WHERE report_id = $1', [reportId]);
    
    await client.query('COMMIT');
    
    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting report:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  } finally {
    client.release();
  }
});

// Add new parameter to report
router.post('/reports/:reportId/parameters', authenticateAdmin, async (req, res) => {
  const { query, getClient } = require('../config/database');
  const { reportId } = req.params;
  const { parameter_name, parameter_value, unit } = req.body;
  
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    // Validate input
    if (!parameter_name || !parameter_value) {
      return res.status(400).json({ error: 'Parameter name and value are required' });
    }
    
    // Check if report exists
    const reportCheck = await client.query(
      'SELECT ur.report_id, ur.user_id, u.gender FROM user_reports ur JOIN users u ON ur.user_id = u.user_id WHERE ur.report_id = $1',
      [reportId]
    );
    
    if (reportCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    const gender = reportCheck.rows[0].gender;
    
    // Get parameter info from parameter_master
    const paramResult = await client.query(
      `SELECT parameter_key, unit, reference_min, reference_max, 
              reference_min_male, reference_max_male, 
              reference_min_female, reference_max_female,
              parameter_id
       FROM parameter_master 
       WHERE parameter_key = $1`,
      [parameter_name]
    );
    
    let paramUnit = unit;
    let refMin = null, refMax = null;
    let categoryName = null;
    
    if (paramResult.rows.length > 0) {
      const param = paramResult.rows[0];
      paramUnit = unit || param.unit;
      
      // Get gender-specific reference ranges
      if (gender && gender.toUpperCase() === 'MALE') {
        refMin = param.reference_min_male || param.reference_min;
        refMax = param.reference_max_male || param.reference_max;
      } else if (gender && gender.toUpperCase() === 'FEMALE') {
        refMin = param.reference_min_female || param.reference_min;
        refMax = param.reference_max_female || param.reference_max;
      } else {
        refMin = param.reference_min;
        refMax = param.reference_max;
      }
      
      // Get category
      const categoryResult = await client.query(
        `SELECT pc.category_name 
         FROM parameter_category_mappings pcm
         JOIN parameter_categories pc ON pcm.category_id = pc.id
         WHERE pcm.parameter_id = $1`,
        [param.parameter_id]
      );
      
      if (categoryResult.rows.length > 0) {
        categoryName = categoryResult.rows[0].category_name;
      }
    }
    
    // Calculate status based on value and reference ranges
    let status = 'Normal';
    const numValue = parseFloat(parameter_value);
    
    if (!isNaN(numValue) && refMin !== null && refMax !== null) {
      const minVal = parseFloat(refMin);
      const maxVal = parseFloat(refMax);
      
      if (numValue < minVal || numValue > maxVal) {
        const range = maxVal - minVal;
        const lower10 = minVal - range * 0.1;
        const upper10 = maxVal + range * 0.1;
        const lower20 = minVal - range * 0.2;
        const upper20 = maxVal + range * 0.2;
        
        if ((numValue >= lower10 && numValue < minVal) || (numValue > maxVal && numValue <= upper10)) {
          status = 'Borderline';
        } else if ((numValue >= lower20 && numValue < lower10) || (numValue > upper10 && numValue <= upper20)) {
          status = 'Flagged';
        } else {
          status = 'Severe';
        }
      }
    }
    
    // Insert the new parameter
    const insertResult = await client.query(
      `INSERT INTO lab_parameters (report_id, parameter_name, parameter_value, unit, reference_min, reference_max, status, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [reportId, parameter_name, parameter_value, paramUnit, refMin, refMax, status, categoryName]
    );
    
    // Recalculate health score and biological age
    const { user_id } = reportCheck.rows[0];
    
    // Get all parameters for this report
    const allParamsResult = await client.query(
      `SELECT lp.parameter_name, lp.parameter_value
       FROM lab_parameters lp
       WHERE lp.report_id = $1`,
      [reportId]
    );
    
    // Convert to format expected by calculation functions
    const parameters = {};
    for (const row of allParamsResult.rows) {
      parameters[row.parameter_name] = row.parameter_value;
    }
    
    // Import calculation functions
    const { calculateHealthScore, calculateBiologicalAge } = require('../service/healthCalculations');
    
    // Calculate new scores
    const healthScore = await calculateHealthScore(parameters);
    const reportData = await client.query(
      'SELECT test_date FROM user_reports WHERE report_id = $1',
      [reportId]
    );
    const userAge = await client.query(
      'SELECT EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth)) as age FROM users WHERE user_id = $1',
      [user_id]
    );
    
    const biologicalAge = await calculateBiologicalAge(
      parseInt(userAge.rows[0].age),
      gender,
      parameters,
      reportData.rows[0].test_date
    );
    
    // Update report with new scores
    await client.query(
      'UPDATE user_reports SET health_score = $1, biological_age = $2 WHERE report_id = $3',
      [healthScore, biologicalAge, reportId]
    );
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      parameter: insertResult.rows[0],
      updated_scores: {
        health_score: healthScore,
        biological_age: biologicalAge
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Admin API] Error adding parameter:', error);
    res.status(500).json({ error: 'Failed to add parameter' });
  } finally {
    client.release();
  }
});

// Send report ready email
router.post('/users/:userId/send-report-email', authenticateAdmin, async (req, res) => {
  const { query } = require('../config/database');
  
  try {
    const { userId } = req.params;
    
    // Get user details
    const userResult = await query(`
      SELECT u.user_id, u.email, u.first_name, u.last_name, c.company_name
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.company_id
      WHERE u.user_id = $1
    `, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    if (!user.email) {
      return res.status(400).json({ error: 'User does not have an email address' });
    }
    
    // Check if user has at least one report
    const reportCheck = await query(`
      SELECT report_id FROM user_reports WHERE user_id = $1 LIMIT 1
    `, [userId]);
    
    if (reportCheck.rows.length === 0) {
      return res.status(400).json({ error: 'User does not have any reports' });
    }
    
    // Send email
    const { sendReportReadyEmail } = require('../utils/email');
    const emailSent = await sendReportReadyEmail(
      user.email,
      user.first_name || 'User',
      user.company_name || 'Your Company'
    );
    
    if (emailSent) {
      res.json({ 
        success: true, 
        message: 'Report ready email sent successfully',
        email: user.email 
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to send email. Email service may not be configured.' 
      });
    }
  } catch (error) {
    console.error('Error sending report ready email:', error);
    res.status(500).json({ error: 'Failed to send report ready email' });
  }
});

// Delete all users in a company
router.delete('/companies/:companyId/users', authenticateAdmin, async (req, res) => {
  console.log('[DELETE ALL USERS] ========== START ==========');
  console.log('[DELETE ALL USERS] Endpoint hit: DELETE /companies/:companyId/users');
  console.log('[DELETE ALL USERS] Request params:', req.params);
  console.log('[DELETE ALL USERS] Request headers:', req.headers);
  console.log('[DELETE ALL USERS] Authenticated admin:', req.admin);
  console.log('[DELETE ALL USERS] Admin role:', req.admin?.role);
  console.log('[DELETE ALL USERS] Admin ID:', req.admin?.id);
  
  const { query, getClient } = require('../config/database');
  
  let client;
  try {
    console.log('[DELETE ALL USERS] Getting database client...');
    client = await getClient();
    console.log('[DELETE ALL USERS] Database client obtained');
  } catch (dbError) {
    console.error('[DELETE ALL USERS] Failed to get database client:', dbError);
    return res.status(500).json({ 
      error: 'Database connection failed',
      details: dbError.message 
    });
  }
  
  try {
    const { companyId } = req.params;
    const admin = req.admin;
    
    console.log('[DELETE ALL USERS] Company ID to delete users from:', companyId);
    console.log('[DELETE ALL USERS] Company ID type:', typeof companyId);
    console.log('[DELETE ALL USERS] Admin attempting deletion:', {
      id: admin?.id,
      email: admin?.email,
      role: admin?.role
    });
    
    // Check if admin is superadmin
    console.log('[DELETE ALL USERS] Checking admin role...');
    if (admin.role !== 'superadmin') {
      console.log('[DELETE ALL USERS] Access denied - admin role is:', admin.role);
      await client.release();
      return res.status(403).json({ error: 'Only superadmins can delete all users in a company' });
    }
    console.log('[DELETE ALL USERS] Admin role verified as superadmin');
    
    // Start transaction
    console.log('[DELETE ALL USERS] Starting database transaction...');
    await client.query('BEGIN');
    console.log('[DELETE ALL USERS] Transaction started');
    
    // Check if company exists
    console.log('[DELETE ALL USERS] Checking if company exists...');
    console.log('[DELETE ALL USERS] Query: SELECT company_name FROM companies WHERE company_id = $1');
    console.log('[DELETE ALL USERS] Query param:', [companyId]);
    
    const companyCheck = await client.query(
      'SELECT company_name FROM companies WHERE company_id = $1',
      [companyId]
    );
    
    console.log('[DELETE ALL USERS] Company check result:', companyCheck.rows);
    
    if (companyCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Company not found' });
    }
    
    // Get count of users to be deleted
    const userCountResult = await client.query(
      'SELECT COUNT(*) as count FROM users WHERE company_id = $1',
      [companyId]
    );
    
    const userCount = parseInt(userCountResult.rows[0].count);
    
    if (userCount === 0) {
      await client.query('ROLLBACK');
      return res.json({ 
        message: 'No users found for this company',
        deletedCount: 0
      });
    }
    
    // Delete all related data in order
    // 1. Delete risk assessments
    await client.query(`
      DELETE FROM risk_assessments 
      WHERE report_id IN (
        SELECT report_id FROM user_reports 
        WHERE user_id IN (SELECT user_id FROM users WHERE company_id = $1)
      )
    `, [companyId]);
    
    // 2. Delete lab parameters
    await client.query(`
      DELETE FROM lab_parameters 
      WHERE report_id IN (
        SELECT report_id FROM user_reports 
        WHERE user_id IN (SELECT user_id FROM users WHERE company_id = $1)
      )
    `, [companyId]);
    
    // 3. Delete user reports
    await client.query(`
      DELETE FROM user_reports 
      WHERE user_id IN (SELECT user_id FROM users WHERE company_id = $1)
    `, [companyId]);
    
    // Get sample user details for audit log (first 5 users)
    const sampleUsers = await client.query(`
      SELECT user_id, email, first_name, last_name 
      FROM users 
      WHERE company_id = $1 
      LIMIT 5
    `, [companyId]);
    
    // 4. Finally delete users
    await client.query(
      'DELETE FROM users WHERE company_id = $1',
      [companyId]
    );
    
    // Log the bulk deletion in audit table
    await client.query(`
      INSERT INTO user_deletion_audit (
        operation_type, 
        company_id, 
        company_name, 
        deleted_count,
        deleted_by_admin_id, 
        deleted_by_admin_email, 
        deleted_by_admin_name,
        additional_info,
        ip_address,
        user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      'delete_all_company_users',
      companyId,
      companyCheck.rows[0].company_name,
      userCount,
      admin.id,
      admin.email,
      admin.name,
      JSON.stringify({
        sample_deleted_users: sampleUsers.rows,
        total_users_deleted: userCount,
        deleted_at: new Date().toISOString()
      }),
      req.ip || req.connection.remoteAddress,
      req.headers['user-agent']
    ]);
    
    console.log('[DELETE ALL USERS] Committing transaction...');
    await client.query('COMMIT');
    console.log('[DELETE ALL USERS] Transaction committed successfully');
    
    console.log('[DELETE ALL USERS] ========== SUCCESS ==========');
    console.log(`[DELETE ALL USERS] Successfully deleted ${userCount} users from company ${companyId}`);
    console.log(`[DELETE ALL USERS] Company name: ${companyCheck.rows[0].company_name}`);
    console.log(`[DELETE ALL USERS] Deleted by admin: ${admin.email}`);
    
    res.json({ 
      message: `Successfully deleted all users from ${companyCheck.rows[0].company_name}`,
      deletedCount: userCount,
      company_id: companyId,
      company_name: companyCheck.rows[0].company_name
    });
    
  } catch (error) {
    console.error('[DELETE ALL USERS] ========== ERROR ==========');
    console.error('[DELETE ALL USERS] Error caught:', error);
    console.error('[DELETE ALL USERS] Error name:', error.name);
    console.error('[DELETE ALL USERS] Error message:', error.message);
    console.error('[DELETE ALL USERS] Error code:', error.code);
    console.error('[DELETE ALL USERS] Error detail:', error.detail);
    console.error('[DELETE ALL USERS] Error hint:', error.hint);
    console.error('[DELETE ALL USERS] Error position:', error.position);
    console.error('[DELETE ALL USERS] Error stack:', error.stack);
    
    if (client) {
      console.log('[DELETE ALL USERS] Rolling back transaction...');
      await client.query('ROLLBACK');
      console.log('[DELETE ALL USERS] Transaction rolled back');
    }
    
    res.status(500).json({ 
      error: 'Failed to delete users',
      details: error.message,
      code: error.code,
      hint: error.hint
    });
  } finally {
    if (client) {
      console.log('[DELETE ALL USERS] Releasing database client');
      client.release();
    }
    console.log('[DELETE ALL USERS] ========== END ==========');
  }
});

// GET /api/admin/deletion-audit - Get user deletion audit logs
router.get('/deletion-audit', authenticateAdmin, async (req, res) => {
  console.log('[Deletion Audit API] ========== START ==========');
  console.log('[Deletion Audit API] Request received');
  console.log('[Deletion Audit API] Request headers:', req.headers);
  console.log('[Deletion Audit API] Request query params:', req.query);
  console.log('[Deletion Audit API] Authenticated admin:', req.admin);
  
  const { query } = require('../config/database');
  
  try {
    const { company_id, operation_type, admin_id, limit = 100, offset = 0 } = req.query;
    
    console.log('[Deletion Audit API] Parsed params:', {
      company_id,
      operation_type,
      admin_id,
      limit,
      offset
    });
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;
    
    if (company_id) {
      paramCount++;
      whereClause += ` AND company_id = $${paramCount}`;
      params.push(company_id);
      console.log('[Deletion Audit API] Added company_id filter:', company_id);
    }
    
    if (operation_type) {
      paramCount++;
      whereClause += ` AND operation_type = $${paramCount}`;
      params.push(operation_type);
    }
    
    if (admin_id) {
      paramCount++;
      whereClause += ` AND deleted_by_admin_id = $${paramCount}`;
      params.push(admin_id);
    }
    
    paramCount++;
    params.push(limit);
    paramCount++;
    params.push(offset);
    
    console.log('[Deletion Audit API] Final query params:', params);
    console.log('[Deletion Audit API] Final where clause:', whereClause);
    console.log('[Deletion Audit API] Param count:', paramCount);
    
    const queryText = `
      SELECT 
        id,
        operation_type,
        company_id,
        company_name,
        user_id,
        user_email,
        user_identifier,
        deleted_count,
        deleted_by_admin_id,
        deleted_by_admin_email,
        deleted_by_admin_name,
        deleted_at,
        additional_info,
        ip_address
      FROM user_deletion_audit
      ${whereClause}
      ORDER BY deleted_at DESC
      LIMIT $${paramCount - 1} OFFSET $${paramCount}
    `;
    
    console.log('[Deletion Audit API] Full query text:', queryText);
    console.log('[Deletion Audit API] Query params for execution:', params);
    console.log('[Deletion Audit API] About to execute main query...');
    
    const result = await query(queryText, params);
    
    console.log('[Deletion Audit API] Main query executed successfully');
    console.log('[Deletion Audit API] Number of rows returned:', result.rows.length);
    
    console.log('[Deletion Audit API] About to execute count query...');
    console.log('[Deletion Audit API] Count query params:', params.slice(0, -2));
    
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM user_deletion_audit
      ${whereClause}
    `, params.slice(0, -2));
    
    console.log('[Deletion Audit API] Count query executed successfully');
    console.log('[Deletion Audit API] Total count:', countResult.rows[0].total);
    
    const responseData = {
      audit_logs: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    };
    
    console.log('[Deletion Audit API] Preparing response:', {
      audit_logs_count: responseData.audit_logs.length,
      total: responseData.total,
      limit: responseData.limit,
      offset: responseData.offset
    });
    
    console.log('[Deletion Audit API] ========== SUCCESS ==========');
    res.json(responseData);
  } catch (error) {
    console.error('[Deletion Audit API] ========== ERROR ==========');
    console.error('[Deletion Audit API] Error caught:', error);
    console.error('[Deletion Audit API] Error name:', error.name);
    console.error('[Deletion Audit API] Error message:', error.message);
    console.error('[Deletion Audit API] Error code:', error.code);
    console.error('[Deletion Audit API] Error detail:', error.detail);
    console.error('[Deletion Audit API] Error hint:', error.hint);
    console.error('[Deletion Audit API] Error position:', error.position);
    console.error('[Deletion Audit API] Error stack:', error.stack);
    console.error('[Deletion Audit API] Full error object:', JSON.stringify(error, null, 2));
    
    res.status(500).json({ 
      error: 'Failed to fetch deletion audit logs',
      details: error.message,
      code: error.code,
      hint: error.hint
    });
  }
});

// GET /api/admin/companies/:id/employee-counts - Get employee counts by year for a company
router.get('/companies/:id/employee-counts', authenticateAdmin, async (req, res) => {
  console.log('[Admin] GET employee-counts - Start');
  console.log('[Admin] Company ID:', req.params.id);
  console.log('[Admin] User (req.user):', req.user);
  console.log('[Admin] Admin (req.admin):', req.admin);
  
  try {
    const { id: companyId } = req.params;
    
    console.log('[Admin] Fetching employee counts for company:', companyId);
    const result = await query(
      `SELECT year, total_employees, created_at, updated_at 
       FROM company_year_employees 
       WHERE company_id = $1 
       ORDER BY year DESC`,
      [companyId]
    );
    
    console.log('[Admin] Employee counts found:', result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error('[Admin] Error fetching employee counts - Full error:', error);
    console.error('[Admin] Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch employee counts',
      details: error.message 
    });
  }
});

// PUT /api/admin/companies/:id/employee-counts/:year - Update employee count for a specific year
router.put('/companies/:id/employee-counts/:year', authenticateAdmin, async (req, res) => {
  console.log('[Admin] PUT employee-counts - Start');
  console.log('[Admin] Params:', req.params);
  console.log('[Admin] Body:', req.body);
  console.log('[Admin] User (req.user):', req.user);
  console.log('[Admin] Admin (req.admin):', req.admin);
  
  try {
    const { id: companyId, year } = req.params;
    const { total_employees } = req.body;
    
    console.log('[Admin] Parsed values:', { companyId, year, total_employees });
    
    if (!total_employees && total_employees !== 0) {
      console.log('[Admin] Missing total_employees');
      return res.status(400).json({ error: 'total_employees is required' });
    }
    
    const employeeCount = parseInt(total_employees);
    if (isNaN(employeeCount) || employeeCount < 0) {
      console.log('[Admin] Invalid employee count:', total_employees);
      return res.status(400).json({ error: 'Invalid employee count' });
    }
    
    console.log('[Admin] Checking if company exists:', companyId);
    // Check if company exists
    const companyCheck = await query(
      'SELECT company_id FROM companies WHERE company_id = $1',
      [companyId]
    );
    
    console.log('[Admin] Company check result:', companyCheck.rows);
    
    if (companyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    // Get created_by value - admin middleware sets req.admin
    const createdBy = req.admin?.email || req.admin?.username || req.user?.email || req.user?.username || 'admin';
    console.log('[Admin] Created by:', createdBy);
    console.log('[Admin] req.admin:', req.admin);
    console.log('[Admin] req.user:', req.user);
    
    console.log('[Admin] Executing INSERT/UPDATE query...');
    // Insert or update employee count
    const result = await query(
      `INSERT INTO company_year_employees (company_id, year, total_employees, created_by) 
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (company_id, year) 
       DO UPDATE SET 
         total_employees = $3,
         updated_at = CURRENT_TIMESTAMP,
         created_by = $4
       RETURNING *`,
      [companyId, year, employeeCount, createdBy]
    );
    
    console.log('[Admin] Query result:', result.rows);
    
    res.json({ 
      success: true, 
      data: result.rows[0],
      message: `Employee count updated for ${year}`
    });
    
  } catch (error) {
    console.error('[Admin] Error updating employee count - Full error:', error);
    console.error('[Admin] Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to update employee count',
      details: error.message 
    });
  }
});


module.exports = router;