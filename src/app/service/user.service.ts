import {Injectable} from '@angular/core';
import {RemoteUser} from "../model/remote-user";
import {UserId} from "../model/types";
import {LocalUser} from "../model/local-user";
import {Role} from "../model/user";

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private nextId: number = 0;

  private _localUser: LocalUser | null = null;
  private _remoteUsers: { [key: UserId]: RemoteUser } = {};

  public constructor() { }

  public login(username: string, role: Role): Promise<LocalUser> {
    /* @TODO send request to backend to authenticate */

    /* possible return from backend */
    this._localUser = {
      id: this.nextId++,
      username,
      role,
      zoomUser: {
        id: null,
        isVideoOn: false,
        isAudioOn: false
      }
    };
    return Promise.resolve(this._localUser);
  }

  public get localUser(): LocalUser {
    if (this._localUser) {
      return this._localUser;
    }

    throw Error('User is not logged in');
  }

  public addRemoteUser(user: RemoteUser): void {
    this._remoteUsers[user.id] = user;
  }

  public isLoggedIn(): boolean {
    return !!this._localUser;
  }
}
