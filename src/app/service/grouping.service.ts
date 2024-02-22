import {Injectable} from "@angular/core";
import {User} from "../model/user";
import {GroupId, UserId} from "../model/types";
import {UserService} from "./user.service";
import {AudioSubscriptionService} from "./audio-subscription.service";

class Group {
  public readonly id: GroupId;

  private static nextId: GroupId = 0;
  private users: {[key: UserId]: User} = {};

  constructor() {
    this.id = Group.nextId++;
  }

  public addUser(user: User): void {
    this.users[user.id] = user;
  }

  public removeUser(user: User): void {
    delete this.users[user.id];
  }
}


@Injectable({
  providedIn: 'root'
})
export class GroupingService {
  private groups: {[key: GroupId]: Group} = {};

  constructor(
    private audioSubscriptionService: AudioSubscriptionService,
    private userService: UserService
  ) {}

  public createGroup(): number {
    return 0;
  }

  public deleteGroup(groupId: GroupId): void {
    delete this.groups[groupId];
  }

  public addUserToGroup(groupId: GroupId, user: User): void {}

  public removeUserFromGroup(groupId: GroupId, user: User): void {}

  public addUsersToGroup(groupId: GroupId, users: User[]): void {}

  public removeUsersFromGroup(groupId: GroupId, users: User[]): void {}

  public moveUser(fromGroupId: GroupId, toGroupId: GroupId, user: User): void {}

  public mergeGroups(toGroupId: GroupId, fromGroupId: GroupId): void {}
}
