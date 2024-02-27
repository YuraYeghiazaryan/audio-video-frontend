import {Action, State, StateContext} from '@ngxs/store';
import {Injectable} from '@angular/core';
import {RemoteUser} from "../model/remote-user";
import {UserId} from "../model/types";
import {RoomConnection} from "../model/user";

export interface RemoteUsers {
  [key: UserId]: RemoteUser;
}

export namespace RemoteUsersAction {
  export class AddRemoteUser {
    static readonly type: string = '[remote-users] add remote user';
    constructor(public remoteUser: RemoteUser) {}
  }

  export class RemoveRemoteUser {
    static readonly type: string = '[remote-users] remove remote user';
    constructor(public remoteUser: RemoteUser) {}
  }

  export class SetConnectionState {
    static readonly type: string = '[remote-users] set remote user connection state';
    constructor(public remoteUser: RemoteUser, public connectionState: RoomConnection) {}
  }
}

@State<RemoteUsers>({
  name: RemoteUsersState.storeName,
  defaults: RemoteUsersState.defaults
})
@Injectable()
export class RemoteUsersState {
  static readonly storeName: string = 'remoteUsers';
  static readonly defaults: RemoteUsers = {};

  @Action(RemoteUsersAction.AddRemoteUser)
  addRemoteUser({getState, setState}: StateContext<RemoteUsers>, {remoteUser}: RemoteUsersAction.AddRemoteUser): void {
    const state: RemoteUsers = JSON.parse(JSON.stringify(getState()));
    state[remoteUser.id] = remoteUser;

    setState(state);
  }

  @Action(RemoteUsersAction.RemoveRemoteUser)
  removeRemoteUser({getState, setState}: StateContext<RemoteUsers>, {remoteUser}: RemoteUsersAction.RemoveRemoteUser): void {
    const state: RemoteUsers = JSON.parse(JSON.stringify(getState()));
    delete state[remoteUser.id];

    setState(state);
  }

  @Action(RemoteUsersAction.SetConnectionState)
  setConnectionState({getState, setState}: StateContext<RemoteUsers>, {remoteUser, connectionState}: RemoteUsersAction.SetConnectionState): void {
    const state: RemoteUsers = JSON.parse(JSON.stringify(getState()));
    state[remoteUser.id].roomConnection = connectionState;

    setState(state);
  }
}



