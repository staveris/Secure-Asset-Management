import crypto from "crypto";
import { db } from "./db";
import { platformSettings } from "@shared/schema";
import { eq } from "drizzle-orm";

interface EmailConfig {
  provider: string;
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

async function getEmailConfig(): Promise<EmailConfig | null> {
  try {
    const [configRow] = await db.select().from(platformSettings).where(eq(platformSettings.key, "email_config"));
    if (!configRow) return null;
    const config = JSON.parse(configRow.value);
    if (!config.provider || !config.apiKey || !config.fromAddress) return null;
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

  const baseUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : process.env.REPL_SLUG
      ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
      : "http://localhost:5000";

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
          subject: "Verify your email - NIS2 Platform",
          content: [
            { type: "text/html", value: htmlBody },
          ],
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
          subject: "Verify your email - NIS2 Platform",
          html: htmlBody,
        }),
      });
      if (!response.ok) {
        const text = await response.text();
        console.error(`[Email] Resend error: ${response.status} ${text}`);
        return false;
      }
      return true;
    } else if (config.provider === "smtp") {
      console.log(`[Email] SMTP not yet implemented. Verification link: ${verifyUrl}`);
      return false;
    }
  } catch (err) {
    console.error(`[Email] Send error:`, err);
    return false;
  }

  return false;
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
      return response.ok;
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
      return response.ok;
    }
  } catch (err) {
    console.error(`[Email] Send error:`, err);
  }
  return false;
}
