// Sentinel AI Email Security Engine (Gmail SMTP + Nodemailer)
import nodemailer from "nodemailer";

const DEFAULT_GMAIL_USER = "yashguptaofficial333@gmail.com";
const DEFAULT_GMAIL_PASS = "tvduigvvavjuraky";

export function getGmailCredentials() {
    const gmailUser = (
        process.env.GMAIL_USER ||
        process.env.GMAIL_EMAIL ||
        process.env.EMAIL_USER ||
        DEFAULT_GMAIL_USER
    )?.trim();

    const gmailPass = (
        process.env.GMAIL_APP_PASSWORD ||
        process.env.GMAIL_PASSWORD ||
        process.env.EMAIL_APP_PASSWORD ||
        DEFAULT_GMAIL_PASS
    )?.replace(/\s+/g, "");

    return { gmailUser, gmailPass };
}

function getTransporter() {
    const { gmailUser, gmailPass } = getGmailCredentials();

    if (!gmailUser || !gmailPass) {
        return null;
    }

    return nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true, // Port 465 with SSL is reliable across all serverless runtimes
        auth: {
            user: gmailUser,
            pass: gmailPass,
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 15000,
    });
}

interface Send2FAEmailParams {
    to: string;
    userName: string;
    otp: string;
    type?: "2fa" | "forget-password";
}

export async function send2FAEmail({ to, userName, otp, type = "2fa" }: Send2FAEmailParams) {
    const isReset = type === "forget-password";
    const subject = isReset
        ? `🔑 Reset your Sentinel-AI Password (Code: ${otp})`
        : `🔒 ${otp} is your Sentinel-AI verification code`;
    const heading = isReset ? "Password Reset Authorization" : "Two-Factor Security Verification";
    const description = isReset
        ? `A request was received to reset the password for your account. Use the 6-digit authorization code below along with your new password to restore access:`
        : `A sign-in attempt was detected for your account. Use the one-time verification code below to authorize access:`;

    console.log(`\n========================================`);
    console.log(`🔒 SENTINEL EMAIL DISPATCH [${type.toUpperCase()}]`);
    console.log(`To: ${userName} <${to}>`);
    console.log(`Code: ${otp}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`========================================\n`);

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${heading}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050505; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E5E7EB;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #050505; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="500" style="max-width: 500px; background-color: #0A0A0A; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.8);">
          <!-- Header -->
          <tr>
            <td style="padding: 35px 35px 20px 35px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.06);">
              <div style="font-size: 20px; font-weight: 800; letter-spacing: 2px; color: #FFFFFF; text-transform: uppercase;">
                🛡️ SENTINEL AI
              </div>
              <div style="font-size: 11px; color: #9CA3AF; letter-spacing: 1px; margin-top: 4px; text-transform: uppercase;">
                Cyber Defense Platform
              </div>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 30px 35px;">
              <h2 style="font-size: 16px; font-weight: 600; color: #FFFFFF; margin: 0 0 10px 0;">
                ${heading}
              </h2>
              <p style="font-size: 13px; color: #9CA3AF; line-height: 1.6; margin: 0 0 25px 0;">
                Hello <strong style="color: #FFFFFF;">${userName || "Operator"}</strong>, ${description}
              </p>

              <!-- OTP Code Box -->
              <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 20px; text-align: center; margin: 0 0 25px 0;">
                <span style="font-size: 32px; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-weight: 800; letter-spacing: 8px; color: #10B981; display: inline-block;">
                  ${otp}
                </span>
                <div style="font-size: 11px; color: #6EE7B7; margin-top: 6px; letter-spacing: 0.5px;">
                  VALID FOR 3 MINUTES
                </div>
              </div>

              <p style="font-size: 12px; color: #6B7280; line-height: 1.5; margin: 0 0 15px 0;">
                🔒 If you did not make this request, someone may be trying to access your Sentinel-AI account. Please reset your password immediately.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #080808; padding: 20px 35px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
              <p style="font-size: 11px; color: #4B5563; margin: 0; line-height: 1.4;">
                This is an automated security broadcast from Sentinel-AI.<br>
                Node: LAX-01 • AES-256 Encrypted Stream
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const { gmailUser } = getGmailCredentials();
    const transporter = getTransporter();

    if (!transporter || !gmailUser) {
        console.warn("⚠️ [Gmail SMTP] Gmail credentials not configured. Email logged to console only.");
        return {
            success: false,
            reason: "NO_CONFIG",
            error: "Gmail credentials not configured in process.env",
        };
    }

    try {
        const info = await transporter.sendMail({
            from: `Sentinel AI <${gmailUser}>`,
            to,
            subject,
            html: htmlContent,
        });
        console.log("✅ [Gmail SMTP] Email delivered successfully to:", to, "ID:", info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (smtpErr) {
        console.error("❌ [Gmail SMTP] Failed to send email via SMTP:", smtpErr);
        return { success: false, error: smtpErr };
    }
}
