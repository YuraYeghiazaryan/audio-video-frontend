import { Pipe, PipeTransform } from '@angular/core';
import {RemoteUsers} from "../state/remote-users.state";
import {RemoteUser} from "../model/remote-user";
import {Role} from "../model/user";

@Pipe({
  name: 'roles',
  standalone: true
})
export class RolesPipe implements PipeTransform {

  public transform(remoteUsers: RemoteUsers, role: Role): RemoteUser[] {
    return Object.values(remoteUsers)
      .filter((remoteUser: RemoteUser): boolean => {
        return remoteUser.role === role;
      });
  }
}
