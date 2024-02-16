import { Injectable } from '@angular/core';
import ZoomVideo, {Participant} from '@zoom/videosdk';
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
        return throwError(() => new Error('Something bad happened; please try again later.'));
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

    this.client.on('user-added', (participantProperties: any): void => {
      if (participantProperties[0]?.userId) {
        this.onParticipantAdded(participantProperties[0].userId);
      }
    })
    this.client.on('user-removed', (participantProperties: any): void => {
      if (participantProperties[0]?.userId) {
        this.onParticipantRemoved(participantProperties[0].userId);
      }
    })

    this.client.on('peer-video-state-change', (payload: { action: "Start" | "Stop"; userId: number }): void => {
      if (payload.action === 'Start') {
        this.startParticipantVideo(payload.userId);
      } else if (payload.action === 'Stop') {
        this.stopParticipantVideo(payload.userId);
      }
    })
  }

  private onParticipantAdded(participantId: number): void {
    if (!this.remoteUsersVideoContainer) {
      throw Error();
    }

    const remoteUserVideoElement: HTMLCanvasElement = document.createElement('canvas');
    remoteUserVideoElement.id = 'u_' + participantId;
    remoteUserVideoElement.width = 200;
    remoteUserVideoElement.height = 112;

    this.remoteUsersVideoContainer.appendChild(remoteUserVideoElement);
  }
  private onParticipantRemoved(participantId: number): void {
    const remoteUserVideoElement: HTMLCanvasElement | null = document.querySelector('#u_' + participantId);
    if (!remoteUserVideoElement) {
      return;
    }

    if (!this.remoteUsersVideoContainer) {
      throw Error();
    }

    this.remoteUsersVideoContainer.removeChild(remoteUserVideoElement);
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

  public async startLocalVideo(): Promise<void> {
    if (!this.localUserVideoContainer || !this.stream) {
      return Promise.reject(`Trying to turn on local Participant video:Stream is not found`);
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

    this.userService.localUser.zoomState.isVideoOn = true;
  }

  public async stopLocalVideo(): Promise<void> {
    if (!this.stream) {
      return Promise.reject(`Trying to turn off local Participant video:Stream is not found`);
    }

    await this.stream.stopVideo();

    this.userService.localUser.zoomState.isVideoOn = false;
  }

  public async unmuteLocalAudio(): Promise<void> {
    if (!this.stream) {
      return Promise.reject(`Trying to turn on local Participant audio:Stream is not found`);
    }

    await this.stream.unmuteAudio();

    this.userService.localUser.zoomState.isAudioOn = true;
  }

  public async muteLocalAudio(): Promise<void> {
    if (!this.stream) {
      return Promise.reject(`Trying to turn off local Participant viaudiodeo:Stream is not found`);
    }

    await this.stream.muteAudio();

    this.userService.localUser.zoomState.isAudioOn = false;
  }

  private startParticipantVideo(userId: number): void {
    if (!this.stream) {
      throw Error(`Trying to turn on ${userId} Participant video:Stream is not found`);
    }

    const remoteUserVideo: HTMLCanvasElement | null = document.querySelector(`#u_${userId}`);
    if (!remoteUserVideo) {
      return;
    }

    this.stream.renderVideo(remoteUserVideo, userId, 200, 112, 0, 0, 3)
  }
  private stopParticipantVideo(userId: number): void {
    if (!this.stream) {
      throw Error(`Trying to turn off ${userId} Participant video:Stream is not found`);
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

    participants.forEach((participant: Participant): void => {
      if (participant.userId === this.client.getSessionInfo().userId) {
        return;
      }

      this.onParticipantAdded(participant.userId);
      if (participant.bVideoOn) {
        this.startParticipantVideo(participant.userId);
      }
    });
  }
}
