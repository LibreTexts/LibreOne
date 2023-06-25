import { IncomingHttpHeaders } from 'http';

export type TokenAuthenticationVerificationResult = {
  expired: boolean;
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

export type InitLoginQuery = {
  redirectURI?: string;
};

export type CompleteLoginQuery = {
  ticket: string;
};

export type InitResetPasswordBody = {
  email: string;
  redirectURI?: string;
};

export type ResetPasswordBody = {
  token: string;
  password: string;
};
