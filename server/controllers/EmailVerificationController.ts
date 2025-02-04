import { Op } from "sequelize";
import { EmailVerification } from "../models";
import { MailController } from "./MailController";

export class EmailVerificationController {
  static generateCode() {
    return Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
  }

  public async createVerification(uuid: string, email: string) {
    const verifyExpiry = new Date();
    verifyExpiry.setDate(verifyExpiry.getDate() + 1);

    const verification = await EmailVerification.create({
      user_id: uuid,
      email,
      code: EmailVerificationController.generateCode(),
      expires_at: verifyExpiry,
    });
    return verification.get("code");
  }

  public async checkVerification(email: string, code: number) {
    const now = new Date();
    const foundVerification = await EmailVerification.findOne({
      where: {
        [Op.and]: [{ email }, { code }],
      },
    });
    if (
      !foundVerification ||
      foundVerification.expires_at < now ||
      foundVerification.code !== code
    ) {
      return null;
    }

    const response = {
      uuid: foundVerification.get("user_id"),
      email: foundVerification.get("email"),
    };

    await foundVerification.destroy();
    return response;
  }

  public async sendEmailVerificationMessage(
    mailSender: MailController,
    email: string,
    code: number
  ) {
    if (!mailSender || !mailSender.isReady()) {
      throw new Error("No mail sender available to issue email verification!");
    }

    const emailRes = await mailSender.send({
      destination: { to: [email] },
      subject: `LibreOne Verification Code: ${code}`,
      htmlContent: `
        <p>Hello there,</p>
        <p>Please verify your email address by entering this code:</p>
        <p style="font-size: 1.5em;">${code}</p>
        <p>If this wasn't you, you can safely ignore this email.</p>
        <p>Best,</p>
        <p>The LibreTexts Team</p>
      `,
    });

    return emailRes;
  }

  public async sendVerificationEmailLink(
    mailSender: MailController,
    email: string,
    token: string,
  ) {
    if (!mailSender || !mailSender.isReady()) {
      throw new Error("No mail sender available to issue email verification!");
    }

    const emailRes = await mailSender.send({
      destination: { to: [email] },
      subject: "LibreOne Account Verification Link",
      htmlContent: `
        <p>Hello there,</p>
        <p>Please verify your email address by clicking this link:</p>
        <p><a href="https://one.libretexts.org/verify-email?token=${token}">https://one.libretexts.org/verify-email?token=${token}</a></p>
        <p>If this wasn't you, you can safely ignore this email.</p>
        <p>Best,</p>
        <p>The LibreTexts Team</p>
      `,
    });

    return emailRes;
  }
}
