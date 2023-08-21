export type ApplicationIDParams = {
  applicationID: number;
};

export type CreateApplicationBody = {
  name: string;
  app_type: 'standalone' | 'library';
  main_url: string;
  cas_service_url: string;
  default_access: 'all' | 'instructors' | 'none';
  primary_color: string;
};

export type GetAllApplicationsQuery = {
  offset: number;
  limit: number;
  query?: string;
};

export type UpdateApplicationBody = Partial<CreateApplicationBody>;
