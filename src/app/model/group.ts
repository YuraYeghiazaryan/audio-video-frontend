import {User} from "./user";
import {GroupId, UserId} from "./types"

export class Group {
  private groupId: number;
  private users: {[key: UserId]: User} = {};

  constructor(groupId: GroupId) {
    this.groupId = groupId;
  }

  public addUser(user: User): void {

  }

  public removeUser(user: User): void {

  }
}
