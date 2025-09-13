const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { generateOTP, sendOTPEmail } = require('../utils/email');

const router = express.Router();

// Generate JWT token
const generateToken = (userId, verified = false) => {
  return jwt.sign(
    { userId, verified },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );
};

// POST /api/auth/login - Initial login with email/user_id
router.post('/login', async (req, res) => {
  try {
    const { identifier } = req.body; // Can be email or user_id
    
    if (!identifier) {
      return res.status(400).json({ error: 'Email or User ID is required' });
    }

    // Find user by email or user_id
    const userResult = await query(`
      SELECT user_id, email, first_name, last_name, first_login
      FROM users 
      WHERE email = $1 OR user_id = $1
    `, [identifier]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    
    // Generate a temporary unverified token for OTP flow
    const token = generateToken(user.user_id, false);
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        first_login: user.first_login,
        email_verified: false // Always return false to force OTP verification
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/request-otp - Request OTP for email verification (stateless, no DB storage)
router.post('/request-otp', async (req, res) => {
  try {
    const { email, language = 'en' } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const userResult = await query(`
      SELECT user_id, email, first_name 
      FROM users 
      WHERE email = $1
    `, [email]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const otpCode = generateOTP();
    const expiresAt = Math.floor(Date.now() / 1000) + 10 * 60; // 10 minutes from now (in seconds)

    // Create a stateless OTP token (JWT)
    const otpToken = jwt.sign(
      {
        email,
        otp: otpCode,
        exp: expiresAt
      },
      process.env.JWT_SECRET || 'your-secret-key'
    );

    // Send OTP email with language support
    const emailSent = await sendOTPEmail(email, user.first_name, otpCode, language);
    
    if (emailSent) {
      res.json({
        success: true,
        message: 'OTP sent to your email',
        otpToken, // Send token to client
        // Remove this in production - only for testing
        debug_otp: process.env.NODE_ENV === 'development' ? otpCode : undefined
      });
    } else {
      // For demo purposes, return OTP in response
      res.json({
        success: true,
        message: 'OTP generated (email service not configured)',
        otpToken,
        debug_otp: otpCode // This is for testing only
      });
    }

  } catch (error) {
    console.error('OTP request error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// POST /api/auth/verify-otp - Verify OTP and grant report access (stateless)
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp, otpToken } = req.body;
    
    if (!email || !otp || !otpToken) {
      return res.status(400).json({ error: 'Email, OTP, and otpToken are required' });
    }

    // Verify OTP token (stateless)
    let payload;
    try {
      payload = jwt.verify(otpToken, process.env.JWT_SECRET || 'your-secret-key');
    } catch (err) {
      return res.status(400).json({ error: 'OTP expired or invalid' });
    }

    if (payload.email !== email || payload.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP or email' });
    }

    // Get user details without permanently marking email as verified
    const userResult = await query(`
      SELECT user_id, first_name, last_name, email
      FROM users
      WHERE email = $1
    `, [email]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Update last_login timestamp
    await query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1',
      [user.user_id]
    );

    // Generate verified access token
    const token = generateToken(user.user_id, true);

    res.json({
      success: true,
      message: 'Email verified successfully',
      token,
      user: {
        user_id: user.user_id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        email_verified: true // This is for the current session only
      }
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// GET /api/auth/verify-token - Verify if token is valid
router.get('/verify-token', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Get user details
    const userResult = await query(`
      SELECT user_id, email, first_name, last_name
      FROM users 
      WHERE user_id = $1
    `, [decoded.userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    
    res.json({
      valid: true,
      user: {
        user_id: user.user_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        email_verified: decoded.verified || false // Check if token is verified
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;


// const express = require('express');
// const bcrypt = require('bcrypt');
// const jwt = require('jsonwebtoken');
// const { query } = require('../config/database');
// const { generateOTP, sendOTPEmail } = require('../utils/email');

// const router = express.Router();

// // Generate JWT token
// const generateToken = (userId) => {
//   return jwt.sign(
//     { userId },
//     process.env.JWT_SECRET || 'your-secret-key',
//     { expiresIn: '24h' }
//   );
// };

// // POST /api/auth/login - Initial login with email/user_id
// router.post('/login', async (req, res) => {
//   try {
//     const { identifier } = req.body; // Can be email or user_id
    
//     if (!identifier) {
//       return res.status(400).json({ error: 'Email or User ID is required' });
//     }

//     // Find user by email or user_id
//     const userResult = await query(`
//       SELECT user_id, email, first_name, last_name, first_login, email_verified
//       FROM users 
//       WHERE email = $1 OR user_id = $1
//     `, [identifier]);

//     if (userResult.rows.length === 0) {
//       return res.status(404).json({ error: 'User not found' });
//     }

//     const user = userResult.rows[0];
    
//     // For demo purposes, we'll allow login and show cover page
//     const token = generateToken(user.user_id);
    
//     res.json({
//       success: true,
//       message: 'Login successful',
//       token,
//       user: {
//         user_id: user.user_id,
//         email: user.email,
//         first_name: user.first_name,
//         last_name: user.last_name,
//         first_login: user.first_login,
//         email_verified: user.email_verified
//       }
//     });

//   } catch (error) {
//     console.error('Login error:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// // POST /api/auth/request-otp - Request OTP for email verification
// router.post('/request-otp', async (req, res) => {
//   try {
//     const { email } = req.body;
    
//     if (!email) {
//       return res.status(400).json({ error: 'Email is required' });
//     }

//     // Check if user exists
//     const userResult = await query(`
//       SELECT user_id, email, first_name 
//       FROM users 
//       WHERE email = $1
//     `, [email]);

//     if (userResult.rows.length === 0) {
//       return res.status(404).json({ error: 'User not found' });
//     }

//     const user = userResult.rows[0];
//     const otpCode = generateOTP();
//     const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

//     // Store OTP in database
//     await query(`
//       INSERT INTO email_verifications (user_id, email, otp_code, expires_at)
//       VALUES ($1, $2, $3, $4)
//       ON CONFLICT (user_id) 
//       DO UPDATE SET 
//         otp_code = $3, 
//         expires_at = $4, 
//         verified = false, 
//         created_at = CURRENT_TIMESTAMP
//     `, [user.user_id, email, otpCode, expiresAt]);

//     // Send OTP email (for now, we'll return it in response for testing)
//     // In production, you'd send actual email
//     const emailSent = await sendOTPEmail(email, user.first_name, otpCode);
    
//     if (emailSent) {
//       res.json({
//         success: true,
//         message: 'OTP sent to your email',
//         // Remove this in production - only for testing
//         debug_otp: process.env.NODE_ENV === 'development' ? otpCode : undefined
//       });
//     } else {
//       // For demo purposes, return OTP in response
//       res.json({
//         success: true,
//         message: 'OTP generated (email service not configured)',
//         debug_otp: otpCode // This is for testing only
//       });
//     }

//   } catch (error) {
//     console.error('OTP request error:', error);
//     res.status(500).json({ error: 'Failed to send OTP' });
//   }
// });

// // POST /api/auth/verify-otp - Verify OTP and grant report access
// router.post('/verify-otp', async (req, res) => {
//   try {
//     const { email, otp } = req.body;
    
//     if (!email || !otp) {
//       return res.status(400).json({ error: 'Email and OTP are required' });
//     }

//     // Verify OTP
//     const otpResult = await query(`
//       SELECT ev.user_id, ev.expires_at, u.first_name, u.last_name
//       FROM email_verifications ev
//       JOIN users u ON ev.user_id = u.user_id
//       WHERE ev.email = $1 AND ev.otp_code = $2 AND ev.verified = false
//     `, [email, otp]);

//     if (otpResult.rows.length === 0) {
//       return res.status(400).json({ error: 'Invalid or expired OTP' });
//     }

//     const verification = otpResult.rows[0];
    
//     // Check if OTP is expired
//     if (new Date() > new Date(verification.expires_at)) {
//       return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
//     }

//     // Mark OTP as verified
//     await query(`
//       UPDATE email_verifications 
//       SET verified = true 
//       WHERE email = $1 AND otp_code = $2
//     `, [email, otp]);

//     // Mark user email as verified
//     await query(`
//       UPDATE users 
//       SET email_verified = true 
//       WHERE user_id = $1
//     `, [verification.user_id]);

//     // Generate access token
//     const token = generateToken(verification.user_id);

//     res.json({
//       success: true,
//       message: 'Email verified successfully',
//       token,
//       user: {
//         user_id: verification.user_id,
//         first_name: verification.first_name,
//         last_name: verification.last_name,
//         email_verified: true
//       }
//     });

//   } catch (error) {
//     console.error('OTP verification error:', error);
//     res.status(500).json({ error: 'Failed to verify OTP' });
//   }
// });

// // GET /api/auth/verify-token - Verify if token is valid
// router.get('/verify-token', async (req, res) => {
//   try {
//     const token = req.headers.authorization?.replace('Bearer ', '');
    
//     if (!token) {
//       return res.status(401).json({ error: 'No token provided' });
//     }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
//     // Get user details
//     const userResult = await query(`
//       SELECT user_id, email, first_name, last_name, email_verified
//       FROM users 
//       WHERE user_id = $1
//     `, [decoded.userId]);

//     if (userResult.rows.length === 0) {
//       return res.status(404).json({ error: 'User not found' });
//     }

//     const user = userResult.rows[0];
    
//     res.json({
//       valid: true,
//       user: {
//         user_id: user.user_id,
//         email: user.email,
//         first_name: user.first_name,
//         last_name: user.last_name,
//         email_verified: user.email_verified
//       }
//     });

//   } catch (error) {
//     console.error('Token verification error:', error);
//     res.status(401).json({ error: 'Invalid token' });
//   }
// });

// module.exports = router;
