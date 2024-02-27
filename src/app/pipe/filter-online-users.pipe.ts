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

  public transform(remoteUsers: RemoteUsers): RemoteUser[] {
    return Object.values(remoteUsers)
      .filter((remoteUser: RemoteUser): boolean => {
        return remoteUser.roomConnection === RoomConnection.ONLINE;
      });
  }
}
