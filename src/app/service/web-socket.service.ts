import {EventEmitter, Injectable} from "@angular/core";
import {ActivationState, Client} from '@stomp/stompjs';
import {Observable, Subscriber} from "rxjs";
import {ConnectionHandleService} from "./connection-handle.service";

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

  constructor(
    private connectionHandleService: ConnectionHandleService
  ) {}

  public connect(url: string): Observable<boolean> {
    return new Observable<boolean>((observer: Subscriber<boolean>): void => {
      const protocol: string = window.location.protocol
        .replace('http', 'ws')
        .replace('https', 'wss');

      const host: string = window.location.host;

      this.stompClient = new Client({
        brokerURL: `${protocol}//${host}${url}`,
        onConnect: (): void => {
          this.onConnected$.emit();
          observer.next(true);
          observer.complete();
        },
        onChangeState: (activationState: ActivationState): void => {
          const localUserConnected: boolean = activationState === ActivationState.ACTIVE;

          this.connectionHandleService.webSocketConnectionChanged(localUserConnected);
        },
        reconnectDelay: 200,
      });

      this.stompClient.activate();
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

  public subscribe(channel: string, callback: (responseBody: any) => void): void {
    if (this.stompClient?.connected) {
      this.stompClient.subscribe(channel, (response: { body: string; }) => callback(JSON.parse(response.body)));
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
