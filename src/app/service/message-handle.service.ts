import {Injectable} from '@angular/core';
import {WebSocketService} from "./web-socket.service";
import {User} from "../model/user";
import {UserId} from "../model/types";
import {UserEventHandleService} from "./event-handler/user-event-handle.service";
import {TeamsDTO} from "../state/game-mode.state";
import {GameModeService} from "./game-mode.service";
import {TeamDTO} from "../model/team";
import {LocalUser} from "../model/local-user";
import {LocalUserState} from "../state/local-user.state";
import {RemoteUsers, RemoteUsersState} from "../state/remote-users.state";
import {Store} from "@ngxs/store";
import {PrivateTalkService} from "./private-talk.service";
import {GroupingService} from "./grouping.service";

@Injectable({
  providedIn: 'root'
})
export class MessageHandleService {
  private localUser: LocalUser = LocalUserState.defaults;
  private remoteUsers: RemoteUsers = RemoteUsersState.defaults;

  constructor(
    private webSocketService: WebSocketService,
    private userEventHandleService: UserEventHandleService,
    private gameModeService: GameModeService,
    private privateTalkService: PrivateTalkService,
    private groupingService: GroupingService,
    private store: Store
  ) {
    this.listenStoreChanges();
  }

  public registerMessageHandlers(roomNumber: number): void {
    this.webSocketService.subscribe(`/topic/${roomNumber}/user-joined`, this.remoteUserConnected.bind(this));
    this.webSocketService.subscribe(`/topic/${roomNumber}/user-connection-state-changed`, this.userConnectionStateChanged.bind(this));
    this.webSocketService.subscribe(`/topic/${roomNumber}/user-video-state-changed`, this.userVideoStateChanged.bind(this));
    this.webSocketService.subscribe(`/topic/${roomNumber}/user-audio-state-changed`, this.userAudioStateChanged.bind(this));

    this.webSocketService.subscribe(`/topic/${roomNumber}/game-mode`, this.gameModeStateChanged.bind(this));
    this.webSocketService.subscribe(`/topic/${roomNumber}/team-talk`, this.teamTalkStateChanged.bind(this));

    this.webSocketService.subscribe(`/topic/${roomNumber}/private-talk`, this.privateTalkStateChanged.bind(this));
    this.webSocketService.subscribe(`/topic/${roomNumber}/add-user-to-private-talk`, this.userAddedToPrivateTalk.bind(this));
    this.webSocketService.subscribe(`/topic/${roomNumber}/remove-user-from-private-talk`, this.userRemovedFromPrivateTalk.bind(this));
  }


  /** get remote user from BE and add him to remoteUsers of all users */
  private remoteUserConnected(user: User): void {
    this.userEventHandleService.onUserConnected(user);
  }

  /** get remote user from BE and add him to remoteUsers of all users */
  private userVideoStateChanged({userId, isOn}: {userId: UserId, isOn: boolean}): void {
    this.userEventHandleService.onUserVideoStateChanged(userId, isOn);
  }
  private userAudioStateChanged({userId, isOn}: {userId: UserId, isOn: boolean}): void {
    this.userEventHandleService.onUserAudioStateChanged(userId, isOn);
  }

  /** get new state from BE */
  private userConnectionStateChanged({userId, connected}: {userId: UserId, connected: boolean}): void {
    this.userEventHandleService.onUserConnectionChanged(userId, connected);
  }

  private gameModeStateChanged({started, teams}: { started: boolean, senderId: number, teams?: TeamsDTO }): void {
    this.gameModeService.endGameMode(false).then((): void => {
      if (teams) {
        Object.values(teams)
          .forEach((team: TeamDTO): void => {
            const users: User[] = team.userIds
              .map((id: number): User => {
                return this.localUser.id === id ? this.localUser : this.remoteUsers[id];
              })
              .filter((user: User): boolean => !!user);

            this.gameModeService.createTeam(users, team.id, team.name, team.color);
        });

        if (started) {
          this.gameModeService.startGameMode(false).then((): void => {
            this.groupingService.updateGroups().then();
          });
        } else {
          this.gameModeService.endGameMode(false).then((): void => {
            this.groupingService.updateGroups().then();
          });
        }
      }
    });
  }

  private teamTalkStateChanged({started, senderId}: { started: boolean, senderId: number }): void {
    if (started) {
      this.gameModeService.startTeamTalk(false).then((): void => {
        this.groupingService.updateGroups().then();
      });
    } else {
      this.gameModeService.endTeamTalk(false).then((): void => {
        this.groupingService.updateGroups().then();
      });
    }
  }

  private userAddedToPrivateTalk({userId, senderId}: { userId: number, senderId: number }): void {
    let user: User | undefined = undefined;

    if (userId === this.localUser.id) {
      user = this.localUser;
    } else if (this.remoteUsers[userId]) {
      user = this.remoteUsers[userId];
    } else {
      return;
    }

    this.privateTalkService.addUserToPrivateTalk(user, false).then((): void => {
      this.groupingService.updateGroups().then();
    });
  }

  private userRemovedFromPrivateTalk({userId, senderId}: { userId: number, senderId: number }): void {

    let user: User | undefined = undefined;

    if (userId === this.localUser.id) {
      user = this.localUser;
    } else if (this.remoteUsers[userId]) {
      user = this.remoteUsers[userId];
    } else {
      return;
    }

    this.privateTalkService.removeUserFromPrivateTalk(user, false).then((): void => {
      this.groupingService.updateGroups().then();
    });
  }

  private privateTalkStateChanged({started, senderId}: { started: boolean, senderId: number }): void {
    if (started) {
      this.privateTalkService.startPrivateTalk(false).then((): void => {
        this.groupingService.updateGroups().then();
      });
    } else {
      this.privateTalkService.endPrivateTalk(false).then((): void => {
        this.groupingService.updateGroups().then();
      });
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
