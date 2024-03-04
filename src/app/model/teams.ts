import {TeamId} from "./types";
import {Team} from "./team";

export interface Teams {
  teams: {[key: TeamId]: Team}
}
