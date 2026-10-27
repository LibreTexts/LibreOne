export type RegistrationAccount = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export type RegistrationProfile = {
  userType: 'student' | 'instructor';
  lang: string;
  timeZone: string;
  marketingOptIn: boolean;
  organizationId?: number;
  useDefaultOrganization?: boolean;
};
