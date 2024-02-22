import {UserId} from "./types";
import {Participant} from "@zoom/videosdk";

export interface User {
  id: UserId;
  username: string;
  role: Role;
  zoomParticipant: Participant | undefined;
}

export enum Role {
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT'
}
