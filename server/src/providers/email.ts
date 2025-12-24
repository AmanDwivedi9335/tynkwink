import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";

export type EmailMessage = {
  to: string[];
  subject: string;
  html: string;
  text?: string;
};

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

class SmtpProvider implements EmailProvider {
  private transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  async send(message: EmailMessage) {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error("SMTP configuration missing");
    }
    await this.transport.sendMail({
      from: process.env.EMAIL_FROM,
      to: message.to.join(","),
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
  }
}

class SendgridProvider implements EmailProvider {
  constructor() {
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error("SENDGRID_API_KEY is required for SendGrid provider");
    }
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  }

  async send(message: EmailMessage) {
    if (!process.env.EMAIL_FROM) {
      throw new Error("EMAIL_FROM is required");
    }
    await sgMail.send({
      from: process.env.EMAIL_FROM,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
  }
}

export function getEmailProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER ?? "smtp";
  if (provider === "sendgrid") {
    return new SendgridProvider();
  }
  return new SmtpProvider();
}
