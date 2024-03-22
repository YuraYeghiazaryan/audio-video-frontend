import {Pipe, PipeTransform} from '@angular/core';
import {RemoteUsers} from "../state/remote-users.state";
import {RemoteUser} from "../model/remote-user";
import {RoomConnection} from "../model/user";

@Pipe({
  name: 'filterOnlineUsers',
  pure: true,
  standalone: true
})
export class FilterOnlineUsersPipe implements PipeTransform {

  public transform(remoteUsers: RemoteUser[]): RemoteUser[] {
    return remoteUsers.filter((remoteUser: RemoteUser): boolean =>
      remoteUser.roomConnection === RoomConnection.ONLINE
    );
  }
}
