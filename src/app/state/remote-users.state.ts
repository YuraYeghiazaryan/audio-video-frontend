import {Action, State, StateContext} from '@ngxs/store';
import {Injectable} from '@angular/core';
import {RemoteUser} from "../model/remote-user";
import {UserId} from "../model/types";
import {RoomConnection} from "../model/user";
import produce from "immer";

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

  export class SetAudioListenable {
    static readonly type: string = '[remote-users] set remote user audio listenable';
    constructor(public remoteUser: RemoteUser, public isAudioListenable: boolean) {}
  }

  export class SetVideoVisible {
    static readonly type: string = '[remote-users] set remote user video visibility';
    constructor(public remoteUser: RemoteUser, public isVideoVisible: boolean) {}
  }

  export class SetAudioState {
    static readonly type: string = '[remote-users] set remote user audio state';
    constructor(public remoteUser: RemoteUser, public isOn: boolean) {}
  }

  export class SetVideoState {
    static readonly type: string = '[remote-users] set remote user video state';
    constructor(public remoteUser: RemoteUser, public isOn: boolean) {}
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
  public addRemoteUser({setState}: StateContext<RemoteUsers>, {remoteUser}: RemoteUsersAction.AddRemoteUser): void {
    setState(
      produce((state: RemoteUsers): void => {
        state[remoteUser.id] = remoteUser;
      })
    );
  }

  @Action(RemoteUsersAction.RemoveRemoteUser)
  public removeRemoteUser({setState}: StateContext<RemoteUsers>, {remoteUser}: RemoteUsersAction.RemoveRemoteUser): void {
    setState(
      produce((state: RemoteUsers): void => {
        delete state[remoteUser.id];
      })
    );
  }

  @Action(RemoteUsersAction.SetConnectionState)
  public setConnectionState({setState}: StateContext<RemoteUsers>, {remoteUser, connectionState}: RemoteUsersAction.SetConnectionState): void {
    setState(
      produce((state: RemoteUsers): void => {
        state[remoteUser.id].roomConnection = connectionState;
      })
    );
  }

  @Action(RemoteUsersAction.SetAudioListenable)
  public setAudioListenable({setState}: StateContext<RemoteUsers>, {remoteUser, isAudioListenable}: RemoteUsersAction.SetAudioListenable): void {
    setState(
      produce((state: RemoteUsers): void => {
        state[remoteUser.id].isAudioListenable = isAudioListenable;
      })
    );
  }

  @Action(RemoteUsersAction.SetVideoVisible)
  public setVideoVisible({setState}: StateContext<RemoteUsers>, {remoteUser, isVideoVisible}: RemoteUsersAction.SetVideoVisible): void {
    setState(
      produce((state: RemoteUsers): void => {
        state[remoteUser.id].isVideoVisible = isVideoVisible;
      })
    );
  }

  @Action(RemoteUsersAction.SetAudioState)
  public setAudioState({setState}: StateContext<RemoteUsers>, {remoteUser, isOn}: RemoteUsersAction.SetAudioState): void {
    setState(
      produce((state: RemoteUsers): void => {
        state[remoteUser.id].audioVideoUser.isAudioOn = isOn;
      })
    );
  }

  @Action(RemoteUsersAction.SetVideoState)
  public setVideoState({setState}: StateContext<RemoteUsers>, {remoteUser, isOn}: RemoteUsersAction.SetVideoState): void {
    setState(
      produce((state: RemoteUsers): void => {
        state[remoteUser.id].audioVideoUser.isVideoOn = isOn;
      })
    );
  }
}



