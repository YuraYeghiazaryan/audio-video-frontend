import {Action, State, StateContext} from "@ngxs/store";
import {Injectable} from "@angular/core";
import {UserId} from "../model/types";
import produce from "immer";

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
  public addUser({setState}: StateContext<PrivateTalk>, {userId}: PrivateTalkAction.AddUser): void {
    setState(
      produce((state: PrivateTalk): void => {
        state.userIds.add(userId);
      })
    );
  }

  @Action(PrivateTalkAction.RemoveUser)
  public removeUser({setState}: StateContext<PrivateTalk>, { userId }: PrivateTalkAction.RemoveUser): void {
    setState(
      produce((state: PrivateTalk): void => {
        state.userIds.delete(userId);
      })
    );
  }
}
