import {Injectable} from '@angular/core';
import {UserService} from "../user.service";
import {RoomConnection, User} from "../../model/user";
import {RemoteUser} from "../../model/remote-user";
import {Store} from "@ngxs/store";
import {LocalUserState} from "../../state/local-user.state";
import {LocalUser} from "../../model/local-user";
import {RemoteUsers, RemoteUsersAction, RemoteUsersState} from "../../state/remote-users.state";
import {UserId} from "../../model/types";

@Injectable({
  providedIn: 'root'
})
export class UserEventHandleService {
  private localUser: LocalUser = LocalUserState.defaults;
  private remoteUsers: RemoteUsers = RemoteUsersState.defaults;

  constructor(
    private userService: UserService,
    private store: Store
  ) {
    this.listenStoreChanges();
  }

  public onUserConnected(user: User): void {
    if (user.id === this.localUser?.id) {
      return;
    }

    if (user.audioVideoUser) {
      const remoteUser: RemoteUser = user as RemoteUser;
      remoteUser.isAudioListenable = true;
      remoteUser.isVideoVisible = true;

      /* the state of remoteUsers will be changed and zoomApiService will render their videos or not(depending video state)*/
      this.userService.addRemoteUser(remoteUser);
    } else {
      throw Error(`User ${user} doesn't have zoom participant (is not joined to zoom)`);
    }
  }

  public onUserConnectionChanged(userId: number, connected: boolean): void {
    const remoteUser: RemoteUser = this.remoteUsers[userId];
    let connectionState: RoomConnection = RoomConnection.OFFLINE;

    if (connected) {
      connectionState = RoomConnection.ONLINE;
    }

    this.store.dispatch(new RemoteUsersAction.SetConnectionState(remoteUser, connectionState));
  }

  public onUserVideoStateChanged(userId: UserId, isOn: boolean): void {
    const remoteUser: RemoteUser | undefined = this.remoteUsers[userId];
    if (remoteUser) {
      this.store.dispatch(new RemoteUsersAction.SetVideoState(remoteUser, isOn));
    }
  }

  public onUserAudioStateChanged(userId: UserId, isOn: boolean): void {
    const remoteUser: RemoteUser | undefined = this.remoteUsers[userId];
    if (remoteUser) {
      this.store.dispatch(new RemoteUsersAction.SetAudioState(remoteUser, isOn));
    }
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
