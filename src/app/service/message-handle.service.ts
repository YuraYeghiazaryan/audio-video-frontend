import {Injectable} from '@angular/core';
import {WebSocketService} from "./web-socket.service";
import {UserService} from "./user.service";
import {RemoteUser} from "../model/remote-user";
import {RoomConnection, User} from "../model/user";
import {LocalUserState} from "../state/local-user.state";
import {LocalUser} from "../model/local-user";
import {RemoteUsers, RemoteUsersAction, RemoteUsersState} from "../state/remote-users.state";
import {Store} from "@ngxs/store";
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
    private store: Store
  ) {
    this.listenStoreChanges();
  }

  public registerMessageHandlers(roomNumber: number): void {
    this.webSocketService.subscribe(`/topic/${roomNumber}/user-joined`, this.remoteUserConnected.bind(this));
    this.webSocketService.subscribe(`/topic/${roomNumber}/user-connection-state-changed`, this.userConnectionStateChanged.bind(this));
  }


  /** get remote user from BE and add him to remoteUsers of all users */
  private remoteUserConnected(user: User): void {
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



  /** get new state from BE */
  private userConnectionStateChanged({userId, connected}: {userId: UserId, connected: boolean}): void {
    const remoteUser: RemoteUser = this.remoteUsers[userId];
    let connectionState: RoomConnection = RoomConnection.OFFLINE;

    if (connected) {
      connectionState = RoomConnection.ONLINE;
    }

    this.store.dispatch(new RemoteUsersAction.SetConnectionState(remoteUser, connectionState));
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
