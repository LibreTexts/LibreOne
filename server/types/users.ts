export type UserUUIDParams = {
  uuid: string;
};

export type GetAllUsersQuery = {
  offset: number;
  limit: number;
};

export type UpdateUserBody = {
  first_name?: string;
  last_name?: string;
  bio_url?: string;
  user_type?: string;
  organization_id?: number;
  add_organization_name?: string;
  verify_status?: string;
};

export type ResolvePrincipalAttributesQuery = {
  username: string;
};
