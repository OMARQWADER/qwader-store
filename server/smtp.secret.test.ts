import { describe, it, expect } from "vitest";
import nodemailer from "nodemailer";

describe("Gmail SMTP credentials validation", () => {
  it("GMAIL_USER and GMAIL_APP_PASSWORD authenticate against smtp.gmail.com", async () => {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    expect(user).toBeTruthy();
    expect(pass).toBeTruthy();
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
    // verify() logs into SMTP and confirms the credentials without sending mail
    await expect(transporter.verify()).resolves.toBeTruthy();
  }, 30_000);
});
