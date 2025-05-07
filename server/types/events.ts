import { Organization, OrganizationSystem } from "@server/models";
import { User } from "./users";

export type EventSubscriberEvents = {
  "user:created": User;
  "user:updated": User;
  "user:delete_requested": User & {
    requested_at: Date;
  };
  "user:delete_completed": User;
  "organization:created": Organization;
  "organization:updated": Organization;
  "organization:deleted": Organization;
  "organization_system:created": OrganizationSystem;
  "organization_system:updated": OrganizationSystem;
  "organization_system:deleted": OrganizationSystem;
};
