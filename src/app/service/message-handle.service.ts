import {Injectable} from '@angular/core';
import {WebSocketService} from "./web-socket.service";
import {User} from "../model/user";
import {UserId} from "../model/types";
import {UserEventHandleService} from "./event-handler/user-event-handle.service";
import {AudioVideoService} from "./audio-video/audio-video.service";
import {Group} from "./grouping.service";

@Injectable({
  providedIn: 'root'
})
export class MessageHandleService {

  constructor(
    private webSocketService: WebSocketService,
    private userEventHandleService: UserEventHandleService,
    private audioVideoService: AudioVideoService
  ) {}

  public registerMessageHandlers(roomNumber: number): void {
    this.webSocketService.subscribe(`/topic/${roomNumber}/user-joined`, this.remoteUserConnected.bind(this));
    this.webSocketService.subscribe(`/topic/${roomNumber}/user-connection-state-changed`, this.userConnectionStateChanged.bind(this));
    this.webSocketService.subscribe(`/topic/${roomNumber}/user-video-state-changed`, this.userVideoStateChanged.bind(this));

    this.webSocketService.subscribe(`/topic/${roomNumber}/audio-video-groups-changed`, this.audioVideoGroupsChanged.bind(this));
  }


  /** get remote user from BE and add him to remoteUsers of all users */
  private remoteUserConnected(user: User): void {
    this.userEventHandleService.onUserConnected(user);
  }

  /** get remote user from BE and add him to remoteUsers of all users */
  private userVideoStateChanged({userId, isOn}: {userId: UserId, isOn: boolean}): void {
    this.userEventHandleService.onUserVideoStateChanged(userId, isOn);
  }

  /** get new state from BE */
  private userConnectionStateChanged({userId, connected}: {userId: UserId, connected: boolean}): void {
    this.userEventHandleService.onUserConnectionChanged(userId, connected);
  }

  private audioVideoGroupsChanged(groups: Group[]): void {
    this.audioVideoService.breakRoomIntoGroups(groups).then();
  }
}
