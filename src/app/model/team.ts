import {TeamId, UserId} from "./types";

export interface Team {
  id: TeamId,
  name: string,
  color: string,
  userIds: UserId[]
}
