import { marked } from 'marked';
import type { Application } from '@server/models';

const VERIFICATION_CONSOLE_URL =
  'https://commons.libretexts.org/controlpanel/libreone/instructor-verifications';
const INSTRUCTOR_PORTAL_URL = 'https://one.libretexts.org/instructor';
const SUPPORT_CENTER_URL = 'https://commons.libretexts.org/support/contact';

const GREETING = '<p>Hello there,</p>';
const SIGNATURE = `<p>Best, &nbsp;</p><p>The LibreTexts Team</p>`;
const SUPPORT = `<p>If you have further questions, please feel free to contact our Support Center at <a href="${SUPPORT_CENTER_URL}" target="_blank" rel="noopener noreferrer">${SUPPORT_CENTER_URL}</a>.</p>`;
const NO_REPLY_FOOTER = `<p><i>This is an automated message from LibreOne. Please do not reply to this email.</i></p>`;
const TRANSACTIONAL_FOOTER = `<p>This is a transactional email related to your LibreOne account and/or activity on LibreTexts applications.</p>`

type Template = { subject: string; htmlContent: string };

const adminCommentBlock = (comment?: string) =>
  comment
    ? `
          <p>The team member reviewing your request provided this comment:</p>
          <p>${marked.parseInline(comment)}</p>
        `
    : '';

const adminReasoningBlock = (reason?: string) =>
  reason
    ? `
          <p>The team member reviewing your request provided this reasoning:</p>
          <p>${marked.parseInline(reason)}</p>
        `
    : '';

const applicationsList = (apps: Application[]) =>
  `<ul>${apps.map((a) => `<li>${a.get('name')}</li>`).join('')}</ul>`;

const applicationNamesList = (names: string[]) =>
  `<ul>${names.map((n) => `<li>${n}</li>`).join('')}</ul>`;

export const emailTemplates = {
  emailVerification: ({ code }: { code: number | string }): Template => ({
    subject: `LibreOne Verification Code: ${code}`,
    htmlContent: `
        ${GREETING}
        <p>Please verify your email address by entering this code:</p>
        <p style="font-size: 1.5em;">${code}</p>
        <p>If this wasn't you, you can safely ignore this email.</p>
        ${SIGNATURE}
        <p>&nbsp;</p>
        ${TRANSACTIONAL_FOOTER}
        ${NO_REPLY_FOOTER}
      `,
  }),

  passwordResetLink: ({ resetLink }: { resetLink: string }): Template => ({
    subject: 'Reset Your LibreOne Password',
    htmlContent: `
        ${GREETING}
        <p>We received a request to reset your LibreOne password. You can do so by following this link:</p>
        <a href="${resetLink}" target="_blank" rel="noopener noreferrer">${resetLink}</a>
        <p>If this wasn't you, you can safely ignore this email.</p>
        ${SIGNATURE}
        <p>&nbsp;</p>
        ${TRANSACTIONAL_FOOTER}
        ${NO_REPLY_FOOTER}
      `,
  }),

  passwordChanged: ({
    dateStr,
    timeStr,
  }: {
    dateStr: string;
    timeStr: string;
  }): Template => ({
    subject: 'LibreOne Password Changed',
    htmlContent: `
        ${GREETING}
        <p>We're writing to confirm that your LibreOne password was updated on ${dateStr} at ${timeStr} UTC.</p>
        <p>If this wasn't you, please <a href="mailto:support@libretexts.org?subject=Unrecognized Password Change" target="_blank" rel="noopener">contact LibreTexts.</p>
        ${SIGNATURE}
        <p>&nbsp;</p>
        ${TRANSACTIONAL_FOOTER}
        ${NO_REPLY_FOOTER}
      `,
  }),

  verificationRequestSubmittedAdmin: (): Template => ({
    subject: 'LibreOne: New Verification Request Submitted',
    htmlContent: `
        <p>A new Instructor Verification Request has been submitted. Please open the <a href="${VERIFICATION_CONSOLE_URL}" target="_blank" rel="noopener noreferrer">Verification Requests Console</a> in Conductor to review.</p>
        <br />
        ${NO_REPLY_FOOTER}
      `,
  }),

  verificationRequestUpdatedAdmin: (): Template => ({
    subject: 'LibreOne: Verification Request Updated',
    htmlContent: `
        <p>A previously reviewed Instructor Verification Request has been updated by the requester. Please open the <a href="${VERIFICATION_CONSOLE_URL}" target="_blank" rel="noopener noreferrer">Verification Requests Console</a> in Conductor to review again.</p>
        <br />
        ${NO_REPLY_FOOTER}
      `,
  }),

  verificationRequestApproved: ({
    comment,
    applicationNames,
  }: {
    comment?: string;
    applicationNames?: string[];
  }): Template => ({
    subject: 'Your LibreTexts Verification Request Was Approved',
    htmlContent: `
        ${GREETING}
        <p>Good news! Your Instructor Verification Request was approved by the LibreTexts team!</p>
        ${adminCommentBlock(comment)}
        ${applicationNames?.length ? `
          <p>You now have access to the following applications:</p>
          ${applicationNamesList(applicationNames)}
        ` : ''}
        <p>If you have further questions, please feel free to submit a ticket in our <a href="${SUPPORT_CENTER_URL}" target="_blank">Support Center</a>.</p>
        ${SIGNATURE}
        <p>&nbsp;</p>
        ${TRANSACTIONAL_FOOTER}
        ${NO_REPLY_FOOTER}
      `,
  }),

  verificationRequestNeedsChanges: ({
    comment,
  }: {
    comment?: string;
  }): Template => ({
    subject: 'Your LibreTexts Verification Request Needs More Information',
    htmlContent: `
        ${GREETING}
        <p>Your Instructor Verification Request has been reviewed by the LibreTexts team. We've determined we need more information to complete your request.</p>
        ${adminCommentBlock(comment)}
        <p>You can update your request in <a href="${INSTRUCTOR_PORTAL_URL}" target="_blank" rel="noopener noreferrer">LibreOne</a>.</p>
        ${SUPPORT}
        ${SIGNATURE}
        <p>&nbsp;</p>
        ${TRANSACTIONAL_FOOTER}
        ${NO_REPLY_FOOTER}
      `,
  }),

  verificationRequestDenied: ({ comment }: { comment?: string }): Template => ({
    subject: 'Your LibreTexts Verification Request',
    htmlContent: `
        ${GREETING}
        <p>Your Instructor Verification Request has been reviewed by the LibreTexts team. Unfortunately, we have decided not to approve your request.</p>
        ${adminCommentBlock(comment)}
        ${SUPPORT}
        ${SIGNATURE}
        <p>&nbsp;</p>
        ${TRANSACTIONAL_FOOTER}
        ${NO_REPLY_FOOTER}
      `,
  }),

  accessRequestApproved: ({
    approvedApps,
    reason,
  }: {
    approvedApps: Application[];
    reason?: string;
  }): Template => ({
    subject: 'Your LibreTexts Access Request Was Approved',
    htmlContent: `
        ${GREETING}
        <p>Good news! Your applications access request was approved by the LibreTexts team!</p>
        <p>You can now access the following applications:</p>
        ${applicationsList(approvedApps)}
        ${adminCommentBlock(reason)}
        ${SUPPORT}
        ${SIGNATURE}
        <p>&nbsp;</p>
        ${TRANSACTIONAL_FOOTER}
        ${NO_REPLY_FOOTER}
      `,
  }),

  accessRequestPartiallyApproved: ({
    reqApps,
    approvedApps,
    reason,
  }: {
    reqApps: Application[];
    approvedApps: Application[];
    reason?: string;
  }): Template => ({
    subject: 'Your LibreTexts Access Request Was Partially Approved',
    htmlContent: `
        ${GREETING}
        <p>Your applications access request has been reviewed by the LibreTexts team and we have decided to partially approve your request.</p>
        <p>You requested access to the following applications:</p>
        ${applicationsList(reqApps)}
        <p>You now have access to the following applications:</p>
        ${applicationsList(approvedApps)}
        ${adminCommentBlock(reason)}
        ${SUPPORT}
        ${SIGNATURE}
        <p>&nbsp;</p>
        ${TRANSACTIONAL_FOOTER}
        ${NO_REPLY_FOOTER}
      `,
  }),

  accessRequestDenied: ({
    reqApps,
    reason,
  }: {
    reqApps: Application[];
    reason?: string;
  }): Template => ({
    subject: 'Your LibreTexts Access Request Was Denied',
    htmlContent: `
        ${GREETING}
        <p>Your applications access request has been reviewed by the LibreTexts team. Unfortunately, we have decided to deny your request to access the following applications:</p>
        ${applicationsList(reqApps)}
        ${adminReasoningBlock(reason)}
        <p>If you still need access to the requested applications, please address any comments provided.</p>
        ${SUPPORT}
        ${SIGNATURE}
        <p>&nbsp;</p>
        ${TRANSACTIONAL_FOOTER}
        ${NO_REPLY_FOOTER}
      `,
  }),

  storeAccessCode: ({
    appName,
    accessCode,
    hostname,
  }: {
    appName: string;
    accessCode: string;
    hostname: string;
  }): Template => ({
    subject: `Your Access Code - ${appName}`,
    htmlContent: `
        <p>Hi there,</p>
        <p>We've received your order for ${appName}.</p>
        <br/>
        <p>Your access code is: </p>
        <p><strong>${accessCode}</strong></p>
        <br/>
        <p>Please visit the following link to redeem your access code: <a href="https://${hostname}/redeem?access_code=${accessCode}">https://${hostname}/redeem?access_code=${accessCode}</a>.</p>
        <p>Caution: Do not share this access code with anyone else, as it can only be used once!</p>
        <br/>
        ${SUPPORT}
        <br/>
        ${SIGNATURE}
        <p>&nbsp;</p>
        ${TRANSACTIONAL_FOOTER}
        ${NO_REPLY_FOOTER}
      `,
  }),
};
