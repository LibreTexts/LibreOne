import {
  AnnouncementScope,
  AnnouncementVariant,
} from "@server/types/announcements";
import { NonAttribute } from "sequelize";
import {
  AllowNull,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from "sequelize-typescript";

export const ANNOUNCEMENT_SCOPES: AnnouncementScope[] = [
  "global",
  "launchpad",
  "launchpad-instructors",
  "launchpad-students",
  "registration",
];

export const ANNOUNCEMENT_VARIANTS: AnnouncementVariant[] = [
  "info",
  "warning",
  "critical",
];

@Table({
  timestamps: true,
  tableName: "announcements",
})
export class Announcement extends Model {
  @PrimaryKey
  @AllowNull(false)
  @Column(DataType.STRING)
  declare uuid: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  declare content: string; // HTML content of the announcement

  @AllowNull(false)
  @Column(DataType.ENUM(...ANNOUNCEMENT_VARIANTS))
  declare variant: AnnouncementVariant;

  @AllowNull(false)
  @Column(DataType.DATE)
  declare start_time: Date;

  @AllowNull(false)
  @Column(DataType.DATE)
  declare end_time: Date;

  @AllowNull(false)
  @Column(DataType.ENUM(...ANNOUNCEMENT_SCOPES))
  declare scope: AnnouncementScope;

  /**
   * Computed property to get the background color based on the variant
   * These colors are chosen specifically to be WCAG AAA compliant with white (#FFFFFF) large (14pt bold or 18pt+) text
   * and harcoded here to ensure consistency.
   */
  @Column(DataType.VIRTUAL)
  get background_color(): NonAttribute<string> {
    switch (this.variant) {
      case "warning":
        return "#C2410C"; // orange
      case "critical":
        return "#991B1B"; // red
      default:
        return "#0b4a76"; // default blue
    }
  }
}
