import { IncomingHttpHeaders } from 'http';

export type ADAPTSpecialRole = 'instructor' | 'grader' | 'question-editor' | 'tester';

export type TokenAuthenticationVerificationResult = {
  expired: boolean;
  sessionInvalid: boolean;
  isAuthenticated: boolean;
  userUUID: string | null;
};

export type RegisterBody = {
  email: string;
  password: string;
};

export type VerifyEmailBody = {
  email: string;
  code: number;
};

export type CreateUserFromExternalIdPHeaders = IncomingHttpHeaders & {
  clientname: string;
  principalattributes: string;
  principalid: string;
  profileattributes: string;
  profileid: string;
  profiletypeid: string;
};

export type CheckCASInterruptQuery = {
  registeredService: string;
  username: string;
};

export type InitLoginQuery = {
  redirectURI?: string;
  redirectCASServiceURI?: string;
  casInitSSOSession?: boolean;
  tryGateway?: boolean;
};

export type CompleteLoginQuery = {
  ticket: string;
};

export type completeRegistrationBody = {
  source?: 'adapt-registration';
  adapt_role?: ADAPTSpecialRole;
};

export type InitResetPasswordBody = {
  email: string;
  redirectURI?: string;
};

export type ResetPasswordBody = {
  token: string;
  password: string;
};

export type AutoProvisionUserBody = {
  email: string;
  first_name: string;
  last_name: string;
  user_type: 'student' | 'instructor';
  time_zone: string;
};

export type BackChannelSLOBody = {
  logoutRequest?: string;
};

export type BackChannelSLOQuery = {
  logoutRequest?: string;
};