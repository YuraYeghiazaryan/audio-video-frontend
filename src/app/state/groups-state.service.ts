import {Action, State, StateContext} from "@ngxs/store";
import {Injectable} from "@angular/core";
import {Group} from "../service/grouping.service"
import {GroupId, UserId} from "../model/types";
import {User} from "../model/user";

export interface Groups {
  [key: GroupId]: Group
}

export namespace GroupsActions {
  export class Create {
    static readonly type: string = '[groups] create group';
    constructor(public groupId: GroupId) {}
  }

  export class Delete {
    static readonly type: string = '[groups] delete group';
    constructor(public groupId: GroupId) {}
  }

  export class DeleteAll {
    static readonly type: string = '[groups] delete all group';
    constructor() {}
  }

  export class AddUserToGroup {
    static readonly type: string = '[groups] add user to group';
    constructor(public groupId: GroupId, public user: User) {}
  }

  export class RemoveUserFromGroup {
    static readonly type: string = '[groups] remove user from group';
    constructor(public groupId: GroupId, public user: User) {}
  }

  export class AddUsersToGroup {
    static readonly type: string = '[groups] add users to group';
    constructor(public groupId: GroupId, public users: User[]) {}
  }

  export class RemoveUsersFromGroup {
    static readonly type: string = '[groups] remove users from group';
    constructor(public groupId: GroupId, public users: User[]) {}
  }

  export class MoveUser {
    static readonly type: string = '[groups] move users fromTo group';
    constructor(public fromGroupId: GroupId, public toGroupId: GroupId, public user: User) {}
  }

  export class MergeGroups {
    static readonly type: string = '[groups] merge groups';
    constructor(public fromGroupId: GroupId, public toGroupId: GroupId) {}
  }
}

@State<Groups>({
  name: GroupsState.storeName,
  defaults: GroupsState.defaults
})
@Injectable()
export class GroupsState {
  static readonly storeName: string = 'groups';
  static readonly defaults: Groups = {};

  @Action(GroupsActions.Create)
  public createGroup({getState, setState}: StateContext<Groups>, {groupId}: GroupsActions.Create): void {
    const state: Groups = JSON.parse(JSON.stringify(getState()));

    if (state[groupId]) {
      throw Error(`Group ${groupId} already exists`);
    }

    state[groupId] = {
      id: groupId,
      users: {}
    };

    setState(state);
  }

  @Action(GroupsActions.Delete)
  public deleteGroup({getState, setState}: StateContext<Groups>, {groupId}: GroupsActions.Create): void {
    const state: Groups = JSON.parse(JSON.stringify(getState()));
    delete state[groupId];

    setState(state);
  }

  @Action(GroupsActions.DeleteAll)
  public deleteAllGroups({setState}: StateContext<Groups>): void {
    setState({});
  }

  @Action(GroupsActions.AddUserToGroup)
  public addUserToGroup({getState, setState}: StateContext<Groups>, {groupId, user}: GroupsActions.AddUserToGroup): void {
    const state: Groups = JSON.parse(JSON.stringify(getState()));

    if (!state[groupId]) {
      throw Error(`Group ${groupId} does not exists`);
    }

    state[groupId].users[user.id] = user;

    setState(state);
  }

  @Action(GroupsActions.RemoveUserFromGroup)
  public removeUserFromGroup({getState, setState}: StateContext<Groups>, {groupId, user}: GroupsActions.RemoveUserFromGroup): void {
    const state: Groups = JSON.parse(JSON.stringify(getState()));

    if (!state[groupId]) {
      throw Error(`Group ${groupId} does not exists`);
    }

    delete state[groupId].users[user.id]

    setState(state);
  }

   @Action(GroupsActions.AddUsersToGroup)
  public addUsersToGroup({getState, setState}: StateContext<Groups>, {groupId, users}: GroupsActions.AddUsersToGroup): void {
    const state: Groups = JSON.parse(JSON.stringify(getState()));

    if (!state[groupId]) {
      throw Error(`Group ${groupId} does not exists`);
    }

    users.forEach((user: User): User => state[groupId].users[user.id] = user);

    setState(state);
  }

  @Action(GroupsActions.RemoveUserFromGroup)
  public removeUsersFromGroup({getState, setState}: StateContext<Groups>, {groupId, users}: GroupsActions.RemoveUsersFromGroup): void {
    const state: Groups = JSON.parse(JSON.stringify(getState()));

    if (!state[groupId]) {
      throw Error(`Group ${groupId} does not exists`);
    }

    users.forEach((user: User): boolean => delete state[groupId].users[user.id]);

    setState(state);
  }

  @Action(GroupsActions.MoveUser)
  public moveUser({getState, setState}: StateContext<Groups>, {fromGroupId, toGroupId, user}: GroupsActions.MoveUser): void {
    const state: Groups = JSON.parse(JSON.stringify(getState()));

    if (!state[fromGroupId] || !state[toGroupId]) {
      throw Error(`Group ${fromGroupId} or ${toGroupId} does not exists`);
    }

    delete state[fromGroupId].users[user.id];
    state[toGroupId].users[user.id] = user;

    setState(state);
  }

  @Action(GroupsActions.MergeGroups)
  public mergeGroups({getState, setState}: StateContext<Groups>, {fromGroupId, toGroupId}: GroupsActions.MergeGroups): void {
    const state: Groups = JSON.parse(JSON.stringify(getState()));

    if (!state[fromGroupId] || !state[toGroupId]) {
      throw Error(`Group ${fromGroupId} or ${toGroupId} does not exists`);
    }

    const usersToMove: User[] = Object.values(state[fromGroupId].users);
    usersToMove.forEach((user: User): User => state[toGroupId].users[user.id] = user);
    delete state[fromGroupId];

    setState(state);
  }
}
