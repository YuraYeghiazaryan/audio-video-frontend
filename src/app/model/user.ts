import {UserId, ZoomUserId} from "./types";
import {Participant} from "@zoom/videosdk";

export interface User {
  id: UserId;
  username: string;
  role: Role;
  zoomUser: ZoomUser;
}

export interface ZoomUser {
  id: ZoomUserId;
  isVideoOn: boolean;
  isAudioOn: boolean;
}

export enum Role {
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT'
}
