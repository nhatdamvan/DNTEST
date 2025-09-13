import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, X, User, Plus, Save, Trash2 } from 'lucide-react';
import axios from 'axios';

const DataUpload = ({ onUploadSuccess }) => {
  const [activeTab, setActiveTab] = useState('excel');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  
  // Manual entry states
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [availableParameters, setAvailableParameters] = useState([]);
  const [manualRows, setManualRows] = useState(
    Array(10).fill(null).map((_, index) => ({
      id: index,
      employee_id: '',
      name: '',
      date_of_birth: '',
      gender: '',
      email: '',
      phone: '',
      test_date: new Date().toISOString().split('T')[0],
      location: '',
      doctor_remark: '',
      parameters: {}
    }))
  );

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file) => {
    const validTypes = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    
    if (!validTypes.includes(file.type)) {
      alert('Please select a valid Excel file (.xls or .xlsx)');
      return;
    }
    
    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      alert('File size exceeds 50MB limit');
      return;
    }
    
    setSelectedFile(file);
    setUploadResult(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.post('/api/admin/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      
      setUploadResult(response.data);
      if (response.data.success && onUploadSuccess) {
        onUploadSuccess(response.data);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      const errorData = error.response?.data;
      setUploadResult({
        success: false,
        error: errorData?.message || errorData?.error || 'Upload failed',
        errors: errorData?.errors || []
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/download-template', {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Add timestamp to filename to indicate when template was generated
      const timestamp = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `health_data_template_${timestamp}.xlsx`);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      // Show success message
      console.log(`Template downloaded with ${availableParameters.length} parameters`);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download template. Please try again.');
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setUploadResult(null);
  };

  // Fetch companies and parameters on mount
  useEffect(() => {
    fetchCompanies();
    fetchParameterKeys();
  }, []);

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/companies', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCompanies(response.data.filter(c => c.company_id)); // Filter out empty IDs
      if (response.data.length > 0 && response.data[0].company_id) {
        setSelectedCompany(response.data[0].company_id);
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    }
  };

  const fetchParameterKeys = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/parameter-master', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Sort parameters alphabetically for better UX
      const sortedParams = response.data.sort((a, b) => 
        a.parameter_key.localeCompare(b.parameter_key)
      );
      setAvailableParameters(sortedParams);
    } catch (error) {
      console.error('Failed to fetch parameters:', error);
    }
  };

  const updateRowField = (rowIndex, field, value) => {
    const newRows = [...manualRows];
    newRows[rowIndex] = { ...newRows[rowIndex], [field]: value };
    setManualRows(newRows);
  };

  const updateRowParameter = (rowIndex, paramKey, value) => {
    const newRows = [...manualRows];
    newRows[rowIndex].parameters = {
      ...newRows[rowIndex].parameters,
      [paramKey]: value
    };
    setManualRows(newRows);
  };

  const clearRow = (rowIndex) => {
    const newRows = [...manualRows];
    newRows[rowIndex] = {
      id: rowIndex,
      employee_id: '',
      name: '',
      date_of_birth: '',
      gender: '',
      email: '',
      phone: '',
      test_date: new Date().toISOString().split('T')[0],
      location: '',
      doctor_remark: '',
      parameters: {}
    };
    setManualRows(newRows);
  };

  const validateManualData = () => {
    const errors = [];
    const emails = new Set();
    const employeeIds = new Set();
    const filledRows = manualRows.filter(row => 
      row.employee_id || row.name || row.email
    );

    if (filledRows.length === 0) {
      errors.push({ message: 'Please fill at least one row' });
      return { valid: false, errors };
    }

    filledRows.forEach((row, rowIndex) => {
      const rowErrors = [];
      const actualRowNumber = rowIndex + 1;
      
      // 1. Employee ID validation
      if (!row.employee_id || row.employee_id.trim() === '') {
        rowErrors.push('Employee ID is required');
      } else {
        if (employeeIds.has(row.employee_id.toLowerCase())) {
          rowErrors.push('Duplicate Employee ID found in this batch');
        }
        employeeIds.add(row.employee_id.toLowerCase());
      }
      
      // 2. Name validation
      if (!row.name || row.name.trim() === '') {
        rowErrors.push('Name is required');
      }
      
      // 3. Email validation
      if (!row.email || row.email.trim() === '') {
        rowErrors.push('Email is required');
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(row.email)) {
          rowErrors.push('Invalid email format');
        } else if (emails.has(row.email.toLowerCase())) {
          rowErrors.push('Duplicate email found in this batch');
        }
        emails.add(row.email.toLowerCase());
      }
      
      // 4. Phone validation
      if (row.phone && row.phone.trim() !== '') {
        const cleanPhone = row.phone.replace(/[\s\-\(\)\+]/g, '');
        if (!/^\d{6,15}$/.test(cleanPhone)) {
          rowErrors.push('Phone must be 6-15 digits');
        }
      }
      
      // 5. Date of Birth validation
      if (!row.date_of_birth) {
        rowErrors.push('Date of Birth is required');
      } else {
        const dob = new Date(row.date_of_birth);
        const now = new Date();
        const minDate = new Date('1900-01-01');
        
        if (isNaN(dob.getTime())) {
          rowErrors.push('Invalid date format for Date of Birth');
        } else if (dob > now) {
          rowErrors.push('Date of Birth cannot be in the future');
        } else if (dob < minDate) {
          rowErrors.push('Date of Birth cannot be before 1900');
        } else {
          const age = Math.floor((now - dob) / (365.25 * 24 * 60 * 60 * 1000));
          if (age > 150) {
            rowErrors.push('Age exceeds 150 years');
          }
        }
      }
      
      // 6. Gender validation - STRICT
      if (!row.gender || row.gender.trim() === '') {
        rowErrors.push('Gender is required');
      } else if (!['Male', 'Female', 'Other'].includes(row.gender)) {
        rowErrors.push('Gender must be exactly "Male", "Female", or "Other"');
      }
      
      // 7. Test Date validation
      if (!row.test_date) {
        rowErrors.push('Test Date is required');
      } else {
        const testDate = new Date(row.test_date);
        const now = new Date();
        const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        
        if (isNaN(testDate.getTime())) {
          rowErrors.push('Invalid test date format');
        } else if (testDate > now) {
          rowErrors.push('Test Date cannot be in the future');
        } else if (testDate < oneYearAgo) {
          rowErrors.push('Test Date cannot be more than 1 year old');
        }
      }
      
      // 8. Location validation
      if (row.location && row.location.length > 100) {
        rowErrors.push('Location must not exceed 100 characters');
      }
      
      // 9. Parameter validation
      const hasParameter = Object.entries(row.parameters).some(([key, val]) => val && val.trim());
      if (!hasParameter) {
        rowErrors.push('At least one parameter value is required');
      } else {
        // Validate parameter values
        Object.entries(row.parameters).forEach(([paramName, paramValue]) => {
          if (paramValue && paramValue.trim() !== '') {
            // Skip Doctor's Remark
            if (paramName === "Doctor's Remark" || paramName === 'doctor_remark') {
              return;
            }
            
            // Blood pressure validation
            // Check if it's a combined BP field (not systolic or diastolic separately)
            if ((paramName.toLowerCase() === 'blood pressure' || paramName.toLowerCase() === 'bp') &&
                !paramName.toLowerCase().includes('systolic') && 
                !paramName.toLowerCase().includes('diastolic')) {
              if (!paramValue.includes('/')) {
                rowErrors.push(`${paramName}: Must be in format "120/80"`);
              } else {
                const parts = paramValue.split('/');
                if (parts.length !== 2) {
                  rowErrors.push(`${paramName}: Invalid format, use "120/80"`);
                } else {
                  const systolic = parseFloat(parts[0].trim());
                  const diastolic = parseFloat(parts[1].trim());
                  if (isNaN(systolic) || isNaN(diastolic)) {
                    rowErrors.push(`${paramName}: Both values must be numeric`);
                  } else {
                    if (systolic < 50 || systolic > 300) {
                      rowErrors.push(`${paramName}: Systolic out of range (50-300)`);
                    }
                    if (diastolic < 30 || diastolic > 200) {
                      rowErrors.push(`${paramName}: Diastolic out of range (30-200)`);
                    }
                    if (systolic <= diastolic) {
                      rowErrors.push(`${paramName}: Systolic must be > diastolic`);
                    }
                  }
                }
              }
            } else if (paramName.toLowerCase().includes('systolic') && 
                      (paramName.toLowerCase().includes('bp') || paramName.toLowerCase().includes('blood pressure'))) {
              // Separate Systolic BP validation
              const numValue = parseFloat(paramValue);
              if (isNaN(numValue)) {
                rowErrors.push(`${paramName}: Must be numeric`);
              } else if (numValue < 50 || numValue > 300) {
                rowErrors.push(`${paramName}: Out of range (50-300)`);
              }
            } else if (paramName.toLowerCase().includes('diastolic') && 
                      (paramName.toLowerCase().includes('bp') || paramName.toLowerCase().includes('blood pressure'))) {
              // Separate Diastolic BP validation
              const numValue = parseFloat(paramValue);
              if (isNaN(numValue)) {
                rowErrors.push(`${paramName}: Must be numeric`);
              } else if (numValue < 30 || numValue > 200) {
                rowErrors.push(`${paramName}: Out of range (30-200)`);
              }
            } else {
              // Other numeric parameters
              const numValue = parseFloat(paramValue);
              if (isNaN(numValue)) {
                rowErrors.push(`${paramName}: Must be numeric`);
              } else if (numValue < 0) {
                rowErrors.push(`${paramName}: Cannot be negative`);
              } else if (numValue > 10000) {
                rowErrors.push(`${paramName}: Value too high (>10000)`);
              }
            }
          }
        });
      }
      
      if (rowErrors.length > 0) {
        errors.push({ row: actualRowNumber, errors: rowErrors });
      }
    });

    return { valid: errors.length === 0, errors };
  };

  const handleManualSubmit = async () => {
    const validation = validateManualData();
    if (!validation.valid) {
      alert('Validation errors:\n' + 
        validation.errors.map(e => 
          `Row ${e.row}: ${e.errors.join(', ')}`
        ).join('\n')
      );
      return;
    }

    const filledRows = manualRows.filter(row => 
      row.employee_id || row.name || row.email
    );

    setUploading(true);
    
    try {
      const token = localStorage.getItem('adminToken');
      const formData = new FormData();
      
      // Format data for backend
      const dataToSend = filledRows.map(row => ({
        'Employee ID': row.employee_id,
        'Name': row.name,
        'Date of Birth': row.date_of_birth,
        'Gender': row.gender,
        'Email': row.email,
        'Phone': row.phone,
        'Test Date': row.test_date,
        'Company ID': selectedCompany,
        'Location': row.location || 'Vietnam',
        "Doctor's Remark": row.doctor_remark,
        ...row.parameters
      }));

      formData.append('source', 'manual');
      formData.append('data', JSON.stringify(dataToSend));
      
      const response = await axios.post('/api/admin/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      
      setUploadResult(response.data);
      if (response.data.success) {
        // Clear the form
        setManualRows(
          Array(10).fill(null).map((_, index) => ({
            id: index,
            employee_id: '',
            name: '',
            date_of_birth: '',
            gender: '',
            email: '',
            phone: '',
            test_date: new Date().toISOString().split('T')[0],
            location: '',
            doctor_remark: '',
            parameters: {}
          }))
        );
        
        if (onUploadSuccess) {
          onUploadSuccess(response.data);
        }
      }
    } catch (error) {
      console.error('Manual entry failed:', error);
      setUploadResult({
        success: false,
        error: error.response?.data?.error || 'Manual entry failed'
      });
    } finally {
      setUploading(false);
    }
  };

  // Show all parameters with horizontal scroll
  const displayParameters = availableParameters;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Data Upload</h2>
        <p className="text-gray-600">Upload health data via Excel file or manual entry</p>
      </div>

      {/* Tab Selection */}
      <div className="flex mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('excel')}
          className={`px-6 py-2 rounded-md font-medium transition-all ${
            activeTab === 'excel' 
              ? 'bg-white text-[#174798] shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 inline-block mr-2" />
          Excel Upload
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`px-6 py-2 rounded-md font-medium transition-all ${
            activeTab === 'manual' 
              ? 'bg-white text-[#174798] shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <User className="w-4 h-4 inline-block mr-2" />
          Manual Entry
        </button>
      </div>

      {/* Excel Upload Tab */}
      {activeTab === 'excel' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {/* Download Template Button */}
            <div className="mb-6">
              <button
                onClick={handleDownloadTemplate}
                className="bg-[#174798] text-white px-4 py-2 rounded-lg hover:bg-[#0f2d52] transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Template
              </button>
              <p className="text-sm text-gray-600 mt-2">
                Download the Excel template with all required columns and parameter fields. 
                This template is dynamically generated with all current parameters from the database.
              </p>
              {availableParameters.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Template includes {availableParameters.length} health parameters
                </p>
              )}
            </div>

            {/* Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {!selectedFile ? (
                <>
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">
                    Drag and drop your Excel file here, or
                  </p>
                  <label className="cursor-pointer">
                    <span className="text-blue-600 hover:text-blue-700 font-medium">
                      browse
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".xlsx,.xls"
                      onChange={(e) => handleFileSelect(e.target.files[0])}
                    />
                  </label>
                  <p className="text-sm text-gray-500 mt-2">
                    Accepts .xlsx and .xls files up to 50MB
                  </p>
                </>
              ) : (
                <div className="flex items-center justify-center gap-4">
                  <FileSpreadsheet className="w-8 h-8 text-green-600" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={resetUpload}
                    className="ml-4 p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              )}
            </div>

            {/* Upload Button */}
            {selectedFile && !uploadResult && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload File
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Upload Result */}
            {uploadResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-6 p-4 rounded-lg ${
                  uploadResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {uploadResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`font-medium ${uploadResult.success ? 'text-green-900' : 'text-red-900'}`}>
                      {uploadResult.success ? 'Upload Successful!' : 'Upload Failed'}
                    </p>
                    {uploadResult.success ? (
                      <div className="text-sm text-green-700 mt-1">
                        <p>Batch ID: {uploadResult.batchId}</p>
                        <p>Total Records: {uploadResult.totalRecords}</p>
                        <p>Valid Records: {uploadResult.validRecords}</p>
                      </div>
                    ) : (
                      <div className="text-sm text-red-700 mt-1">
                        <p className="font-semibold">
                          {typeof uploadResult.error === 'object' 
                            ? (uploadResult.error?.message || JSON.stringify(uploadResult.error))
                            : (uploadResult.error || uploadResult.message)}
                        </p>
                        {uploadResult.errors && uploadResult.errors.length > 0 && (
                          <div className="mt-2 max-h-48 overflow-y-auto">
                            <p className="font-semibold mb-1">Validation Errors:</p>
                            {uploadResult.errors.slice(0, 10).map((err, idx) => (
                              <div key={idx} className="mb-2 text-xs bg-red-50 p-2 rounded">
                                {/* Handle special error types */}
                                {(err.type === 'UNKNOWN_PARAMETERS' || err.type === 'INVALID_COMPANY' || err.type === 'DUPLICATE_ENTRIES') ? (
                                  <div>
                                    <p className="font-medium text-red-700">{err.message}</p>
                                    {err.examples && err.examples.length > 0 && (
                                      <div className="mt-2">
                                        <p className="font-medium text-red-600">Examples:</p>
                                        <ul className="list-disc list-inside ml-2 mt-1">
                                          {err.examples.map((ex, i) => (
                                            <li key={i} className="text-gray-700">
                                              <span className="font-medium">{ex.employee}</span> - {ex.parameter}: {ex.rows}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {err.suggestion && (
                                      <p className="mt-2 text-gray-600 italic">{err.suggestion}</p>
                                    )}
                                  </div>
                                ) : (
                                  <>
                                    <p className="font-medium">Row {err.row_number} - {err.name || err.employee_id}:</p>
                                    <ul className="list-disc list-inside ml-2">
                                      {err.errors && err.errors.map((e, i) => (
                                        <li key={i}>
                                          {e.field}: {typeof e.error === 'object' 
                                            ? (e.error?.message || JSON.stringify(e.error))
                                            : e.error}
                                        </li>
                                      ))}
                                    </ul>
                                  </>
                                )}
                              </div>
                            ))}
                            {uploadResult.errors.length > 10 && (
                              <p className="text-xs mt-2">...and {uploadResult.errors.length - 10} more errors</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={resetUpload}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* Manual Entry Tab */}
      {activeTab === 'manual' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {/* Company Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company
              </label>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#174798] focus:border-transparent"
              >
                {companies.map((company) => (
                  <option key={company.company_id} value={company.company_id}>
                    {company.company_name} ({company.company_id})
                  </option>
                ))}
              </select>
            </div>

            {/* Data Entry Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-2 py-2 text-xs font-medium text-gray-700 text-left">#</th>
                    <th className="border border-gray-200 px-2 py-2 text-xs font-medium text-gray-700 text-left">Employee ID</th>
                    <th className="border border-gray-200 px-2 py-2 text-xs font-medium text-gray-700 text-left">Name</th>
                    <th className="border border-gray-200 px-2 py-2 text-xs font-medium text-gray-700 text-left">DOB</th>
                    <th className="border border-gray-200 px-2 py-2 text-xs font-medium text-gray-700 text-left">Gender</th>
                    <th className="border border-gray-200 px-2 py-2 text-xs font-medium text-gray-700 text-left">Email</th>
                    <th className="border border-gray-200 px-2 py-2 text-xs font-medium text-gray-700 text-left">Phone</th>
                    <th className="border border-gray-200 px-2 py-2 text-xs font-medium text-gray-700 text-left">Test Date</th>
                    <th className="border border-gray-200 px-2 py-2 text-xs font-medium text-gray-700 text-left">Location</th>
                    <th className="border border-gray-200 px-2 py-2 text-xs font-medium text-gray-700 text-left">Doctor's Remark</th>
                    {displayParameters.map(param => (
                      <th key={param.parameter_id} className="border border-gray-200 px-2 py-2 text-xs font-medium text-gray-700 text-left">
                        {param.parameter_key}
                      </th>
                    ))}
                    <th className="border border-gray-200 px-2 py-2 text-xs font-medium text-gray-700 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {manualRows.map((row, index) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-2 py-1 text-xs text-gray-600">{index + 1}</td>
                      <td className="border border-gray-200 px-1 py-1">
                        <input
                          type="text"
                          value={row.employee_id}
                          onChange={(e) => updateRowField(index, 'employee_id', e.target.value)}
                          className="w-full px-1 py-1 text-xs border-0 focus:ring-1 focus:ring-[#174798]"
                          placeholder="EMP001"
                        />
                      </td>
                      <td className="border border-gray-200 px-1 py-1">
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => updateRowField(index, 'name', e.target.value)}
                          className="w-full px-1 py-1 text-xs border-0 focus:ring-1 focus:ring-[#174798]"
                          placeholder="John Doe"
                        />
                      </td>
                      <td className="border border-gray-200 px-1 py-1">
                        <input
                          type="date"
                          value={row.date_of_birth}
                          onChange={(e) => updateRowField(index, 'date_of_birth', e.target.value)}
                          className="w-full px-1 py-1 text-xs border-0 focus:ring-1 focus:ring-[#174798]"
                        />
                      </td>
                      <td className="border border-gray-200 px-1 py-1">
                        <select
                          value={row.gender}
                          onChange={(e) => updateRowField(index, 'gender', e.target.value)}
                          className="w-full px-1 py-1 text-xs border-0 focus:ring-1 focus:ring-[#174798]"
                        >
                          <option value="">-</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </td>
                      <td className="border border-gray-200 px-1 py-1">
                        <input
                          type="email"
                          value={row.email}
                          onChange={(e) => updateRowField(index, 'email', e.target.value)}
                          className="w-full px-1 py-1 text-xs border-0 focus:ring-1 focus:ring-[#174798]"
                          placeholder="email@example.com"
                        />
                      </td>
                      <td className="border border-gray-200 px-1 py-1">
                        <input
                          type="text"
                          value={row.phone}
                          onChange={(e) => updateRowField(index, 'phone', e.target.value)}
                          className="w-full px-1 py-1 text-xs border-0 focus:ring-1 focus:ring-[#174798]"
                          placeholder="+84912345678"
                        />
                      </td>
                      <td className="border border-gray-200 px-1 py-1">
                        <input
                          type="date"
                          value={row.test_date}
                          onChange={(e) => updateRowField(index, 'test_date', e.target.value)}
                          className="w-full px-1 py-1 text-xs border-0 focus:ring-1 focus:ring-[#174798]"
                        />
                      </td>
                      <td className="border border-gray-200 px-1 py-1">
                        <input
                          type="text"
                          value={row.location}
                          onChange={(e) => updateRowField(index, 'location', e.target.value)}
                          className="w-full px-1 py-1 text-xs border-0 focus:ring-1 focus:ring-[#174798]"
                          placeholder="Hanoi"
                        />
                      </td>
                      <td className="border border-gray-200 px-1 py-1">
                        <input
                          type="text"
                          value={row.doctor_remark}
                          onChange={(e) => updateRowField(index, 'doctor_remark', e.target.value)}
                          className="w-full px-1 py-1 text-xs border-0 focus:ring-1 focus:ring-[#174798]"
                          placeholder="Notes"
                        />
                      </td>
                      {displayParameters.map(param => (
                        <td key={param.parameter_id} className="border border-gray-200 px-1 py-1">
                          <input
                            type="text"
                            value={row.parameters[param.parameter_key] || ''}
                            onChange={(e) => updateRowParameter(index, param.parameter_key, e.target.value)}
                            className="w-full px-1 py-1 text-xs border-0 focus:ring-1 focus:ring-[#174798]"
                            placeholder="0"
                          />
                        </td>
                      ))}
                      <td className="border border-gray-200 px-1 py-1 text-center">
                        <button
                          onClick={() => clearRow(index)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Clear row"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Note about parameters */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> All {availableParameters.length} parameters are available. Use horizontal scroll to view all columns.
                Parameter ranges will be automatically determined based on gender and parameter type.
              </p>
            </div>

            {/* Submit Button */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setManualRows(
                    Array(10).fill(null).map((_, index) => ({
                      id: index,
                      employee_id: '',
                      name: '',
                      date_of_birth: '',
                      gender: '',
                      email: '',
                      phone: '',
                      test_date: new Date().toISOString().split('T')[0],
                      location: '',
                      doctor_remark: '',
                      parameters: {}
                    }))
                  );
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={handleManualSubmit}
                disabled={uploading}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Submit Data
                  </>
                )}
              </button>
            </div>

            {/* Upload Result */}
            {uploadResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-6 p-4 rounded-lg ${
                  uploadResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {uploadResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`font-medium ${uploadResult.success ? 'text-green-900' : 'text-red-900'}`}>
                      {uploadResult.success ? 'Data Submitted Successfully!' : 'Submission Failed'}
                    </p>
                    {uploadResult.success ? (
                      <div className="text-sm text-green-700 mt-1">
                        <p>Batch ID: {uploadResult.batchId}</p>
                        <p>Records Processed: {uploadResult.totalRecords}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-red-700 mt-1">
                        {typeof uploadResult.error === 'object' 
                          ? (uploadResult.error?.message || JSON.stringify(uploadResult.error))
                          : (uploadResult.error || uploadResult.message)}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default DataUpload;