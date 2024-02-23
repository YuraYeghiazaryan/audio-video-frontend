import {EventEmitter, Injectable} from "@angular/core";
import {ActivationState, Client} from '@stomp/stompjs';
import {Observable, Subscriber} from "rxjs";

export namespace WebSocket {
  export enum MessageSendStatus {
    SUCCESSFUL,
    LIMIT_EXCEEDED,
    NOT_CONNECTED
  }
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {

  private stompClient: Client | undefined;
  private readonly MESSAGE_LENGTH_LIMIT: number = 1000 * 1024; /* bytes */
  public readonly onConnected$: EventEmitter<void> = new EventEmitter<void>();

  constructor() {}

  public connect(url: string): Observable<boolean> {
    if (this.stompClient?.connected) {
      return this.reconnect();
    }

    return new Observable<boolean>((observer: Subscriber<boolean>): void => {
      this.stompClient = new Client({
        brokerURL: `ws://localhost:8090${url}`,
        onConnect: (): void => {
          this.onConnected$.emit();
          observer.next(true);
          observer.complete();
        },
        onWebSocketClose: (): void => {

        },
        onChangeState: (activationState: ActivationState): void => {
          const localUserConnected: boolean = activationState === ActivationState.ACTIVE;
          /* @TODO */
        },
        reconnectDelay: 200,
      });

      this.stompClient.activate();
    });
  }

  public reconnect(): Observable<boolean> {
    return new Observable<boolean>((observer: Subscriber<boolean>): void => {
      if (this.stompClient?.connected) { /* if connected, disconnect before reconnection */
        this.stompClient.forceDisconnect();
        this.stompClient.deactivate().then((): void => {
          if (!this.stompClient) {
            return;
          }
           this.stompClient.onConnect = (): void => {
            observer.next(true);
            observer.complete();
          };
          this.stompClient.activate();
        });
      } else {
        if (!this.stompClient) {
          return;
        }
        this.stompClient.onConnect = (): void => {
          observer.next(true);
          observer.complete();
        };
        this.stompClient.activate();
      }
    });
  }

  public disconnect(): void {
    if (this.stompClient?.connected) {
      this.stompClient.forceDisconnect();
      this.stompClient.deactivate().then();
    }
  }

  public get isConnected(): boolean {
    return this.stompClient?.connected || false;
  }

  public subscribe(channel: string, callback: (responseBody: string) => void): void {
    if (this.stompClient?.connected) {
      this.stompClient.subscribe(channel, (response: { body: string; }) => callback(response.body));
    } else {
      throw Error('Socket connection is not established yet...');
    }
  }

  public send(destination: string, message: string): WebSocket.MessageSendStatus {
    if (!this.stompClient?.connected) {
      return WebSocket.MessageSendStatus.NOT_CONNECTED;
    }

    if (new TextEncoder().encode(message).length > this.MESSAGE_LENGTH_LIMIT) {
      return WebSocket.MessageSendStatus.LIMIT_EXCEEDED;
    }

    this.stompClient.publish({destination, body: message});
    return WebSocket.MessageSendStatus.SUCCESSFUL;
  }
}
