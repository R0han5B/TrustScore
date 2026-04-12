import nodemailer from 'nodemailer';

function getEmailConfig() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;
  const from = process.env.EMAIL_FROM || 'TrustScore Platform';

  if (!user || !pass) {
    return null;
  }

  return {
    user,
    pass,
    from,
  };
}

export async function sendOtpEmail(email: string, otp: string, name?: string) {
  const config = getEmailConfig();

  if (!config) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Gmail email OTP is not configured. Falling back to console OTP in development.');
      return { delivered: false, skipped: true };
    }

    throw new Error('Email OTP is not configured. Set EMAIL_USER, EMAIL_PASSWORD, and optionally EMAIL_FROM.');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  const greeting = name ? `Hi ${name},` : 'Hi,';

  await transporter.sendMail({
    from: config.from.includes('<') ? config.from : `"${config.from}" <${config.user}>`,
    to: email,
    subject: 'Your TrustScore login OTP',
    text: `${greeting}\n\nYour TrustScore OTP is ${otp}. It will expire in 10 minutes.\n\nIf you did not request this, you can ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #0f172a;">
        <h2 style="margin-bottom: 8px;">TrustScore Login OTP</h2>
        <p style="margin: 0 0 16px;">${greeting}</p>
        <p style="margin: 0 0 16px;">Use this OTP to sign in to your TrustScore account:</p>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; padding: 16px 20px; border-radius: 12px; background: #f1f5f9; display: inline-block;">
          ${otp}
        </div>
        <p style="margin: 16px 0 0;">This OTP expires in 10 minutes.</p>
        <p style="margin: 16px 0 0; color: #475569;">If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  });

  return { delivered: true, skipped: false };
}
