import {Injectable} from "@angular/core";
import {User} from "../model/user";
import {TeamId, UserId} from "../model/types";
import {GameMode, GameModeAction, GameModeState, Teams, TeamsDAO} from "../state/game-mode.state";
import {Store} from "@ngxs/store";
import {HttpClient} from "@angular/common/http";
import {Classroom} from "../model/classroom";
import {ClassroomState} from "../state/classroom.state";
import {lastValueFrom} from "rxjs";
import {Team} from "../model/team";
import {LocalUser} from "../model/local-user";
import {LocalUserState} from "../state/local-user.state";
import {GroupingService} from "./grouping.service";


@Injectable({
  providedIn: 'root'
})
export class GameModeService {
  private classroom: Classroom = ClassroomState.defaults;
  private gameMode: GameMode = GameModeState.defaults;
  private localUser: LocalUser = LocalUserState.defaults;

  constructor(
    private groupingService: GroupingService,
    private store: Store,
    private httpClient: HttpClient
  ) {
    this.listenStoreChanges();
  }

  public createTeam(users: User[], teamId: TeamId, name: string, color: string): void {
    this.store.dispatch(new GameModeAction.CreateTeam(teamId, name, color));
    this.addUsersToTeam(teamId, users);
  }

  public addUserToTeam(teamId: TeamId, user: User): void {
    this.store.dispatch(new GameModeAction.AddUserToTeam(teamId, user.id));
  }

  public removeUserFromTeam(teamId: TeamId, user: User): void {
    this.store.dispatch(new GameModeAction.RemoveUserFromTeam(teamId, user.id));
  }

  public addUsersToTeam(teamId: TeamId, users: User[]): void {
    const userIds: UserId[] = users.map((user: User) => user.id);
    this.store.dispatch(new GameModeAction.AddUsersToTeam(teamId, userIds));
  }

  public removeUsersFromTeam(teamId: TeamId, users: User[]): void {
    const userIds: UserId[] = users.map((user: User) => user.id);
    this.store.dispatch(new GameModeAction.RemoveUsersFromTeam(teamId, userIds));
  }

  public deleteTeam(teamId: TeamId): void {
    this.store.dispatch(new GameModeAction.DeleteTeam(teamId));
  }

  public deleteAllTeams(): void {
    this.store.dispatch(new GameModeAction.DeleteAllTeams());
  }

  public async startGameMode(send: boolean = true): Promise<void> {
    this.store.dispatch(new GameModeAction.StartGameMode);

    if (send) {
      await this.groupingService.breakRoomIntoGroups(send);
      await lastValueFrom(this.httpClient.post<void>(
        `/api/classroom/${this.classroom.roomNumber}/game-mode`,
        {
          senderId: this.localUser.id,
          started: true,
          teams: this.toTeamsDAO(this.gameMode.teams)
        }
      ));
    }

    await this.groupingService.updateGroups();
  }

  public async endGameMode(send: boolean = true): Promise<void> {
    this.store.dispatch(new GameModeAction.EndGameMode);

    if (send) {
      await this.groupingService.breakRoomIntoGroups(send);
      await lastValueFrom(this.httpClient.post<void>(
        `/api/classroom/${this.classroom.roomNumber}/game-mode`,
        {
          senderId: this.localUser.id,
          started: false
        }
      ));
    }

    await this.groupingService.updateGroups();
  }

  public async startTeamTalk(send: boolean = true): Promise<void> {
    this.store.dispatch(new GameModeAction.StartTeamTalk());

    if (send) {
      await this.groupingService.breakRoomIntoGroups(send);
      await lastValueFrom(this.httpClient.post<void>(
        `/api/classroom/${this.classroom.roomNumber}/team-talk`,
        {
          senderId: this.localUser.id,
          started: true
        }
      ));
    }

    await this.groupingService.updateGroups();
  }

  public async endTeamTalk(send: boolean = true): Promise<void> {
    this.store.dispatch(new GameModeAction.EndTeamTalk());

    if (send) {
      await this.groupingService.breakRoomIntoGroups(send);
      await lastValueFrom(this.httpClient.post<void>(
        `/api/classroom/${this.classroom.roomNumber}/team-talk`,
        {
          senderId: this.localUser.id,
          started: false
        }
      ));
    }

    await this.groupingService.updateGroups();
  }

  private toTeamsDAO(teams: Teams): TeamsDAO {
    const teamsDAO: TeamsDAO = {};
    Object.values(teams)
      .forEach((team: Team): void => {
        teamsDAO[team.id] = {
          ...team,
          userIds: [...team.userIds]
        };
      });

    return teamsDAO;
  }

  private listenStoreChanges(): void {
    this.store.select(ClassroomState).subscribe((classroom: Classroom): void => {
      this.classroom = classroom;
    });
    this.store.select(GameModeState).subscribe((gameMode: GameMode): void => {
      this.gameMode = gameMode;
    });
    this.store.select(LocalUserState).subscribe((localUser: LocalUser): void => {
      this.localUser = localUser;
    });
  }
}
