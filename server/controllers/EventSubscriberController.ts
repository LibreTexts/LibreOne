import { EventSubscriber } from "@server/models/EventSubscriber";
import { EventSubscriberEventConfig } from "@server/models/EventSubscriberEventConfig";
import {
  EventSubscriberEvents,
  SendTestEventBody,
} from "@server/types/eventsubscribers";
import axios from "axios";
import { SignJWT } from "jose";
import { Request, Response } from "express";
import errors from "@server/errors";
import { User } from "@server/types/users";

export const EVENT_SUBSCRIBER_EVENTS = [
  "user:created",
  "user:updated",
  "user:delete_requested",
  "user:delete_completed",
  "organization:created",
  "organization:updated",
  "organization:deleted",
  "organization_system:created",
  "organization_system:updated",
  "organization_system:deleted",
];

export class EventSubscriberController {
  private debug(message: string) {
    console.error(`[EventSubscriberController] ${message}`);
  }

  private getColumnName(event: keyof EventSubscriberEvents): string {
    return event.split(":").join("_");
  }

  private async signPayload(
    event: string,
    payload: any,
    signingKey: string
  ): Promise<string> {
    const encoded = new TextEncoder().encode(signingKey);
    return new SignJWT({
      event,
      payload,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuedAt()
      .setExpirationTime("10m")
      .sign(encoded);
  }

  private async sendToWebhook(
    webhookUrl: string,
    signedPayload: string
  ): Promise<boolean> {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second
    for (let attempt = 1; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await axios.post(
          webhookUrl,
          {
            payload: signedPayload,
          },
          {
            headers: {
              "Content-Type": "application/json",
              "X-Requested-With": "XMLHttpRequest",
              Authorization: `Bearer ${signedPayload}`,
              Origin:
                process.env.PRODUCTION_DOMAIN ??
                process.env.DOMAIN ??
                "one.libretexts.org",
            },
          }
        );

        if (response.status === 200) {
          return true;
        }

        this.debug(
          `Failed to send webhook to ${webhookUrl}. Status code: ${response.status}`
        );
      } catch (error) {
        this.debug(`Error sending to webhook ${webhookUrl}: ${error}`);
      }

      if (attempt < MAX_RETRIES) {
        this.debug(
          `Retrying to send webhook to ${webhookUrl} in ${RETRY_DELAY}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      }
    }

    this.debug(
      `Failed to send webhook to ${webhookUrl} after ${MAX_RETRIES} attempts.`
    );
    return false;
  }

  async getEventSubscribers(
    event: keyof EventSubscriberEvents
  ): Promise<EventSubscriber[]> {
    try {
      const columnName = this.getColumnName(event);
      const eventSubscribers = await EventSubscriber.findAll({
        include: [
          {
            model: EventSubscriberEventConfig,
          },
        ],
      });

      const filteredEventSubscribers = eventSubscribers.filter((subscriber) => {
        const eventConfig = subscriber.get("event_config") as
          | EventSubscriberEventConfig
          | undefined;
        if (!eventConfig) return false;
        const eventValue = eventConfig[columnName];
        return eventValue === true;
      });

      return filteredEventSubscribers.map((subscriber) => {
        return subscriber.get({ plain: true });
      });
    } catch (error) {
      this.debug(
        `Error fetching event subscribers for event ${event}: ${error}`
      );
      return [];
    }
  }

  async getEventSubscriberById(id: number): Promise<EventSubscriber | null> {
    try {
      const eventSubscriber = await EventSubscriber.findByPk(id, {
        include: [
          {
            model: EventSubscriberEventConfig,
          },
        ],
      });
      return eventSubscriber ? eventSubscriber.get({ plain: true }) : null;
    } catch (error) {
      this.debug(`Error fetching event subscriber by ID ${id}: ${error}`);
      return null;
    }
  }

  async signAndSend(
    subscribers: EventSubscriber[],
    event: string,
    payload: any
  ) {
    if (!subscribers || subscribers.length === 0) {
      this.debug(`No subscribers found for event ${event}`);
      return;
    }

    if (!payload) {
      this.debug(`No payload found for event ${event}`);
      return;
    }

    for (const subscriber of subscribers) {
      try {
        const signingKey = subscriber.signing_key;
        const webhookUrl = subscriber.webhook_url;

        // Sign the payload with the signing key
        const signedPayload = await this.signPayload(
          event,
          payload,
          signingKey
        );

        // Send the signed payload to the webhook URL
        await this.sendToWebhook(webhookUrl, signedPayload);
      } catch (error) {
        this.debug(
          `Error sending event to subscriber ${subscriber.id}: ${error}`
        );
      }
    }
  }

  async sendTestEvent(req: Request, res: Response) {
    try {
      const { event, url, secret_key } = req.body as SendTestEventBody;

      const payload = this.generateTestEventPayload(event);
      const signedPayload = await this.signPayload(event, payload, secret_key);
      const success = await this.sendToWebhook(url, signedPayload);

      if (!success) {
        return errors.internalServerError(res, "Failed to send test event");
      }

      res.status(200).json({
        message: "Test event sent successfully",
      });
    } catch (error) {
      this.debug(`Error sending test event: ${error}`);
      return errors.internalServerError(res);
    }
  }

  private generateTestEventPayload(event: keyof EventSubscriberEvents) {
    const user: User = {
      uuid: "4087971b-34ed-4a35-9af9-150eee0d5291",
      // @ts-ignore
      external_subject_id: null,
      first_name: "Test",
      last_name: "User",
      email: "testuser@example.com",
      user_type: "instructor",
      time_zone: "America/Los_Angeles",
      lang: "en-US",
      // @ts-ignore
      student_id: null,
      disabled: false,
      expired: false,
      registration_complete: true,
      legacy: false,
      // @ts-ignore
      external_idp: null,
      // @ts-ignore
      avatar: null,
      // @ts-ignore
      bio_url: null,
      verify_status: "not_attempted",
      // @ts-ignore
      last_password_change: null,
      registration_type: "self",
      is_developer: false,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const organization = {
      id: 3,
      name: "American River College",
      logo: "logo.png",
      created_at: new Date(),
      updated_at: new Date(),
    };

    const organization_system = {
      id: 1,
      name: "University of California",
      logo: "logo.png",
      created_at: new Date(),
      updated_at: new Date(),
      organizations: [organization],
    };

    switch (event) {
      case "user:created":
        return user;
      case "user:updated":
        return {
          ...user,
          first_name: "Updated Test",
          verify_status: "verified",
        };
      case "user:delete_requested":
        return { id: user.uuid, requested_at: new Date() };
      case "user:delete_completed":
        return { id: user.uuid };
      case "organization:created":
        return organization;
      case "organization:updated":
        return { ...organization, name: "American River College Updated" };
      case "organization:deleted":
        return { id: 3 };
      case "organization_system:created":
        return organization_system;
      case "organization_system:updated":
        return {
          ...organization_system,
          name: "University of California Updated",
        };
      case "organization_system:deleted":
        return { id: 1 };
      default:
        throw new Error(`Unknown event type ${event}`);
    }
  }
}
