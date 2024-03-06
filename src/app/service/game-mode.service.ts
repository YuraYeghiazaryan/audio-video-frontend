import {Injectable} from "@angular/core";
import {User} from "../model/user";
import {TeamId} from "../model/types";
import {GameModeAction} from "../state/game-mode.state";
import {Store} from "@ngxs/store";


@Injectable({
  providedIn: 'root'
})
export class GameModeService {

  constructor(
    private store: Store
  ) {}

  public createTeam(users: User[], teamId: TeamId, name: string, color: string): void {
    this.store.dispatch(new GameModeAction.Create(teamId, name, color));
    this.addUsersToTeam(teamId, users);
  }

  public addUserToTeam(teamId: TeamId, user: User): void {
    this.store.dispatch(new GameModeAction.AddUserToTeam(teamId, user.id));
  }

  public removeUserFromTeam(teamId: TeamId, user: User): void {
    this.store.dispatch(new GameModeAction.RemoveUserFromTeam(teamId, user.id));
  }

  public addUsersToTeam(teamId: TeamId, users: User[]): void {
    const userIds = users.map(user => user.id);
    this.store.dispatch(new GameModeAction.AddUsersToTeam(teamId, userIds));
  }

  public removeUsersFromTeam(teamId: TeamId, users: User[]): void {
    const userIds = users.map(user => user.id);
    this.store.dispatch(new GameModeAction.RemoveUsersFromTeam(teamId, userIds));
  }

  public deleteTeam(teamId: TeamId): void {
    this.store.dispatch(new GameModeAction.Delete(teamId));
  }

  public deleteAllTeams(): void {
    this.store.dispatch(new GameModeAction.DeleteAll());
  }

  public async startTeamTalk(): Promise<void> {
    this.store.dispatch(new GameModeAction.StartTeamTalk());
  }

  public async endTeamTalk(): Promise<void> {
    this.store.dispatch(new GameModeAction.EndTeamTalk());
  }
}
