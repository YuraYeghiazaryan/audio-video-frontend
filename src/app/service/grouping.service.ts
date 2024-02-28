import {Injectable} from "@angular/core";
import {User} from "../model/user";
import {GroupId, UserId} from "../model/types";
import {AudioSubscriptionService} from "./audio-subscription.service";
import {RemoteUser} from "../model/remote-user";
import {LocalUser} from "../model/local-user";
import {LocalUserState} from "../state/local-user.state";
import {Store} from "@ngxs/store";

class Group {
  public readonly id: GroupId;
  private readonly users: {[key: UserId]: User} = {};

  private static nextId: GroupId = 0;

  constructor() {
    this.id = Group.nextId++;
  }

  public getUsers(): User[] {
    return Object.values(this.users);
  }

  public findUser(userId: UserId): User | undefined {
    return this.users[userId];
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
  private localUser: LocalUser = LocalUserState.defaults;

  constructor(
    private audioSubscriptionService: AudioSubscriptionService,
    private store: Store
  ) {
    this.listenStoreChanges();
  }

  public createGroup(): GroupId {
    const group: Group = new Group();
    this.groups[group.id] = group;
    return group.id;
  }

  public async deleteGroup(groupId: GroupId, updateSubscriptions: boolean = true): Promise<void> {
    const group: Group = this.groups[groupId];
    if (group) {
      delete this.groups[groupId];
      updateSubscriptions && await this.updateAudioSubscriptions();
    }
  }

  public async addUserToGroup(groupId: GroupId, user: User): Promise<void> {
    const group: Group = this.groups[groupId];
    if (group) {
      group.addUser(user);
      await this.updateAudioSubscriptions();
    }
  }

  public async removeUserFromGroup(groupId: GroupId, user: User): Promise<void> {
    const group: Group = this.groups[groupId];
    if (group) {
      group.removeUser(user);
      await this.updateAudioSubscriptions();
    }
  }

  public async addUsersToGroup(groupId: GroupId, users: User[], updateSubscriptions: boolean = true): Promise<void> {
    const group: Group = this.groups[groupId];
    if (group) {
      users.forEach((user: User): void => group.addUser(user));
      updateSubscriptions && await this.updateAudioSubscriptions();
    }
  }

  public async removeUsersFromGroup(groupId: GroupId, users: User[]): Promise<void> {
    const group: Group = this.groups[groupId];
    if (group) {
      users.forEach((user: User): void => group.removeUser(user));
      await this.updateAudioSubscriptions();
    }
  }

  public async moveUser(fromGroupId: GroupId, toGroupId: GroupId, user: User): Promise<void> {
    const fromGroup: Group = this.groups[fromGroupId];
    const toGroup: Group = this.groups[toGroupId];

    if (fromGroup && toGroup) {
      fromGroup.removeUser(user);
      toGroup.addUser(user);
      await this.updateAudioSubscriptions();
    }
  }

  public async mergeGroups(fromGroupId: GroupId, toGroupId: GroupId): Promise<void> {
    const toGroup: Group = this.groups[toGroupId];
    const fromGroup: Group = this.groups[fromGroupId];

    if (toGroup && fromGroup) {
      const usersToMove: User[] = fromGroup.getUsers();
      await this.addUsersToGroup(toGroupId, usersToMove, false);
      await this.deleteGroup(fromGroupId, false);
      await this.updateAudioSubscriptions();
    }
  }

  /** call the method after each change in groups */
  private async updateAudioSubscriptions(): Promise<void> {
    /* users in the same group with local user */
    const localUserGroupMembers: User[] = [];
    /* users in other groups */
    const remoteUsers: User[] = [];

    Object.values(this.groups).forEach((group: Group): void => {
      /* check if local user is in current group */
      const localUserInCurrentGroup: User | undefined = group.findUser(this.localUser.id);

      if (localUserInCurrentGroup) {
        /* current group is local user's group */
        localUserGroupMembers.push(
          /* remove local user from its group */
          ...group.getUsers().filter((user: User): boolean => user.id !== this.localUser.id)
        );
      } else {
        /* current group is not local user's group */
        remoteUsers.push(...group.getUsers());
      }
    });

    const subscriptionPromise: Promise<void> = this.audioSubscriptionService.subscribe(localUserGroupMembers as RemoteUser[]);
    const unsubscriptionPromise: Promise<void> = this.audioSubscriptionService.unsubscribe(remoteUsers as RemoteUser[]);

    await Promise.all([subscriptionPromise, unsubscriptionPromise]);
  }

  private listenStoreChanges(): void {
    this.store.select(LocalUserState).subscribe((localUser: LocalUser): void => {
      this.localUser = localUser;
    });
  }
}
