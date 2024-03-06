import {Injectable} from "@angular/core";
import {Role} from "../model/user";
import {UserId} from "../model/types";
import {AudioVideoService} from "./audio-video/audio-video.service";
import {LocalUser} from "../model/local-user";
import {LocalUserState} from "../state/local-user.state";
import {Store} from "@ngxs/store";
import {RemoteUsers, RemoteUsersState} from "../state/remote-users.state";
import {PrivateTalk, PrivateTalkState} from "../state/private-talk.state";
import {GameMode, GameModeState} from "../state/game-mode.state";
import {Team} from "../model/team";


export interface Group {
  userIds: Set<UserId>;
  isAudioAvailableForLocalUser: boolean;
  isVideoAvailableForLocalUser: boolean;
}


@Injectable({
  providedIn: 'root'
})
export class GroupingService {
  private localUser: LocalUser = LocalUserState.defaults;
  private remoteUsers: RemoteUsers = RemoteUsersState.defaults;

  private privateTalk: PrivateTalk = PrivateTalkState.defaults;
  private gameMode: GameMode = GameModeState.defaults;

  constructor(
    private audioVideoService: AudioVideoService,
    private store: Store
  ) {
    this.listenStoreChanges();
  }

  private async updateGroups(): Promise<void> {
    const groups: Group[] = [];
    /* should be users set, which are not in any Team */
    const freeUserIds: Set<UserId> = new Set<UserId>(Object.keys(this.remoteUsers).map(parseInt)).add(this.localUser.id);
    const isLocalUserInAnyTeam: boolean = this.isLocalUserInAnyTeam();

    if (this.gameMode.isTeamTalkStarted) {
      this.updateGroupsForTeamTalk(groups, freeUserIds, isLocalUserInAnyTeam);
    }

    this.updateGroupsForFreeUsers(groups, freeUserIds, isLocalUserInAnyTeam);

    if (this.privateTalk.isStarted) {
      this.updateGroupsForPrivateTalk(groups);
    }

    await this.audioVideoService.breakRoomIntoGroups(groups);
  }

  /** update groups for students who are in Teams */
  private updateGroupsForTeamTalk(groups: Group[], freeUserIds: Set<UserId>, isLocalUserInAnyTeam: boolean): void {
    const gameModeGroups: Group[] = Object.values(this.gameMode.teams).map((team: Team): Group => {
      /* remove from the freeUsers group those users who are already in other Teams */
      this.subtractSets(freeUserIds, team.userIds);

      const isLocalUserInCurrentTeam: boolean = team.userIds.has(this.localUser.id);
      let isAudioAvailableForLocalUser: boolean = false;
      let isVideoAvailableForLocalUser: boolean = false;

      /* student should only listen the audio and see the video of the Team if the student is in that Team */
      if (this.localUser.role === Role.STUDENT) {
        isAudioAvailableForLocalUser = isLocalUserInCurrentTeam;
        isVideoAvailableForLocalUser = isLocalUserInCurrentTeam;
        /* if Teacher in any Team, it should see the videos of all Teams and listen the audio only it's Team */
      } else if (this.localUser.role === Role.TEACHER) {
        isAudioAvailableForLocalUser = isLocalUserInAnyTeam ? isLocalUserInCurrentTeam : true;
        isVideoAvailableForLocalUser = true;
      } else {
        throw Error();
      }

      return  {
        userIds: team.userIds,
        isAudioAvailableForLocalUser,
        isVideoAvailableForLocalUser
      };
    });

    groups.push(...gameModeGroups);
  }

  /** update groups for students who are not in any Team */
  private updateGroupsForFreeUsers(groups: Group[], freeUserIds: Set<UserId>, isLocalUserInAnyTeam: boolean): void {
    let isAudioAvailableForLocalUser: boolean = false;
    let isVideoAvailableForLocalUser: boolean = false;

    /* free student should only listen the audio and see the video of all free users */
    if (this.localUser.role === Role.STUDENT) {
      isAudioAvailableForLocalUser = !isLocalUserInAnyTeam;
      isVideoAvailableForLocalUser = !isLocalUserInAnyTeam;
      /* if Teacher is not in any team, it should see the videos and listen the audios of all Teams */
    } else if (this.localUser.role === Role.TEACHER) {
      isAudioAvailableForLocalUser = !isLocalUserInAnyTeam;
      isVideoAvailableForLocalUser = true;
    } else {
      throw Error();
    }

    const freeUsersGroup: Group = {
      userIds: freeUserIds,
      isAudioAvailableForLocalUser,
      isVideoAvailableForLocalUser
    };
    groups.push(freeUsersGroup);
  }

  /** update groups for students who are in Private Talk */
  private updateGroupsForPrivateTalk(groups: Group[]): void {
    /* no one listens to anyone during the Private Talk,except those in the Private Talk */
    groups.forEach((group: Group): void => {
      group.isAudioAvailableForLocalUser = false;
    });

    const privateTalkGroup: Group = {
      userIds: this.privateTalk.userIds,
      isAudioAvailableForLocalUser: true,
      isVideoAvailableForLocalUser: false
    };

    groups.push(privateTalkGroup);
  }

  private isLocalUserInAnyTeam(): boolean {
    return !!Object.values(this.gameMode.teams).filter((team: Team): boolean => {
      return team.userIds.has(this.localUser.id);
    }).length;
  }

  private subtractSets<Type>(A: Set<Type>, B: Set<Type>): void {
    B.forEach((value: Type): void => {
      A.delete(value);
    });
  }

  private listenStoreChanges(): void {
    this.store.select(LocalUserState).subscribe((localUser: LocalUser): void => {
      this.localUser = localUser;
    });

    this.store.select(RemoteUsersState).subscribe((remoteUsers: RemoteUsers): void => {
      this.remoteUsers = remoteUsers;
    });

    this.store.select(PrivateTalkState).subscribe((privateTalk: PrivateTalk): void => {
      this.privateTalk = privateTalk;
      this.updateGroups().then();
    });

    this.store.select(GameModeState).subscribe((gameMode: GameMode): void => {
      this.gameMode = gameMode;
      this.updateGroups().then();
    });
  }
}
