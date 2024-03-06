import {Action, State, StateContext} from "@ngxs/store";
import {Injectable} from "@angular/core";
import {UserId} from "../model/types";

export interface PrivateTalk {
  isStarted: boolean;
  userIds: Set<UserId>;
}

export namespace PrivateTalkAction {

  export class StartPrivateTalk {
    static readonly type: string = '[private-talk] start Private talk';
    constructor() {}
  }

  export class EndPrivateTalk {
    static readonly type: string = '[private-talk] end Private talk';
    constructor() {}
  }

  export class AddUser {
    static readonly type: string = '[private-talk] add user to Private talk';
    constructor(public userId: UserId) {}
  }

  export class RemoveUser {
    static readonly type: string = '[private-talk] remove user from Private talk';
    constructor(public userId: UserId) {}
  }
}

@State<PrivateTalk>({
  name: PrivateTalkState.storeName,
  defaults: PrivateTalkState.defaults
})
@Injectable()
export class PrivateTalkState {
  static readonly storeName: string = 'privateTalk';
  static readonly defaults: PrivateTalk = {
    isStarted: false,
    userIds: new Set<UserId>()
  };

  @Action(PrivateTalkAction.StartPrivateTalk)
  public startPrivateTalk({patchState}: StateContext<PrivateTalk>): void {
    patchState({
      isStarted: true
    });
  }

  @Action(PrivateTalkAction.EndPrivateTalk)
  public endPrivateTalk({patchState}: StateContext<PrivateTalk>): void {
    patchState({
      isStarted: false
    })
  }

  @Action(PrivateTalkAction.AddUser)
  public addUser({getState, patchState}: StateContext<PrivateTalk>, {userId}: PrivateTalkAction.AddUser): void {
    const state: PrivateTalk = getState();
    state.userIds.add(userId);

    patchState({
      userIds: new Set([...state.userIds])
    });
  }

  @Action(PrivateTalkAction.RemoveUser)
  public removeUser({ getState, patchState }: StateContext<PrivateTalk>, { userId }: PrivateTalkAction.RemoveUser): void {
    const state: PrivateTalk = getState();
    state.userIds.delete(userId);

    patchState({
      userIds: new Set([...state.userIds])
    });
  }
}
