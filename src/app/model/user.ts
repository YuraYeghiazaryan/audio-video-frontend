import {UserId, ZoomUserId} from "./types";

export interface User {
  id: UserId;
  username: string;
  role: Role;
  roomConnection: RoomConnection;
  zoomUser?: ZoomUser;
}

export enum RoomConnection {
  ONLINE,
  OFFLINE,
  PENDING
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
