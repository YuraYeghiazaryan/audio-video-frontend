import {Action, State, StateContext} from '@ngxs/store';
import {Injectable} from '@angular/core';
import {LocalUser} from "../model/local-user";
import {RemoteUser} from "../model/remote-user";
import {UserId} from "../model/types";

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
}

@State<RemoteUsers>({
  name: RemoteUsersState.storeName,
  defaults: RemoteUsersState.defaults
})
@Injectable()
export class RemoteUsersState {
  static readonly storeName: string = 'remote-users';
  static readonly defaults: RemoteUsers = {};

  @Action(RemoteUsersAction.AddRemoteUser)
  addRemoteUser({getState, setState}: StateContext<RemoteUsers>, {remoteUser}: RemoteUsersAction.AddRemoteUser): void {
    const state: RemoteUsers = getState();
    state[remoteUser.id] = remoteUser;

    setState(state);
  }

  @Action(RemoteUsersAction.RemoveRemoteUser)
  removeRemoteUser({getState, setState}: StateContext<RemoteUsers>, {remoteUser}: RemoteUsersAction.RemoveRemoteUser): void {
    const state: RemoteUsers = getState();
    delete state[remoteUser.id];

    setState(state);
  }
}



