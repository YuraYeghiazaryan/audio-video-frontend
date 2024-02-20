import {Injectable} from "@angular/core";
import {GroupingService} from "./grouping.service";
import {User} from "../model/user";
import {GroupId, TeamId, UserId} from "../model/types";


@Injectable({
  providedIn: 'root'
})
export class TeamTalkService {
  private teams: {[key: TeamId]: GroupId} = {};

  constructor(
    private groupingService: GroupingService
  ) {}

  public createTeam(users: User[]): void {}

  public joinTeamUser(teamId: TeamId, userId: UserId): void {}

  public leftTeamUser(teamId: TeamId, userId: UserId): void {}

  public joinTeamUsers(teamId: TeamId, users: User[]): void {}

  public leftTeamUsers(teamId: TeamId, users: User[]): void {}

  public deleteTeam(teamId: TeamId): void {}

  public deleteAllTeams(): void {}
}
