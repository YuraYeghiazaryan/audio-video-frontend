import {Injectable} from "@angular/core";
import {GroupingService} from "./grouping.service";
import {User} from "../model/user";
import {GroupId, TeamId} from "../model/types";


@Injectable({
  providedIn: 'root'
})
export class TeamTalkService {
  private teams: {[key: TeamId]: GroupId} = {};

  private static nextId: TeamId = 0;

  constructor(
    private groupingService: GroupingService
  ) {}

  public async createTeam(users: User[]): Promise<TeamId> {
    const teamId: TeamId = TeamTalkService.nextId++;
    const groupId: GroupId = this.groupingService.createGroup();

    this.teams[teamId] = groupId;
    await this.groupingService.addUsersToGroup(groupId, users);

    return teamId;
  }

  public async addUserToTeam(teamId: TeamId, user: User): Promise<void> {
    const groupId: GroupId = this.teams[teamId];
    if (groupId) {
      await this.groupingService.addUserToGroup(groupId, user);
    }
  }

  public async removeUserFromTeam(teamId: TeamId, user: User): Promise<void> {
    const groupId: GroupId = this.teams[teamId];
    if (groupId) {
      await this.groupingService.removeUserFromGroup(groupId, user);
    }
  }

  public async addUsersToTeam(teamId: TeamId, users: User[]): Promise<void> {
    const groupId: GroupId = this.teams[teamId];
    if (groupId) {
      await this.groupingService.addUsersToGroup(groupId, users);
    }
  }

  public async removeUsersFromTeam(teamId: TeamId, users: User[]): Promise<void> {
    const groupId: GroupId = this.teams[teamId];
    if (groupId) {
      await this.groupingService.removeUsersFromGroup(groupId, users);
    }
  }

  public async deleteTeam(teamId: TeamId): Promise<void> {
    const groupId: GroupId = this.teams[teamId];
    if (groupId) {
      await this.groupingService.deleteGroup(groupId);
      delete this.teams[teamId];
    }
  }

  public async deleteAllTeams(): Promise<void> {
    await this.groupingService.deleteAllGroups();
    this.teams = {};
  }
}
