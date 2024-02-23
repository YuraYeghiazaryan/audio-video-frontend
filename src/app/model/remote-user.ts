import {User, ZoomUser} from "./user";

export interface RemoteUser extends User {
  zoomUser: ZoomUser;
}
