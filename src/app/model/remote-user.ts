import {User} from "./user";
import {Participant} from "@zoom/videosdk";

export interface RemoteUser extends User {
  zoomParticipant: Participant;
}
