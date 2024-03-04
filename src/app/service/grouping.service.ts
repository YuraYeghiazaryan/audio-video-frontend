import {Injectable} from "@angular/core";
import {User} from "../model/user";
import {GroupId, UserId} from "../model/types";
import {AudioVideoService} from "./audio-video.service";
import {RemoteUser} from "../model/remote-user";
import {LocalUser} from "../model/local-user";
import {LocalUserState} from "../state/local-user.state";
import {Store} from "@ngxs/store";
import {RemoteUsers, RemoteUsersState} from "../state/remote-users.state";


export interface Group {
  id: GroupId,
  users: {[key: UserId]: User}
}
// export class Group {
//   public readonly id: GroupId;
//   private readonly users: {[key: UserId]: User} = {};
//   private static nextId: GroupId = 0;
//
//   constructor() {
//     this.id = Group.nextId++;
//   }
//
//   public getUsers(): User[] {
//     return Object.values(this.users);
//   }
//
//   public findUser(userId: UserId): User | undefined {
//     return this.users[userId];
//   }
//
//   public addUser(user: User): void {
//     this.users[user.id] = user;
//   }
//
//   public removeUser(user: User): void {
//     delete this.users[user.id];
//   }
// }


@Injectable({
  providedIn: 'root'
})
export class GroupingService {
  private groups: {[key: GroupId]: Group} = {};
  private localUser: LocalUser = LocalUserState.defaults;
  private remoteUsers: RemoteUsers = RemoteUsersState.defaults;

  constructor(
    private audioVideoService: AudioVideoService,
    private store: Store
  ) {
    this.listenStoreChanges();
  }

  public createGroup(): GroupId {
    const group: Group = {
      id: 1,
      users: []
    };
    this.groups[group.id] = group;
    return group.id;
  }

  public deleteGroup(groupId: GroupId): void {
    const group: Group = this.groups[groupId];
    if (group) {
      delete this.groups[groupId];
    }
  }

  public deleteAllGroups(): void {
    this.groups = {};
  }

  public addUserToGroup(groupId: GroupId, user: User): void {
    // const group: Group = this.groups[groupId];
    // if (group) {
    //   group.addUser(user);
    // }
  }

  public removeUserFromGroup(groupId: GroupId, user: User): void {
    // const group: Group = this.groups[groupId];
    // if (group) {
    //   group.removeUser(user);
    // }
  }

  public addUsersToGroup(groupId: GroupId, users: User[]): void {
    // const group: Group = this.groups[groupId];
    // if (group) {
    //   users.forEach((user: User): void => group.addUser(user));
    // }
  }

  public removeUsersFromGroup(groupId: GroupId, users: User[]): void {
    // const group: Group = this.groups[groupId];
    // if (group) {
    //   users.forEach((user: User): void => group.removeUser(user));
    // }
  }

  public moveUser(fromGroupId: GroupId, toGroupId: GroupId, user: User): void {
    // const fromGroup: Group = this.groups[fromGroupId];
    // const toGroup: Group = this.groups[toGroupId];
    //
    // if (fromGroup && toGroup) {
    //   fromGroup.removeUser(user);
    //   toGroup.addUser(user);
    // }
  }

  public mergeGroups(fromGroupId: GroupId, toGroupId: GroupId): void {
    // const toGroup: Group = this.groups[toGroupId];
    // const fromGroup: Group = this.groups[fromGroupId];
    //
    // if (toGroup && fromGroup) {
    //   const usersToMove: User[] = fromGroup.getUsers();
    //   this.addUsersToGroup(toGroupId, usersToMove);
    //   this.deleteGroup(fromGroupId);
    // }
  }

  /** unsubscribe from all remote users, then subscribe to local user group members */
  public async updateAudioSubscriptions(): Promise<void> {
    // /* users in the same group with local user */
    // const localUserGroupMembers: User[] = [];
    //
    // for (const group of Object.values(this.groups)) {
    //   const localUserInCurrentGroup: User | undefined = group.findUser(this.localUser.id);
    //
    //   if (localUserInCurrentGroup) {
    //     /* current group is local user's group */
    //     localUserGroupMembers.push(
    //       /* remove local user from its group */
    //       // ...group.getUsers().filter((user: User): boolean => user.id !== this.localUser.id)
    //     );
    //     /* local user group is found*/
    //     return;
    //   }
    // }
    //
    // const unsubscriptionPromise: Promise<void> = this.audioVideoService.unsubscribe(this.remoteUsers as RemoteUser[]);
    // const subscriptionPromise: Promise<void> = this.audioVideoService.subscribe(localUserGroupMembers as RemoteUser[]);
    //
    // await Promise.all([subscriptionPromise, unsubscriptionPromise]);
  }

  public async subscribeToAll(): Promise<void> {
    await this.audioVideoService.subscribe(this.remoteUsers as RemoteUser[]);
  }

  private listenStoreChanges(): void {
    this.store.select(LocalUserState).subscribe((localUser: LocalUser): void => {
      this.localUser = localUser;
    });

    this.store.select(RemoteUsersState).subscribe((remoteUsers: RemoteUsers): void => {
      this.remoteUsers = remoteUsers;
    });
  }
}
