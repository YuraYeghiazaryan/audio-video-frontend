import {Injectable} from '@angular/core';
import {WebSocketService} from "./web-socket.service";
import {ClassroomService} from "./classroom.service";
import {UserService} from "./user.service";
import {RemoteUser} from "../model/remote-user";
import {User} from "../model/user";

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

    this.webSocketService.subscribe(`/classroom/${roomNumber}/user-joined`, this.remoteUserAdded.bind(this));
  }

  private remoteUserAdded({user}: {user: User}): void {
    if (user.id === this.userService.localUser.id) {
      return;
    }

    if (user.zoomParticipant) {
      const remoteUser: RemoteUser = user as RemoteUser;

      this.userService.addRemoteUser(remoteUser);
    } else {
      throw Error(`User ${user} doesn't have zoom participant (is not joined to zoom)`);
    }
  }
}
