import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileSpreadsheet, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  AlertCircle,
  Download,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import axios from 'axios';

const BatchManagement = () => {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchDetails, setBatchDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [selectedErrorDetails, setSelectedErrorDetails] = useState(null);
  const admin = JSON.parse(localStorage.getItem('adminUser') || '{}');
  const isSuperAdmin = admin.role === 'superadmin';

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/batches', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBatches(response.data);
    } catch (error) {
      console.error('Error fetching batches:', error);
      alert('Failed to fetch batches');
    } finally {
      setLoading(false);
    }
  };

  const fetchBatchDetails = async (batchId) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`/api/admin/batches/${batchId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBatchDetails(response.data);
      setSelectedBatch(batchId);
    } catch (error) {
      console.error('Error fetching batch details:', error);
      alert('Failed to fetch batch details');
    }
  };

  const handleApprove = async (batchId) => {
    if (!window.confirm('Are you sure you want to approve this batch? This will create user accounts and generate reports.')) {
      return;
    }

    try {
      setProcessing(true);
      const token = localStorage.getItem('adminToken');
      const response = await axios.post(`/api/admin/batches/${batchId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert(response.data.message || 'Batch approved successfully');
      fetchBatches();
      setSelectedBatch(null);
      setBatchDetails(null);
    } catch (error) {
      console.error('Error approving batch:', error);
      alert('Failed to approve batch');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (batchId) => {
    const reason = window.prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      setProcessing(true);
      const token = localStorage.getItem('adminToken');
      await axios.post(`/api/admin/batches/${batchId}/reject`, { reason }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Batch rejected successfully');
      fetchBatches();
      setSelectedBatch(null);
      setBatchDetails(null);
    } catch (error) {
      console.error('Error rejecting batch:', error);
      alert('Failed to reject batch');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (batchId) => {
    if (!window.confirm('Are you sure you want to delete this batch? This action cannot be undone.')) {
      return;
    }

    try {
      setProcessing(true);
      const token = localStorage.getItem('adminToken');
      await axios.delete(`/api/admin/batches/${batchId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Batch deleted successfully');
      fetchBatches();
      setSelectedBatch(null);
      setBatchDetails(null);
    } catch (error) {
      console.error('Error deleting batch:', error);
      alert('Failed to delete batch');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = async (batchId) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`/api/admin/batches/${batchId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `batch_${batchId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading batch:', error);
      if (error.response?.status === 404) {
        alert('Excel file not available for this batch');
      } else {
        alert('Failed to download batch Excel file');
      }
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      uploaded: { color: 'bg-gray-100 text-gray-800', icon: Clock },
      validated: { color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
      approved: { color: 'bg-blue-100 text-[#174798]', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle },
      failed: { color: 'bg-red-100 text-red-800', icon: AlertTriangle },
      processing: { color: 'bg-yellow-100 text-yellow-800', icon: RefreshCw },
      completed: { color: 'bg-blue-100 text-[#174798]', icon: CheckCircle }
    };

    const config = statusConfig[status] || statusConfig.uploaded;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Batch Management</h2>
        <p className="text-gray-600">Review and approve uploaded health data batches</p>
      </div>

      {/* Batch List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto" style={{ maxHeight: '600px', overflowY: 'auto' }}>
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Batch
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Company
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  File
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  By
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                  Rec
                </th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                    Loading batches...
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                    No batches found
                  </td>
                </tr>
              ) : (
                batches.map((batch) => (
                  <tr key={batch.batch_id} className="hover:bg-gray-50">
                    <td className="px-2 py-1 text-xs font-medium text-gray-900">
                      <div className="truncate max-w-[80px]" title={batch.batch_id}>
                        {batch.batch_id.replace('BATCH_', '').substring(0, 12)}
                      </div>
                    </td>
                    <td className="px-2 py-1 text-xs font-medium text-[#174798]">
                      <div className="truncate max-w-[70px]" title={batch.company_id || 'Not specified'}>
                        {batch.company_id || '-'}
                      </div>
                    </td>
                    <td className="px-2 py-1 text-xs text-gray-500">
                      <div className="truncate max-w-[100px]" title={batch.filename}>
                        {batch.filename.split('.')[0]}
                      </div>
                    </td>
                    <td className="px-2 py-1 text-xs text-gray-500">
                      <div className="truncate max-w-[60px]" title={batch.uploaded_by}>
                        {batch.uploaded_by.split('@')[0]}
                      </div>
                    </td>
                    <td className="px-2 py-1 text-xs text-gray-500">
                      {new Date(batch.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      <br/>
                      <span className="text-xs text-gray-400">
                        {new Date(batch.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="px-2 py-1 text-xs text-gray-500 text-center">
                      {batch.total_records}
                    </td>
                    <td className="px-2 py-1 text-center">
                      {(batch.status === 'failed' || batch.status === 'rejected') && batch.error_details ? (
                        <button
                          onClick={() => {
                            setSelectedErrorDetails(batch.error_details);
                            setShowErrorModal(true);
                          }}
                          className={`inline-flex items-center px-1 py-0.5 rounded text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity ${
                            batch.status === 'failed' ? 'bg-red-100 text-red-800 hover:bg-red-200' :
                            batch.status === 'rejected' ? 'bg-orange-100 text-orange-800 hover:bg-orange-200' :
                            ''
                          }`}
                          title="Click to view error details"
                        >
                          {batch.status.substring(0, 3).toUpperCase()}
                        </button>
                      ) : (
                        <span className={`inline-flex items-center px-1 py-0.5 rounded text-xs font-semibold ${
                          batch.status === 'validated' ? 'bg-green-100 text-green-800' :
                          batch.status === 'processed' ? 'bg-blue-100 text-blue-800' :
                          batch.status === 'failed' ? 'bg-red-100 text-red-800' :
                          batch.status === 'rejected' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {batch.status.substring(0, 3).toUpperCase()}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1 text-center">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => fetchBatchDetails(batch.batch_id)}
                          className="p-1 text-[#174798] hover:bg-[#174798] hover:text-white rounded transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDownload(batch.batch_id)}
                          className="p-1 text-green-600 hover:bg-green-600 hover:text-white rounded transition-colors"
                          title="Download Excel"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(batch.batch_id)}
                          className="p-1 text-red-600 hover:bg-red-600 hover:text-white rounded transition-colors"
                          title="Delete Batch"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Batch Details Modal */}
      {selectedBatch && batchDetails && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  Batch Details: {selectedBatch}
                </h3>
                <button
                  onClick={() => {
                    setSelectedBatch(null);
                    setBatchDetails(null);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Batch Info */}
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Company ID</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {batchDetails.records && batchDetails.records.length > 0 
                        ? batchDetails.records[0].company_id || 'Not specified'
                        : 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Uploaded By</p>
                    <p className="text-lg font-semibold text-gray-900">{batchDetails.batch.uploaded_by}</p>
                  </div>
                </div>
              </div>

              {/* Batch Summary */}
              <div className="mb-6 grid grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Total Records</p>
                  <p className="text-2xl font-bold text-gray-900">{batchDetails.batch.total_records}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Valid Records</p>
                  <p className="text-2xl font-bold text-[#174798]">{batchDetails.batch.valid_records}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Error Records</p>
                  <p className="text-2xl font-bold text-red-600">{batchDetails.batch.error_records}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Status</p>
                  <div className="mt-1">{getStatusBadge(batchDetails.batch.status)}</div>
                </div>
              </div>

              {/* Error Details */}
              {batchDetails.batch.error_details && batchDetails.batch.error_details.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Validation Errors</h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <ul className="space-y-1 text-sm text-red-700">
                      {batchDetails.batch.error_details.map((error, index) => (
                        <li key={index}>
                          Row {error.row}: {error.errors.join(', ')}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Sample Records */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">Sample Records</h4>
                {batchDetails.records.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    All parameters for this batch have been processed.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Company ID</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                          {batchDetails.parameterKeys.map((key) => (
                            <th key={key} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{key}</th>
                          ))}
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {batchDetails.records.slice(0, 10).map((record, index) => (
                          <tr key={`${record.row_number}-${record.employee_id}-${index}`} className={record.validation_status === 'error' ? 'bg-red-50' : ''}>
                            <td className="px-4 py-2 whitespace-nowrap">{record.row_number}</td>
                            <td className="px-4 py-2 whitespace-nowrap font-medium">{record.company_id || 'Not specified'}</td>
                            <td className="px-4 py-2 whitespace-nowrap">{record.employee_id}</td>
                            <td className="px-4 py-2 whitespace-nowrap">{record.name}</td>
                            {batchDetails.parameterKeys.map((key) => (
                              <td key={key} className="px-4 py-2 whitespace-nowrap">{record.parameters[key]}</td>
                            ))}
                            <td className="px-4 py-2 whitespace-nowrap">
                              <span className={`inline-flex px-2 text-xs font-semibold rounded-full ${
                                record.validation_status === 'valid' 
                                  ? 'bg-blue-100 text-[#174798]' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {record.validation_status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {batchDetails.records.length > 10 && (
                      <p className="text-sm text-gray-500 mt-2">
                        Showing first 10 of {batchDetails.records.length} records
                      </p>
                    )}
                  </div>
                )}
              </div>
              {/* <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">Sample Records</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        {batchDetails.parameterKeys.map((key) => (
                          <th key={key} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{key}</th>
                        ))}
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {batchDetails.records.slice(0, 10).map((record) => (
                        <tr key={record.id} className={record.validation_status === 'error' ? 'bg-red-50' : ''}>
                          <td className="px-4 py-2 whitespace-nowrap">{record.row_number}</td>
                          <td className="px-4 py-2 whitespace-nowrap">{record.employee_id}</td>
                          <td className="px-4 py-2 whitespace-nowrap">{record.name}</td>
                          {batchDetails.parameterKeys.map((key) => (
                            <td key={key} className="px-4 py-2 whitespace-nowrap">{record.parameters[key]}</td>
                          ))}
                          <td className="px-4 py-2 whitespace-nowrap">
                            <span className={`inline-flex px-2 text-xs font-semibold rounded-full ${
                              record.validation_status === 'valid' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {record.validation_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {batchDetails.records.length > 10 && (
                  <p className="text-sm text-gray-500 mt-2">
                    Showing first 10 of {batchDetails.records.length} records
                  </p>
                )}
              </div> */}
            </div>

            {/* Action Buttons */}
            
            {isSuperAdmin && batchDetails.batch.status === 'validated' && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                <button
                  onClick={() => handleReject(selectedBatch)}
                  disabled={processing}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4 inline mr-2" />
                  Reject Batch
                </button>
                <button
                  onClick={() => handleApprove(selectedBatch)}
                  disabled={processing}
                  className="px-4 py-2 bg-[#174798] text-white rounded-lg hover:bg-[#0f2d52] transition-colors disabled:opacity-50"
                >
                  {processing ? (
                    <>
                      <RefreshCw className="w-4 h-4 inline mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 inline mr-2" />
                      Approve & Generate Reports
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Error Details Modal */}
      {showErrorModal && selectedErrorDetails && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                  Batch Processing Error Details
                </h3>
                <button
                  onClick={() => {
                    setShowErrorModal(false);
                    setSelectedErrorDetails(null);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              {selectedErrorDetails.error && (
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Error Summary</h4>
                  <p className="text-red-600">{selectedErrorDetails.error}</p>
                  {selectedErrorDetails.timestamp && (
                    <p className="text-sm text-gray-500 mt-1">
                      Occurred at: {new Date(selectedErrorDetails.timestamp).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {selectedErrorDetails.total_errors && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    Total errors found: <span className="font-semibold">{selectedErrorDetails.total_errors}</span>
                  </p>
                </div>
              )}

              {selectedErrorDetails.details && selectedErrorDetails.details.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Detailed Errors</h4>
                  <div className="space-y-3">
                    {selectedErrorDetails.details.map((detail, index) => (
                      <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                        {detail.row_number && (
                          <div className="mb-2">
                            <span className="font-semibold">Row {detail.row_number}:</span>
                            {detail.employee_id && <span className="ml-2">Employee ID: {detail.employee_id}</span>}
                            {detail.name && <span className="ml-2">({detail.name})</span>}
                          </div>
                        )}
                        {detail.errors && detail.errors.length > 0 && (
                          <ul className="list-disc list-inside space-y-1">
                            {detail.errors.map((err, errIndex) => (
                              <li key={errIndex} className="text-sm text-red-700">
                                <span className="font-medium">{err.field}:</span> {err.error}
                                {err.value && <span className="ml-1">(Value: "{err.value}")</span>}
                              </li>
                            ))}
                          </ul>
                        )}
                        {!detail.errors && detail.field && (
                          <p className="text-sm text-red-700">
                            <span className="font-medium">{detail.field}:</span> {detail.error}
                            {detail.value && <span className="ml-1">(Value: "{detail.value}")</span>}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowErrorModal(false);
                  setSelectedErrorDetails(null);
                }}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default BatchManagement;