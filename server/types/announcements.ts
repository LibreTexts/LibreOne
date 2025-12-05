export type AnnouncementScope =
  | "global" // visible to all users, including registration and login pages
  | "launchpad" // visible to all users on Launchpad only
  | "launchpad-instructors" // visible to all instructors on Launchpad only
  | "launchpad-students"; // visible to all students on Launchpad only

export type AnnouncementVariant = "info" | "warning" | "critical";
