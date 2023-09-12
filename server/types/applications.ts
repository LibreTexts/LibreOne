export type Application = {
  id: string;
  name: string;
  app_type: ApplicationType;
  main_url: string;
  cas_service_url: string;
  hide_from_apps: boolean;
  hide_from_user_apps: boolean;
  is_default_library: boolean;
  supports_cas: boolean;
  default_access: 'all' | 'instructors' | 'none';
  icon: string;
  description: string;
  primary_color: string;
  is_default_library: boolean;
  supports_cas: boolean;
  created_at: Date;
  updated_at: Date;
}

export type ApplicationIDParams = {
  applicationID: number;
};

export type ApplicationType = 'standalone' | 'library';

export type CreateApplicationBody = Omit<Application, 'id' | 'created_at' | 'updated_at'>;

export type GetAllApplicationsQuery = {
  offset: number;
  limit: number;
  query?: string;
  type?: ApplicationType;
  onlyCASSupported?: boolean;
  default_access?: 'all' | 'instructors' | 'none';
};

export type UpdateApplicationBody = Partial<CreateApplicationBody>;
