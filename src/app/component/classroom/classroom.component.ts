import {Component, OnDestroy, OnInit} from '@angular/core';
import {UserService} from "../../service/user.service";
import {Router} from "@angular/router";
import {KeyValuePipe, NgForOf, NgIf} from "@angular/common";
import {Classroom} from "../../model/classroom";
import {LocalUser} from "../../model/local-user";
import {Store} from "@ngxs/store";
import {ClassroomState} from "../../state/classroom.state";
import {LocalUserAction, LocalUserState} from "../../state/local-user.state";
import {RemoteUsers, RemoteUsersState} from "../../state/remote-users.state";
import {FilterOnlineUsersPipe} from "../../pipe/filter-online-users.pipe";
import {catchError, ObservableInput, throwError} from "rxjs";
import {HttpClient, HttpErrorResponse} from "@angular/common/http";
import {WebSocketService} from "../../service/web-socket.service";
import {MessageHandleService} from "../../service/message-handle.service";
import {Role, RoomConnection, User} from "../../model/user";
import {AudioVideoService} from "../../service/audio-video/audio-video.service";
import {GameMode, GameModeState} from "../../state/game-mode.state";
import {TeamId,} from "../../model/types";
import {GameModeService} from "../../service/game-mode.service";
import {RemoteUserComponent} from "./remote-users/remote-user/remote-user.component";
import {LocalUserComponent} from "./remote-users/local-user/local-user.component";
import {Team} from "../../model/team";

@Component({
  selector: 'app-classroom',
  standalone: true,
  imports: [
    NgForOf,
    FilterOnlineUsersPipe,
    NgIf,
    KeyValuePipe,
    RemoteUserComponent,
    LocalUserComponent
  ],
  templateUrl: './classroom.component.html',
  styleUrl: './classroom.component.css'
})
export class ClassroomComponent implements OnInit, OnDestroy {
  protected classroom: Classroom = ClassroomState.defaults;
  protected localUser: LocalUser = LocalUserState.defaults;
  protected remoteUsers: RemoteUsers = RemoteUsersState.defaults;
  protected gameMode: GameMode = GameModeState.defaults;

  protected localUserTeam: Team | undefined;

  protected joined: boolean = false;

  protected readonly Role = Role;

  constructor(
    protected userService: UserService,
    private audioVideoService: AudioVideoService,
    private gameModeService: GameModeService,
    private websocketService: WebSocketService,
    private messageHandleServiceService: MessageHandleService,
    private httpClient: HttpClient,
    private router: Router,
    private store: Store
  ) {
    this.listenStoreChanges();
  }

  /** logic, running during initialization classroom.Connect to VCR and Zoom */
  public ngOnInit(): void {
    /* if user is not logged in or classroom number doesn't exist, navigate to login page */
    if (!this.classroom.roomNumber || !this.userService.isLoggedIn()) {
      this.router.navigate([this.classroom.roomNumber, 'login']).then();
      return;
    }

    /* connect to VCR web socket */
    const websocketConnectPromise: Promise<boolean> = new Promise<boolean>((resolve, reject): void => {
      this.websocketService.connect('/websocket')
        .pipe(catchError((error: HttpErrorResponse): ObservableInput<any> => {
          reject(error);
          return throwError(() => new Error('Something bad happened; please try again later.'));
        }))
        .subscribe(resolve);
    });

    /* join to Zoom */
    const zoomJoinPromise: Promise<void> = this.audioVideoService.init()
      .then((): Promise<void> =>
        this.audioVideoService.join()
          .then((): void => {
            this.joined = true;
          })
      );

    Promise.all([websocketConnectPromise, zoomJoinPromise])
      .then((): void => {
        /* connected to VCR web socket and joined to Zoom */
        this.store.dispatch(new LocalUserAction.SetConnectionState(RoomConnection.ONLINE));

        /* notify VCR server about local user readiness */
        this.httpClient.post<void>(
          `http://localhost:8090/classroom/${this.classroom?.roomNumber}/user-joined`,
          this.localUser
        ).subscribe();

        /* listening for new user adding and remote user connection state changing */
        this.messageHandleServiceService.registerMessageHandlers(this.classroom.roomNumber);
      })
      .catch((cause): void => {
        console.error(cause);
      });
  }

  public ngOnDestroy(): void {
    this.audioVideoService.leave();
  }

  public toggleVideo(): void {
    if (this.localUser.audioVideoUser?.isVideoOn) {
      this.audioVideoService.stopLocalVideo().then((): void => {
        this.httpClient.post<void>(
          `http://localhost:8090/user/${this.classroom?.roomNumber}/user-video-state-changed`,
          {
            userId: this.localUser.id,
            isOn: false
          }
        ).subscribe();
      });
    } else {
      this.audioVideoService.startLocalVideo().then((): void => {
        this.httpClient.post<void>(
          `http://localhost:8090/user/${this.classroom?.roomNumber}/user-video-state-changed`,
          {
            userId: this.localUser.id,
            isOn: true
          }
        ).subscribe();
      });
    }
  };

  public toggleAudio(): void {
    if (this.localUser.audioVideoUser?.isAudioOn) {
      this.audioVideoService.muteLocalAudio().then()
    } else {
      this.audioVideoService.unmuteLocalAudio().then()
    }
  };

  private listenStoreChanges(): void {
    this.store.select(ClassroomState).subscribe((classroom: Classroom): void => {
      this.classroom = classroom;
    });

    this.store.select(LocalUserState).subscribe((localUser: LocalUser): void => {
      this.localUser = localUser;
    });

    this.store.select(RemoteUsersState).subscribe((remoteUsers: RemoteUsers): void => {
      this.remoteUsers = remoteUsers;
    });

    this.store.select(GameModeState).subscribe((gameMode: GameMode): void => {
      this.gameMode = gameMode;

      if (this.gameMode.isStarted) {
        this.localUserTeam = Object.values(this.gameMode.teams)
          .find((team: Team): boolean => team.userIds.has(this.localUser.id));
      }
    });
  }

  protected createDemoTeams(): void {
    const colors: any = {};
    colors[0] = '#33ff00';
    colors[2] = '#ff2015';
    colors[4] = '#1100f2';
    colors[5] = '#ee00ff';
    colors[1] = '#ff8800';
    colors[3] = '#00ff99';

    let teamId: TeamId = 0;

    const users: User[] = Object.values(this.remoteUsers);
    users.push(this.localUser);

    users.reduce((result: User[][], value: User, index: number, array: User[]): User[][] => {
      if (index % 2 === 0) {
        result.push(array.slice(index, index + 2));
      }

      return result;
    }, []).forEach((users: User[]): void => {
      const teamMembers: User[] = Object.assign([], users);

      if (this.localUser.role === Role.TEACHER) {
        teamMembers.push(this.localUser);
      }

      this.gameModeService.createTeam(teamMembers, teamId, `team_${teamId}`, colors[teamId]);
      teamId++;
    });
    this.gameModeService.startGameMode().then();
  }

  public toggleTeamTalk(): void {
    if (this.gameMode.isTeamTalkStarted) {
      this.gameModeService.endTeamTalk().then();
    } else {
      this.gameModeService.startTeamTalk().then();
    }
  }
}
