import {User} from "./user";

export interface LocalUser extends User {
  username: string;
  role: Role;
  zoomState: ZoomState;
}

export interface ZoomState {
  isVideoOn: boolean;
  isAudioOn: boolean;
}

export enum Role {
  TEACHER,
  STUDENT
}
