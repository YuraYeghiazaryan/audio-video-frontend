import {Injectable} from "@angular/core";
import {GroupingService} from "./grouping.service";
import {GroupId, PrivateTalkId, UserId} from "../model/types";

@Injectable({
  providedIn: 'root'
})
export class PrivateTalkService {
  private groupingService: GroupingService;
  private privateTalks: {[key: PrivateTalkId]: GroupId} = {};

  constructor(groupingService: GroupingService) {
    this.groupingService = groupingService;
  }

  public startPrivateTalk(userId: UserId): number { return 0; }

  public joinPrivateTalk(privateTalkId: PrivateTalkId, userId: UserId): void {}

  public leavePrivateTalk(privateTalkId: PrivateTalkId, userId: UserId): void {}

  public endPrivateTalk(privateTalkId: PrivateTalkId): void {}
}
