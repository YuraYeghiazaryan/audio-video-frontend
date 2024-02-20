import {Injectable} from "@angular/core";
import {Group} from "../model/group";
import {User} from "../model/user";
import {GroupId, UserId} from "../model/types";
import {UserService} from "./user.service";
import {AudioSubscriptionService} from "./audio-subscription.service";

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

  public joinGroupUser(groupId: GroupId, userId: UserId): void {}

  public leftGroupUser(groupId: GroupId, userIde: UserId): void {}

  public joinGroupUsers(groupId: GroupId, users: User[]): void {}

  public leftGroupUsers(groupId: GroupId, users: User[]): void {}

  public moveUser(fromGroupId: GroupId, toGroupId: GroupId, userId: UserId): void {}

  public joinGroup(toGroupId: GroupId, fromGroupId: GroupId): void {}

}
