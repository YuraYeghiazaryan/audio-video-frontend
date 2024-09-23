import {Injectable} from "@angular/core";
import {User} from "../model/user";
import {TeamId, UserId} from "../model/types";
import {GameMode, GameModeAction, GameModeState, Teams, TeamsDTO} from "../state/game-mode.state";
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

  public addUsersToTeam(teamId: TeamId, users: User[]): void {
    const userIds: UserId[] = users.map((user: User) => user.id);
    this.store.dispatch(new GameModeAction.AddUsersToTeam(teamId, userIds));
  }

  public async startGameMode(send: boolean = true): Promise<void> {
    this.store.dispatch(new GameModeAction.StartGameMode);

    if (send) {
      await this.groupingService.sendBreakRoomIntoGroups();
      await lastValueFrom(this.httpClient.post<void>(
        `/api/classroom/game-mode`,
        {
          senderId: this.localUser.id,
          started: true,
          teams: this.toTeamsDTO(this.gameMode.teams)
        }
      ));
    }
  }

  public async endGameMode(send: boolean = true): Promise<void> {
    this.store.dispatch(new GameModeAction.EndGameMode);

    if (send) {
      await this.groupingService.sendBreakRoomIntoGroups();
      await lastValueFrom(this.httpClient.post<void>(
        `/api/classroom/game-mode`,
        {
          senderId: this.localUser.id,
          started: false
        }
      ));
    }
  }

  public async startTeamTalk(send: boolean = true): Promise<void> {
    this.store.dispatch(new GameModeAction.StartTeamTalk());

    if (send) {
      await this.groupingService.sendBreakRoomIntoGroups();
      await lastValueFrom(this.httpClient.post<void>(
        `/api/classroom/team-talk`,
        {
          senderId: this.localUser.id,
          started: true
        }
      ));
    }
  }

  public async endTeamTalk(send: boolean = true): Promise<void> {
    this.store.dispatch(new GameModeAction.EndTeamTalk());

    if (send) {
      await this.groupingService.sendBreakRoomIntoGroups();
      await lastValueFrom(this.httpClient.post<void>(
        `/api/classroom/team-talk`,
        {
          senderId: this.localUser.id,
          started: false
        }
      ));
    }
  }

  private toTeamsDTO(teams: Teams): TeamsDTO {
    const teamsDTO: TeamsDTO = {};
    Object.values(teams)
      .forEach((team: Team): void => {
        teamsDTO[team.id] = {
          ...team,
          userIds: [...team.userIds]
        };
      });

    return teamsDTO;
  }

  private listenStoreChanges(): void {
    this.store.select(GameModeState).subscribe((gameMode: GameMode): void => {
      this.gameMode = gameMode;
    });
    this.store.select(LocalUserState).subscribe((localUser: LocalUser): void => {
      this.localUser = localUser;
    });
  }
}
