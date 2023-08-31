export type Application = {
  id: number;
  name: string;
  app_type: 'standalone' | 'library';
  main_url: string;
  cas_service_url: string;
  hide_from_apps: boolean;
  hide_from_user_apps: boolean;
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

export type ApplicationType = 'standalone' | 'library';

export type CreateApplicationBody = {
  name: string;
  app_type: ApplicationType;
  main_url: string;
  cas_service_url: string;
  hide_from_apps: boolean;
  hide_from_user_apps: boolean;
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
