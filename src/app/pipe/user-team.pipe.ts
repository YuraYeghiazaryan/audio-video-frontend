import { Pipe, PipeTransform } from '@angular/core';
import {Team} from "../model/team";
import {Teams} from "../state/game-mode.state";

@Pipe({
  name: 'userTeam',
  standalone: true
})
export class UserTeamPipe implements PipeTransform {

  public transform(teams: Teams, userId: number): Team {
    return Object.values(teams).find((team: Team): boolean => {
      return team.userIds.has(userId);
    });
  }
}
