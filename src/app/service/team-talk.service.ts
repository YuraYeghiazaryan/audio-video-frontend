import {Injectable} from "@angular/core";
import {GroupingService} from "./grouping.service";
import {Group} from "../model/group";
import {User} from "../model/user";
import {GroupId, TeamId, UserId} from "../model/types";



@Injectable({
  providedIn: 'root'
})
export class TeamTalkService {
  private groupingService: GroupingService;
  private teams: {[key: TeamId]: GroupId} = {};

  constructor(groupingService: GroupingService) {
    this.groupingService = groupingService;
  }

  public createTeam(users: User[]): void {}

  public joinTeamUser(teamId: TeamId, userId: UserId): void {}

  public leftTeamUser(teamId: TeamId, userId: UserId): void {}

  public joinTeamUsers(teamId: TeamId, users: User[]): void {}

  public leftTeamUsers(teamId: TeamId, users: User[]): void {}

  public deleteTeam(teamId: TeamId): void {}

  public deleteAllTeams(): void {}
}
