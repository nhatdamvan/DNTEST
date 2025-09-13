const nodemailer = require('nodemailer');

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Create email transporter (for production, configure with real email service)
const createTransporter = () => {
  
  if (process.env.EMAIL_SERVICE && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    // Remove spaces from app password for Gmail
    const password = process.env.EMAIL_PASSWORD.replace(/\s/g, '');
    
    console.log('📧 Creating email transporter with:', {
      service: process.env.EMAIL_SERVICE,
      user: process.env.EMAIL_USER,
      from: process.env.EMAIL_FROM || 'IntelliSystem <noreply@intellisystem.com>'
    });
    
    return nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: password
      }
    });
  }
  console.log('⚠️ Email service not configured');
  return null;
};

// Send OTP email
const sendOTPEmail = async (email, firstName, otpCode, language = 'en') => {
  try {
    const transporter = createTransporter();
    
    console.log('📧 Attempting to send OTP email to:', email, 'in language:', language);
    
    if (!transporter) {
      console.log(`📧 Demo Mode: OTP ${otpCode} would be sent to ${email}`);
      return false; // Indicates email service not configured
    }

    // English template
    const englishTemplate = {
      subject: 'Your IntelliSystem Verification Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verification Code</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #174798 0%, #0f2d52 100%); padding: 20px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { padding: 30px; }
            .otp-code { background-color: #f0f9ff; border: 2px solid #174798; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
            .otp-number { font-size: 32px; font-weight: bold; color: #174798; letter-spacing: 4px; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>IntelliSystem Health Report</h1>
            </div>
            <div class="content">
              <h2>Hello ${firstName},</h2>
              <p>You requested access to your health report. Please use the verification code below to continue:</p>
              
              <div class="otp-code">
                <div style="color: #374151; margin-bottom: 10px;">Your Verification Code</div>
                <div class="otp-number">${otpCode}</div>
              </div>
              
              <p><strong>This code will expire in 10 minutes.</strong></p>
              
              <p>If you didn't request this code, please ignore this email or contact your administrator.</p>
              
              <hr style="border: 1px solid #e5e7eb; margin: 30px 0;">
              
              <p style="color: #6b7280; font-size: 14px;">
                This is an automated message from IntelliSystem. Please do not reply to this email.
              </p>
            </div>
            <div class="footer">
              <p>© 2025 IntelliSystem. All rights reserved.</p>
              <p>Secure health analytics for better wellness</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Hello ${firstName},
        
        Your IntelliSystem verification code is: ${otpCode}
        
        This code will expire in 10 minutes.
        
        If you didn't request this code, please ignore this email.
        
        IntelliSystem Health Report
      `
    };

    // Vietnamese template
    const vietnameseTemplate = {
      subject: 'Mã xác thực IntelliSystem của bạn',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Mã xác thực</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #174798 0%, #0f2d52 100%); padding: 20px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { padding: 30px; }
            .otp-code { background-color: #f0f9ff; border: 2px solid #174798; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
            .otp-number { font-size: 32px; font-weight: bold; color: #174798; letter-spacing: 4px; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Báo cáo sức khỏe IntelliSystem</h1>
            </div>
            <div class="content">
              <h2>Xin chào ${firstName},</h2>
              <p>Bạn đã yêu cầu truy cập vào báo cáo sức khỏe của mình. Vui lòng sử dụng mã xác thực dưới đây để tiếp tục:</p>
              
              <div class="otp-code">
                <div style="color: #374151; margin-bottom: 10px;">Mã xác thực của bạn</div>
                <div class="otp-number">${otpCode}</div>
              </div>
              
              <p><strong>Mã này sẽ hết hạn sau 10 phút.</strong></p>
              
              <p>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này hoặc liên hệ với quản trị viên của bạn.</p>
              
              <hr style="border: 1px solid #e5e7eb; margin: 30px 0;">
              
              <p style="color: #6b7280; font-size: 14px;">
                Đây là email tự động từ IntelliSystem. Vui lòng không trả lời email này.
              </p>
            </div>
            <div class="footer">
              <p>© 2025 IntelliSystem. Tất cả các quyền được bảo lưu.</p>
              <p>Phân tích sức khỏe an toàn để có sức khỏe tốt hơn</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Xin chào ${firstName},
        
        Mã xác thực IntelliSystem của bạn là: ${otpCode}
        
        Mã này sẽ hết hạn sau 10 phút.
        
        Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.
        
        Báo cáo sức khỏe IntelliSystem
      `
    };

    // Select template based on language
    const template = language === 'vi' ? vietnameseTemplate : englishTemplate;

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"IntelliSystem Health" <noreply@intellisystem.com>',
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    };

    // Verify transporter before sending
    console.log('🔍 Verifying email transporter...');
    await transporter.verify();
    console.log('✅ Transporter verified');
    
    console.log('📤 Sending email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      otpCode: otpCode
    });
    
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    console.log('📬 Accepted recipients:', result.accepted);
    console.log('❌ Rejected recipients:', result.rejected);
    console.log('📨 SMTP Response:', result.response);
    console.log('✉️ Envelope:', JSON.stringify(result.envelope));
    return true;
    
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    console.error('❌ Error details:', error);
    // Don't throw error, just return false so OTP is still shown on screen
    return false;
  }
};

// Send welcome email (for future use)
const sendWelcomeEmail = async (email, firstName, loginLink) => {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      console.log(`📧 Demo Mode: Welcome email would be sent to ${email}`);
      return false;
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"IntelliSystem Health" <noreply@intellisystem.com>',
      to: email,
      subject: 'Welcome to IntelliSystem Health Report',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to IntelliSystem</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #174798 0%, #0f2d52 100%); padding: 20px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { padding: 30px; }
            .cta-button { display: inline-block; background-color: #174798; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏥 Welcome to IntelliSystem</h1>
            </div>
            <div class="content">
              <h2>Hello ${firstName},</h2>
              <p>Your personalized health report is ready! 🎉</p>
              
              <p>IntelliSystem provides you with:</p>
              <ul>
                <li>📊 Comprehensive health score analysis</li>
                <li>📈 Comparison with peers and benchmarks</li>
                <li>⚠️ Risk assessments and predictions</li>
                <li>📋 Personalized action plans</li>
              </ul>
              
              <div style="text-align: center;">
                <a href="${loginLink}" class="cta-button">Access Your Report</a>
              </div>
              
              <p>If you have any questions, please contact your HR administrator.</p>
            </div>
            <div class="footer">
              <p>© 2025 IntelliSystem. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent successfully:', result.messageId);
    return true;
    
  } catch (error) {
    console.error('❌ Welcome email sending failed:', error);
    return false;
  }
};

// Send approved email (for future use)
const sendApprovedEmail = async (email, processingType, batchId, records) => {

    console.log(`Batch ${batchId} processed in background by worker | $1`, {processingType});
    try {
    const transporter = createTransporter();
    if (!transporter) {
      console.log(`[BATCH APPROVED] Would send to ${email} | ${processingType}`);
      return false;
    }
    const numRecords = Array.isArray(records) ? records.length : 0;
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"IntelliSystem" <noreply@intellisystem.com>',
      to: email,
      subject: `Batch ${batchId} Processed`,
      text: `Batch ${batchId} with ${numRecords} records has been processed by the worker.`
    };
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Approved email sent:', result.messageId);
    return true;
    } catch (error) {
      console.error('❌ Approved email failed:', error);
      return false;
    }

}


const sendRejectionEmail = async (email, batchId, reason) => {

    try {
    const transporter = createTransporter();
    if (!transporter) {
      console.log(`[BATCH REJECTED] Would send to ${email} | ${reason}`);
      return false;
    }
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"IntelliSystem" <noreply@intellisystem.com>',
      to: email,
      subject: `Batch ${batchId} Rejected`,
      text: `Batch ${batchId} has been rejected for the following reason: ${reason}`
    };
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Rejection email sent:', result.messageId);
    return true;
    } catch (error) {
      console.error('❌ Reject email failed:', error);
      return false;
    }
}


const sendErrorEmail = async (email, processingType, batchID) => {
 
  try {
    console.log(`Batch ${batchID} processed in background by worker | $1`, {processingType});

    const transporter = createTransporter();
    if (!transporter) {
      console.log(`[BATCH ERROR] Would send error email to ${email}`);
      return false;
    }
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"IntelliSystem" <noreply@intellisystem.com>',
      to: email,
      subject: `Batch ${batchID} Processing Error`,
      text: `There was an error processing batch ${batchID}. Entire batch rolled back. Please review the batch and try again.`
    };
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Error email sent:', result.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error email failed:', error);
    return false;
  }
}

// Send Health Report Ready Email
const sendReportReadyEmail = async (email, firstName, companyName) => {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      console.log(`📧 Demo Mode: Report ready email would be sent to ${email}`);
      return false;
    }

    const portalLink = process.env.PORTAL_URL || 'http://13.60.66.60:3000/';
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'IntelliSystem Health Report <noreply@intellisystem.com>',
      to: email,
      subject: `Your Health Report is Ready - ${companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background-color: #174798; padding: 30px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { padding: 30px; }
            .button { display: inline-block; background-color: #174798; color: white !important; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .steps { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .steps ol { margin: 10px 0; padding-left: 20px; }
            .steps li { margin: 8px 0; color: #374151; }
            .features { margin: 20px 0; }
            .features ul { list-style: none; padding: 0; }
            .features li { padding: 8px 0; color: #374151; }
            .features li:before { content: "✓ "; color: #174798; font-weight: bold; margin-right: 8px; }
            .help-section { background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
            .footer-note { color: #6b7280; font-size: 13px; margin-top: 20px; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>IntelliSystem Health Report</h1>
            </div>
            <div class="content">
              <h2>Dear ${firstName},</h2>
              <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">
                Good news! Your personalized health report from your recent health checkup is now ready for viewing.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <h3 style="color: #374151; margin-bottom: 10px;">Access Your Report:</h3>
                <a href="${portalLink}" class="button" style="color: white !important;">View Your Health Report</a>
              </div>
              
              <div class="steps">
                <h3 style="color: #1f2937; margin-top: 0;">How to Login:</h3>
                <ol>
                  <li>Click the link above or visit <a href="${portalLink}" style="color: #174798;">${portalLink}</a></li>
                  <li>Enter your registered email address</li>
                  <li>Click "Send OTP"</li>
                  <li>Check your email for the One-Time Password (OTP)</li>
                  <li>Enter the OTP to access your report</li>
                </ol>
              </div>
              
              <div class="features">
                <h3 style="color: #1f2937;">What's Inside Your Report:</h3>
                <ul>
                  <li>Your overall health score and status</li>
                  <li>Detailed analysis of all test parameters</li>
                  <li>Comparison with peers and past results</li>
                  <li>Personalized health recommendations</li>
                  <li>Action plans for better health</li>
                </ul>
              </div>
              
              <div class="help-section">
                <h3 style="color: #1f2937; margin-top: 0;">Need Help?</h3>
                <p style="margin: 5px 0;">
                  <strong>For login issues:</strong> <a href="mailto:support@healthreport.com" style="color: #174798;">support@healthreport.com</a><br>
                  <strong>For health queries:</strong> Contact your HR team
                </p>
              </div>
              
              <p class="footer-note">
                Your health data is secure and only accessible by you. The report is best viewed on desktop or tablet for optimal experience.
              </p>
              
              <p style="font-size: 18px; color: #174798; font-weight: bold; text-align: center; margin-top: 30px;">
                Take charge of your health today!
              </p>
            </div>
            <div class="footer">
              <p>This is an automated message from IntelliSystem. Please do not reply to this email.</p>
              <p style="font-size: 12px; margin-top: 10px;">© 2024 IntelliSystem. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    // Send email
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Report ready email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('❌ Report ready email sending failed:', error);
    return false;
  }
};

module.exports = {
  generateOTP,
  sendOTPEmail,
  sendWelcomeEmail,
  sendApprovedEmail,
  sendRejectionEmail,
  sendErrorEmail,
  sendReportReadyEmail
};