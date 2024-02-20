import {ZoomUserId} from "./types";

export interface ZoomUser {
  id: ZoomUserId | null;
  isVideoOn: boolean;
  isAudioOn: boolean;
}
