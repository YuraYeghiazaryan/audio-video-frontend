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
    private userService: UserService
  ) {}

  public registerMessageHandlers(roomNumber: number): void {
    this.webSocketService.subscribe(`/topic/${roomNumber}/user-joined`, this.remoteUserAdded.bind(this));
  }


  private remoteUserAdded(responseBody: string): void {
    const user: User = JSON.parse(responseBody) as User;
    if (user.id === this.userService.localUser.id) {
      return;
    }

    if (user.zoomUser) {
      const remoteUser: RemoteUser = user as RemoteUser;

      this.userService.addRemoteUser(remoteUser);
    } else {
      throw Error(`User ${user} doesn't have zoom participant (is not joined to zoom)`);
    }
  }
}
