import { Injectable } from '@angular/core';
import {Store} from "@ngxs/store";
import {Classroom} from "../../../model/classroom";
import {ClassroomState} from "../../../state/classroom.state";

@Injectable({
  providedIn: 'root'
})
export class AudioVideoUtilService {
  private classroom: Classroom = ClassroomState.defaults;

  constructor(
    private store: Store
  ) {
    this.listenStoreChanges();
  }

  public buildMainRoomName(): string {
    return `${this.classroom.roomNumber}_main`;
  }

  public buildPrivateTalkRoomName(): string {
    return `${this.classroom.roomNumber}_private-talk`;
  }

  public buildTeamTalkRoomName(teamId: number): string {
    return `${this.classroom.roomNumber}_team-talk_${teamId}`;
  }

  private listenStoreChanges(): void {
    this.store.select(ClassroomState).subscribe((classroom: Classroom): void => {
      this.classroom = classroom;
    });
  }
}
