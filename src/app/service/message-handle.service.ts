import {Injectable} from '@angular/core';
import {WebSocketService} from "./web-socket.service";
import {User} from "../model/user";
import {UserId} from "../model/types";
import {UserEventHandleService} from "./event-handler/user-event-handle.service";

@Injectable({
  providedIn: 'root'
})
export class MessageHandleService {

  constructor(
    private webSocketService: WebSocketService,
    private userEventHandleService: UserEventHandleService,
  ) {}

  public registerMessageHandlers(roomNumber: number): void {
    this.webSocketService.subscribe(`/topic/${roomNumber}/user-joined`, this.remoteUserConnected.bind(this));
    this.webSocketService.subscribe(`/topic/${roomNumber}/user-connection-state-changed`, this.userConnectionStateChanged.bind(this));
  }


  /** get remote user from BE and add him to remoteUsers of all users */
  private remoteUserConnected(user: User): void {
    this.userEventHandleService.onUserConnected(user);
  }

  /** get new state from BE */
  private userConnectionStateChanged({userId, connected}: {userId: UserId, connected: boolean}): void {
    this.userEventHandleService.onUserConnectionChanged(userId, connected);
  }
}
