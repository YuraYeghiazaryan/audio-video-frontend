import {Action, State, StateContext} from "@ngxs/store";
import {Injectable} from "@angular/core";
import {TeamId, UserId} from "../model/types";
import {Team, TeamDTO} from "../model/team";
import produce from "immer";

export interface Teams {
  [key: TeamId]: Team
}
export interface TeamsDTO {
  [key: TeamId]: TeamDTO
}

export interface GameMode {
  isStarted: boolean;
  isTeamTalkStarted: boolean;
  teams: Teams;
}

export namespace GameModeAction {
  export class CreateTeam {
    static readonly type: string = '[game-mode] create Team';
    constructor(public teamId: TeamId, public name: string, public color: string) {}
  }

  export class DeleteTeam {
    static readonly type: string = '[game-mode] delete Team';
    constructor(public teamId: TeamId) {}
  }

  export class DeleteAllTeams {
    static readonly type: string = '[game-mode] delete all Teams';
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
    isTeamTalkStarted: false,
    teams: {}
  };

  @Action(GameModeAction.CreateTeam)
  public createTeam({setState}: StateContext<GameMode>, {teamId, name, color}: GameModeAction.CreateTeam): void {
    setState(
      produce((state: GameMode): void => {
        if (state.teams[teamId]) {
          throw Error(`Team ${teamId} already exists`);
        }

        state.teams[teamId] = {
          id: teamId,
          name,
          color,
          userIds: new Set<UserId>()
        };
      })
    );
  }

  @Action(GameModeAction.DeleteTeam)
  public deleteTeam({setState}: StateContext<GameMode>, {teamId}: GameModeAction.DeleteTeam): void {
    setState(
      produce((state: GameMode): void => {
        delete state.teams[teamId];
      })
    );
  }

  @Action(GameModeAction.DeleteAllTeams)
  public deleteAllTeams({patchState}: StateContext<GameMode>): void {
    patchState({
      teams: {}
    });
  }

  @Action(GameModeAction.AddUserToTeam)
  public addUserToTeam({setState}: StateContext<GameMode>, {teamId, userId}: GameModeAction.AddUserToTeam): void {
    setState(
      produce((state: GameMode): void => {
        if (!state.teams[teamId]) {
          throw Error(`Team ${teamId} does not exists`);
        }

        state.teams[teamId].userIds.add(userId);
      })
    );
  }

  @Action(GameModeAction.RemoveUserFromTeam)
  public removeUserFromTeam({setState}: StateContext<GameMode>, {teamId, userId}: GameModeAction.RemoveUserFromTeam): void {
    setState(
      produce((state: GameMode): void => {
        if (!state.teams[teamId]) {
          throw Error(`Team ${teamId} does not exists`);
        }

        state.teams[teamId].userIds.delete(userId)
      })
    );
  }

  @Action(GameModeAction.AddUsersToTeam)
  public addUsersToTeam({setState}: StateContext<GameMode>, {teamId, userIds}: GameModeAction.AddUsersToTeam): void {
    setState(
      produce((state: GameMode): void => {
        if (!state.teams[teamId]) {
          throw Error(`Team ${teamId} does not exists`);
        }

        userIds.forEach((userId: UserId): void => {
          state.teams[teamId].userIds.add(userId);
        });
      })
    );
  }

  @Action(GameModeAction.RemoveUsersFromTeam)
  public removeUsersFromTeam({setState}: StateContext<GameMode>, {teamId, userIds}: GameModeAction.RemoveUsersFromTeam): void {
    setState(
      produce((state: GameMode): void => {
        if (!state.teams[teamId]) {
          throw Error(`Team ${teamId} does not exists`);
        }

        userIds.forEach((userId: UserId): boolean => state.teams[teamId].userIds.delete(userId));
      })
    );
  }

  @Action(GameModeAction.MoveUser)
  public moveUser({setState}: StateContext<GameMode>, {fromTeamId, toTeamId, userId}: GameModeAction.MoveUser): void {
    setState(
      produce((state: GameMode): void => {
        if (!state.teams[fromTeamId] || !state.teams[toTeamId]) {
          throw Error(`Team ${fromTeamId} or ${toTeamId} does not exists`);
        }

        state.teams[fromTeamId].userIds.delete(userId);
        state.teams[toTeamId].userIds.add(userId);
      })
    );
  }

  @Action(GameModeAction.MergeTeams)
  public mergeTeams({setState}: StateContext<GameMode>, {fromTeamId, toTeamId}: GameModeAction.MergeTeams): void {
    setState(
      produce((state: GameMode): void => {
        if (!state.teams[fromTeamId] || !state.teams[toTeamId]) {
          throw Error(`Team ${fromTeamId} or ${toTeamId} does not exists`);
        }

        const userIdsToMove: UserId[] = Object.values(state.teams[fromTeamId].userIds);
        userIdsToMove.forEach((userId: UserId): Set<UserId> => state.teams[toTeamId].userIds.add(userId));
        delete state.teams[fromTeamId];
      })
    );
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
      isStarted: false,
      isTeamTalkStarted: false,
      teams: []
    })
  }

  @Action(GameModeAction.StartTeamTalk)
  public startTeamTalk({patchState}: StateContext<GameMode>): void {
    patchState({
      isTeamTalkStarted: true
    });
  }

  @Action(GameModeAction.EndTeamTalk)
  public endTeamTalk({patchState}: StateContext<GameMode>): void {
    patchState({
      isTeamTalkStarted: false
    })
  }
}
