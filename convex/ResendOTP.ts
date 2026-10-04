import Resend from "@auth/core/providers/resend";
import { Resend as ResendAPI } from "resend";

function fromAddress() {
  return process.env.RESEND_FROM_ADDRESS ?? "DailyReport <noreply@dailyreport.app>";
}

function randomCode(length = 8) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => (b % 10).toString()).join("");
}

function otpProvider(id: string, subject: string, intro: string) {
  return Resend({
    id,
    apiKey: process.env.RESEND_API_KEY,
    maxAge: 60 * 15,
    async generateVerificationToken() {
      return randomCode();
    },
    async sendVerificationRequest({ identifier: email, provider, token }) {
      const resend = new ResendAPI(provider.apiKey);
      const { error } = await resend.emails.send({
        from: fromAddress(),
        to: [email],
        subject,
        text: `${intro}\n\nYour code is ${token}\n\nIt expires in 15 minutes. If you did not request this, you can ignore this email.`,
      });
      if (error) {
        throw new Error("Could not send the verification email");
      }
    },
  });
}

export const ResendOTP = otpProvider(
  "resend-otp",
  "Your DailyReport verification code",
  "Use this code to verify your email address."
);

export const ResendOTPPasswordReset = otpProvider(
  "resend-otp-password-reset",
  "Reset your DailyReport password",
  "Use this code to reset your password."
);
