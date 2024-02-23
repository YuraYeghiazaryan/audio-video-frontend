import {Pipe, PipeTransform} from '@angular/core';
import {RemoteUsers} from "../state/remote-users.state";
import {RemoteUser} from "../model/remote-user";
import {ConnectionState} from "../model/user";

@Pipe({
  name: 'filterOnlineUsers',
  standalone: true
})
export class FilterOnlineUsersPipe implements PipeTransform {

  public transform(remoteUsers: RemoteUsers): RemoteUser[] {
    return Object.values(remoteUsers)
      .filter((remoteUser: RemoteUser): boolean => {
        return remoteUser.connectionState === ConnectionState.ONLINE;
      });
  }
}
