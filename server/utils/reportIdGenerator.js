const crypto = require('crypto');

/**
 * Generates a shorter, unique report ID
 * Format: SR-YYYY-XXXX where XXXX is a random 4-character alphanumeric string
 * Example: SR-2025-A7B9
 */
function generateShortReportId() {
  const year = new Date().getFullYear();
  
  // Generate a random 4-character alphanumeric string (uppercase)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomPart = '';
  
  // Use crypto for better randomness
  const randomBytes = crypto.randomBytes(4);
  for (let i = 0; i < 4; i++) {
    randomPart += chars[randomBytes[i] % chars.length];
  }
  
  return `SR-${year}-${randomPart}`;
}

/**
 * Generates a legacy long report ID (for backwards compatibility if needed)
 * Format: SR-YYYY-{employeeId}-{timestamp}-{uuid}
 */
function generateLongReportId(employeeId) {
  const { v4: uuidv4 } = require('uuid');
  return `SR-${new Date().getFullYear()}-${employeeId}-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;
}

/**
 * Checks if a report ID already exists in the database
 * Returns true if exists, false otherwise
 */
async function reportIdExists(reportId) {
  const { query } = require('../config/database');
  
  try {
    const result = await query(
      'SELECT 1 FROM user_reports WHERE report_id = $1 LIMIT 1',
      [reportId]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking report ID existence:', error);
    throw error;
  }
}

/**
 * Generates a unique short report ID, checking for collisions
 * Will retry up to 10 times if collision detected
 */
async function generateUniqueShortReportId(maxRetries = 10) {
  for (let i = 0; i < maxRetries; i++) {
    const reportId = generateShortReportId();
    
    // Check if this ID already exists
    const exists = await reportIdExists(reportId);
    
    if (!exists) {
      return reportId;
    }
    
    console.log(`Report ID collision detected: ${reportId}, retrying...`);
  }
  
  // If we still have collisions after maxRetries, fall back to a longer format
  // This adds more entropy to avoid collisions
  const year = new Date().getFullYear();
  const randomPart = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `SR-${year}-${randomPart}`;
}

module.exports = {
  generateShortReportId,
  generateLongReportId,
  generateUniqueShortReportId,
  reportIdExists
};