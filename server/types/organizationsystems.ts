export type OrganizationSystemIDParams = {
  orgSystemID: number;
};

export type GetAllOrganizationSystemsQuery = {
  offset?: number;
  limit?: number;
};

export type CreateOrganizationSystemBody = {
    name: string;
    logo: string;
}


