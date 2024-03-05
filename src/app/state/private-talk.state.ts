import {Action, State, StateContext} from "@ngxs/store";
import {Injectable} from "@angular/core";
import {TeamId, UserId} from "../model/types";
import {Team} from "../model/team";

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
  public startTeamTalk({patchState}: StateContext<PrivateTalk>): void {
    patchState({
      isStarted: true
    });
  }

  @Action(PrivateTalkAction.EndPrivateTalk)
  public endTeamTalk({patchState}: StateContext<PrivateTalk>): void {
    patchState({
      isStarted: false
    })
  }
}
