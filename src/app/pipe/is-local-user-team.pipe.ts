import { Pipe, PipeTransform } from '@angular/core';
import {Team} from "../model/team";
import {Teams} from "../state/game-mode.state";
import {LocalUser} from "../model/local-user";
import {LocalUserState} from "../state/local-user.state";
import {Store} from "@ngxs/store";

@Pipe({
  name: 'isLocalUserTeam',
  standalone: true
})
export class IsLocalUserTeamPipe implements PipeTransform {
  private localUser: LocalUser = LocalUserState.defaults;

  constructor(private store: Store) {
    this.listenStoreChanges();
  }

  public transform(teams: Teams, userId: number): boolean {
    return !!Object.values(teams)
      .filter((team: Team): boolean => {
        return team.userIds.has(userId);
      }).find((team: Team): boolean => {
        return team.userIds.has(this.localUser.id)
      })
  }

  private listenStoreChanges(): void {
    this.store.select(LocalUserState).subscribe((localUser: LocalUser): void => {
      this.localUser = localUser;
    });
  }
}
