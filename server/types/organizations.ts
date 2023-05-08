export type OrganizationIDParams = {
  orgID: number;
};

export type OrganizationAliasIDParams = OrganizationIDParams & {
  aliasID: number;
};

export type OrganizationDomainIDParams = OrganizationIDParams & {
  domainID: number;
};

export type CreateOrganizationBody = {
  name: string;
  logo: string;
  system_id?: number;
  aliases: string[];
  domains: string[];
};

export type CreateOrganizationAliasBody = {
  alias: string;
};

export type CreateOrganizationDomainBody = {
  domain: string;
};

export type GetAllOrganizationsQuery = {
  offset: number;
  limit: number;
  query?: string;
};

export type UpdateOrganizationBody = {
  name?: string;
  logo?: string;
  system_id?: number;
};
