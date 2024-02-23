import {AfterViewInit, Component, OnDestroy, OnInit} from '@angular/core';
import {ZoomApiService} from "../../service/zoom-api.service";
import {UserService} from "../../service/user.service";
import {Router} from "@angular/router";
import {NgForOf, NgIf} from "@angular/common";
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
import {RoomConnection} from "../../model/user";

@Component({
  selector: 'app-classroom',
  standalone: true,
  imports: [
    NgForOf,
    FilterOnlineUsersPipe,
    NgIf
  ],
  templateUrl: './classroom.component.html',
  styleUrl: './classroom.component.css'
})
export class ClassroomComponent implements OnInit, AfterViewInit, OnDestroy {
  protected classroom: Classroom = ClassroomState.defaults;
  protected localUser: LocalUser = LocalUserState.defaults;
  protected remoteUsers: RemoteUsers = RemoteUsersState.defaults;

  protected joined: boolean = false;

  constructor(
    protected userService: UserService,
    private zoomApiServiceService: ZoomApiService,
    private websocketService: WebSocketService,
    private messageHandleServiceService: MessageHandleService,
    private httpClient: HttpClient,
    private router: Router,
    private store: Store
  ) {
    this.listenStoreChanges();
  }

  public ngOnInit(): void {
    if (!this.classroom.roomNumber || !this.userService.isLoggedIn()) {
      this.router.navigate([this.classroom.roomNumber, 'login']).then();
    }
  }

  public ngAfterViewInit(): void {
    if (!this.classroom.roomNumber || !this.userService.isLoggedIn()) {
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
    const zoomJoinPromise: Promise<void> = this.zoomApiServiceService.init()
      .then((): Promise<void> =>
        this.zoomApiServiceService.join()
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
        );

        this.messageHandleServiceService.registerMessageHandlers(this.classroom.roomNumber);
      })
      .catch((cause): void => {
        console.error(cause);
      });
  }

  public ngOnDestroy(): void {
    this.zoomApiServiceService.leave();
  }

  public toggleVideo(): void {
    if (this.localUser.zoomUser?.isVideoOn) {
      this.zoomApiServiceService.stopLocalVideo().then()
    } else {
      this.zoomApiServiceService.startLocalVideo().then()
    }
  };

  public toggleAudio(): void {
    if (this.localUser.zoomUser?.isAudioOn) {
      this.zoomApiServiceService.muteLocalAudio().then()
    } else {
      this.zoomApiServiceService.unmuteLocalAudio().then()
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
  }

  protected readonly Object = Object;
}
