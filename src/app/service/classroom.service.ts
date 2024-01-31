import { Injectable } from '@angular/core';
import {Classroom} from "../model/classroom";

@Injectable({
  providedIn: 'root'
})
export class ClassroomService {
  private _classroom: Classroom | null = null;

  public constructor() {}

  public async init(): Promise<Classroom> {
    const roomNumber: number = await this.getRoomNumber();
    this._classroom = {roomNumber};
    return this._classroom;
  }

  public get classroom(): Classroom {
    if (this._classroom) {
      return this._classroom;
    }

    throw Error();
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
      return Promise.reject('Trying to parse "' + match[1] + '" value to number.');
    }
  }
}
