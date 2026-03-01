import { IncomingHttpHeaders } from 'http';
import { Arrayify } from './misc';

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

export type VerifyEmailCodeBody = {
  email: string;
  code: number;
};

export type VerifyEmailTokenBody = {
  token: string;
};

export type ResendVerificationEmailBody = {
  uuid: string;
};

export type CreateUserFromExternalIdPBody = {
  profileAttributes: CreateUserFromExternalIdPBodyProfileAttributes;
  clientName: string;
  profileId: string;
  profileTypedId: string;
  principalId: string;
  principalAttributes: CreateUserFromExternalIdPBodyPrincipalAttributes;
};

export type CreateUserFromExternalIdPBodyProfileAttributes = {
  at_hash?: string;
  sub?: string;
  email_verified?: boolean;
  id_token?: string;
  iss?: string;
  given_name?: string;
  picture?: string;
  access_token?: string;
  token_expiration_advance?: number;
  aud?: string[];
  azp?: string;
  name?: string;
  expiration?: number;
  hd?: string;
  exp?: string | number;
  family_name?: string;
  iat?: string | number;
  email?: string;
  preferred_username?: string;
};

export type CreateUserFromExternalIdPBodyPrincipalAttributes = Arrayify<CreateUserFromExternalIdPBodyProfileAttributes>;

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