import {Injectable} from '@angular/core';
import {WebSocketService} from "./web-socket.service";
import {ClassroomService} from "./classroom.service";
import {UserService} from "./user.service";
import {RemoteUser} from "../model/remote-user";
import {LocalUser} from "../model/local-user";

@Injectable({
  providedIn: 'root'
})
export class MessageHandleServiceService {

  constructor(
    private webSocketService: WebSocketService,
    private classroomService: ClassroomService,
    private userService: UserService
  ) {
    const roomNumber: number = this.classroomService.classroom.roomNumber;

    this.webSocketService.subscribe(`/classroom/${roomNumber}/remote-user-added`, this.remoteUserAdded.bind(this));
  }

  private remoteUserAdded({localUser}: {localUser: LocalUser}): void {
    const remoteUser: RemoteUser = localUser as RemoteUser;

    this.userService.addRemoteUser(remoteUser);
  }
}
