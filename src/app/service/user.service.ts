import { Injectable } from '@angular/core';
import {LocalUser} from "../model/local-user";

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private nextId: number = 0;

  private _localUser: LocalUser | null = null;

  public constructor() { }

  public login(username: string): Promise<LocalUser> {
    /* @TODO send request to backend to authenticate */

    /* possible return from backend */
    this._localUser = {
      id: this.nextId++,
      username
    };
    return Promise.resolve(this._localUser);
  }

  public get localUser(): LocalUser | null {
    return this._localUser;
  }

  public isLoggedIn(): boolean {
    return !!this._localUser;
  }
}
