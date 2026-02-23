export type Application = {
  id: string;
  name: string;
  app_type: ApplicationType;
  main_url: string;
  cas_service_url: string;
  launchpad_visibility: ApplicationLaunchpadVisibility;
  hide_from_apps_api: boolean;
  hide_from_user_apps_api: boolean;
  is_default_library: boolean;
  supports_cas: boolean;
  default_access: 'all' | 'instructors' | 'verified_instructors' | 'none';
  icon: string;
  preview_image?: string | null;
  stripe_id?: string | null;
  description: string;
  primary_color: string;
  created_at: Date;
  updated_at: Date;
}

export type ApplicationIDParams = {
  applicationID: number;
};

export type ApplicationLaunchpadVisibility = 'none' | 'students' | 'instructors' | 'verified_instructors' | 'all';
export type ApplicationType = 'standalone' | 'library';

export type CreateApplicationBody = Omit<Application, 'id' | 'created_at' | 'updated_at'>;

export type GetAllApplicationsQuery = {
  offset: number;
  limit: number;
  query?: string;
  type?: ApplicationType;
  onlyCASSupported?: boolean;
  default_access?: 'all' | 'instructors' | 'verified_instructors' | 'none';
};

export type UpdateApplicationBody = Partial<CreateApplicationBody>;
