export type OrganizationIDParams = {
  orgID: number;
};

export type CreateOrganizationBody = {
  name: string;
  logo: string;
  system_id?: number;
  aliases: string[];
  domains: string[];
};

export type GetAllOrganizationsQuery = {
  offset: number;
  limit: number;
  query?: string;
};
