import crypto from "crypto";
import nodemailer from "nodemailer";
import { db } from "./db";
import { platformSettings } from "@shared/schema";
import { eq } from "drizzle-orm";

export function getAppBaseUrl(): string {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/+$/, "");
  }
  if (process.env.REPLIT_DOMAINS) {
    const domains = process.env.REPLIT_DOMAINS.split(",");
    return `https://${domains[0]}`;
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  return "http://localhost:5000";
}

interface EmailConfig {
  provider: string;
  apiKey?: string;
  fromEmail: string;
  fromName: string;
  smtpUser?: string;
  smtpPass?: string;
  smtpHost?: string;
  smtpPort?: number;
}

async function getEmailConfig(): Promise<EmailConfig | null> {
  try {
    const [configRow] = await db.select().from(platformSettings).where(eq(platformSettings.key, "email_config"));
    if (!configRow) return null;
    const config = JSON.parse(configRow.value);
    if (!config.provider) return null;

    if (config.provider === "gmail") {
      if (!config.smtpUser || !config.smtpPass) return null;
      return {
        provider: "gmail",
        smtpUser: config.smtpUser,
        smtpPass: config.smtpPass,
        fromEmail: config.fromAddress || config.smtpUser,
        fromName: config.fromName || "NIS2 Platform",
      };
    }

    if (config.provider === "smtp") {
      if (!config.smtpHost || !config.smtpUser || !config.smtpPass) return null;
      return {
        provider: "smtp",
        smtpHost: config.smtpHost,
        smtpPort: config.smtpPort || 587,
        smtpUser: config.smtpUser,
        smtpPass: config.smtpPass,
        fromEmail: config.fromAddress || config.smtpUser,
        fromName: config.fromName || "NIS2 Platform",
      };
    }

    if (!config.apiKey || !config.fromAddress) return null;
    return {
      provider: config.provider,
      apiKey: config.apiKey,
      fromEmail: config.fromAddress,
      fromName: config.fromName || "NIS2 Platform",
    };
  } catch {
    return null;
  }
}

async function sendViaSMTP(
  config: EmailConfig,
  toEmail: string,
  subject: string,
  htmlBody: string,
): Promise<boolean> {
  const transportConfig: any = config.provider === "gmail"
    ? {
        service: "gmail",
        auth: { user: config.smtpUser, pass: config.smtpPass },
      }
    : {
        host: config.smtpHost,
        port: config.smtpPort || 587,
        secure: config.smtpPort === 465,
        auth: { user: config.smtpUser, pass: config.smtpPass },
      };

  const transporter = nodemailer.createTransport(transportConfig);
  await transporter.sendMail({
    from: `"${config.fromName}" <${config.fromEmail}>`,
    to: toEmail,
    subject,
    html: htmlBody,
  });
  return true;
}

async function sendViaAPI(
  config: EmailConfig,
  toEmail: string,
  subject: string,
  htmlBody: string,
): Promise<boolean> {
  if (config.provider === "sendgrid") {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: toEmail }] }],
        from: { email: config.fromEmail, name: config.fromName },
        subject,
        content: [{ type: "text/html", value: htmlBody }],
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      console.error(`[Email] SendGrid error: ${response.status} ${text}`);
      return false;
    }
    return true;
  } else if (config.provider === "resend") {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${config.fromName} <${config.fromEmail}>`,
        to: [toEmail],
        subject,
        html: htmlBody,
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      console.error(`[Email] Resend error: ${response.status} ${text}`);
      return false;
    }
    return true;
  }
  return false;
}

export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function getVerificationExpiry(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24);
  return expiry;
}

export async function sendVerificationEmail(
  toEmail: string,
  fullName: string,
  token: string,
): Promise<boolean> {
  const config = await getEmailConfig();
  if (!config) {
    console.log(`[Email] No email config found. Verification link for ${toEmail}: /verify-email?token=${token}`);
    return false;
  }

  const baseUrl = getAppBaseUrl();
  const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1a1a1a;">Verify your email address</h2>
      <p>Hello ${fullName},</p>
      <p>Thank you for registering on the NIS2 Readiness Platform. Please verify your email address by clicking the button below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verifyUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
          Verify Email Address
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">This link expires in 24 hours. If you did not register, you can safely ignore this email.</p>
      <p style="color: #666; font-size: 12px;">If the button doesn't work, copy and paste this URL into your browser:<br/>${verifyUrl}</p>
    </div>
  `;

  try {
    if (config.provider === "gmail" || config.provider === "smtp") {
      return await sendViaSMTP(config, toEmail, "Verify your email - NIS2 Platform", htmlBody);
    }
    return await sendViaAPI(config, toEmail, "Verify your email - NIS2 Platform", htmlBody);
  } catch (err) {
    console.error(`[Email] Send error:`, err);
    return false;
  }
}

export async function sendPasswordResetEmail(
  toEmail: string,
  fullName: string,
  token: string,
): Promise<boolean> {
  const config = await getEmailConfig();
  if (!config) {
    console.log(`[Email] No email config found. Password reset link for ${toEmail}: /reset-password?token=${token}`);
    return false;
  }

  const baseUrl = getAppBaseUrl();
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1a1a1a;">Reset your password</h2>
      <p>Hello ${fullName},</p>
      <p>We received a request to reset your password on the NIS2 Readiness Platform. Click the button below to set a new password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
          Reset Password
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
      <p style="color: #666; font-size: 12px;">If the button doesn't work, copy and paste this URL into your browser:<br/>${resetUrl}</p>
    </div>
  `;

  try {
    if (config.provider === "gmail" || config.provider === "smtp") {
      return await sendViaSMTP(config, toEmail, "Reset your password - NIS2 Platform", htmlBody);
    }
    return await sendViaAPI(config, toEmail, "Reset your password - NIS2 Platform", htmlBody);
  } catch (err) {
    console.error(`[Email] Send error:`, err);
    return false;
  }
}

export async function sendGenericEmail(
  toEmail: string,
  subject: string,
  htmlBody: string,
): Promise<boolean> {
  const config = await getEmailConfig();
  if (!config) {
    console.log(`[Email] No email config found. Skipping email to ${toEmail}: ${subject}`);
    return false;
  }

  try {
    if (config.provider === "gmail" || config.provider === "smtp") {
      return await sendViaSMTP(config, toEmail, subject, htmlBody);
    }
    return await sendViaAPI(config, toEmail, subject, htmlBody);
  } catch (err) {
    console.error(`[Email] Send error:`, err);
  }
  return false;
}
