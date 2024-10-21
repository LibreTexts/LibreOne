export type VerificationRequestEffect = 'approve' | 'deny' | 'request_change';
export type VerificationRequestStatus =  'approved' | 'denied' | 'needs_change' | 'open';

export type VerificationRequestIDParams = {
  verificationRequestID: number;
};

export type CreateVerificationRequestProps = {
  bio_url?: string;
  addtl_info?: string;
  applications?: number[]; 
};

export type GetAllVerificationRequestsQuery = {
  offset: number;
  limit: number;
  status?: VerificationRequestStatus;
};

export type UpdateVerificationRequestBody = {
  effect: VerificationRequestEffect;
  reason?: string;
  approved_applications?: number[];
  library_access_option: 'all' | 'default' | 'specific';
  libraries?: number[];
};

export type UpdateVerificationRequestByUserProps = {
  bio_url: string;
  status?: string;
};
