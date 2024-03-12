import {User, AudioVideoUser} from "./user";

export interface RemoteUser extends User {
  isAudioListenable: boolean;
  isVideoVisible: boolean;
  audioVideoUser: AudioVideoUser;
}
