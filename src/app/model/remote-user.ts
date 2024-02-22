import {User, ZoomUser} from "./user";
import {Participant} from "@zoom/videosdk";

export interface RemoteUser extends User {
  zoomUser: ZoomUser;
}
