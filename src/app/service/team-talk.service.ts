import {Injectable} from "@angular/core";
import {GroupingService} from "./grouping.service";
import {User} from "../model/user";
import {GroupId, TeamId} from "../model/types";


@Injectable({
  providedIn: 'root'
})
export class TeamTalkService {
  private teams: {[key: TeamId]: GroupId} = {};

  constructor(
    private groupingService: GroupingService
  ) {}

  public createTeam(users: User[]): void {}

  public addUserToTeam(teamId: TeamId, user: User): void {}

  public removeUserFromTeam(teamId: TeamId, user: User): void {}

  public addUsersToTeam(teamId: TeamId, users: User[]): void {}

  public remoteUsersFromTeam(teamId: TeamId, users: User[]): void {}

  public deleteTeam(teamId: TeamId): void {}

  public deleteAllTeams(): void {}
}
