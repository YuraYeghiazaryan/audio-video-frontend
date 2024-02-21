import {UserId} from "./types";
import {ZoomUser} from "./zoom-user";

export interface User {
  id: UserId;
  username: string;
  role: Role;
  zoomUser: ZoomUser;
}

export enum Role {
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT'
}
