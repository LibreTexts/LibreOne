export type ApplicationIDParams = {
  applicationID: number;
};

export type ApplicationType = 'standalone' | 'library';

export type CreateApplicationBody = {
  name: string;
  app_type: ApplicationType;
  main_url: string;
  cas_service_url: string;
  default_access: 'all' | 'instructors' | 'none';
  icon: string;
  description: string;
  primary_color: string;
};

export type GetAllApplicationsQuery = {
  offset: number;
  limit: number;
  query?: string;
  type?: ApplicationType;
};

export type UpdateApplicationBody = Partial<CreateApplicationBody>;
