import { Op } from "sequelize";
import { EmailVerification } from "../models";
import { MailController } from "./MailController";
import crypto from "crypto";

export class EmailVerificationController {
  static generateCode() {
    return Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
  }

  static generateToken() {
    return crypto.randomBytes(32).toString("hex");
  }

  public async createVerification(uuid: string, email: string) {
    const verifyExpiry = new Date();
    verifyExpiry.setDate(verifyExpiry.getDate() + 1);

    // Delete any existing verifications for this user or email
    await EmailVerification.destroy({
      where: {
        [Op.or]: [
          { user_id: uuid },
          { email },
        ],
      },
    })

    const verification = await EmailVerification.create({
      user_id: uuid,
      email,
      code: EmailVerificationController.generateCode(),
      token: EmailVerificationController.generateToken(),
      expires_at: verifyExpiry,
    });
    return {
      code: verification.get("code"),
      token: verification.get("token"),
    };
  }

  public async checkVerificationCode(user_id: string, code: number) {
    const now = new Date();
    const foundVerification = await EmailVerification.findOne({
      where: {
        user_id,
        code,
      },
    });
    if (!foundVerification || foundVerification.expires_at < now) {
      return null;
    }

    const response = {
      uuid: foundVerification.get("user_id"),
      email: foundVerification.get("email"),
    };

    await foundVerification.destroy();
    return response;
  }

  public async checkVerificationToken(token: string) {
    const now = new Date();
    const foundVerification = await EmailVerification.findOne({
      where: {
        token,
      },
    });

    if (!foundVerification) {
      return null;
    }

    // Token was found, but it's expired
    const isExpired = foundVerification.expires_at < now;

    const response = {
      uuid: foundVerification.get("user_id"),
      expired: isExpired,
    };

    await foundVerification.destroy();
    return response;
  }

  public async sendEmailVerificationMessage(
    mailSender: MailController,
    email: string,
    code: number | null,
    token: string,
  ) {
    if (!mailSender || !mailSender.isReady()) {
      throw new Error("No mail sender available to issue email verification!");
    }

    let instructions = "";
    if (code) {
      instructions = `
      <p>Thank you for registering with LibreOne! To complete your registration, please use the verification code below or click the link to verify your email address:</p>
      <p style="font-size: 1.5em;">${code}</p>
      `;
    } else {
      instructions = `
      <p>Thank you for registering with LibreOne! To finish verifying your email address, please click the link below:</p>
      `;
    }

    const emailRes = await mailSender.send({
      destination: { to: [email] },
      subject: `Your Verification ${code ? "Code" : "Link for LibreOne"}${code ? `: ${code}` : ""}`,
      htmlContent: `
        <p>Hi there,</p>
        ${instructions}
        <br/>
        <p><a href="https://${process.env.DOMAIN}/verify-email?token=${token}">Verify Email Address</a></p>
        <br/>
        <p>This ${code ? `code and link` : `link`} will expire in 24 hours.</p>
        <p>If this wasn't you, you can safely ignore this email.</p>
        <p>Best,</p>
        <p>The LibreTexts Team</p>
      `,
    });

    return emailRes;
  }
}
