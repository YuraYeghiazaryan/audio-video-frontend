import {UserId, ZoomUserId} from "./types";

export interface User {
  id: UserId;
  username: string;
  role: Role;
  connectionState: ConnectionState;
  zoomUser?: ZoomUser;
}

export enum ConnectionState {
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
