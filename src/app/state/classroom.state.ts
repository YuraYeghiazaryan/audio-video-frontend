import {Action, Selector, State, StateContext} from '@ngxs/store';
import {Injectable} from '@angular/core';
import {LocalUser} from "../model/local-user";
import {RemoteUser} from "../model/remote-user";
import {UserId} from "../model/types";
import {Classroom} from "../model/classroom";

export namespace ClassroomAction {
  export class SetRoomNumber {
    public static type: string = "[classroom] set room number";
    constructor(public roomNumber: number) {}
  }
}

@State<Classroom>({
  name: ClassroomState.storeName,
  defaults: ClassroomState.defaults
})
@Injectable()
export class ClassroomState {
  static readonly storeName: string = 'classroom';
  static readonly defaults: Classroom = {
    roomNumber: -1
  };

  @Action(ClassroomAction.SetRoomNumber)
  public setRoomNumber({patchState}: StateContext<Classroom>, {roomNumber}: ClassroomAction.SetRoomNumber): void {
    patchState({roomNumber})
  }
}



