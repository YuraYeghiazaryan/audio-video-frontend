import {UserId, AudioVideoUserId} from "./types";

export interface User {
  id: UserId;
  username: string;
  role: Role;
  roomConnection: RoomConnection;
  audioVideoUser?: AudioVideoUser;
}

export enum RoomConnection {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  PENDING = 'PENDING'
}

export interface AudioVideoUser {
  id: AudioVideoUserId;
  isVideoOn: boolean;
  isAudioOn: boolean;
}

export enum Role {
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT'
}
