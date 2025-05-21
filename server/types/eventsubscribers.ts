import { Organization, OrganizationSystem } from "@server/models";
import { User } from "./users";

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
};

export type SendTestEventBody = {
  event: keyof EventSubscriberEvents;
  url: string;
  secret_key: string;
};
