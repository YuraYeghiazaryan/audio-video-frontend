import {Injectable} from "@angular/core";
import {GroupingService} from "./grouping.service";
import {GroupId, PrivateTalkId} from "../model/types";
import {User} from "../model/user";

@Injectable({
  providedIn: 'root'
})
export class PrivateTalkService {
  private privateTalks: {[key: PrivateTalkId]: GroupId} = {};

  constructor(
    private groupingService: GroupingService
  ) {}

  public startPrivateTalk(user: User): number {
    return 0;
  }

  public joinPrivateTalk(privateTalkId: PrivateTalkId, user: User): void {}

  public leavePrivateTalk(privateTalkId: PrivateTalkId, user: User): void {}

  public endPrivateTalk(privateTalkId: PrivateTalkId): void {}
}
