import {Action, State, StateContext} from "@ngxs/store";
import {Injectable} from "@angular/core";
import {TeamId, UserId} from "../model/types";
import {Team} from "../model/team";

export interface Teams {
  [key: TeamId]: Team
}

export interface GameMode {
  isStarted: boolean;
  isTeamTalkOn: boolean;
  teams: Teams;
}

export namespace GameModeAction {
  export class Create {
    static readonly type: string = '[game-mode] create Team';
    constructor(public teamId: TeamId, public name: string, public color: string) {}
  }

  export class Delete {
    static readonly type: string = '[game-mode] delete Team';
    constructor(public teamId: TeamId) {}
  }

  export class DeleteAll {
    static readonly type: string = '[game-mode] delete all Team';
    constructor() {}
  }

  export class AddUserToTeam {
    static readonly type: string = '[game-mode] add user to Team';
    constructor(public teamId: TeamId, public userId: UserId) {}
  }

  export class RemoveUserFromTeam {
    static readonly type: string = '[game-mode] remove user from Team';
    constructor(public teamId: TeamId, public userId: UserId) {}
  }

  export class AddUsersToTeam {
    static readonly type: string = '[game-mode] add users to Team';
    constructor(public teamId: TeamId, public userIds: UserId[]) {}
  }

  export class RemoveUsersFromTeam {
    static readonly type: string = '[game-mode] remove users from Team';
    constructor(public teamId: TeamId, public userIds: UserId[]) {}
  }

  export class MoveUser {
    static readonly type: string = '[game-mode] move users fromTo Team';
    constructor(public fromTeamId: TeamId, public toTeamId: TeamId, public userId: UserId) {}
  }

  export class MergeTeams {
    static readonly type: string = '[game-mode] merge teams';
    constructor(public fromTeamId: TeamId, public toTeamId: TeamId) {}
  }

  export class StartGameMode {
    static readonly type: string = '[game-mode] start game mode';
    constructor() {}
  }

  export class EndGameMode {
    static readonly type: string = '[game-mode] end game mode';
    constructor() {}
  }

  export class StartTeamTalk {
    static readonly type: string = '[game-mode] start Team talk';
    constructor() {}
  }

  export class EndTeamTalk {
    static readonly type: string = '[game-mode] end Team talk';
    constructor() {}
  }
}

@State<GameMode>({
  name: GameModeState.storeName,
  defaults: GameModeState.defaults
})
@Injectable()
export class GameModeState {
  static readonly storeName: string = 'gameMode';
  static readonly defaults: GameMode = {
    isStarted: false,
    isTeamTalkOn: false,
    teams: {}
  };

  @Action(GameModeAction.Create)
  public createTeam({getState, setState}: StateContext<GameMode>, {teamId, name, color}: GameModeAction.Create): void {
    const state: GameMode = JSON.parse(JSON.stringify(getState()));

    if (state.teams[teamId]) {
      throw Error(`Team ${teamId} already exists`);
    }

    state.teams[teamId] = {
      id: teamId,
      name,
      color,
      userIds: new Set<UserId>()
    };

    setState(state);
  }

  @Action(GameModeAction.Delete)
  public deleteTeam({getState, setState}: StateContext<GameMode>, {teamId}: GameModeAction.Create): void {
    const state: GameMode = JSON.parse(JSON.stringify(getState()));
    delete state.teams[teamId];

    setState(state);
  }

  @Action(GameModeAction.DeleteAll)
  public deleteAllTeams({patchState}: StateContext<GameMode>): void {
    patchState({
      teams: {}
    });
  }

  @Action(GameModeAction.AddUserToTeam)
  public addUserToTeam({getState, setState}: StateContext<GameMode>, {teamId, userId}: GameModeAction.AddUserToTeam): void {
    const state: GameMode = JSON.parse(JSON.stringify(getState()));

    if (!state.teams[teamId]) {
      throw Error(`Team ${teamId} does not exists`);
    }

    state.teams[teamId].userIds.add(userId);

    setState(state);
  }

  @Action(GameModeAction.RemoveUserFromTeam)
  public removeUserFromTeam({getState, setState}: StateContext<GameMode>, {teamId, userId}: GameModeAction.RemoveUserFromTeam): void {
    const state: GameMode = JSON.parse(JSON.stringify(getState()));

    if (!state.teams[teamId]) {
      throw Error(`Team ${teamId} does not exists`);
    }

    state.teams[teamId].userIds.delete(userId)

    setState(state);
  }

  @Action(GameModeAction.AddUsersToTeam)
  public addUsersToTeam({getState, setState}: StateContext<GameMode>, {teamId, userIds}: GameModeAction.AddUsersToTeam): void {
    const state: GameMode = JSON.parse(JSON.stringify(getState()));

    if (!state.teams[teamId]) {
      throw Error(`Team ${teamId} does not exists`);
    }

    userIds.forEach((userId: UserId): Set<UserId> => state.teams[teamId].userIds.add(userId));

    setState(state);
  }

  @Action(GameModeAction.RemoveUsersFromTeam)
  public removeUsersFromTeam({getState, setState}: StateContext<GameMode>, {teamId, userIds}: GameModeAction.RemoveUsersFromTeam): void {
    const state: GameMode = JSON.parse(JSON.stringify(getState()));

    if (!state.teams[teamId]) {
      throw Error(`Team ${teamId} does not exists`);
    }

    userIds.forEach((userId: UserId): boolean => state.teams[teamId].userIds.delete(userId));

    setState(state);
  }

  @Action(GameModeAction.MoveUser)
  public moveUser({getState, setState}: StateContext<GameMode>, {fromTeamId, toTeamId, userId}: GameModeAction.MoveUser): void {
    const state: GameMode = JSON.parse(JSON.stringify(getState()));

    if (!state.teams[fromTeamId] || !state.teams[toTeamId]) {
      throw Error(`Team ${fromTeamId} or ${toTeamId} does not exists`);
    }

    state.teams[fromTeamId].userIds.delete(userId);
    state.teams[toTeamId].userIds.add(userId);

    setState(state);
  }

  @Action(GameModeAction.MergeTeams)
  public mergeTeams({getState, setState}: StateContext<GameMode>, {fromTeamId, toTeamId}: GameModeAction.MergeTeams): void {
    const state: GameMode = JSON.parse(JSON.stringify(getState()));

    if (!state.teams[fromTeamId] || !state.teams[toTeamId]) {
      throw Error(`Team ${fromTeamId} or ${toTeamId} does not exists`);
    }

    const userIdsToMove: UserId[] = Object.values(state.teams[fromTeamId].userIds);
    userIdsToMove.forEach((userId: UserId): Set<UserId> => state.teams[toTeamId].userIds.add(userId));
    delete state.teams[fromTeamId];

    setState(state);
  }

  @Action(GameModeAction.StartGameMode)
  public startGameMode({patchState}: StateContext<GameMode>): void {
    patchState({
      isStarted: true
    });
  }

  @Action(GameModeAction.EndGameMode)
  public endGameMode({patchState}: StateContext<GameMode>): void {
    patchState({
      isStarted: false
    })
  }

  @Action(GameModeAction.StartTeamTalk)
  public startTeamTalk({patchState}: StateContext<GameMode>): void {
    patchState({
      isTeamTalkOn: true
    });
  }

  @Action(GameModeAction.EndTeamTalk)
  public endTeamTalk({patchState}: StateContext<GameMode>): void {
    patchState({
      isTeamTalkOn: false
    })
  }
}
