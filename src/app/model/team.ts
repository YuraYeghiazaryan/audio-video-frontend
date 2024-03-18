import {TeamId, UserId} from "./types";

export interface Team {
  id: TeamId;
  name: string;
  color: string;
  userIds: Set<UserId>;
}

export interface TeamDAO {
  id: TeamId;
  name: string;
  color: string;
  userIds: UserId[];
}
