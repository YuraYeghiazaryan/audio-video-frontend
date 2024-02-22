import {Injectable} from '@angular/core';
import {RemoteUser} from "../model/remote-user";
import {UserId} from "../model/types";
import {LocalUser} from "../model/local-user";
import {Role} from "../model/user";
import {catchError, ObservableInput, throwError} from "rxjs";
import {HttpClient, HttpErrorResponse} from "@angular/common/http";

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private _localUser: LocalUser | null = null;
  private _remoteUsers: { [key: UserId]: RemoteUser } = {};

  public constructor(
    private httpClient: HttpClient
  ) {}

  public async login(username: string, role: Role): Promise<LocalUser> {
    this._localUser = await this.sendLogin(username, role);

    return this._localUser;
  }

  private sendLogin(username: string, role: Role): Promise<LocalUser> {
    return new Promise<LocalUser>((resolve, reject): void => {
      this.httpClient.get<LocalUser>(
        `http://localhost:8090/user/login`,
      {
        params: {
          username,
          role
        }
      }
      )
        .pipe(catchError((error: HttpErrorResponse): ObservableInput<any> => {
          reject(error);
          return throwError(() => new Error('Something bad happened; please try again later.'));
        }))
        .subscribe((localUser: LocalUser): void => {
          resolve(localUser);
        });
    });
  }

  public get localUser(): LocalUser {
    if (this._localUser) {
      return this._localUser;
    }

    throw Error('User is not logged in');
  }

  public addRemoteUser(remoteUser: RemoteUser): void {
    this._remoteUsers[remoteUser.id] = remoteUser;
  }

  public addRemoteUsers(remoteUsers: RemoteUser[]): void {
    for (const remoteUser of remoteUsers) {
      this._remoteUsers[remoteUser.id] = remoteUser;
    }
  }

  public isLoggedIn(): boolean {
    return !!this._localUser;
  }
}
