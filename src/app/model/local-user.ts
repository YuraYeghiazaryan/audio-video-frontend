export interface LocalUser {
  id: number;
  username: string;
  zoomState: ZoomState;
}

export interface ZoomState {
  isVideoOn: boolean;
}
