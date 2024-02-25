import {Injectable} from '@angular/core';
import {RemoteUser} from "../model/remote-user";
import {LocalUser} from "../model/local-user";
import {Role} from "../model/user";
import {lastValueFrom} from "rxjs";
import {HttpClient} from "@angular/common/http";
import {LocalUserAction, LocalUserState} from "../state/local-user.state";
import {RemoteUsers, RemoteUsersAction, RemoteUsersState} from "../state/remote-users.state";
import {Store} from "@ngxs/store";
import {ClassroomState} from "../state/classroom.state";
import {Classroom} from "../model/classroom";

@Injectable({
  providedIn: 'root'
})
export class UserService {
  protected classroom: Classroom = ClassroomState.defaults;
  private localUser: LocalUser = LocalUserState.defaults;
  private remoteUsers: RemoteUsers = RemoteUsersState.defaults;

  public constructor(
    private httpClient: HttpClient,
    private store: Store
  ) {
    this.listenStoreChanges();
  }

  /** initialize localUser object */
  public async login(username: string, role: Role): Promise<LocalUser> {
    const localUser: LocalUser = await this.sendLogin(username, role);

    this.store.dispatch(new LocalUserAction.SetLocalUser(localUser));

    return localUser;
  }

  /** get all users from BE and add them to remoteUsers*/
  public async updateRemoteUsers(): Promise<void> {
    const remoteUsers: RemoteUser[] = await lastValueFrom(this.httpClient.get<RemoteUser[]>(
      `http://localhost:8090/classroom/${this.classroom?.roomNumber}/users`
    ));

    this.addRemoteUsers(remoteUsers);
  }

  /** add remoteUser to remoteUsers*/
  public addRemoteUser(remoteUser: RemoteUser): void {
    if (remoteUser.id !== this.localUser?.id) {
      this.store.dispatch(new RemoteUsersAction.AddRemoteUser(remoteUser));
    }
  }

  /** delete user from remoteUsers*/
  public removeRemoteUser(remoteUser: RemoteUser): void {
    this.store.dispatch(new RemoteUsersAction.RemoveRemoteUser(remoteUser));
  }

  /** add remote users to remoteUsers*/
  public addRemoteUsers(remoteUsers: RemoteUser[]): void {
    for (const remoteUser of remoteUsers) {
      this.addRemoteUser(remoteUser);
    }
  }

  public isLoggedIn(): boolean {
    return !!this.localUser;
  }

  /** send user credentials to BE and get localUser object */
  private sendLogin(username: string, role: Role): Promise<LocalUser> {
    return lastValueFrom(this.httpClient.get<LocalUser>(
      `http://localhost:8090/user/login`,
      {
        params: {
          username,
          role
        }
      }
    ));
  }

  private listenStoreChanges(): void {
    this.store.select(ClassroomState).subscribe((classroom: Classroom): void => {
      this.classroom = classroom;
    });

    this.store.select(LocalUserState).subscribe((localUser: LocalUser): void => {
      this.localUser = localUser;
    });

    this.store.select(RemoteUsersState).subscribe((remoteUsers: RemoteUsers): void => {
      this.remoteUsers = remoteUsers;
    });
  }
}
