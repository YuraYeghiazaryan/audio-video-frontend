import {Injectable} from "@angular/core";
import {GroupingService} from "./grouping.service";
import {User} from "../model/user";
import {GroupId, TeamId} from "../model/types";


@Injectable({
  providedIn: 'root'
})
export class GameModeService {
  private groups: {
    [key: GroupId]: {
      users: User[],
      localUserListen: boolean,
      localUserSee: boolean
    }
  } = {};

  constructor(
    private groupingService: GroupingService
  ) {}

  public createTeam(users: User[], teamId: TeamId): void {
    // if (this.teams[teamId]) {
    //   return error(`Team with ${teamId} is already exist`);
    // }
    // const groupId: GroupId = this.groupingService.createGroup();
    //
    // this.teams[teamId] = groupId;
    // this.groupingService.addUsersToGroup(groupId, users);
    //
    // return teamId;
  }

  public addUserToTeam(teamId: TeamId, user: User): void {
    // const groupId: GroupId = this.teams[teamId];
    // if (groupId) {
    //   this.groupingService.addUserToGroup(groupId, user);
    // }
  }

  public removeUserFromTeam(teamId: TeamId, user: User): void {
    // const groupId: GroupId = this.teams[teamId];
    // if (groupId) {
    //   this.groupingService.removeUserFromGroup(groupId, user);
    // }
  }

  public addUsersToTeam(teamId: TeamId, users: User[]): void {
    // const groupId: GroupId = this.teams[teamId];
    // if (groupId) {
    //   this.groupingService.addUsersToGroup(groupId, users);
    // }
  }

  public removeUsersFromTeam(teamId: TeamId, users: User[]): void {
    // const groupId: GroupId = this.teams[teamId];
    // if (groupId) {
    //   this.groupingService.removeUsersFromGroup(groupId, users);
    // }
  }

  public deleteTeam(teamId: TeamId): void {
    // const groupId: GroupId = this.teams[teamId];
    // if (groupId) {
    //   this.groupingService.deleteGroup(groupId);
    //   delete this.teams[teamId];
    // }
  }

  public deleteAllTeams(): void {
    // this.groupingService.deleteAllGroups();
    // this.teams = {};
  }

  public async startTeamTalk(): Promise<void> {
  }

  public async endTeamTalk(): Promise<void> {
  }
}
