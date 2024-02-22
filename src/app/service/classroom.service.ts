import {Injectable} from '@angular/core';
import {Classroom} from "../model/classroom";
import {UserService} from "./user.service";
import {RemoteUser} from "../model/remote-user";
import {HttpClient, HttpErrorResponse} from "@angular/common/http";
import {catchError, ObservableInput, throwError} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class ClassroomService {
  private _classroom: Classroom | null = null;

  public constructor(
    private userService: UserService,
    private httpClient: HttpClient
  ) {}

  public async init(): Promise<Classroom> {
    const roomNumber: number = await this.getRoomNumber();
    this._classroom = {roomNumber};
    const remoteUsers: RemoteUser[] = await this.getRemoteUsers();
    this.userService.addRemoteUsers(remoteUsers);
    return this._classroom;
  }

  public get classroom(): Classroom {
    if (this._classroom) {
      return this._classroom;
    }

    throw Error();
  }

  public sendLocalUserJoined(): Promise<void> {
    return new Promise<void>((resolve, reject): void => {
      this.httpClient.post(
        `http://localhost:8090/classroom/${this.classroom.roomNumber}/user-joined`,
        this.userService.localUser
      )
        .pipe(catchError((error: HttpErrorResponse): ObservableInput<any> => {
          reject(error);
          return throwError(() => new Error('Failed to add user to classroom. Please try again later.'));
        }))
        .subscribe((): void => {
          resolve();
        });
    });
  }

  private getRemoteUsers(): Promise<RemoteUser[]> {
    return new Promise<RemoteUser[]>((resolve, reject): void => {
      this.httpClient.get<RemoteUser[]>(
        `http://localhost:8090/classroom/${this.classroom.roomNumber}/users`
      )
        .pipe(catchError((error: HttpErrorResponse): ObservableInput<any> => {
          reject(error);
          return throwError(() => new Error('Something bad happened; please try again later.'));
        }))
        .subscribe((users: RemoteUser[]): void => {
          resolve(users);
        });
    });
  }

  private getRoomNumber(): Promise<number> {
    // Parse '/<num>' or '/<num>/' or '/<num>/<any-string>'
    const pattern: RegExp = /^\/([1-9]\d*)(?:\/.*|\?.*|$)/;

    const match: RegExpMatchArray | null = window.location.pathname.match(pattern);

    if (!match || !match[1]) {
      return Promise.reject();
    }

    try {
      const roomNumber: number = parseInt(match[1]);
      return Promise.resolve(roomNumber);
    } catch (error) {
      return Promise.reject(`Trying to parse "${match[1]}" value to number.`);
    }
  }
}
