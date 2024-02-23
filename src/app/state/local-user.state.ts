import {Action, State, StateContext} from '@ngxs/store';
import {Injectable} from '@angular/core';
import {LocalUser} from "../model/local-user";
import {ConnectionState, Role, ZoomUser} from "../model/user";

export namespace LocalUserAction {
  export class SetLocalUser {
    public static readonly type: string = '[local-user] set local user';
    constructor(public localUser: LocalUser) {}
  }

  export class SetZoomUser {
    public static readonly type: string = '[local-user] set zoom user';
    constructor(public zoomUser: ZoomUser) {}
  }

  export class SetIsVideoOn {
    public static readonly type: string = '[local-user] set isVideoOn';
    constructor(public isVideoOn: boolean) {}
  }

  export class SetIsAudioOn {
    public static readonly type: string = '[local-user] set isAudioOn';
    constructor(public isAudioOn: boolean) {}
  }

  export class SetConnectionState {
    public static readonly type: string = '[local-user] set connectionState';
    constructor(public connectionState: ConnectionState) {}
  }
}

@State<LocalUser>({
  name: LocalUserState.storeName,
  defaults: LocalUserState.defaults
})
@Injectable()
export class LocalUserState {
  static readonly storeName: string = 'local-user';
  static readonly defaults: LocalUser = {
    id: -1,
    role: Role.STUDENT,
    username: "",
    connectionState: ConnectionState.OFFLINE
  };

  @Action(LocalUserAction.SetLocalUser)
  public setLocalUser({setState}: StateContext<LocalUser>, {localUser}: LocalUserAction.SetLocalUser): void {
    setState(localUser);
  }

  @Action(LocalUserAction.SetZoomUser)
  public setZoomUser({patchState}: StateContext<LocalUser>, {zoomUser}: LocalUserAction.SetZoomUser): void {
    patchState({zoomUser});
  }

  @Action(LocalUserAction.SetIsVideoOn)
  public setIsVideoOn({getState, setState}: StateContext<LocalUser>, {isVideoOn}: LocalUserAction.SetIsVideoOn): void {
    const state: LocalUser = getState();
    if (!state.zoomUser) {
      throw Error('Can\'t set isVideoOn. Local user doesn\'t have zoomUser');
    }

    state.zoomUser.isVideoOn = isVideoOn;
    setState(state);
  }

  @Action(LocalUserAction.SetIsAudioOn)
  public setIsAudioOn({getState, setState}: StateContext<LocalUser>, {isAudioOn}: LocalUserAction.SetIsAudioOn): void {
    const state: LocalUser = getState();
    if (!state.zoomUser) {
      throw Error('Can\'t set isAudioOn. Local user doesn\'t have zoomUser');
    }

    state.zoomUser.isAudioOn = isAudioOn;
    setState(state);
  }

  @Action(LocalUserAction.SetConnectionState)
  public setConnectionState({patchState}: StateContext<LocalUser>, {connectionState}: LocalUserAction.SetConnectionState): void {
    patchState({connectionState})
  }
}



