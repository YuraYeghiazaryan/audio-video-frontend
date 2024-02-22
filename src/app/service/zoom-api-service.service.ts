import {Injectable} from '@angular/core';
import ZoomVideo, {Participant, ParticipantPropertiesPayload} from '@zoom/videosdk';
import {ConnectionOptions} from "../model/connection-options";
import {UserService} from "./user.service";
import {ClassroomService} from "./classroom.service";
import {Classroom} from "../model/classroom";
import {LocalUser} from "../model/local-user";
import {HttpClient, HttpErrorResponse} from "@angular/common/http";
import {catchError, ObservableInput, throwError} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class ZoomApiServiceService {

  private localUserVideoContainer: HTMLDivElement | null = null;
  private remoteUsersVideoContainer: HTMLDivElement | null = null;
  private initialized: boolean = false;
  private connectionOptions: ConnectionOptions | null = null;

  private client: any;
  private stream: any;

  public constructor(
    private userService: UserService,
    private classroomService: ClassroomService,
    private httpClient: HttpClient
  ) {}

  public init(localUserVideoContainer: HTMLDivElement, remoteUsersVideoContainer: HTMLDivElement): Promise<void> {
    if (!localUserVideoContainer || !remoteUsersVideoContainer) {
      return Promise.reject();
    }

    this.localUserVideoContainer = localUserVideoContainer;
    this.remoteUsersVideoContainer = remoteUsersVideoContainer;
    this.client = ZoomVideo.createClient();


    const connectionOptionsPromise: Promise<void> = this.getConnectionOptions()
      .then((connectionOptions: ConnectionOptions): void => {
        this.connectionOptions = connectionOptions;
      });

    const initPromise: Promise<void> = this.client.init('en-US', 'Global', { patchJsMedia: true })
      .then((): void => {
        this.initialized = true;
      });

    return Promise.all([connectionOptionsPromise, initPromise]).then();
  }

  public join(): Promise<void> {
    const videoSDKJWT: string | undefined = this.connectionOptions?.videoSDKJWT;
    const username: string | undefined = this.connectionOptions?.username;
    const sessionName: string | undefined = this.connectionOptions?.sessionName;
    const sessionPasscode: string | undefined = this.connectionOptions?.sessionPasscode;

    if (!this.initialized || !this.client || !videoSDKJWT || !sessionName || !username || !sessionPasscode) {
      throw Error('Not initialized yet.' +
        'Please call init() method first or wait to initialize or wait for init() method promise to resolve.');
    }

    return this.client.join(sessionName, videoSDKJWT, username, sessionPasscode).then(this.onJoin.bind(this));
  }
  public leave(): void {
    this.client?.leave(true);
  }

  public async startLocalVideo(): Promise<void> {
    if (!this.localUserVideoContainer || !this.stream) {
      return Promise.reject(`Trying to turn on local User video:Stream is not found`);
    }

    if (!this.userService.localUser.zoomUser) {
      throw Error(`Trying to turn on local User video. Zoom user is not found`);
    }

    const localUserVideoElement: HTMLElement | null = document.querySelector(`#u_${this.userService.localUser.id}`)

    if (!localUserVideoElement) {
      return Promise.reject("Local User video element does not exist");
    }

    if (localUserVideoElement instanceof HTMLVideoElement) {
      await this.stream.startVideo({ videoElement: localUserVideoElement });
    } else if (localUserVideoElement instanceof HTMLCanvasElement) {
      const localUserZoomId: number = this.client.getCurrentUserInfo().userId;
      await this.stream.startVideo()
        .then((): void => {
          this.stream.renderVideo(localUserVideoElement, localUserZoomId, 200, 112, 0, 0, 3);
        });
    } else {
      return Promise.reject("Local User video element is not either HTMLVideoElement nor HTMLCanvasElement");
    }

    this.userService.localUser.zoomUser.isVideoOn = true;
  }

  public async stopLocalVideo(): Promise<void> {
    if (!this.stream) {
      return Promise.reject(`Trying to turn off local User video. Stream is not found`);
    }

    if (!this.userService.localUser.zoomUser) {
      throw Error(`Trying to turn off local User video. Zoom user is not found`);
    }

    await this.stream.stopVideo();

    this.userService.localUser.zoomUser.isVideoOn = false;
  }

  public async unmuteLocalAudio(): Promise<void> {
    if (!this.stream) {
      return Promise.reject(`Trying to turn on local User audio. Stream is not found`);
    }

    if (!this.userService.localUser.zoomUser) {
      throw Error(`Trying to turn on local user audio. Zoom user is not found`);
    }

    await this.stream.unmuteAudio();

    this.userService.localUser.zoomUser.isAudioOn = true;
  }

  public async muteLocalAudio(): Promise<void> {
    if (!this.stream) {
      return Promise.reject(`Trying to turn off local User audio. Stream is not found`);
    }

    if (!this.userService.localUser.zoomUser) {
      throw Error(`Trying to turn off local User audio. Zoom user is not found`);
    }

    await this.stream.muteAudio();

    this.userService.localUser.zoomUser.isAudioOn = false;
  }

  public async muteUserAudioLocally(userId: number): Promise<void> {
    await this.stream.muteUserAudioLocally(userId);
  }

  public async unmuteUserAudioLocally(userId: number): Promise<void> {
    await this.stream.unmuteUserAudioLocally(userId);
  }

  private createLocalUserVideoElement(): void {
    if (!this.localUserVideoContainer) {
      throw Error();
    }

    let localUserVideoElement: HTMLVideoElement | HTMLCanvasElement;

    if (this.stream.isRenderSelfViewWithVideoElement()) {
      localUserVideoElement = document.createElement('video');
    } else {
      localUserVideoElement = document.createElement('canvas');
    }

    localUserVideoElement.id = 'u_' + this.userService.localUser.id;
    localUserVideoElement.width = 200;
    localUserVideoElement.height = 112;

    this.localUserVideoContainer.appendChild(localUserVideoElement);
  }

  private getConnectionOptions(): Promise<ConnectionOptions> {
    const classroom: Classroom | null = this.classroomService.classroom;
    const localUser: LocalUser | null = this.userService.localUser;

    if (!classroom) {
      return Promise.reject('Classroom is not initialized');
    }

    if (!localUser) {
      return Promise.reject('User is not logged in');
    }

    return new Promise<ConnectionOptions>((resolve, reject): void => {
      this.httpClient.get<ConnectionOptions>(
        'http://localhost:8090/zoom/connection-options',
        {
          params: {
            sessionName: classroom.roomNumber,
            username: localUser.username
          }
        }
      )
        .pipe(catchError((error: HttpErrorResponse): ObservableInput<any> => {
          reject(error);
          return throwError(() => new Error('Something bad happened: please try again later.'));
        }))
        .subscribe((connectionOptions: ConnectionOptions): void => {
          resolve(connectionOptions);
        });
    });

  }

  private registerEventListeners(): void  {
    if (!this.client) {
      throw Error();
    }

    this.client.on('user-added', (userProperties: ParticipantPropertiesPayload[]): void => {
      if (userProperties[0]?.userId) {
        this.onUserAdded(userProperties[0].userId);
      }
    });
    this.client.on('user-removed', (userProperties: ParticipantPropertiesPayload[]): void => {
      if (userProperties[0]?.userId) {
        this.onUserRemoved(userProperties[0].userId);
      }
    });

    this.client.on('peer-video-state-change', (payload: { action: "Start" | "Stop"; userId: number }): void => {
      if (payload.action === 'Start') {
        this.startUserVideo(payload.userId);
      } else if (payload.action === 'Stop') {
        this.stopUserVideo(payload.userId);
      }
    });
  }

  private onUserAdded(userId: number): void {
    if (!this.remoteUsersVideoContainer) {
      throw Error();
    }

    const remoteUserVideoElement: HTMLCanvasElement = document.createElement('canvas');
    remoteUserVideoElement.id = 'u_' + userId;
    remoteUserVideoElement.width = 200;
    remoteUserVideoElement.height = 112;

    this.remoteUsersVideoContainer.appendChild(remoteUserVideoElement);
  }

  private onUserRemoved(userId: number): void {
    const remoteUserVideoElement: HTMLCanvasElement | null = document.querySelector('#u_' + userId);
    if (!remoteUserVideoElement) {
      return;
    }

    if (!this.remoteUsersVideoContainer) {
      throw Error();
    }

    this.remoteUsersVideoContainer.removeChild(remoteUserVideoElement);
  }

  private startUserVideo(userId: number): void {
    if (!this.stream) {
      throw Error(`Trying to turn on ${userId} User video. Stream is not found`);
    }

    const remoteUserVideo: HTMLCanvasElement | null = document.querySelector(`#u_${userId}`);
    if (!remoteUserVideo) {
      return;
    }

    this.stream.renderVideo(remoteUserVideo, userId, 200, 112, 0, 0, 3)
  }

  private stopUserVideo(userId: number): void {
    if (!this.stream) {
      throw Error(`Trying to turn off ${userId} User video. Stream is not found`);
    }

    const remoteUserVideo: HTMLCanvasElement | null = document.querySelector(`#u_${userId}`);
    if (!remoteUserVideo) {
      return;
    }

    this.stream.stopRenderVideo(remoteUserVideo, userId);
  }

  private async onJoin(): Promise<void> {
    if (!this.client) {
      throw Error('Client is not found after joining');
    }

    this.stream = this.client.getMediaStream();
    await this.stream.startAudio({mute: true, backgroundNoiseSuppression: true});
    this.createLocalUserVideoElement();

    this.registerEventListeners();

    /* video rendered */
    const participants: Participant[] = this.client.getAllUser();

    const localParticipant: Participant = this.client.getUser(this.client.getSessionInfo().userId)
    this.userService.localUser.zoomUser = {
      id: localParticipant.userId,
      isVideoOn: localParticipant.bVideoOn,
      isAudioOn: localParticipant.muted || false,
    };
    await this.classroomService.sendLocalUserJoined();

    participants.forEach((participant: Participant): void => {
      if (participant.userId === this.userService.localUser.zoomUser.id) {
        return;
      }

      this.onUserAdded(participant.userId);
      if (participant.bVideoOn) {
        this.startUserVideo(participant.userId);
      }
    });
  }

}
