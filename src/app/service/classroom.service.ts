import {Injectable} from '@angular/core';
import {Store} from "@ngxs/store";
import {ClassroomAction} from "../state/classroom.state";

@Injectable({
  providedIn: 'root'
})
export class ClassroomService {
  public constructor(
    private store: Store
  ) {
    this.listenStoreChanges();
  }

  /** before all. Getting room number */
  public async init(): Promise<void> {
    const roomNumber: number = await this.getRoomNumber();
    this.store.dispatch(new ClassroomAction.SetRoomNumber(roomNumber));
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

  private listenStoreChanges(): void {}
}
