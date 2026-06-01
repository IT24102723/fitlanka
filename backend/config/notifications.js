const nodemailer = require('nodemailer');
const twilio = require('twilio');

// ===== EMAIL =====
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('Email skipped (SMTP not configured)');
    return;
  }
  try {
    await transporter.sendMail({
      from: `"FitLanka" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html
    });
    console.log('Email sent to:', to);
  } catch (err) {
    console.error('Email error:', err.message);
  }
};

// ===== SMS =====
const sendSMS = async ({ to, message }) => {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.log('SMS skipped (Twilio not configured)');
    return;
  }
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    });
    console.log('SMS sent to:', to);
  } catch (err) {
    console.error('SMS error:', err.message);
  }
};

// ===== NOTIFICATION TEMPLATES =====

const sendRegistrationNotification = async (user) => {
  const role = user.role.charAt(0).toUpperCase() + user.role.slice(1);

  await sendEmail({
    to: user.email,
    subject: `FitLanka - Registration Received`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;">
        <div style="background:#ffc107;padding:20px;text-align:center;border-radius:10px 10px 0 0;">
          <h1 style="color:#000;margin:0;">FitLanka</h1>
        </div>
        <div style="padding:30px;border:1px solid #eee;border-radius:0 0 10px 10px;">
          <h2>Welcome to FitLanka, ${user.name}!</h2>
          <p>Your ${role.toLowerCase()} registration has been received successfully.</p>
          <p>Your profile is now pending admin approval. We will notify you once it's approved.</p>
          <hr style="margin:25px 0;">
          <p style="color:#999;font-size:12px;">FitLanka &mdash; Sri Lanka's Fitness Platform</p>
        </div>
      </div>
    `
  });

  await sendSMS({
    to: user.phone.startsWith('+') ? user.phone : '+94' + user.phone.replace(/^0/, ''),
    message: `FitLanka: Registration received ${user.name}! We'll notify you once admin approves your profile. - FitLanka Team`
  });
};

const sendApprovalNotification = async (user) => {
  const role = user.role.charAt(0).toUpperCase() + user.role.slice(1);
  const dashboardLink = user.role === 'coach'
    ? 'http://localhost:' + (process.env.PORT || 3000) + '/coach/dashboard'
    : 'http://localhost:' + (process.env.PORT || 3000) + '/member/dashboard';

  await sendEmail({
    to: user.email,
    subject: `FitLanka - Your ${role} Profile is Approved!`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;">
        <div style="background:#ffc107;padding:20px;text-align:center;border-radius:10px 10px 0 0;">
          <h1 style="color:#000;margin:0;">FitLanka</h1>
        </div>
        <div style="padding:30px;border:1px solid #eee;border-radius:0 0 10px 10px;">
          <h2>Welcome to FitLanka, ${user.name}!</h2>
          <p>Your ${role.toLowerCase()} profile has been <strong style="color:green;">approved</strong>.</p>
          <p>You can now log in and start using the platform.</p>
          <a href="${dashboardLink}" style="display:inline-block;background:#ffc107;color:#000;padding:12px 30px;border-radius:5px;text-decoration:none;font-weight:bold;margin-top:10px;">Go to Dashboard</a>
          <hr style="margin:25px 0;">
          <p style="color:#999;font-size:12px;">FitLanka &mdash; Sri Lanka's Fitness Platform</p>
        </div>
      </div>
    `
  });

  await sendSMS({
    to: user.phone.startsWith('+') ? user.phone : '+94' + user.phone.replace(/^0/, ''),
    message: `FitLanka: Your ${role.toLowerCase()} profile is APPROVED! Login to start your fitness journey. - FitLanka Team`
  });
};

const sendRejectionNotification = async (user) => {
  const role = user.role.charAt(0).toUpperCase() + user.role.slice(1);

  await sendEmail({
    to: user.email,
    subject: `FitLanka - ${role} Profile Update`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;">
        <div style="background:#dc3545;padding:20px;text-align:center;border-radius:10px 10px 0 0;">
          <h1 style="color:#fff;margin:0;">FitLanka</h1>
        </div>
        <div style="padding:30px;border:1px solid #eee;border-radius:0 0 10px 10px;">
          <h2>Hello ${user.name},</h2>
          <p>Your ${role.toLowerCase()} registration could not be approved at this time.</p>
          <p>If you believe this is a mistake, please contact our support team.</p>
          <hr style="margin:25px 0;">
          <p style="color:#999;font-size:12px;">FitLanka &mdash; Sri Lanka's Fitness Platform</p>
        </div>
      </div>
    `
  });

  await sendSMS({
    to: user.phone.startsWith('+') ? user.phone : '+94' + user.phone.replace(/^0/, ''),
    message: `FitLanka: Your ${role.toLowerCase()} profile could not be approved. Contact support for more info. - FitLanka Team`
  });
};

const sendLoginVerification = async (user) => {
  const role = user.role.charAt(0).toUpperCase() + user.role.slice(1);
  const time = new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' });

  await sendEmail({
    to: user.email,
    subject: `FitLanka - New Login Detected`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;">
        <div style="background:#ffc107;padding:20px;text-align:center;border-radius:10px 10px 0 0;">
          <h1 style="color:#000;margin:0;">FitLanka</h1>
        </div>
        <div style="padding:30px;border:1px solid #eee;border-radius:0 0 10px 10px;">
          <h2>Hi ${user.name}!</h2>
          <p>A new login was detected on your <strong>${role}</strong> account.</p>
          <p><strong>Time:</strong> ${time}</p>
          <p>If this was you, you can ignore this email. If not, contact support immediately.</p>
          <hr style="margin:25px 0;">
          <p style="color:#999;font-size:12px;">FitLanka &mdash; Sri Lanka's Fitness Platform</p>
        </div>
      </div>
    `
  });
};

module.exports = { sendRegistrationNotification, sendApprovalNotification, sendRejectionNotification, sendLoginVerification };
