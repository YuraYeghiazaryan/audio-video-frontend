import {User, ZoomUser} from "./user";

export interface RemoteUser extends User {
  isAudioListenable: boolean;
  isVideoVisible: boolean;
  zoomUser: ZoomUser;
}
