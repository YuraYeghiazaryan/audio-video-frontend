import {Injectable} from "@angular/core";
import {Role, User} from "../model/user";
import {PrivateTalk, PrivateTalkAction, PrivateTalkState} from "../state/private-talk.state";
import {Store} from "@ngxs/store";
import {lastValueFrom, retry} from "rxjs";
import {HttpClient} from "@angular/common/http";
import {LocalUser} from "../model/local-user";
import {LocalUserState} from "../state/local-user.state";
import {Classroom} from "../model/classroom";
import {ClassroomState} from "../state/classroom.state";
import {GroupingService} from "./grouping.service";
import {RemoteUsers, RemoteUsersState} from "../state/remote-users.state";

@Injectable({
  providedIn: 'root'
})
export class PrivateTalkService {
  private localUser: LocalUser = LocalUserState.defaults;
  private remoteUsers: RemoteUsers = RemoteUsersState.defaults;
  private privateTalk: PrivateTalk = PrivateTalkState.defaults;

  constructor(
    private groupingService: GroupingService,
    private store: Store,
    private httpClient: HttpClient
  ) {
    this.listenStoreChanges();
  }

  public async startPrivateTalk(send: boolean = true): Promise<void> {
    this.store.dispatch(new PrivateTalkAction.StartPrivateTalk());

    if (send) {
      await this.groupingService.sendBreakRoomIntoGroups();
      await lastValueFrom(this.httpClient.post<void>(
        `/api/classroom/private-talk`,
        {
          senderId: this.localUser.id,
          started: true
        }
      ));
    }
  }

  public async endPrivateTalk(send: boolean = true): Promise<void> {
    this.store.dispatch(new PrivateTalkAction.EndPrivateTalk());

    if (send) {
      await this.groupingService.sendBreakRoomIntoGroups();
      await lastValueFrom(this.httpClient.post<void>(
        `/api/classroom/private-talk`,
        {
          senderId: this.localUser.id,
          started: false
        }
      ));
    }
  }

  public async addUserToPrivateTalk(user: User, send: boolean = true): Promise<void> {
    this.store.dispatch(new PrivateTalkAction.AddUser(user.id));

    const users: User[] = Object.values(this.remoteUsers);
    users.push(this.localUser);

    users
      .filter((user: User): boolean => user.role === Role.TEACHER)
      .forEach((teacher: User): void => {
        this.store.dispatch(new PrivateTalkAction.AddUser(teacher.id));
      });

    if (!this.privateTalk.isStarted) {
      await this.startPrivateTalk(false);
    }

    if (send) {
      await this.groupingService.sendBreakRoomIntoGroups();
      await lastValueFrom(this.httpClient.post<void>(
        `/api/classroom/add-user-to-private-talk`,
        {
          senderId: this.localUser.id,
          userId: user.id
        }
      ));
    }
  }

  public async removeUserFromPrivateTalk(user: User, send: boolean = true): Promise<void> {
    this.store.dispatch(new PrivateTalkAction.RemoveUser(user.id));
    if (this.getStudentsCount() === 0) {
      await this.endPrivateTalk(false);
    }

    if (send) {
      await this.groupingService.sendBreakRoomIntoGroups();
      await lastValueFrom(this.httpClient.post<void>(
        `/api/classroom/remove-user-from-private-talk`,
        {
          senderId: this.localUser.id,
          userId: user.id
        }
      ));
    }
  }

  private getStudentsCount(): number {
    return [...this.privateTalk.userIds]
      .filter((userId: number): boolean => {
        let user: User | undefined;

        if (this.localUser.id === userId) {
          user = this.localUser;
        } else {
          user = this.remoteUsers[userId];
        }

        if (user) {
          return user.role === Role.STUDENT;
        }

        return false;
      })
      .length;
  }

  private listenStoreChanges(): void {
    this.store.select(LocalUserState).subscribe((localUser: LocalUser): void => {
      this.localUser = localUser;
    });
    this.store.select(RemoteUsersState).subscribe((remoteUsers: RemoteUsers): void => {
      this.remoteUsers = remoteUsers;
    });
    this.store.select(PrivateTalkState).subscribe((privateTalk: PrivateTalk): void => {
      this.privateTalk = privateTalk;
    });
  }
}
