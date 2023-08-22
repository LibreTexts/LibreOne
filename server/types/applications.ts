export type Application = {
  id: string;
  name: string;
  app_type: 'standalone' | 'library';
  main_url: string;
  cas_service_url: string;
  default_access: 'all' | 'instructors' | 'none';
  icon: string;
  description: string;
  primary_color: string;
  created_at: Date;
  updated_at: Date;
}

export type ApplicationIDParams = {
  applicationID: number;
};

export type CreateApplicationBody = {
  name: string;
  app_type: 'standalone' | 'library';
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
};

export type UpdateApplicationBody = Partial<CreateApplicationBody>;
