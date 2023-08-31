export type AccessRequestEffect = 'approve' | 'deny' | 'partial';
export type AccessRequestStatus = 'open' | 'denied' | 'approved' | 'partially_approved';

export type AccessRequestIDParams = {
  accessRequestID: number;
};

export type CreateAccessRequestBody = {
  applications: number[];
};

export type GetAllAccessRequestsQuery = {
  offset: number;
  limit: number;
  status?: AccessRequestStatus;
};

export type UpdateAccessRequestBody = {
  effect: AccessRequestEffect;
  reason?: string;
  approved?: number[];
};
