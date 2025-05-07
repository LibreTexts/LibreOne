import { EventSubscriberController } from "@server/controllers/EventSubscriberController";
import { EventSubscriberEvents } from "@server/types/events";
import { EventEmitter } from "events";
import { E } from "vite/dist/node/moduleRunnerTransport.d-DJ_mE5sf";

type EventHandler<Events> = {
  [K in keyof Events]: (event: K, payload: Events[K]) => void;
};

class TypedEventEmitter<Events extends Record<string, any>> {
  private emitter = new EventEmitter();
  private onAnyListeners: Set<EventHandler<Events>[keyof Events]> = new Set();

  async on<K extends keyof Events>(
    event: K,
    listener: (payload: Events[K]) => void
  ): Promise<this> {
    this.emitter.on(event as string, listener);
    return this;
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): boolean {
    const singleResult = this.emitter.emit(event as string, payload);
    
    this.onAnyListeners.forEach((listener) => {
      listener(event as string, payload);
    });

    return singleResult || this.onAnyListeners.size > 0;
  }

  once<K extends keyof Events>(
    event: K,
    listener: (payload: Events[K]) => void
  ): this {
    this.emitter.once(event as string, listener);
    return this;
  }

  off<K extends keyof Events>(
    event: K,
    listener: (payload: Events[K]) => void
  ): this {
    this.emitter.off(event as string, listener);
    return this;
  }

  listenerCount<K extends keyof Events>(event: K): number {
    return this.emitter.listenerCount(event as string);
  }

  removeAllListeners<K extends keyof Events>(event?: K): this {
    this.emitter.removeAllListeners(event as string);
    return this;
  }

  onAny(listener: (event: keyof Events, payload: any) => void): this {
    this.onAnyListeners.add(listener);
    return this;
  }
  offAny(listener: (event: keyof Events, payload: any) => void): this {
    this.onAnyListeners.delete(listener);
    return this;
  }
}

export default TypedEventEmitter;
