import { Announcement, User } from "@server/models";
import { AnnouncementScope } from "@server/types/announcements";
import { UserUUIDParams } from "@server/types/users";
import { Op } from "sequelize";

export class AnnouncementController {
  constructor() {}

  public async getAnnouncementsInternal(
    scopes?: AnnouncementScope[]
  ): Promise<Announcement[]> {
    const whereClause: any = {
      start_time: { [Op.lte]: new Date() },
      end_time: { [Op.gte]: new Date() },
    };

    if (scopes) {
      if (scopes.length === 0) {
        return [];
      }
      whereClause.scope = scopes;
    }

    const data = await Announcement.findAll({
      where: whereClause,
      attributes: { exclude: ["createdAt", "updatedAt"] },
    });
    return data.map((announcement) => announcement.toJSON());
  }

  public async getAnnouncementsForUserInternal(
    userUuid: string
  ): Promise<Announcement[]> {
    const user = await User.findByPk(userUuid);
    if (!user) {
      return [];
    }
    const scopes: AnnouncementScope[] = ["global", "launchpad"]; // always include general scopes
    if (user.user_type === "instructor") {
      scopes.push("launchpad-instructors");
    } else {
      scopes.push("launchpad-students");
    }
    return this.getAnnouncementsInternal(scopes);
  }

  public async getAllActiveAnnouncements(req: any, res: any) {
    const data = await this.getAnnouncementsInternal();

    return res.status(200).json({ data });
  }

  public async getAllActiveAnnouncementsByScope(req: any, res: any) {
    const { scope } = req.params as { scope: AnnouncementScope };

    const data = await this.getAnnouncementsInternal([scope]);

    return res.status(200).json({ data });
  }

  public async getAllActiveAnnouncementsForUser(req: any, res: any) {
    const { uuid } = req.params as UserUUIDParams;

    const data = await this.getAnnouncementsForUserInternal(uuid);

    return res.status(200).json({ data });
  }
}
