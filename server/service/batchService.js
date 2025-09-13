const { getClient, query } = require('../config/database');
const demographicQueue = require('../queues/demographicQueue');
const batchRepository = require('../repositories/batchRepository');
const batchProcessingQueue = require('../queues/batchProcessingQueue');
const sendEmail = require('../utils/email');
const { v4: uuidv4 } = require('uuid');
const { generateUniqueShortReportId } = require('../utils/reportIdGenerator');

const CHUNK_SIZE = 500;

// Enhanced batch repository update function with error details
async function updateBatchStatusWithError(batchId, status, adminEmail, errorDetails = null) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    
    let queryStr = `
      UPDATE batch_uploads 
      SET status = $2, 
          approved_by = $3, 
          approved_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
    `;
    
    const params = [batchId, status, adminEmail];
    
    if (errorDetails) {
      queryStr += `, error_details = $4`;
      params.push(errorDetails);
    }
    
    queryStr += ` WHERE batch_id = $1`;
    
    await client.query(queryStr, params);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Validate all data before processing
async function validateBatchData(records, parameterMaster) {
  const errors = [];
  const paramMap = {};
  const textMappingToKey = {};
  
  // Create parameter map for quick lookup
  parameterMaster.forEach(param => {
    paramMap[param.parameter_key] = param;
    
    // Also map all text variations to the parameter
    if (param.parameter_text_mapping) {
      const mappings = param.parameter_text_mapping.split(',').map(m => m.trim());
      mappings.forEach(mapping => {
        textMappingToKey[mapping] = param.parameter_key;
      });
    }
    // Also add the parameter_key itself as a valid mapping
    textMappingToKey[param.parameter_key] = param.parameter_key;
  });
  
  // Group records by employee
  const employeeMap = new Map();
  for (const record of records) {
    const key = `${record.row_number}_${record.employee_id}`;
    if (!employeeMap.has(key)) {
      employeeMap.set(key, {
        ...record,
        parameters: {}
      });
    }
    if (record.parameter_name && record.parameter_value) {
      employeeMap.get(key).parameters[record.parameter_name] = record.parameter_value;
    }
  }
  
  // Validate each employee's data
  for (const [key, employee] of employeeMap.entries()) {
    const rowErrors = [];
    
    // Validate required fields
    // 1. Employee ID
    if (!employee.employee_id || employee.employee_id.trim() === '') {
      rowErrors.push({
        field: 'Employee ID',
        value: employee.employee_id || '(empty)',
        error: 'Employee ID is required'
      });
    }
    
    // 2. Name
    if (!employee.name || employee.name.trim() === '') {
      rowErrors.push({
        field: 'Name',
        value: employee.name || '(empty)',
        error: 'Employee name is required'
      });
    }
    
    // 3. Email validation
    if (!employee.email || employee.email.trim() === '') {
      rowErrors.push({
        field: 'Email',
        value: employee.email || '(empty)',
        error: 'Email is required'
      });
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(employee.email)) {
        rowErrors.push({
          field: 'Email',
          value: employee.email,
          error: 'Invalid email format'
        });
      }
    }
    
    // 4. Phone validation
    if (employee.phone && employee.phone.trim() !== '') {
      // Remove common formatting characters
      const cleanPhone = employee.phone.replace(/[\s\-\(\)\+]/g, '');
      if (!/^\d{6,15}$/.test(cleanPhone)) {
        rowErrors.push({
          field: 'Phone',
          value: employee.phone,
          error: 'Phone number must be 6-15 digits (formatting characters allowed)'
        });
      }
    }
    
    // 5. Date of Birth validation
    if (!employee.date_of_birth) {
      rowErrors.push({
        field: 'Date of Birth',
        value: '(empty)',
        error: 'Date of birth is required'
      });
    } else {
      const dob = new Date(employee.date_of_birth);
      const now = new Date();
      const minDate = new Date('1900-01-01');
      
      if (isNaN(dob.getTime())) {
        rowErrors.push({
          field: 'Date of Birth',
          value: employee.date_of_birth,
          error: 'Invalid date format'
        });
      } else if (dob > now) {
        rowErrors.push({
          field: 'Date of Birth',
          value: employee.date_of_birth,
          error: 'Date of birth cannot be in the future'
        });
      } else if (dob < minDate) {
        rowErrors.push({
          field: 'Date of Birth',
          value: employee.date_of_birth,
          error: 'Date of birth cannot be before 1900'
        });
      } else {
        // Check age (must be between 0 and 150)
        const age = Math.floor((now - dob) / (365.25 * 24 * 60 * 60 * 1000));
        if (age > 150) {
          rowErrors.push({
            field: 'Date of Birth',
            value: employee.date_of_birth,
            error: 'Age calculated from date of birth exceeds 150 years'
          });
        }
      }
    }
    
    // 6. Gender validation - STRICT CHECK
    if (!employee.gender || employee.gender.trim() === '') {
      rowErrors.push({
        field: 'Gender',
        value: '(empty)',
        error: 'Gender is required'
      });
    } else if (!['Male', 'Female', 'Other'].includes(employee.gender)) {
      rowErrors.push({
        field: 'Gender',
        value: employee.gender,
        error: 'Gender must be exactly "Male", "Female", or "Other" (case-sensitive)'
      });
    }
    
    // 7. Test Date validation
    if (!employee.test_date) {
      rowErrors.push({
        field: 'Test Date',
        value: '(empty)',
        error: 'Test date is required'
      });
    } else {
      const testDate = new Date(employee.test_date);
      const now = new Date();
      const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
      
      if (isNaN(testDate.getTime())) {
        rowErrors.push({
          field: 'Test Date',
          value: employee.test_date,
          error: 'Invalid test date format'
        });
      } else if (testDate > now) {
        rowErrors.push({
          field: 'Test Date',
          value: employee.test_date,
          error: 'Test date cannot be in the future'
        });
      } else if (testDate < fiveYearsAgo) {
        rowErrors.push({
          field: 'Test Date',
          value: employee.test_date,
          error: 'Test date cannot be more than 5 years old'
        });
      }
    }
    
    // 8. Location validation
    if (employee.location && employee.location.length > 100) {
      rowErrors.push({
        field: 'Location',
        value: employee.location,
        error: 'Location must not exceed 100 characters'
      });
    }
    
    // 9. Validate parameters
    for (const [paramName, paramValue] of Object.entries(employee.parameters)) {
      // Skip text fields
      if (paramName === 'doctor_remark' || paramName === "Doctor's Remark") {
        continue;
      }
      
      // First check if this parameter name maps to a known parameter
      const mappedKey = textMappingToKey[paramName];
      if (!mappedKey) {
        rowErrors.push({
          field: paramName,
          value: paramValue,
          error: `Unknown parameter: "${paramName}" is not mapped in the system. Please use exact parameter names from the template.`
        });
        continue;
      }
      
      const paramDef = paramMap[mappedKey];
      if (!paramDef) {
        rowErrors.push({
          field: paramName,
          value: paramValue,
          error: `Unknown parameter: "${paramName}" is not in the system`
        });
        continue;
      }
      
      // Check for blood pressure format (e.g., "120/80")
      // Only check for combined BP format if it's a single "Blood Pressure" field
      if ((paramName.toLowerCase() === 'blood pressure' || 
           paramName.toLowerCase() === 'bp') && 
          !paramName.toLowerCase().includes('systolic') && 
          !paramName.toLowerCase().includes('diastolic')) {
        if (!paramValue || paramValue.trim() === '') {
          continue; // Skip empty BP values
        }
        
        if (paramValue.includes('/')) {
          const parts = paramValue.split('/');
          if (parts.length !== 2) {
            rowErrors.push({
              field: paramName,
              value: paramValue,
              error: `Invalid blood pressure format. Expected format: "120/80" (systolic/diastolic)`
            });
          } else {
            const systolic = parts[0].trim();
            const diastolic = parts[1].trim();
            if (isNaN(systolic) || isNaN(diastolic) || systolic === '' || diastolic === '') {
              rowErrors.push({
                field: paramName,
                value: paramValue,
                error: `Blood pressure values must be numeric. Got: "${systolic}/${diastolic}"`
              });
            } else {
              // Validate BP ranges
              const systolicNum = parseFloat(systolic);
              const diastolicNum = parseFloat(diastolic);
              if (systolicNum < 50 || systolicNum > 300) {
                rowErrors.push({
                  field: paramName,
                  value: paramValue,
                  error: `Systolic BP out of valid range (50-300). Got: ${systolic}`
                });
              }
              if (diastolicNum < 30 || diastolicNum > 200) {
                rowErrors.push({
                  field: paramName,
                  value: paramValue,
                  error: `Diastolic BP out of valid range (30-200). Got: ${diastolic}`
                });
              }
              if (systolicNum <= diastolicNum) {
                rowErrors.push({
                  field: paramName,
                  value: paramValue,
                  error: `Systolic BP must be greater than diastolic BP`
                });
              }
            }
          }
          continue;
        } else {
          rowErrors.push({
            field: paramName,
            value: paramValue,
            error: `Blood pressure must be in format "120/80"`
          });
          continue;
        }
      }
      
      // Check for separate Systolic BP field
      if (paramName.toLowerCase().includes('systolic') && 
          (paramName.toLowerCase().includes('bp') || paramName.toLowerCase().includes('blood pressure'))) {
        if (paramValue && paramValue.trim() !== '') {
          const numValue = parseFloat(paramValue);
          if (isNaN(numValue)) {
            rowErrors.push({
              field: paramName,
              value: paramValue,
              error: `Systolic BP must be a numeric value`
            });
          } else if (numValue < 50 || numValue > 300) {
            rowErrors.push({
              field: paramName,
              value: paramValue,
              error: `Systolic BP out of valid range (50-300). Got: ${numValue}`
            });
          }
        }
        continue;
      }
      
      // Check for separate Diastolic BP field
      if (paramName.toLowerCase().includes('diastolic') && 
          (paramName.toLowerCase().includes('bp') || paramName.toLowerCase().includes('blood pressure'))) {
        if (paramValue && paramValue.trim() !== '') {
          const numValue = parseFloat(paramValue);
          if (isNaN(numValue)) {
            rowErrors.push({
              field: paramName,
              value: paramValue,
              error: `Diastolic BP must be a numeric value`
            });
          } else if (numValue < 30 || numValue > 200) {
            rowErrors.push({
              field: paramName,
              value: paramValue,
              error: `Diastolic BP out of valid range (30-200). Got: ${numValue}`
            });
          }
        }
        continue;
      }
      
      // Validate numeric values for other parameters
      if (paramValue && paramValue.trim() !== '') {
        const numValue = parseFloat(paramValue);
        if (isNaN(numValue)) {
          rowErrors.push({
            field: paramName,
            value: paramValue,
            error: `Expected numeric value but got: "${paramValue}"`
          });
        } else {
          // Check for reasonable ranges (prevent data entry errors)
          if (numValue < 0) {
            rowErrors.push({
              field: paramName,
              value: paramValue,
              error: `Value cannot be negative`
            });
          } else if (numValue > 10000) {
            rowErrors.push({
              field: paramName,
              value: paramValue,
              error: `Value seems too high (>10000). Please verify`
            });
          }
        }
      }
    }
    
    if (rowErrors.length > 0) {
      errors.push({
        row_number: employee.row_number,
        employee_id: employee.employee_id,
        name: employee.name,
        errors: rowErrors
      });
    }
  }
  
  return errors;
}

// Approve a batch: update status, process synchronously or queue for async
async function approveBatch(batchId, adminEmail) {
  let mode, message;
  try {
    // First, validate all data before processing
    const records = await batchRepository.getValidBatchRecords(batchId);
    
    // Get parameter definitions
    const paramResult = await query(
      `SELECT parameter_key, unit, reference_min, reference_max, 
              reference_min_male, reference_max_male, 
              reference_min_female, reference_max_female 
       FROM parameter_master 
       ORDER BY parameter_priority, parameter_id`
    );
    
    // Validate batch data
    const validationErrors = await validateBatchData(records, paramResult.rows);
    
    if (validationErrors.length > 0) {
      // Update batch status with detailed error information
      const errorDetails = {
        error: "Validation failed",
        total_errors: validationErrors.length,
        details: validationErrors.slice(0, 100), // Limit to first 100 errors
        timestamp: new Date().toISOString()
      };
      
      await updateBatchStatusWithError(batchId, 'failed', adminEmail, errorDetails);
      
      // Send detailed error email if function exists
      if (sendEmail.sendDetailedErrorEmail) {
        await sendEmail.sendDetailedErrorEmail(adminEmail, errorDetails, batchId);
      } else {
        await sendEmail.sendErrorEmail(adminEmail, `Batch validation failed with ${validationErrors.length} errors`, batchId);
      }
      
      return {
        success: false,
        mode: 'validation_failed',
        message: `Batch validation failed with ${validationErrors.length} errors. Check error details for more information.`,
        errors: validationErrors
      };
    }
    
    // If validation passes, proceed with processing
    await batchRepository.updateBatchStatus(batchId, 'processing', adminEmail);
    
    const uniqueEmployeeKeys = new Set(records.map(r => `${r.row_number}_${r.employee_id}`));
    
    // Process synchronously for small batches, async for large ones
    if (uniqueEmployeeKeys.size < 3) {
      await processBatch(batchId, records);
      await sendEmail.sendApprovedEmail(adminEmail, 'SYNC', batchId, records);
      mode = 'sync';
      message = 'Batch processed successfully.';
    } else {
      await batchProcessingQueue.add('process-batch', { batchId, adminEmail });
      mode = 'async';
      message = 'Batch queued for processing.';
    }

    console.log(`Batch ${batchId} approved in ${mode} mode.`);
    
    // Add demographic processing
    try {
      const parameterKeys = await batchRepository.getParameterKeys();
      console.log(`Parameter keys for batch ${batchId}:`, parameterKeys);

      const employeeMap = new Map();
      for (const record of records) {
        const key = `${record.row_number}_${record.employee_id}`;
        if (!employeeMap.has(key)) {
          employeeMap.set(key, {
            ...record,
            parameters: {}
          });
        }
        if (record.parameter_name) {
          employeeMap.get(key).parameters[record.parameter_name] = record.parameter_value;
        }
      }
      const employees = Array.from(employeeMap.values());

      await demographicQueue.add('demographic-averages', {
        batchId,
        records: await Promise.all(employees.map(async emp => ({
          company_id: emp.company_id,
          age: await calculateAge(emp.date_of_birth),
          gender: emp.gender,
          location: emp.location,
          ...parameterKeys.reduce((obj, key) => {
            obj[key] = emp.parameters ? emp.parameters[key] : undefined;
            return obj;
          }, {})
        })))
      });
    } catch (err) {
      message += ` Averages processing failed.`;
      console.error(`Error adding demographic averages job for batch ${batchId}:`, err);
    }
    
    return {
      success: true,
      mode: mode,
      message: message
    };

  } catch (error) {
    console.error(`Error approving batch ${batchId}:`, error);
    
    // Update batch status with error details
    const errorDetails = {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
    
    await updateBatchStatusWithError(batchId, 'failed', adminEmail, errorDetails);
    
    throw new Error('Failed to approve batch: ' + error.message);
  }
}

// Main batch processing logic with atomic transaction
async function processBatch(batchId, records = null) {
  const client = await getClient();
  
  try {
    console.log(`Starting atomic processing of batch ${batchId}`);
    
    // Start transaction
    await client.query('BEGIN');
    
    // Set transaction isolation level for consistency
    await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
    
    // Fetch parameter metadata
    const paramResult = await client.query(
      `SELECT parameter_key, unit, reference_min, reference_max, 
              reference_min_male, reference_max_male, 
              reference_min_female, reference_max_female,
              parameter_id
       FROM parameter_master 
       ORDER BY parameter_priority, parameter_id`
    );
    const parameterKeys = paramResult.rows.map(row => row.parameter_key);
    
    // Fetch records if not provided
    if (!records) {
      const recordsResult = await client.query(
        `SELECT * FROM batch_records 
         WHERE batch_id = $1 AND validation_status = 'valid' 
         ORDER BY row_number`,
        [batchId]
      );
      records = recordsResult.rows;
    }
    
    if (!records || records.length === 0) {
      throw new Error(`No valid records found for batch ${batchId}`);
    }
    
    console.log(`Processing ${records.length} records for batch ${batchId}`);
    
    // Skip validation - already done during upload
    console.log('Skipping validation - batch already validated during upload');
    
    // Process all records
    const { sendReportReadyEmail } = require('../utils/email');
    const emailsToSend = [];
    const allDeleteRowNumbers = [];
    const processedCount = { users: 0, reports: 0, parameters: 0 };
    
    // Process in chunks but ensure all records for an employee are in the same chunk
    // Group records by employee first
    const employeeGroups = {};
    for (const record of records) {
      const key = `${record.row_number}_${record.employee_id}`;
      if (!employeeGroups[key]) {
        employeeGroups[key] = [];
      }
      employeeGroups[key].push(record);
    }
    
    // Create chunks ensuring complete employee data stays together
    const chunks = [];
    let currentChunk = [];
    let currentChunkSize = 0;
    
    for (const [employeeKey, employeeRecords] of Object.entries(employeeGroups)) {
      // If adding this employee would exceed chunk size, start a new chunk
      // But always keep all records for one employee together
      if (currentChunkSize > 0 && currentChunkSize + employeeRecords.length > CHUNK_SIZE) {
        chunks.push(currentChunk);
        currentChunk = [];
        currentChunkSize = 0;
      }
      
      // Add all records for this employee to current chunk
      currentChunk.push(...employeeRecords);
      currentChunkSize += employeeRecords.length;
    }
    
    // Don't forget the last chunk
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }
    
    console.log(`Processing ${chunks.length} chunks for batch ${batchId}`);
    
    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Processing chunk ${i + 1}/${chunks.length} with ${chunk.length} records`);
      const result = await processChunk(client, chunk, batchId, paramResult.rows, parameterKeys);
      
      if (result) {
        if (result.emailsToSend && result.emailsToSend.length > 0) {
          emailsToSend.push(...result.emailsToSend);
        }
        if (result.deleteRowNumbers && result.deleteRowNumbers.length > 0) {
          allDeleteRowNumbers.push(...result.deleteRowNumbers);
        }
        processedCount.users += result.processedUsers || 0;
        processedCount.reports += result.processedUsers || 0;
        processedCount.parameters += result.processedParameters || 0;
      }
    }
    
    // Delete ALL records at once after successful processing
    // Instead of deleting batch records immediately, implement retention policy
    console.log(`Processing completed. Implementing batch retention policy.`);
    
    // First, mark current batch records as processed
    if (allDeleteRowNumbers.length > 0) {
      await client.query(
        `UPDATE batch_records 
         SET validation_status = 'valid'
         WHERE batch_id = $1 AND row_number = ANY($2::int[])`,
        [batchId, allDeleteRowNumbers]
      );
      console.log(`Marked ${allDeleteRowNumbers.length} records as valid`);
    }
    
    // Clean up old batch records (keep last 10 batches)
    const oldBatchesResult = await client.query(
      `SELECT batch_id FROM batch_uploads 
       WHERE status = 'completed'
       ORDER BY created_at DESC
       OFFSET 10`
    );
    
    if (oldBatchesResult.rows.length > 0) {
      const oldBatchIds = oldBatchesResult.rows.map(row => row.batch_id);
      console.log(`Cleaning up ${oldBatchIds.length} old batches: ${oldBatchIds.join(", ")}`);
      
      // Delete batch records for old batches
      const deleteOldResult = await client.query(
        `DELETE FROM batch_records 
         WHERE batch_id = ANY($1::varchar[])`,
        [oldBatchIds]
      );
      
      console.log(`Deleted ${deleteOldResult.rowCount} old batch records`);
    }
    
    // Update batch status to completed
    await client.query(
      `UPDATE batch_uploads 
       SET status = 'completed', 
           updated_at = CURRENT_TIMESTAMP,
           error_details = NULL
       WHERE batch_id = $1`,
      [batchId]
    );
    
    // Commit transaction - all or nothing
    await client.query('COMMIT');
    
    console.log(`Batch ${batchId} processed successfully. Users: ${processedCount.users}, Reports: ${processedCount.reports}, Parameters: ${processedCount.parameters}`);
    
    // Send emails after successful commit
    for (const emailData of emailsToSend) {
      try {
        await sendReportReadyEmail(emailData.email, emailData.firstName, emailData.companyName);
        console.log(`📧 Report ready email sent to ${emailData.email}`);
      } catch (emailError) {
        console.error(`Failed to send email to ${emailData.email}:`, emailError);
      }
    }
    
    return {
      success: true,
      processedCount,
      records
    };
    
  } catch (error) {
    // Rollback on any error
    await client.query('ROLLBACK');
    
    console.error(`Error processing batch ${batchId}:`, error);
    
    // Update batch with detailed error information
    const errorDetails = {
      error: error.message,
      type: error.code || 'PROCESSING_ERROR',
      details: [],
      timestamp: new Date().toISOString()
    };
    
    // Extract specific field errors if available
    if (error.message.includes('invalid input syntax')) {
      const match = error.message.match(/invalid input syntax for type (\w+): "(.+)"/);
      if (match) {
        errorDetails.details.push({
          field: 'Unknown field',
          value: match[2],
          error: `Invalid ${match[1]} value: "${match[2]}"`
        });
      }
    } else if (error.message.includes('Duplicate email detected:')) {
      // Handle duplicate email errors with clear user-friendly message
      errorDetails.type = 'DUPLICATE_EMAIL_ERROR';
      errorDetails.error = 'Batch rejected due to duplicate email address';
      errorDetails.details.push({
        error: error.message,
        suggestion: 'Each employee must have a unique email address. Please correct the duplicate email and re-upload the batch.',
        action: 'No users or reports were created. Please fix the duplicate email and try again.'
      });
    } else if (error.message.includes('foreign key constraint')) {
      // Handle foreign key constraint errors
      errorDetails.type = 'DATA_INTEGRITY_ERROR';
      errorDetails.error = 'Failed to process batch due to data integrity issues';
      errorDetails.details.push({
        error: 'Unable to create health reports for some employees',
        suggestion: 'This may occur if user records could not be created properly. Please check employee data for completeness and try again.',
        technical: error.message
      });
    } else if (error.message.includes('duplicate key')) {
      // Handle duplicate key errors
      errorDetails.type = 'DUPLICATE_ERROR';
      errorDetails.error = 'Duplicate data detected during processing';
      errorDetails.details.push({
        error: 'Some records already exist in the system',
        suggestion: 'Please check if this data has already been uploaded. Remove duplicates and try again.',
        technical: error.message
      });
    } else if (error.message.includes('Validation failed:')) {
      try {
        const validationData = JSON.parse(error.message.replace('Validation failed: ', ''));
        errorDetails.details = validationData;
      } catch (e) {
        // If parsing fails, keep the original error message
      }
    }
    
    await updateBatchStatusWithError(batchId, 'failed', null, errorDetails);
    
    throw error;
  } finally {
    client.release();
  }
}

// Helper: Process a chunk of records
async function processChunk(client, chunk, batchId, paramRows, parameterKeys) {
  let userReportRows = [];
  let labParamRows = [];
  let deleteRowNumbers = [];
  let emailsToSend = [];
  // let healthCategoryRows = [];


  console.log(`Processing chunk of ${chunk.length} records for batch ${batchId}`);

  // 1. Group all parameter rows by employee
  const employeeMap = new Map();
  for (const record of chunk) {
    const key = `${record.row_number}_${record.employee_id}`;
    if (!employeeMap.has(key)) {
      employeeMap.set(key, {
        ...record,
        parameters: {}
      });
    }
    if (record.parameter_name) {
      employeeMap.get(key).parameters[record.parameter_name] = record.parameter_value;
    }
  }
  const employees = Array.from(employeeMap.values());

  console.log('employeeMap keys:', Array.from(employeeMap.keys()));
console.log('employeeMap values:', Array.from(employeeMap.values()));

  // Fetch all parameter-category mappings and categories
  const { rows: paramCatMappings } = await client.query(`
    SELECT pcm.category_id, pcm.parameter_id, pm.parameter_key, pc.category_key, pc.category_name
    FROM parameter_category_mappings pcm
    JOIN parameter_master pm ON pcm.parameter_id = pm.parameter_id
    JOIN parameter_categories pc ON pcm.category_id = pc.id
    WHERE pc.is_active = true
  `);

  const categoryMap = {};
  for (const row of paramCatMappings) {
    if (!categoryMap[row.category_id]) {
      categoryMap[row.category_id] = {
        category_key: row.category_key,
        category_name: row.category_name,
        parameter_keys: []
      };
    }
    categoryMap[row.category_id].parameter_keys.push(row.parameter_key);
  }

  const paramToCategory = {};
  for (const [catId, cat] of Object.entries(categoryMap)) {
    for (const paramKey of cat.parameter_keys) {
      paramToCategory[paramKey] = cat.category_name;
    }
  }

  // 2. Process each employee ONCE
  for (const [key, employee] of employeeMap.entries()) {
    try {
      // Validate employee data before processing
      if (!employee.employee_id || !employee.name || !employee.email) {
        throw new Error(`Missing required fields for employee at row ${employee.row_number}: ID=${employee.employee_id}, Name=${employee.name}, Email=${employee.email}`);
      }

      // Generate UHID
      const uhidResult = await client.query(
        `SELECT 'UH' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || LPAD(nextval('uhid_sequence')::text, 5, '0') as uhid`
      );
      const uhid = uhidResult.rows[0].uhid;
      
      // Safely handle name splitting
      const nameParts = (employee.name || '').trim().split(' ');
      const firstName = nameParts[0] || 'Unknown';
      const lastName = nameParts.slice(1).join(' ') || '';

      console.log(`Processing employee ${employee.employee_id}: ${firstName} ${lastName}`);

    // await client.query(
    //   `INSERT INTO users (uhid, user_id, email, phone, date_of_birth, first_name, last_name, gender, company_id, location, email_verified)
    //   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false)
    //   ON CONFLICT (user_id) DO UPDATE
    //   SET email = EXCLUDED.email, phone = EXCLUDED.phone, location = EXCLUDED.location`,
    //   [
    //     uhid, employee.employee_id, employee.email, employee.phone, employee.date_of_birth,
    //     firstName, lastName, employee.gender, employee.company_id, employee.location
    //   ]
    // );
    
    // Check if user exists by user_id
    const userByIdResult = await client.query(
      'SELECT user_id, email FROM users WHERE user_id = $1',
      [employee.employee_id]
    );

    if (userByIdResult.rows.length > 0) {
      // Case 1: User ID already exists - update their info and create new report (normal flow)
      await client.query(
        `UPDATE users SET
          email = $4, 
          phone = $1, 
          location = $2,
          company_id = $3,
          gender = $6
        WHERE user_id = $5`,
        [employee.phone, employee.location, employee.company_id, employee.email, employee.employee_id, employee.gender]
      );
      console.log(`Updated existing user: ${employee.employee_id} - will create new report`);
    } else {
      // User ID doesn't exist - check if email exists for another user
      const userByEmailResult = await client.query(
        'SELECT user_id, email, CONCAT(first_name, \' \', last_name) as name FROM users WHERE email = $1',
        [employee.email]
      );
      
      if (userByEmailResult.rows.length > 0) {
        // Case 2: Email exists for a different user - REJECT THE ENTIRE BATCH
        const conflictingUser = userByEmailResult.rows[0];
        const errorMessage = `Duplicate email detected: Email '${employee.email}' for new employee '${employee.name}' (${employee.employee_id}) already exists for user '${conflictingUser.name}' (${conflictingUser.user_id}). Please use a unique email address for each employee or update the existing employee record.`;
        
        console.error(errorMessage);
        throw new Error(errorMessage);
      } else {
        // Case 3: Neither user_id nor email exists - create new user
        await client.query(
          `INSERT INTO users (uhid, user_id, email, phone, date_of_birth, first_name, last_name, gender, company_id, location, email_verified)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false)`,
          [uhid, employee.employee_id, employee.email, employee.phone, employee.date_of_birth,
          firstName, lastName, employee.gender, employee.company_id, employee.location]
        );
        console.log(`Created new user: ${employee.employee_id}`);
      }
    }
    
    // Verify user was created/updated successfully
    const verifyResult = await client.query(
      'SELECT user_id FROM users WHERE user_id = $1',
      [employee.employee_id]
    );
    
    if (verifyResult.rows.length === 0) {
      throw new Error(`Failed to create/update user ${employee.employee_id}. User not found after operation.`);
    }

    // Generate shorter report ID (SR-YYYY-XXXX format)
    // For existing reports, keep the old format. New reports get shorter IDs.
    const reportId = await generateUniqueShortReportId();

    console.log(`Generated reportId for employee ${employee.employee_id}: ${reportId}`);

    const age = await calculateAge(employee.date_of_birth);
    const bioAge = await calculateBiologicalAge(age, employee.gender, employee.parameters, employee.test_date);
    const healthScore = await calculateHealthScore(employee, parameterKeys);

    userReportRows.push([
      employee.employee_id, reportId, healthScore, isNaN(bioAge) ? null : bioAge, employee.test_date
    ]);

    // Prepare lab parameter rows for this employee
     for (const param of paramRows) {
    const value = employee.parameters[param.parameter_key];
    if (value !== undefined && value !== null && value !== '') {
      let status = 'Abnormal';
      const numValue = parseFloat(value);
      
      // Get gender-specific reference ranges
      const gender = employee.gender ? employee.gender.toUpperCase() : '';
      let min, max;
      
      if (gender === 'MALE') {
        min = param.reference_min_male !== null ? parseFloat(param.reference_min_male) : 
              (param.reference_min !== null ? parseFloat(param.reference_min) : null);
        max = param.reference_max_male !== null ? parseFloat(param.reference_max_male) : 
              (param.reference_max !== null ? parseFloat(param.reference_max) : null);
      } else if (gender === 'FEMALE') {
        min = param.reference_min_female !== null ? parseFloat(param.reference_min_female) : 
              (param.reference_min !== null ? parseFloat(param.reference_min) : null);
        max = param.reference_max_female !== null ? parseFloat(param.reference_max_female) : 
              (param.reference_max !== null ? parseFloat(param.reference_max) : null);
      } else {
        // Fallback to general ranges for unspecified gender
        min = param.reference_min !== null ? parseFloat(param.reference_min) : null;
        max = param.reference_max !== null ? parseFloat(param.reference_max) : null;
      }
  
      if (!isNaN(numValue) && min !== null && max !== null) {
        if (numValue >= min && numValue <= max) {
          status = 'Normal';
        } else {
          const range = max - min;
          const lower10 = min - range * 0.1;
          const upper10 = max + range * 0.1;
          const lower20 = min - range * 0.2;
          const upper20 = max + range * 0.2;
  
          if ((numValue >= lower10 && numValue < min) || (numValue > max && numValue <= upper10)) {
            status = 'Borderline';
          } else if ((numValue >= lower20 && numValue < lower10) || (numValue > upper10 && numValue <= upper20)) {
            status = 'Flagged';
          } else {
            status = 'Severe';
          }
        }
      }

      const categoryName = paramToCategory[param.parameter_key] || null;

  
      labParamRows.push([
        reportId,
        param.parameter_key,
        value,
        param.unit,
        param.reference_min,
        param.reference_max,
        status,
        categoryName
      ]);
    }
  }

  // Collect row number for deletion (but don't delete yet)
  deleteRowNumbers.push(employee.row_number);
    } catch (empError) {
      console.error(`Error processing employee ${employee.employee_id}:`, empError);
      throw new Error(`Failed to process employee ${employee.employee_id} (${employee.name}): ${empError.message}`);
    }
  }


// Bulk insert user_reports
  if (userReportRows.length) {
    // Validate all users exist before bulk insert
    const userIds = userReportRows.map(row => row[0]);
    const uniqueUserIds = [...new Set(userIds)];
    
    const userCheckResult = await client.query(
      `SELECT user_id FROM users WHERE user_id = ANY($1::varchar[])`,
      [uniqueUserIds]
    );
    
    const existingUserIds = new Set(userCheckResult.rows.map(r => r.user_id));
    const missingUserIds = uniqueUserIds.filter(id => !existingUserIds.has(id));
    
    if (missingUserIds.length > 0) {
      throw new Error(`Cannot create reports for non-existent users: ${missingUserIds.join(', ')}. This indicates a critical data integrity issue.`);
    }
    
    console.log(`Inserting ${userReportRows.length} user reports for users: ${uniqueUserIds.join(', ')}`);
    const valuesSql = userReportRows.map(
      (_, i) => `($${i*5+1},$${i*5+2},$${i*5+3},$${i*5+4},$${i*5+5})`
    ).join(',');
    await client.query(
      `INSERT INTO user_reports (user_id, report_id, health_score, biological_age, test_date) VALUES ${valuesSql}`,
      userReportRows.flat()
    );
  }

  // Bulk insert lab_parameters
  if (labParamRows.length) {
    // console.log('Inserting lab parameters:', labParamRows);
    const valuesSql = labParamRows.map(
      (_, i) => `($${i*8+1},$${i*8+2},$${i*8+3},$${i*8+4},$${i*8+5},$${i*8+6},$${i*8+7},$${i*8+8})`
    ).join(',');
    await client.query(
      `INSERT INTO lab_parameters (report_id, parameter_name, parameter_value, unit, reference_min, reference_max, status, category) VALUES ${valuesSql}`,
      labParamRows.flat()
    );
  }

  // Trigger demographic average calculations for the processed data
  if (labParamRows.length > 0) {
    const demographicData = [];
    for (const [key, employee] of employeeMap.entries()) {
      if (employee.parameters) {
        const age = employee.age || (employee.dob ? calculateAge(employee.dob) : null);
        if (age && employee.gender && employee.location) {
          Object.entries(employee.parameters).forEach(([paramKey, paramValue]) => {
            if (paramValue !== null && paramValue !== undefined && paramValue !== '') {
              demographicData.push({
                company_id: employee.company_id,
                location: employee.location,
                age: age,
                gender: employee.gender,
                [paramKey]: paramValue
              });
            }
          });
        }
      }
    }
    
    if (demographicData.length > 0) {
      console.log(`Queueing ${demographicData.length} records for demographic average calculation`);
      await demographicQueue.add('calculate-averages', {
        records: demographicData,
        batchId: batchId
      });
    }
  }

  // DON'T delete here - return the row numbers to be deleted later
  // This ensures we only delete after ALL chunks are processed successfully
  
  // Check for first-time users and collect email data
  for (const [key, employee] of employeeMap.entries()) {
    if (employee.email) {
      // Check if this is the user's first report
      const reportCountResult = await client.query(
        `SELECT COUNT(*) as count FROM user_reports WHERE user_id = $1`,
        [employee.employee_id]
      );
      const reportCount = parseInt(reportCountResult.rows[0].count);
      
      if (reportCount === 1) {
        // Get company name
        const companyResult = await client.query(
          `SELECT company_name FROM companies WHERE company_id = $1`,
          [employee.company_id]
        );
        const companyName = companyResult.rows[0]?.company_name || 'Your Company';
        
        emailsToSend.push({
          email: employee.email,
          firstName: employee.name.split(' ')[0] || 'User',
          companyName: companyName
        });
      }
    }
  }
  
  return {
    emailsToSend,
    deleteRowNumbers,
    processedUsers: employees.length,
    processedParameters: labParamRows.length
  };
}

async function calculateHealthScore(employee, parameterKeys) {

  console.log(`Calculating health score for parameterKeys: ${parameterKeys}`);
  const paramObj = {};
  for (const key of parameterKeys) {
    if (employee.parameters && employee.parameters[key] !== undefined) {
      paramObj[key] = employee.parameters[key];
    }
  }

  const employeeParameters = {}; 
  try {
  const paramMasterRows = await query('SELECT parameter_id, parameter_key FROM parameter_master');
    const textToKeyMap = {};
    for (const row of paramMasterRows.rows) {
      textToKeyMap[row.parameter_key] = row.parameter_id;
    }
    
    for (const [displayName, value] of Object.entries(paramObj)) {
      const key = textToKeyMap[displayName];
      if (key) {
        employeeParameters[key] = value;
      }
    }
  }catch (err) {
    console.error('Error processing employee parameters:', err);
  }

  console.log(`Parameters for health score calculation:`, employeeParameters);
  return await calculateHealthIndex(employeeParameters);
}

function applyPenaltyRules(value, rules) {
  for (const rule of rules) {
    if (rule.direction === 'above' && value > rule.range_start && value <= rule.range_end) return rule.penalty_points;
    if (rule.direction === 'below' && value < rule.range_end && value >= rule.range_start) return rule.penalty_points;
    if (rule.direction === 'range' && value >= rule.range_start && value <= rule.range_end) return rule.penalty_points;
  }
  return 0;
}

async function calculateHealthIndex(inputData) {
  let healthIndex = 1000;
  const penalties = [];
  const flags = [];

  // Fetch rules
  const penaltyRulesRes = await query('SELECT * FROM health_penalty_rules');
  const conditionRulesRes = await query('SELECT * FROM health_condition_rules');
  const safetyRulesRes = await query('SELECT * FROM health_safety_rules');

  // Group penalty rules
  const grouped = {};
  for (const rule of penaltyRulesRes.rows) {
    if (!grouped[rule.parameter_id]) grouped[rule.parameter_id] = [];
    grouped[rule.parameter_id].push(rule);
  }

  // Apply penalty rules
  for (const pid in inputData) {
    const value = inputData[pid];
    if (grouped[pid]) {
      console.log(`Applying penalty rules for ${pid} with value ${value}`);
      const points = applyPenaltyRules(value, grouped[pid]);
      if (points > 0) {
        healthIndex -= points;
        penalties.push({ parameter_id: pid, value, points });
      }
    }
  }

  // Apply condition rules
  for (const rule of conditionRulesRes.rows) {
    let conditionExpr = rule.condition.replace(/(P\d+)/g, (match) => inputData[match] ?? 'null');
    conditionExpr = conditionExpr.replace(/\bAND\b/gi, '&&').replace(/\bOR\b/gi, '||');

    if (eval(conditionExpr)) {
      healthIndex -= rule.penalty_points;
      penalties.push({ condition: rule.rule_name, points: rule.penalty_points });
    }
  }

  // Apply safety rules
  for (const rule of safetyRulesRes.rows) {
    let flagExpr = rule.condition
      .replace(/(P\d+)/g, (match) => inputData[match] ?? 'null')
      .replace(/health_index/g, healthIndex);
    flagExpr = flagExpr.replace(/\bAND\b/gi, '&&').replace(/\bOR\b/gi, '||');
    if (eval(flagExpr)) {
      flags.push(rule.action);
    }
  }

  console.log(`Health Index calculated: ${healthIndex}, Penalties: ${JSON.stringify(penalties)}, Flags: ${JSON.stringify(flags)}`);
  return healthIndex;
}

async function calculateBiologicalAge(chronologicalAge, gender, parameters, testDate) {
  // If insufficient parameters, return chronologicalAge as a number
  if (!parameters || Object.keys(parameters).length < 6) {
    return chronologicalAge;
  }
  const now = new Date();
  const testDt = new Date(testDate);
  const monthsOld = (now - testDt) / (1000 * 60 * 60 * 24 * 30);

  // If data is outdated, return chronologicalAge as a number
  if (monthsOld > 3) {
    return chronologicalAge;
  }

  console.log(`Calculating biological age for parameters: ${JSON.stringify(parameters)}`);

  const penalties = [];
  const flags = [];
  let totalPenalty = 0;

  const employeeParameters = {}; 
  try {
  const paramMasterRows = await query('SELECT parameter_id, parameter_key FROM parameter_master');
    const textToKeyMap = {};
    for (const row of paramMasterRows.rows) {
      textToKeyMap[row.parameter_key] = row.parameter_id;
    }
    // When processing an employee's parameters:
    
    for (const [displayName, value] of Object.entries(parameters)) {
      const key = textToKeyMap[displayName];
      if (key) {
        employeeParameters[key] = value;
      }
    }
  }catch (err) {
    console.error('Error processing employee parameters:', err);
  }

  console.log(`Employee parameters for biological age calculation:`, employeeParameters);

  for (const paramId in employeeParameters) {
    const value = Number(employeeParameters[paramId]);
    if (value <= 0) {
      flags.push(`SR_007: Invalid or missing value for ${paramId}`);
      continue;
    }
    // Fetch parameter reference range
    const paramRes = await query(
      `SELECT * FROM parameter_master WHERE parameter_id = $1`,
      [paramId]
    );

    if (paramRes.rows.length === 0) continue;
    const param = paramRes.rows[0];


    // Get gender-specific reference ranges
    let refMin, refMax;
    if (gender && gender.toUpperCase() === 'MALE') {
      refMin = param.reference_min_male !== null ? parseFloat(param.reference_min_male) : parseFloat(param.reference_min);
      refMax = param.reference_max_male !== null ? parseFloat(param.reference_max_male) : parseFloat(param.reference_max);
    } else if (gender && gender.toUpperCase() === 'FEMALE') {
      refMin = param.reference_min_female !== null ? parseFloat(param.reference_min_female) : parseFloat(param.reference_min);
      refMax = param.reference_max_female !== null ? parseFloat(param.reference_max_female) : parseFloat(param.reference_max);
    } else {
      // Fallback to general ranges
      refMin = parseFloat(param.reference_min);
      refMax = parseFloat(param.reference_max);
    }
    let deviationPercent = 0;
    let matchedRule = null;

    // Fetch rules
    const rulesRes = await query(
      `SELECT * FROM bio_age_rules WHERE parameter_id = $1`,
      [paramId]
    );
    const rules = rulesRes.rows;

    console.log(`rules for parameter ${paramId}:`, rules);

    for (const rule of rules) {
      if (rule.gender && rule.gender !== gender) continue;

      const { direction, range_start, range_end, penalty_years, flag_if_extreme } = rule;

      // Convert to numbers!
      const numRangeStart = Number(range_start);
      const numRangeEnd = Number(range_end);
      const numPenaltyYears = Number(penalty_years);

      let isMatch = false;

      if (direction === 'above' && value > refMax) {
        const diff = value - refMax;
        deviationPercent = (diff / refMax) * 100;
        isMatch = deviationPercent >= numRangeStart && deviationPercent <= numRangeEnd;
        // ...
      } else if (direction === 'below' && value < refMin) {
        const diff = refMin - value;
        deviationPercent = (diff / refMin) * 100;
        isMatch = deviationPercent >= numRangeStart && deviationPercent <= numRangeEnd;
        // ...
      } else if (direction === 'range') {
        isMatch = value >= numRangeStart && value <= numRangeEnd;
        // ...
      } else if (direction === 'both') {
        const deviation = value < refMin
          ? (refMin - value) / refMin * 100
          : (value - refMax) / refMax * 100;
        isMatch = deviation >= numRangeStart && deviation <= numRangeEnd;
        // ...
      }

      if (isMatch) {
        matchedRule = rule;
        if (flag_if_extreme && deviationPercent >= 200) {
          flags.push(`SR_003: ${param.parameter_key} is >200% from normal. Flag for review.`);
        }
        penalties.push({
          parameter: param.parameter_key,
          value,
          penalty: numPenaltyYears
        });
        totalPenalty += numPenaltyYears;
        break;
      }
    }
  }

  // Apply SR_001: Max cap 15 years
  if (totalPenalty > 15) {
    flags.push("SR_001: Total penalty capped at 15 years");
    totalPenalty = 15;
  }

  // Apply SR_008: Bio age ≤ Chrono + 20
  const biologicalAge = Math.min(chronologicalAge + totalPenalty, chronologicalAge + 20);

  console.log('Chronological age:', chronologicalAge);

  console.log(`Calculated biological age: ${biologicalAge}, Total penalty: ${totalPenalty}, Flags: ${JSON.stringify(flags)}`);

  // Always return a number, fallback to chronologicalAge if result is not a valid number
  return (typeof biologicalAge === 'number' && !isNaN(biologicalAge)) ? biologicalAge : chronologicalAge;
}

    async function getBatchDetails(batchId) {
      const batch = await batchRepository.getBatchById(batchId);
      if (!batch) return null;

      const parameterKeys = await batchRepository.getParameterKeys();
      parameterKeys.push('doctor_remark');

      const records = await batchRepository.getBatchRecords(batchId);

      // Group records by employee (row_number or employee_id)
      const employeeMap = new Map();

      for (const record of records) {
        const key = `${record.row_number}_${record.employee_id}`;
        if (!employeeMap.has(key)) {
          // Copy demographic fields from the first occurrence
          employeeMap.set(key, {
            employee_id: record.employee_id,
            name: record.name,
            date_of_birth: record.date_of_birth,
            gender: record.gender,
            email: record.email,
            phone: record.phone,
            test_date: record.test_date,
            company_id: record.company_id,
            row_number: record.row_number,
            validation_status: record.validation_status,
            validation_message: record.validation_message,
            parameters: {}
          });
        }
        // Add parameter to the parameters object
        if (record.parameter_name) {
          employeeMap.get(key).parameters[record.parameter_name] = record.parameter_value;
        }
      }

      // Convert map to array
      const recordsWithParams = Array.from(employeeMap.values());

      console.log(`employeeMap: ${JSON.stringify(Array.from(employeeMap.entries()))}`);

      return {
        batch,
        records: recordsWithParams,
        parameterKeys,
      };
    }

async function listRecentBatches(limit = 50) {
  return await batchRepository.getRecentBatches(limit);
}

async function rejectBatch(batchId, reason, adminEmail) {
  await batchRepository.rejectBatch(batchId, reason);
  sendEmail.sendRejectionEmail(adminEmail, batchId, reason);
  return { success: true, message: 'Batch rejected' };
}

async function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

async function deleteBatch(batchId) {
  console.log(`[DEBUG deleteBatch Service] ========== START ==========`);
  console.log(`[DEBUG deleteBatch Service] Batch ID: ${batchId}`);
  
  const client = await getClient();
  try {
    console.log(`[DEBUG deleteBatch Service] Starting transaction...`);
    await client.query('BEGIN');
    
    // First check if batch exists
    console.log(`[DEBUG deleteBatch Service] Checking if batch exists...`);
    const batchResult = await client.query(
      'SELECT batch_id, file_path, status FROM batch_uploads WHERE batch_id = $1',
      [batchId]
    );
    
    console.log(`[DEBUG deleteBatch Service] Batch query result:`, batchResult.rows);
    
    if (batchResult.rows.length === 0) {
      console.log(`[DEBUG deleteBatch Service] Batch not found in database`);
      throw new Error('Batch not found');
    }
    
    const batch = batchResult.rows[0];
    console.log(`[DEBUG deleteBatch Service] Batch found:`, batch);
    
    // Don't allow deletion of processing batches
    if (batch.status === 'processing' || batch.status === 'approved') {
      console.log(`[DEBUG deleteBatch Service] Cannot delete batch with status: ${batch.status}`);
      throw new Error('Cannot delete batch in processing or approved status');
    }
    
    // Delete the Excel file if it exists
    if (batch.file_path) {
      const fs = require('fs');
      try {
        console.log(`[DEBUG deleteBatch Service] Checking if file exists: ${batch.file_path}`);
        if (fs.existsSync(batch.file_path)) {
          console.log(`[DEBUG deleteBatch Service] File exists, deleting...`);
          fs.unlinkSync(batch.file_path);
          console.log(`[DEBUG deleteBatch Service] File deleted successfully`);
        } else {
          console.log(`[DEBUG deleteBatch Service] File does not exist on filesystem`);
        }
      } catch (fileError) {
        console.error(`[DEBUG deleteBatch Service] Error deleting file:`, fileError);
      }
    } else {
      console.log(`[DEBUG deleteBatch Service] No file_path stored for this batch`);
    }
    
    // Delete batch records first (due to foreign key constraint)
    console.log(`[DEBUG deleteBatch Service] Deleting from batch_records...`);
    const recordsResult = await client.query('DELETE FROM batch_records WHERE batch_id = $1', [batchId]);
    console.log(`[DEBUG deleteBatch Service] Deleted ${recordsResult.rowCount} records from batch_records`);
    
    // Delete the batch upload record
    console.log(`[DEBUG deleteBatch Service] Deleting from batch_uploads...`);
    const uploadsResult = await client.query('DELETE FROM batch_uploads WHERE batch_id = $1', [batchId]);
    console.log(`[DEBUG deleteBatch Service] Deleted ${uploadsResult.rowCount} records from batch_uploads`);
    
    console.log(`[DEBUG deleteBatch Service] Committing transaction...`);
    await client.query('COMMIT');
    
    // After successful deletion, enforce the 10-record limit
    console.log(`[DEBUG deleteBatch Service] Enforcing record limit...`);
    await enforceRecordLimit();
    
    console.log(`[DEBUG deleteBatch Service] ========== END SUCCESS ==========`);
    return { deleted: true, batchId };
  } catch (error) {
    console.error(`[DEBUG deleteBatch Service] ERROR occurred:`, error);
    console.error(`[DEBUG deleteBatch Service] Error stack:`, error.stack);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getBatchExcelPath(batchId) {
  console.log(`[DEBUG getBatchExcelPath] ========== START ==========`);
  console.log(`[DEBUG getBatchExcelPath] Batch ID: ${batchId}`);
  
  try {
    const result = await query(
      'SELECT file_path FROM batch_uploads WHERE batch_id = $1',
      [batchId]
    );
    
    console.log(`[DEBUG getBatchExcelPath] Query result rows:`, result.rows.length);
    console.log(`[DEBUG getBatchExcelPath] Query result:`, result.rows);
    
    if (result.rows.length === 0) {
      console.log(`[DEBUG getBatchExcelPath] No batch found with ID: ${batchId}`);
      return null;
    }
    
    const filePath = result.rows[0].file_path;
    console.log(`[DEBUG getBatchExcelPath] File path found:`, filePath);
    console.log(`[DEBUG getBatchExcelPath] ========== END ==========`);
    
    return filePath;
  } catch (error) {
    console.error(`[DEBUG getBatchExcelPath] ERROR:`, error);
    console.error(`[DEBUG getBatchExcelPath] Error stack:`, error.stack);
    throw error;
  }
}

async function enforceRecordLimit(limit = 10) {
  const client = await getClient();
  try {
    // Get all batches ordered by created_at desc
    const batchesResult = await client.query(
      'SELECT batch_id, file_path FROM batch_uploads ORDER BY created_at DESC'
    );
    
    const batches = batchesResult.rows;
    
    // If we have more than the limit, delete the excess
    if (batches.length > limit) {
      const batchesToDelete = batches.slice(limit);
      
      for (const batch of batchesToDelete) {
        console.log(`[Auto Delete] Deleting old batch: ${batch.batch_id}`);
        
        // Delete file if exists
        if (batch.file_path) {
          const fs = require('fs');
          try {
            if (fs.existsSync(batch.file_path)) {
              fs.unlinkSync(batch.file_path);
            }
          } catch (fileError) {
            console.error(`[Auto Delete] Error deleting file: ${fileError.message}`);
          }
        }
        
        // Delete from database
        await client.query('DELETE FROM batch_records WHERE batch_id = $1', [batch.batch_id]);
        await client.query('DELETE FROM batch_uploads WHERE batch_id = $1', [batch.batch_id]);
      }
      
      console.log(`[Auto Delete] Deleted ${batchesToDelete.length} old batches`);
    }
  } catch (error) {
    console.error('[Auto Delete] Error enforcing record limit:', error);
  } finally {
    client.release();
  }
}

module.exports = {
  approveBatch,
  processBatch,
  listRecentBatches,
  getBatchDetails,
  rejectBatch,
  updateBatchStatusWithError,
  validateBatchData,
  deleteBatch,
  getBatchExcelPath,
  enforceRecordLimit
};