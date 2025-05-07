import { EventSubscriberController } from "@server/controllers/EventSubscriberController";
import TypedEventEmitter from "./TypedEventEmitter";
import { EventSubscriberEvents } from "@server/types/eventsubscribers";

export const EventSubscriberEmitter =
  new TypedEventEmitter<EventSubscriberEvents>();

const controller = new EventSubscriberController();

EventSubscriberEmitter.onAny(async (event, payload) => {
  const subscribers = await controller.getEventSubscribers(event);

  try {
    await controller.signAndSend(subscribers, event, payload);
  } catch (e) {
    console.error(
      "[EventSubscriberEmitter] Error sending event ${event} to subscribers",
      e
    );
  }
});
