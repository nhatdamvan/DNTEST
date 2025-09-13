const xlsx = require('xlsx');
const fs = require('fs');
const excelRepository = require('../repositories/excelRepository');
const { getClient, query } = require('../config/database');
const { validateBatchData } = require('./batchService');

function excelDateToISO(serial) {
  const excelEpoch = new Date(Date.UTC(1899, 11, 30));
  const days = Number(serial);
  if (isNaN(days)) return serial;
  const date = new Date(excelEpoch.getTime() + days * 86400000);
  return date.toISOString().split('T')[0];
}

/**
 * Enhanced batch upload with comprehensive validation
 * This is the main upload function used for Excel file uploads
 * Includes: company validation, duplicate checking, parameter mapping, etc.
 */
async function uploadBatch(file, admin) {
  console.log('[DEBUG-SERVICE] ========== uploadBatch (Enhanced) START ==========');
  console.log('[DEBUG-SERVICE] Timestamp:', new Date().toISOString());
  console.log('[DEBUG-SERVICE] File:', file?.originalname, 'Size:', file?.size, 'Path:', file?.path);
  console.log('[DEBUG-SERVICE] Admin:', JSON.stringify(admin));
  
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Read Excel file
    console.log('[DEBUG-SERVICE] Reading Excel file from:', file.path);
    const workbook = xlsx.readFile(file.path);
    console.log('[DEBUG-SERVICE] Sheet names:', workbook.SheetNames);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Use defval: null to include all columns, even if they're empty
    const data = xlsx.utils.sheet_to_json(worksheet, { defval: null });
    console.log('[DEBUG-SERVICE] Read', data.length, 'rows from Excel');
    if (data.length > 0) {
      console.log('[DEBUG-SERVICE] First row columns:', Object.keys(data[0]));
    }

    // Fetch parameter definitions for validation
    console.log('[DEBUG-SERVICE] Fetching parameter definitions from database...');
    const paramResult = await query(
      `SELECT parameter_key, parameter_text_mapping, unit, reference_min, reference_max, 
              reference_min_male, reference_max_male, 
              reference_min_female, reference_max_female 
       FROM parameter_master 
       ORDER BY parameter_priority, parameter_id`
    );
    const parameterMaster = paramResult.rows;
    console.log('[DEBUG-SERVICE] Found', parameterMaster.length, 'parameters in database');
    const parameterKeys = parameterMaster.map(row => row.parameter_key);
    
    // Create mapping for all valid parameter names (including text_mapping variations)
    const validParameterNames = new Set();
    parameterMaster.forEach(param => {
      validParameterNames.add(param.parameter_key);
      if (param.parameter_text_mapping) {
        const mappings = param.parameter_text_mapping.split(',').map(m => m.trim());
        mappings.forEach(mapping => validParameterNames.add(mapping));
      }
    });
    console.log('[DEBUG-SERVICE] Total valid parameter names (including mappings):', validParameterNames.size);
    
    // Debug: Check specific parameters
    const checkParams = ['CRP', 'Pulse', 'RBC Dist Width', 'White Blood Cell', 'Red Blood Cell'];
    console.log('[DEBUG-SERVICE] Checking if problem parameters are in validParameterNames:');
    checkParams.forEach(p => {
      console.log(`[DEBUG-SERVICE]   - "${p}": ${validParameterNames.has(p) ? 'YES' : 'NO'}`);
    });

    // === PHASE 1: Basic Structure Validation ===
    let basicErrors = [];
    let recordsToProcess = [];
    
    // First, collect all unique company IDs from the data
    const uniqueCompanyIds = new Set();
    data.forEach(row => {
      if (row['Company ID']) {
        uniqueCompanyIds.add(row['Company ID']);
      }
    });
    
    // Check if all company IDs exist in the database
    const invalidCompanyIds = [];
    for (const companyId of uniqueCompanyIds) {
      const companyResult = await query(
        'SELECT company_id FROM companies WHERE company_id = $1',
        [companyId]
      );
      if (companyResult.rows.length === 0) {
        invalidCompanyIds.push(companyId);
      }
    }
    
    // If there are invalid company IDs, reject the entire batch
    if (invalidCompanyIds.length > 0) {
      await client.query('ROLLBACK');
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return {
        success: false,
        message: `Upload failed: Invalid Company ID(s) detected`,
        errors: [{
          type: 'INVALID_COMPANY',
          message: `The following Company IDs do not exist in the system: ${invalidCompanyIds.join(', ')}`,
          companies: invalidCompanyIds,
          suggestion: 'Please create the company first or use a valid Company ID.'
        }]
      };
    }
    
    // Check for unknown parameter columns in the Excel file
    console.log('[DEBUG-SERVICE] ===== STARTING COLUMN VALIDATION =====');
    const knownNonParameterColumns = new Set([
      'Employee ID', 'Name', 'Date of Birth', 'Gender', 'Email', 
      'Phone', 'Test Date', 'Company ID', 'Location', "Doctor's Remark"
    ]);
    console.log('[DEBUG-SERVICE] Known non-parameter columns:', Array.from(knownNonParameterColumns));
    
    const unknownColumns = [];
    if (data.length > 0) {
      const allColumns = Object.keys(data[0]);
      console.log('[DEBUG-SERVICE] All columns from Excel:', allColumns);
      console.log('[DEBUG-SERVICE] Total valid parameter names count:', validParameterNames.size);
      console.log('[DEBUG-SERVICE] First 10 valid parameter names:', Array.from(validParameterNames).slice(0, 10));
      
      console.log('[DEBUG-SERVICE] Checking each column:');
      for (const column of allColumns) {
        const isKnownNonParam = knownNonParameterColumns.has(column);
        const isValidParam = validParameterNames.has(column);
        const isDoctorRemark = column === 'doctor_remark';
        
        console.log(`[DEBUG-SERVICE] Column "${column}":`);
        console.log(`[DEBUG-SERVICE]   - Is known non-parameter: ${isKnownNonParam}`);
        console.log(`[DEBUG-SERVICE]   - Is valid parameter: ${isValidParam}`);
        console.log(`[DEBUG-SERVICE]   - Is doctor_remark: ${isDoctorRemark}`);
        
        if (!isKnownNonParam && !isValidParam && !isDoctorRemark) {
          console.log(`[DEBUG-SERVICE]   => UNKNOWN COLUMN!`);
          unknownColumns.push(column);
        } else {
          console.log(`[DEBUG-SERVICE]   => OK`);
        }
      }
    }
    console.log('[DEBUG-SERVICE] Unknown columns found:', unknownColumns.length, unknownColumns);
    
    // If there are unknown columns, reject the entire batch
    if (unknownColumns.length > 0) {
      console.log('[DEBUG-SERVICE] VALIDATION FAILED - Unknown columns detected!');
      console.log('[DEBUG-SERVICE] Rolling back transaction...');
      await client.query('ROLLBACK');
      if (file && fs.existsSync(file.path)) {
        console.log('[DEBUG-SERVICE] Deleting uploaded file:', file.path);
        fs.unlinkSync(file.path);
      }
      
      const errorResponse = {
        success: false,
        message: `Upload failed: Unknown parameter columns detected`,
        errors: [{
          type: 'UNKNOWN_PARAMETERS',
          message: `The following columns are not recognized parameters: ${unknownColumns.join(', ')}`,
          columns: unknownColumns,
          suggestion: 'Please use exact parameter names from the template. Check parameter mappings in the system.'
        }]
      };
      
      console.log('[DEBUG-SERVICE] Returning error response:', JSON.stringify(errorResponse, null, 2));
      return errorResponse;
    }
    
    // Check for duplicate employee-parameter combinations
    console.log('[DEBUG-SERVICE] ===== CHECKING FOR DUPLICATES =====');
    const employeeParamMap = new Map();
    const duplicateErrors = [];
    
    // First pass: identify all duplicates
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2;
      const employeeId = row['Employee ID'];
      
      if (!employeeId) continue;
      
      // Check each parameter column
      for (const columnName of Object.keys(row)) {
        if (!knownNonParameterColumns.has(columnName) && 
            columnName !== 'doctor_remark' &&
            validParameterNames.has(columnName) &&
            row[columnName] !== undefined && 
            row[columnName] !== null && 
            row[columnName] !== '') {
          
          const key = `${employeeId}:::${columnName}`;
          
          if (employeeParamMap.has(key)) {
            const existing = employeeParamMap.get(key);
            duplicateErrors.push({
              employee_id: employeeId,
              employee_name: row['Name'] || 'Unknown',
              parameter: columnName,
              first_occurrence: {
                row: existing.row,
                value: existing.value
              },
              duplicate_occurrence: {
                row: rowNumber,
                value: row[columnName]
              }
            });
          } else {
            employeeParamMap.set(key, {
              row: rowNumber,
              value: row[columnName]
            });
          }
        }
      }
    }
    
    // If duplicates found, return user-friendly error
    if (duplicateErrors.length > 0) {
      console.log('[DEBUG-SERVICE] Found', duplicateErrors.length, 'duplicate entries');
      console.log('[DEBUG-SERVICE] First few duplicates:', duplicateErrors.slice(0, 3));
      
      await client.query('ROLLBACK');
      if (file && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      
      // Format error message for frontend
      const sampleDuplicates = duplicateErrors.slice(0, 5).map(dup => ({
        employee: `${dup.employee_name} (${dup.employee_id})`,
        parameter: dup.parameter,
        rows: `Row ${dup.first_occurrence.row} (${dup.first_occurrence.value}) and Row ${dup.duplicate_occurrence.row} (${dup.duplicate_occurrence.value})`
      }));
      
      const errorResponse = {
        success: false,
        message: `Upload failed: Duplicate entries found`,
        errors: [{
          type: 'DUPLICATE_ENTRIES',
          message: `Found ${duplicateErrors.length} duplicate entries. Each employee can only have one value per health parameter in a single upload.`,
          total_duplicates: duplicateErrors.length,
          examples: sampleDuplicates,
          suggestion: 'Please ensure each employee has only one row of data, or if multiple test dates, upload them in separate batches.'
        }]
      };
      
      console.log('[DEBUG-SERVICE] Returning duplicate error response');
      return errorResponse;
    }
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // Excel rows start at 1, header is row 1
      
      // Handle Doctor's Remark field name
      if (row["Doctor's Remark"] !== undefined) {
        row.doctor_remark = row["Doctor's Remark"];
        delete row["Doctor's Remark"];
      }
      
      const rowErrors = [];
      
      // Check required fields
      if (!row['Employee ID']) rowErrors.push('Employee ID is required');
      if (!row['Name']) rowErrors.push('Name is required');
      if (!row['Date of Birth']) rowErrors.push('Date of Birth is required');
      if (!row['Gender']) rowErrors.push('Gender is required');
      if (!row['Email']) rowErrors.push('Email is required');
      if (!row['Test Date']) rowErrors.push('Test Date is required');
      if (!row['Company ID']) rowErrors.push('Company ID is required');
      
      // Check at least one parameter
      let hasAtLeastOneParam = false;
      for (const columnName of Object.keys(row)) {
        if (!knownNonParameterColumns.has(columnName) && 
            columnName !== 'doctor_remark' &&
            validParameterNames.has(columnName) &&
            row[columnName] !== undefined && 
            row[columnName] !== null && 
            row[columnName] !== '') {
          hasAtLeastOneParam = true;
          break;
        }
      }
      if (!hasAtLeastOneParam) {
        rowErrors.push('At least one parameter value is required');
      }
      
      if (rowErrors.length > 0) {
        basicErrors.push({
          row_number: rowNumber,
          employee_id: row['Employee ID'] || 'N/A',
          name: row['Name'] || 'N/A',
          errors: rowErrors
        });
      } else {
        // Convert dates
        let testDate = row['Test Date'];
        if (/^\d+$/.test(testDate)) testDate = excelDateToISO(testDate);
        
        let dob = row['Date of Birth'];
        if (/^\d+$/.test(dob)) dob = excelDateToISO(dob);
        
        // Create mapping from text variations to parameter keys
        const textToKeyMap = {};
        parameterMaster.forEach(param => {
          textToKeyMap[param.parameter_key] = param.parameter_key;
          if (param.parameter_text_mapping) {
            const mappings = param.parameter_text_mapping.split(',').map(m => m.trim());
            mappings.forEach(mapping => {
              textToKeyMap[mapping] = param.parameter_key;
            });
          }
        });
        
        // Create flat records for each parameter (check all columns in the row)
        for (const columnName of Object.keys(row)) {
          // Skip non-parameter columns
          if (knownNonParameterColumns.has(columnName) || columnName === 'doctor_remark') {
            continue;
          }
          
          // Get the actual parameter key for this column
          const actualParamKey = textToKeyMap[columnName];
          if (actualParamKey && row[columnName] !== undefined && row[columnName] !== null && row[columnName] !== '') {
            recordsToProcess.push({
              row_number: rowNumber - 1,
              employee_id: row['Employee ID'],
              name: row['Name'],
              date_of_birth: dob,
              gender: row['Gender'],
              email: row['Email'],
              phone: row['Phone'] || null,
              test_date: testDate,
              company_id: row['Company ID'],
              location: row['Location'] || 'Vietnam',
              parameter_name: actualParamKey,  // Use the actual parameter key, not the column name
              parameter_value: String(row[columnName]),
              validation_status: 'valid'
            });
          }
        }
        
        // Add doctor's remark if present
        if (row.doctor_remark && row.doctor_remark.trim() !== '') {
          recordsToProcess.push({
            row_number: rowNumber - 1,
            employee_id: row['Employee ID'],
            name: row['Name'],
            date_of_birth: dob,
            gender: row['Gender'],
            email: row['Email'],
            phone: row['Phone'] || null,
            test_date: testDate,
            company_id: row['Company ID'],
            location: row['Location'] || 'Vietnam',
            parameter_name: 'doctor_remark',
            parameter_value: row.doctor_remark,
            validation_status: 'valid'
          });
        }
      }
    }
    
    // If basic validation failed, return errors
    if (basicErrors.length > 0) {
      await client.query('ROLLBACK');
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      
      return {
        success: false,
        errors: basicErrors,
        validCount: 0,
        errorCount: basicErrors.length,
        totalRecords: data.length,
        status: 'validation_failed'
      };
    }
    
    // === PHASE 2: Comprehensive Parameter Validation ===
    console.log(`Validating ${recordsToProcess.length} parameter records...`);
    const parameterErrors = await validateBatchData(recordsToProcess, parameterMaster);
    
    if (parameterErrors.length > 0) {
      await client.query('ROLLBACK');
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      
      // Format errors for display
      const formattedErrors = {
        error: 'Validation failed',
        total_errors: parameterErrors.length,
        details: parameterErrors.slice(0, 100), // Limit to first 100 errors
        timestamp: new Date().toISOString()
      };
      
      return {
        success: false,
        errors: parameterErrors,
        validCount: 0,
        errorCount: parameterErrors.length,
        totalRecords: data.length,
        status: 'validation_failed',
        error_details: formattedErrors
      };
    }
    
    // === PHASE 3: All validations passed - Create batch ===
    const batchId = `BATCH_${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}_${String(Date.now()).slice(-4)}`;
    
    // Save the Excel file for later download
    const path = require('path');
    const uploadDir = path.join(__dirname, '../uploads/batch_excel');
    const fileName = `${batchId}_${file.originalname}`;
    const filePath = path.join(uploadDir, fileName);
    
    // Copy file to permanent location
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    fs.copyFileSync(file.path, filePath);
    
    // Insert batch_uploads record with 'validated' status and file_path
    await client.query(
      `INSERT INTO batch_uploads (batch_id, filename, uploaded_by, status, total_records, valid_records, error_records, file_path, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [batchId, file.originalname, admin.email, 'validated', data.length, data.length, 0, filePath]
    );
    
    // Insert all batch records
    const batchRecords = recordsToProcess.map(record => [
      batchId,
      record.row_number,
      record.employee_id,
      record.name,
      record.date_of_birth,
      record.gender,
      record.email,
      record.phone,
      record.test_date,
      record.company_id,
      record.location,
      'valid',
      '',
      record.parameter_name,
      record.parameter_value
    ]);
    
    await excelRepository.insertBatchRecordsBulk(client, batchRecords);
    
    await client.query('COMMIT');
    if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    
    // Enforce 10-record limit by deleting old batches
    const batchService = require('./batchService');
    await batchService.enforceRecordLimit(10);
    
    return {
      success: true,
      batchId,
      totalRecords: data.length,
      validRecords: data.length,
      errorRecords: 0,
      errors: [],
      status: 'validated',
      message: 'All records validated successfully. Ready for processing.'
    };
    
  } catch (error) {
    console.log('[DEBUG-SERVICE] ERROR in uploadBatch!');
    console.log('[DEBUG-SERVICE] Error type:', error.constructor.name);
    console.log('[DEBUG-SERVICE] Error message:', error.message);
    console.log('[DEBUG-SERVICE] Error stack:', error.stack);
    
    await client.query('ROLLBACK');
    if (file && fs.existsSync(file.path)) {
      console.log('[DEBUG-SERVICE] Deleting uploaded file due to error:', file.path);
      fs.unlinkSync(file.path);
    }
    
    console.error('Error in uploadBatch:', error);
    
    return {
      success: false,
      error: error.message,
      status: 'upload_failed'
    };
    
  } finally {
    console.log('[DEBUG-SERVICE] Releasing database client');
    client.release();
    console.log('[DEBUG-SERVICE] ========== uploadBatch END ==========');
  }
}

/**
 * Generate dynamic health data template based on current parameters in database
 * Used for downloading Excel template
 */
async function generateHealthDataTemplate() {
  console.log('[Excel Template] Generating dynamic template with latest parameters...');
  
  // Fetch all current parameters from parameter_master table
  const paramRows = await excelRepository.getParameterTemplateData();
  const parameterKeys = paramRows.map(row => row.parameter_key);
  
  console.log(`[Excel Template] Found ${parameterKeys.length} parameters`);

  // Build header: demographic fields + all parameter keys from database
  const wsHeader = [
    'Employee ID', 'Name', 'Date of Birth', 'Gender', 'Email', 'Phone', 'Test Date', 'Company ID', 'Location', "Doctor's Remark",
    ...parameterKeys
  ];

  // Create example row with appropriate dummy values
  const wsRow = [
    'EMP001', 'John Doe', '2000-01-01', 'Male', 'john.doe@example.com', '+84912345678', new Date().toISOString().split('T')[0], 'CUG001', 'Hanoi', 'Good health',
    ...paramRows.map(row => {
      // Use reference min as example value, or provide sensible default
      if (row.reference_min) {
        return row.reference_min;
      }
      // For parameters without reference_min, provide empty string
      return '';
    })
  ];

  // Create instructions row
  const instructions = [
    'Required', 'Required', 'YYYY-MM-DD', 'Male/Female', 'Required', 'Optional', 'YYYY-MM-DD', 'Required', 'Optional', 'Optional',
    ...paramRows.map(row => {
      if (row.unit) {
        return `Unit: ${row.unit}`;
      }
      return 'Numeric value';
    })
  ];

  // Build the worksheet data with header, instructions, and example
  const wsData = [wsHeader, instructions, wsRow];

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.aoa_to_sheet(wsData);

  // Set column widths based on content
  ws['!cols'] = wsHeader.map((header, index) => {
    // Wider columns for name, email, and doctor's remark
    if (header === 'Name' || header === 'Email' || header === "Doctor's Remark") {
      return { wch: 20 };
    }
    // Standard width for other columns
    return { wch: 15 };
  });

  // Add cell styling for better readability
  const range = xlsx.utils.decode_range(ws['!ref']);
  
  // Style header row (row 0)
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = xlsx.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellAddress]) ws[cellAddress] = {};
    ws[cellAddress].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: "E8E8E8" } }
    };
  }

  xlsx.utils.book_append_sheet(wb, ws, 'Health Data Template');
  
  // Add a metadata sheet with parameter information
  const metadataHeaders = ['Parameter Key', 'Unit', 'Reference Min', 'Reference Max', 'Description'];
  const metadataRows = [
    metadataHeaders,
    ...paramRows.map(row => [
      row.parameter_key,
      row.unit || '',
      row.reference_min || '',
      row.reference_max || '',
      `${row.reference_min || ''} - ${row.reference_max || ''} ${row.unit || ''}`
    ])
  ];
  
  const metadataWs = xlsx.utils.aoa_to_sheet(metadataRows);
  metadataWs['!cols'] = [
    { wch: 20 }, // Parameter Key
    { wch: 10 }, // Unit
    { wch: 15 }, // Reference Min
    { wch: 15 }, // Reference Max
    { wch: 30 }  // Description
  ];
  
  xlsx.utils.book_append_sheet(wb, metadataWs, 'Parameter Reference');
  
  const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  
  console.log('[Excel Template] Template generated successfully');
  return buffer;
}

/**
 * Process manually entered data (from admin portal manual entry form)
 * Used for manual data entry instead of file upload
 */
async function processManualData(manualData, admin) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Fetch parameter keys
    const parameterKeys = await excelRepository.getParameterKeys();

    // Validate rows
    let validCount = 0, errorCount = 0, errors = [];
    const emailSet = new Set();
    
    for (let i = 0; i < manualData.length; i++) {
      const row = manualData[i];
      const rowNumber = i + 2;
      const validationErrors = [];
      
      if (!row['Employee ID']) validationErrors.push({ column: 'Employee ID', message: 'Employee ID is required' });
      if (!row['Name']) validationErrors.push({ column: 'Name', message: 'Name is required' });
      if (!row['Date of Birth']) validationErrors.push({ column: 'Date of Birth', message: 'Date of Birth is required' });
      if (!row['Email']) validationErrors.push({ column: 'Email', message: 'Email is required' });
      
      // Check email uniqueness within the batch
      if (row['Email']) {
        const emailLower = row['Email'].toLowerCase();
        if (emailSet.has(emailLower)) {
          validationErrors.push({ column: 'Email', message: 'Duplicate email found in this batch' });
        }
        emailSet.add(emailLower);
      }
      
      // Check for at least one parameter
      let hasAtLeastOneParam = false;
      for (const key of parameterKeys) {
        if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
          hasAtLeastOneParam = true;
          break;
        }
      }
      if (!hasAtLeastOneParam) {
        validationErrors.push({ column: 'Parameters', message: 'At least one parameter value is required' });
      }
      
      if (validationErrors.length > 0) {
        errorCount++;
        errors.push({ row: rowNumber, errors: validationErrors });
      } else {
        validCount++;
      }
    }

    if (errors.length > 0) {
      await client.query('ROLLBACK');
      return { success: false, errors, validCount, errorCount, totalRecords: manualData.length };
    }

    // Generate batch ID
    const batchId = `MANUAL_${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}_${String(Date.now()).slice(-4)}`;
    
    // Create batch
    await excelRepository.insertBatchUpload(client, batchId, 'manual_entry.xlsx', admin.email, manualData.length);

    // Process each row
    const batchRecords = [];
    for (let i = 0; i < manualData.length; i++) {
      const row = manualData[i];
      const rowNumber = i + 1;
      
      let testDate = row['Test Date'];
      if (/^\d+$/.test(testDate)) testDate = excelDateToISO(testDate);
      
      let dob = row['Date of Birth'];
      if (/^\d+$/.test(dob)) dob = excelDateToISO(dob);

      // Insert all parameter keys as parameter rows
      for (const paramKey of parameterKeys) {
        if (row[paramKey] !== undefined && row[paramKey] !== null && row[paramKey] !== '') {
          batchRecords.push([
            batchId, rowNumber, row['Employee ID'], row['Name'], dob, row['Gender'],
            row['Email'], row['Phone'], testDate, row['Company ID'], 
            row['Location'] || 'Vietnam',
            'valid', '', // validation_status, validation_message
            paramKey, row[paramKey], 
          ]);
        }
      }

      // Insert doctor_remark as a parameter row if present
      if (row["Doctor's Remark"] && row["Doctor's Remark"].trim() !== '') {
        batchRecords.push([
          batchId, rowNumber, row['Employee ID'], row['Name'], dob, row['Gender'],
          row['Email'], row['Phone'], testDate, row['Company ID'],
          row['Location'] || 'Vietnam',
          'valid', '', // validation_status, validation_message
          "Doctor's Remark", row["Doctor's Remark"]
        ]);
      }
    }

    // Insert all batch records
    for (const record of batchRecords) {
      await excelRepository.insertBatchRecord(client, 
        ['batch_id', 'row_number', 'employee_id', 'name', 'date_of_birth', 'gender', 
         'email', 'phone', 'test_date', 'company_id', 'location', 
         'validation_status', 'validation_message', 'parameter_name', 'parameter_value'],
        record
      );
    }

    // Update batch status
    await excelRepository.updateBatchStatus(client, batchId, validCount, errorCount);

    await client.query('COMMIT');

    // Enforce 10-record limit by deleting old batches
    const batchService = require('./batchService');
    await batchService.enforceRecordLimit(10);

    return {
      success: true,
      batchId: batchId,
      totalRecords: manualData.length,
      validRecords: validCount,
      errorRecords: errorCount
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing manual data:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  uploadBatch,  // Enhanced version (previously uploadBatchEnhanced)
  generateHealthDataTemplate,
  processManualData
  // Removed: generateCustomHealthDataTemplate (unused)
  // Removed: old uploadBatch (replaced by enhanced version)
};