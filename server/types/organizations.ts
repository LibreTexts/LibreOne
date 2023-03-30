export type OrganizationIDParams = {
  orgID: number;
};

export type GetAllOrganizationsQuery = {
  offset: number;
  limit: number;
  query?: string;
};
