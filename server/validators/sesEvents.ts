import joi from 'joi';

const bouncedRecipient = joi.object({
  emailAddress: joi.string().required(),
  diagnosticCode: joi.string().optional(),
  status: joi.string().optional(),
  action: joi.string().optional(),
}).unknown(true);

const complainedRecipient = joi.object({
  emailAddress: joi.string().required(),
}).unknown(true);

const mail = joi.object({
  messageId: joi.string().required(),
  timestamp: joi.string().optional(),
  source: joi.string().optional(),
  destination: joi.array().items(joi.string()).optional(),
}).unknown(true);

const bounce = joi.object({
  bounceType: joi.string().valid('Permanent', 'Transient', 'Undetermined').required(),
  bounceSubType: joi.string().optional(),
  feedbackId: joi.string().optional(),
  timestamp: joi.string().optional(),
  bouncedRecipients: joi.array().items(bouncedRecipient).min(1).required(),
}).unknown(true);

const complaint = joi.object({
  feedbackId: joi.string().optional(),
  complaintFeedbackType: joi.string().optional(),
  timestamp: joi.string().optional(),
  complainedRecipients: joi.array().items(complainedRecipient).min(1).required(),
}).unknown(true);

const singleMessage = joi.object({
  notificationType: joi.string().valid('Bounce', 'Complaint', 'Delivery').required(),
  mail: mail.required(),
  bounce: joi.when('notificationType', {
    is: 'Bounce',
    then: bounce.required(),
    otherwise: joi.forbidden(),
  }),
  complaint: joi.when('notificationType', {
    is: 'Complaint',
    then: complaint.required(),
    otherwise: joi.forbidden(),
  }),
}).unknown(true);

export const sesEventIngestSchema = joi.alternatives().try(
  singleMessage,
  joi.array().items(singleMessage).min(1),
);

export type SesBouncedRecipient = {
  emailAddress: string;
  diagnosticCode?: string;
};

export type SesComplainedRecipient = {
  emailAddress: string;
};

export type SesMessage = {
  notificationType: 'Bounce' | 'Complaint' | 'Delivery';
  mail: { messageId: string; timestamp?: string };
  bounce?: {
    bounceType: 'Permanent' | 'Transient' | 'Undetermined';
    bounceSubType?: string;
    feedbackId?: string;
    timestamp?: string;
    bouncedRecipients: SesBouncedRecipient[];
  };
  complaint?: {
    feedbackId?: string;
    complaintFeedbackType?: string;
    timestamp?: string;
    complainedRecipients: SesComplainedRecipient[];
  };
};
