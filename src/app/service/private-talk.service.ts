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

  public async startPrivateTalk(user: User, privateTalkId: PrivateTalkId): Promise<PrivateTalkId> {
    if (this.privateTalks[privateTalkId]) {
      return Promise.reject(`Private talk wit ${privateTalkId} id already exist`);
    }
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
