const nodemailer = require('nodemailer');
const winston = require('../config/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.setupTransporter();
  }

  setupTransporter() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Verify connection
    this.transporter.verify((error, success) => {
      if (error) {
        winston.error('❌ SMTP connection failed:', error);
      } else {
        winston.info('✅ SMTP server is ready to send emails');
      }
    });
  }

  /**
   * Send email verification
   * @param {String} email - Recipient email
   * @param {String} name - Recipient name
   * @param {String} verificationUrl - Verification URL
   */
  async sendEmailVerification(email, name, verificationUrl) {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <title>Xác minh email - HostFileDrive</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #1976d2; color: white; padding: 20px; text-align: center; }
              .content { padding: 30px 20px; }
              .button { display: inline-block; background: #1976d2; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>HostFileDrive</h1>
              </div>
              <div class="content">
                  <h2>Chào ${name}!</h2>
                  <p>Cảm ơn bạn đã đăng ký tài khoản HostFileDrive. Để hoàn tất quá trình đăng ký, vui lòng xác minh email của bạn.</p>
                  <p>Nhấn vào nút bên dưới để xác minh email:</p>
                  <a href="${verificationUrl}" class="button">Xác minh Email</a>
                  <p>Hoặc copy link sau vào trình duyệt:</p>
                  <p style="word-break: break-all; color: #1976d2;">${verificationUrl}</p>
                  <p><strong>Lưu ý:</strong> Link này sẽ hết hạn sau 24 giờ.</p>
                  <p>Nếu bạn không yêu cầu xác minh này, vui lòng bỏ qua email này.</p>
              </div>
              <div class="footer">
                  <p>© 2025 HostFileDrive. Tất cả quyền được bảo lưu.</p>
                  <p>Email này được gửi tự động, vui lòng không trả lời.</p>
              </div>
          </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"HostFileDrive" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: 'Xác minh email - HostFileDrive',
      html: htmlContent
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      winston.info(`✅ Verification email sent to ${email}`);
      return result;
    } catch (error) {
      winston.error(`❌ Failed to send verification email to ${email}:`, error);
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Send password reset email
   * @param {String} email - Recipient email
   * @param {String} name - Recipient name
   * @param {String} resetUrl - Password reset URL
   */
  async sendPasswordReset(email, name, resetUrl) {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <title>Đặt lại mật khẩu - HostFileDrive</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #d32f2f; color: white; padding: 20px; text-align: center; }
              .content { padding: 30px 20px; }
              .button { display: inline-block; background: #d32f2f; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; }
              .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>HostFileDrive</h1>
              </div>
              <div class="content">
                  <h2>Chào ${name}!</h2>
                  <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
                  <div class="warning">
                      <strong>⚠️ Lưu ý bảo mật:</strong>
                      <ul>
                          <li>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này</li>
                          <li>Link đặt lại chỉ có hiệu lực trong 10 phút</li>
                          <li>Không chia sẻ link này với bất kỳ ai</li>
                      </ul>
                  </div>
                  <p>Nhấn vào nút bên dưới để đặt lại mật khẩu:</p>
                  <a href="${resetUrl}" class="button">Đặt lại Mật khẩu</a>
                  <p>Hoặc copy link sau vào trình duyệt:</p>
                  <p style="word-break: break-all; color: #d32f2f;">${resetUrl}</p>
              </div>
              <div class="footer">
                  <p>© 2025 HostFileDrive. Tất cả quyền được bảo lưu.</p>
                  <p>Email này được gửi tự động, vui lòng không trả lời.</p>
              </div>
          </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"HostFileDrive" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: 'Đặt lại mật khẩu - HostFileDrive',
      html: htmlContent
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      winston.info(`✅ Password reset email sent to ${email}`);
      return result;
    } catch (error) {
      winston.error(`❌ Failed to send password reset email to ${email}:`, error);
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Send file share notification
   * @param {String} email - Recipient email
   * @param {String} sharer - Name of person sharing
   * @param {String} fileName - Name of shared file
   * @param {String} shareUrl - Share URL
   * @param {String} message - Optional message
   */
  async sendFileShareNotification(email, sharer, fileName, shareUrl, message = '') {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <title>File được chia sẻ - HostFileDrive</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #4caf50; color: white; padding: 20px; text-align: center; }
              .content { padding: 30px 20px; }
              .button { display: inline-block; background: #4caf50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; }
              .file-info { background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0; }
              .message-box { background: #e3f2fd; border: 1px solid #2196f3; padding: 15px; border-radius: 5px; margin: 15px 0; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>📁 HostFileDrive</h1>
              </div>
              <div class="content">
                  <h2>File được chia sẻ với bạn!</h2>
                  <p><strong>${sharer}</strong> đã chia sẻ một file với bạn qua HostFileDrive.</p>
                  
                  <div class="file-info">
                      <h3>📄 ${fileName}</h3>
                  </div>
                  
                  ${message ? `
                  <div class="message-box">
                      <h4>💬 Tin nhắn từ ${sharer}:</h4>
                      <p>"${message}"</p>
                  </div>
                  ` : ''}
                  
                  <p>Nhấn vào nút bên dưới để xem file:</p>
                  <a href="${shareUrl}" class="button">Xem File</a>
                  
                  <p>Hoặc copy link sau vào trình duyệt:</p>
                  <p style="word-break: break-all; color: #4caf50;">${shareUrl}</p>
              </div>
              <div class="footer">
                  <p>© 2025 HostFileDrive. Tất cả quyền được bảo lưu.</p>
                  <p>Email này được gửi tự động, vui lòng không trả lời.</p>
              </div>
          </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"HostFileDrive" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: `${sharer} đã chia sẻ "${fileName}" với bạn`,
      html: htmlContent
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      winston.info(`✅ File share notification sent to ${email}`);
      return result;
    } catch (error) {
      winston.error(`❌ Failed to send file share notification to ${email}:`, error);
      throw new Error('Failed to send file share notification');
    }
  }

  /**
   * Send welcome email
   * @param {String} email - Recipient email
   * @param {String} name - Recipient name
   */
  async sendWelcomeEmail(email, name) {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <title>Chào mừng đến với HostFileDrive</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #1976d2, #42a5f5); color: white; padding: 30px; text-align: center; }
              .content { padding: 30px 20px; }
              .feature { display: flex; align-items: center; margin: 15px 0; }
              .feature-icon { font-size: 24px; margin-right: 15px; }
              .button { display: inline-block; background: #1976d2; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>🎉 Chào mừng đến với HostFileDrive!</h1>
              </div>
              <div class="content">
                  <h2>Xin chào ${name}!</h2>
                  <p>Chúc mừng bạn đã trở thành thành viên của HostFileDrive - nền tảng lưu trữ và chia sẻ file hàng đầu!</p>
                  
                  <h3>🚀 Tính năng nổi bật:</h3>
                  <div class="feature">
                      <span class="feature-icon">☁️</span>
                      <div>
                          <strong>Lưu trữ đám mây:</strong> 
                          Upload và lưu trữ files an toàn trên Google Drive
                      </div>
                  </div>
                  <div class="feature">
                      <span class="feature-icon">🎬</span>
                      <div>
                          <strong>Stream video:</strong> 
                          Xem video trực tiếp với công nghệ HLS
                      </div>
                  </div>
                  <div class="feature">
                      <span class="feature-icon">🤝</span>
                      <div>
                          <strong>Chia sẻ dễ dàng:</strong> 
                          Chia sẻ files với bạn bè và đồng nghiệp
                      </div>
                  </div>
                  <div class="feature">
                      <span class="feature-icon">🔐</span>
                      <div>
                          <strong>Bảo mật cao:</strong> 
                          Mã hóa dữ liệu và xác thực 2 bước
                      </div>
                  </div>
                  
                  <p>Bắt đầu sử dụng ngay hôm nay:</p>
                  <a href="${process.env.FRONTEND_URL}" class="button">Truy cập HostFileDrive</a>
                  
                  <p>Nếu bạn cần hỗ trợ, đừng ngần ngại liên hệ với chúng tôi!</p>
              </div>
              <div class="footer">
                  <p>© 2025 HostFileDrive. Tất cả quyền được bảo lưu.</p>
                  <p>Email này được gửi tự động, vui lòng không trả lời.</p>
              </div>
          </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"HostFileDrive" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: 'Chào mừng đến với HostFileDrive! 🎉',
      html: htmlContent
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      winston.info(`✅ Welcome email sent to ${email}`);
      return result;
    } catch (error) {
      winston.error(`❌ Failed to send welcome email to ${email}:`, error);
      throw new Error('Failed to send welcome email');
    }
  }

  /**
   * Send security alert email
   * @param {String} email - Recipient email
   * @param {String} name - Recipient name
   * @param {String} alertType - Type of security alert
   * @param {Object} details - Alert details
   */
  async sendSecurityAlert(email, name, alertType, details = {}) {
    const alertTypes = {
      'new_login': {
        title: 'Đăng nhập từ thiết bị mới',
        icon: '🔐',
        message: `Có một đăng nhập mới vào tài khoản của bạn từ ${details.device || 'thiết bị không xác định'}.`
      },
      'password_changed': {
        title: 'Mật khẩu đã được thay đổi',
        icon: '🔑',
        message: 'Mật khẩu tài khoản của bạn đã được thay đổi thành công.'
      },
      '2fa_enabled': {
        title: 'Xác thực 2 bước đã được bật',
        icon: '🛡️',
        message: 'Xác thực 2 bước đã được kích hoạt cho tài khoản của bạn.'
      },
      'suspicious_activity': {
        title: 'Phát hiện hoạt động đáng nghi',
        icon: '⚠️',
        message: 'Chúng tôi phát hiện hoạt động bất thường trên tài khoản của bạn.'
      }
    };

    const alert = alertTypes[alertType] || alertTypes['suspicious_activity'];

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <title>Cảnh báo bảo mật - HostFileDrive</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #ff9800; color: white; padding: 20px; text-align: center; }
              .content { padding: 30px 20px; }
              .alert-box { background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 5px; margin: 20px 0; }
              .details { background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0; }
              .button { display: inline-block; background: #ff9800; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>${alert.icon} Cảnh báo Bảo mật</h1>
              </div>
              <div class="content">
                  <h2>Chào ${name}!</h2>
                  
                  <div class="alert-box">
                      <h3>${alert.title}</h3>
                      <p>${alert.message}</p>
                  </div>
                  
                  ${details.timestamp ? `
                  <div class="details">
                      <h4>Chi tiết:</h4>
                      <ul>
                          <li><strong>Thời gian:</strong> ${details.timestamp}</li>
                          ${details.ip ? `<li><strong>IP:</strong> ${details.ip}</li>` : ''}
                          ${details.location ? `<li><strong>Vị trí:</strong> ${details.location}</li>` : ''}
                          ${details.device ? `<li><strong>Thiết bị:</strong> ${details.device}</li>` : ''}
                      </ul>
                  </div>
                  ` : ''}
                  
                  <p><strong>Nếu đây không phải là bạn:</strong></p>
                  <ul>
                      <li>Đổi mật khẩu ngay lập tức</li>
                      <li>Kiểm tra các thiết bị đã đăng nhập</li>
                      <li>Bật xác thực 2 bước nếu chưa có</li>
                      <li>Liên hệ hỗ trợ nếu cần thiết</li>
                  </ul>
                  
                  <a href="${process.env.FRONTEND_URL}/settings/security" class="button">Kiểm tra Bảo mật</a>
              </div>
              <div class="footer">
                  <p>© 2025 HostFileDrive. Tất cả quyền được bảo lưu.</p>
                  <p>Email này được gửi tự động, vui lòng không trả lời.</p>
              </div>
          </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"HostFileDrive Security" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: `⚠️ Cảnh báo bảo mật - ${alert.title}`,
      html: htmlContent
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      winston.info(`✅ Security alert email sent to ${email}`);
      return result;
    } catch (error) {
      winston.error(`❌ Failed to send security alert email to ${email}:`, error);
      throw new Error('Failed to send security alert email');
    }
  }
}

module.exports = new EmailService();
