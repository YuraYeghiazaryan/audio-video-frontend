import {Injectable} from "@angular/core";
import {GroupingService} from "./grouping.service";
import {GroupId, PrivateTalkId} from "../model/types";
import {User} from "../model/user";

@Injectable({
  providedIn: 'root'
})
export class PrivateTalkService {
  private privateTalks: {[key: PrivateTalkId]: GroupId} = {};

  private static nextId: PrivateTalkId = 0;

  constructor(
    private groupingService: GroupingService
  ) {}

  public async startPrivateTalk(user: User): Promise<PrivateTalkId> {
    const privateTalkId: PrivateTalkId = PrivateTalkService.nextId;
    const groupId: GroupId = this.groupingService.createGroup();

    this.privateTalks[privateTalkId] = groupId;
    await this.groupingService.addUserToGroup(groupId, user);

    return privateTalkId;
  }

  public async joinPrivateTalk(privateTalkId: PrivateTalkId, user: User): Promise<void> {
    const groupId: GroupId = this.privateTalks[privateTalkId];
    if (groupId) {
      await this.groupingService.addUserToGroup(groupId, user);
    }
  }

  public async leavePrivateTalk(privateTalkId: PrivateTalkId, user: User): Promise<void> {
    const groupId: GroupId = this.privateTalks[privateTalkId];
    if (groupId) {
      await this.groupingService.removeUserFromGroup(groupId, user);
    }
  }

  public async endPrivateTalk(privateTalkId: PrivateTalkId): Promise<void> {
    const groupId: GroupId = this.privateTalks[privateTalkId];
    if (groupId) {
      await this.groupingService.deleteGroup(groupId);
      delete this.privateTalks[privateTalkId];
    }
  }

  public async endAllPrivateTalks(): Promise<void> {
    await this.groupingService.deleteAllGroups();
    this.privateTalks = {};
  }
}
