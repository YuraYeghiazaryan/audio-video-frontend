import {Injectable} from "@angular/core";
import {Role} from "../model/user";
import {UserId} from "../model/types";
import {LocalUser} from "../model/local-user";
import {LocalUserState} from "../state/local-user.state";
import {Store} from "@ngxs/store";
import {RemoteUsers, RemoteUsersState} from "../state/remote-users.state";
import {PrivateTalk, PrivateTalkState} from "../state/private-talk.state";
import {GameMode, GameModeState} from "../state/game-mode.state";
import {lastValueFrom} from "rxjs";
import {ClassroomState} from "../state/classroom.state";
import {Classroom} from "../model/classroom";
import {AudioVideoService} from "./audio-video/audio-video.service";
import {HttpClient} from "@angular/common/http";
import {Team} from "../model/team";

export interface Group {
  userIds: Set<UserId>;
  isAudioAvailableForLocalUser: boolean;
  isVideoAvailableForLocalUser: boolean;
}
export interface TeamGroup extends Group {
  id: number;
}

export interface Groups {
  main?: Group,
  teamTalk?: TeamGroup[],
  privateTalk?: Group,
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
    private httpClient: HttpClient,
    private store: Store
  ) {
    this.listenStoreChanges();
  }

  public async sendBreakRoomIntoGroups(): Promise<void> {
    const groups: Groups = this.buildGroups();
    const groupsCopy: any = {};

    groupsCopy.main = groups.main;
    groupsCopy.privateTalk = groups.privateTalk;
    groupsCopy.teamTalk = groups.teamTalk;

    if (groupsCopy.main) {
      groupsCopy.main.userIds = Array.from(groupsCopy.main.userIds);
    }
    if (groupsCopy.privateTalk) {
      groupsCopy.privateTalk.userIds = Array.from(groupsCopy.privateTalk.userIds);
    }
    if (groupsCopy.teamTalk) {
      groupsCopy.teamTalk.forEach((group: any): void => {
        group.userIds = Array.from(group.userIds);
      });
    }

    await lastValueFrom(this.httpClient.post<void>(
      `/api/audio-video/break-room-into-groups`,
      {
        senderId: this.localUser.id,
        groups: groupsCopy
      }
    ));
  }

  public async updateGroups(): Promise<void> {
    await this.audioVideoService.breakRoomIntoGroups(this.buildGroups());
  }

  private buildGroups(): Groups {
    const remoteUsersIds: UserId[] = Object.keys(this.remoteUsers).map((id: string): UserId => parseInt(id));

    const groups: Groups = {};

    /* should be users set, which are not in any Team */
    const mainRoomUserIds: Set<UserId> = new Set<UserId>(remoteUsersIds).add(this.localUser.id);
    const isLocalUserInAnyTeam: boolean = this.isLocalUserInAnyTeam() && this.gameMode.isTeamTalkStarted;

    if (this.gameMode.isTeamTalkStarted) {
      this.updateGroupsForTeamTalk(groups, mainRoomUserIds, isLocalUserInAnyTeam);
    }

    this.updateGroupsForMainRoomUsers(groups, mainRoomUserIds, isLocalUserInAnyTeam);

    if (this.privateTalk.isStarted) {
      this.updateGroupsForPrivateTalk(groups);
    }

    return groups;
  }

  /** update groups for students who are in Teams */
  private updateGroupsForTeamTalk(groups: Groups, mainRoomUserIds: Set<UserId>, isLocalUserInAnyTeam: boolean): void {
    groups.teamTalk = Object.values(this.gameMode.teams).map((team: Team): TeamGroup => {
      /* remove from the freeUsers group those users who are already in other Teams */
      this.subtractSets(mainRoomUserIds, team.userIds);

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

      return {
        id: team.id,
        userIds: team.userIds,
        isAudioAvailableForLocalUser,
        isVideoAvailableForLocalUser
      };
    });
  }

  /** update groups for students who are not in any Team */
  private updateGroupsForMainRoomUsers(groups: Groups, mainRoomUserIds: Set<UserId>, isLocalUserInAnyTeam: boolean): void {
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

    groups.main = {
      userIds: mainRoomUserIds,
      isAudioAvailableForLocalUser,
      isVideoAvailableForLocalUser
    };
  }

  /** update groups for students who are in Private Talk */
  private updateGroupsForPrivateTalk(groups: Groups): void {
    /* no one listens to anyone during the Private Talk,except those in the Private Talk */
    if (groups.main) {
      groups.main.isAudioAvailableForLocalUser = false;
    }
    groups.teamTalk?.forEach((team: TeamGroup): void => {
      team.isAudioAvailableForLocalUser = false;
    });

    groups.privateTalk = {
      userIds: this.privateTalk.userIds,
      isAudioAvailableForLocalUser: this.privateTalk.userIds.has(this.localUser.id),
      isVideoAvailableForLocalUser: false
    };
  }

  private isLocalUserInAnyTeam(): boolean {
    return !!Object.values(this.gameMode.teams).filter((team: TeamGroup): boolean => {
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
    });

    this.store.select(GameModeState).subscribe((gameMode: GameMode): void => {
      this.gameMode = gameMode;
    });
  }
}
