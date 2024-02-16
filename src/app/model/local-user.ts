export interface LocalUser {
  id: number;
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
