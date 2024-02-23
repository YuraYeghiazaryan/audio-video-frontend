import {Injectable} from '@angular/core';
import {WebSocketService} from "./web-socket.service";
import {ClassroomService} from "./classroom.service";
import {UserService} from "./user.service";
import {RemoteUser} from "../model/remote-user";
import {ConnectionState, User} from "../model/user";
import {ClassroomState} from "../state/classroom.state";
import {Classroom} from "../model/classroom";
import {LocalUserState} from "../state/local-user.state";
import {LocalUser} from "../model/local-user";
import {RemoteUsers, RemoteUsersState} from "../state/remote-users.state";
import {Store} from "@ngxs/store";
import {ZoomApiService} from "./zoom-api.service";
import {UserId} from "../model/types";

@Injectable({
  providedIn: 'root'
})
export class MessageHandleService {
  private localUser: LocalUser = LocalUserState.defaults;
  private remoteUsers: RemoteUsers = RemoteUsersState.defaults;

  constructor(
    private webSocketService: WebSocketService,
    private userService: UserService,
    private zoomApiService: ZoomApiService,
    private store: Store
  ) {
    this.listenStoreChanges();
  }

  public registerMessageHandlers(roomNumber: number): void {
    this.webSocketService.subscribe(`/topic/${roomNumber}/user-joined`, this.remoteUserConnected.bind(this));
    this.webSocketService.subscribe(`/topic/${roomNumber}/user-connection-state-changed`, this.userConnectionStateChanged.bind(this));
  }


  private remoteUserConnected(responseBody: string): void {
    const user: User = JSON.parse(responseBody) as User;
    if (user.id === this.localUser?.id) {
      return;
    }

    if (user.zoomUser) {
      const remoteUser: RemoteUser = user as RemoteUser;

      this.userService.addRemoteUser(remoteUser);
    } else {
      throw Error(`User ${user} doesn't have zoom participant (is not joined to zoom)`);
    }
  }


  private userConnectionStateChanged(responseBody: string): void {
    const {userId, connectionState}: {userId: UserId, connectionState: ConnectionState} = JSON.parse(responseBody) as {userId: UserId, connectionState: ConnectionState};

    const remoteUser: RemoteUser = this.remoteUsers[userId];

    /* @TODO change connection state */
  }

  private listenStoreChanges(): void {
    this.store.select(LocalUserState).subscribe((localUser: LocalUser): void => {
      this.localUser = localUser;
    });
    this.store.select(RemoteUsersState).subscribe((remoteUsers: RemoteUsers): void => {
      this.remoteUsers = remoteUsers;
    });
  }
}
