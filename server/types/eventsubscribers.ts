import { Organization, OrganizationSystem } from "@server/models";
import { User } from "./users";
import { UserLicenseResultSummary } from "./applicenses";

export type EventSubscriberEvents = {
  "user:created": User;
  "user:updated": User;
  "user:delete_requested": {
    id: string;
    requested_at: Date;
  };
  "user:delete_completed": {
    id: string;
  };
  "organization:created": Organization;
  "organization:updated": Organization;
  "organization:deleted": {
    id: string;
  };
  "organization_system:created": OrganizationSystem;
  "organization_system:updated": OrganizationSystem;
  "organization_system:deleted": {
    id: string;
  };
  "user_app_license:updated": UserLicenseResultSummary;
  "user_organization:admin_role_updated": {
    user_id: string;
    organization_id: number;
    admin_role: string | null;
  };
};

export type SendTestEventBody = {
  event: keyof EventSubscriberEvents;
  url: string;
  secret_key: string;
};
