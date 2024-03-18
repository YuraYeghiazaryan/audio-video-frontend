import {Injectable} from '@angular/core';
import {WebSocketService} from "./web-socket.service";
import {User} from "../model/user";
import {UserId} from "../model/types";
import {UserEventHandleService} from "./event-handler/user-event-handle.service";
import {AudioVideoService} from "./audio-video/audio-video.service";
import {Group} from "./grouping.service";
import {GameMode, GameModeState, TeamsDAO} from "../state/game-mode.state";
import {GameModeService} from "./game-mode.service";
import {TeamDAO} from "../model/team";
import {LocalUser} from "../model/local-user";
import {LocalUserState} from "../state/local-user.state";
import {RemoteUsers, RemoteUsersState} from "../state/remote-users.state";
import {Store} from "@ngxs/store";
import {ClassroomState} from "../state/classroom.state";
import {Classroom} from "../model/classroom";

@Injectable({
  providedIn: 'root'
})
export class MessageHandleService {
  private localUser: LocalUser = LocalUserState.defaults;
  private remoteUsers: RemoteUsers = RemoteUsersState.defaults;

  constructor(
    private webSocketService: WebSocketService,
    private userEventHandleService: UserEventHandleService,
    private audioVideoService: AudioVideoService,
    private gameModeService: GameModeService,
    private store: Store
  ) {
    this.listenStoreChanges();
  }

  public registerMessageHandlers(roomNumber: number): void {
    this.webSocketService.subscribe(`/topic/${roomNumber}/user-joined`, this.remoteUserConnected.bind(this));
    this.webSocketService.subscribe(`/topic/${roomNumber}/user-connection-state-changed`, this.userConnectionStateChanged.bind(this));
    this.webSocketService.subscribe(`/topic/${roomNumber}/user-video-state-changed`, this.userVideoStateChanged.bind(this));

    this.webSocketService.subscribe(`/topic/${roomNumber}/audio-video-groups-changed`, this.audioVideoGroupsChanged.bind(this));

    this.webSocketService.subscribe(`/topic/${roomNumber}/game-mode`, this.gameModeStateChanged.bind(this));
    this.webSocketService.subscribe(`/topic/${roomNumber}/team-talk`, this.teamTalkStateChanged.bind(this));
  }


  /** get remote user from BE and add him to remoteUsers of all users */
  private remoteUserConnected(user: User): void {
    this.userEventHandleService.onUserConnected(user);
  }

  /** get remote user from BE and add him to remoteUsers of all users */
  private userVideoStateChanged({userId, isOn}: {userId: UserId, isOn: boolean}): void {
    this.userEventHandleService.onUserVideoStateChanged(userId, isOn);
  }

  /** get new state from BE */
  private userConnectionStateChanged({userId, connected}: {userId: UserId, connected: boolean}): void {
    this.userEventHandleService.onUserConnectionChanged(userId, connected);
  }

  private audioVideoGroupsChanged(groups: Group[]): void {
    this.audioVideoService.breakRoomIntoGroups(groups).then();
  }

  private gameModeStateChanged({started, senderId, teams}: { started: boolean, senderId: number, teams?: TeamsDAO }): void {
    if (this.localUser.id === senderId) {
      return;
    }

    this.gameModeService.endGameMode(false).then((): void => {
      if (started && teams) {
        Object.values(teams)
          .forEach((team: TeamDAO): void => {
            const users: User[] = team.userIds.map((id: number): User => {
              return this.localUser.id === id ? this.localUser : this.remoteUsers[id];
            })
            .filter((user: User): boolean => !!user);

            this.gameModeService.createTeam(users, team.id, team.name, team.color);
        });
        this.gameModeService.startGameMode(false).then();
      }
    });
  }

  private teamTalkStateChanged({started, senderId}: { started: boolean, senderId: number }): void {
    if (this.localUser.id === senderId) {
      return;
    }

    if (started) {
      this.gameModeService.startTeamTalk(false).then();
    } else {
      this.gameModeService.endTeamTalk(false).then();
    }
  }

  private listenStoreChanges(): void {
    this.store.select(LocalUserState).subscribe((localUser: LocalUser): void => {
      this.localUser = localUser;
    });

    this.store.select(RemoteUsersState).subscribe((remoteUsers: RemoteUsers): void => {
      this.remoteUsers = remoteUsers;
    });
  }
}
