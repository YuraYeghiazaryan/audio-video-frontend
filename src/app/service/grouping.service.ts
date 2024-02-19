import {Injectable} from "@angular/core";
import {Group} from "../model/group";
import {ZoomApiServiceService} from "./zoom-api-service.service";
import {User} from "../model/user";
import {GroupId, UserId} from "../model/types";

@Injectable({
  providedIn: 'root'
})
export class GroupingService {
  private groups: {[key: number]: Group} = {};
  private zoomAPIService: ZoomApiServiceService;

  constructor(zoomAPIService: ZoomApiServiceService) {
    this.zoomAPIService = zoomAPIService;
  }

  public createGroup(): number {
    return 0;
  }

  public deleteGroup(groupId: GroupId): void {}

  public joinGroupUser(groupId: GroupId, userId: UserId): void {}

  public leftGroupUser(groupId: GroupId, userIde: UserId): void {}

  public joinGroupUsers(groupId: GroupId, users: User[]): void {}

  public leftGroupUsers(groupId: GroupId, users: User[]): void {}

  public moveUser(fromGroupId: GroupId, toGroupId: GroupId, userId: UserId): void {}

  public joinGroup(toGroupId: GroupId, fromGroupId: GroupId): void {}

}
