import { Injectable } from '@angular/core';
import ZoomVideo, {Participant} from '@zoom/videosdk';
import {ConnectionOptions} from "../model/connection-options";
import {UserService} from "./user.service";
import {ClassroomService} from "./classroom.service";
import {Classroom} from "../model/classroom";
import {LocalUser} from "../model/local-user";

@Injectable({
  providedIn: 'root'
})
export class ZoomApiServiceService {

  private localUserVideoElement: HTMLVideoElement | null = null;
  private remoteUsersVideoContainer: HTMLDivElement | null = null;
  private initialized: boolean = false;
  private connectionOptions: ConnectionOptions | null = null;

  private client: any;
  private stream: any;

  public constructor(
    private userService: UserService,
    private classroomService: ClassroomService
  ) {}

  public init(localUserVideoElement: HTMLVideoElement, remoteUsersVideoContainer: HTMLDivElement): Promise<void> {
    if (!localUserVideoElement || !remoteUsersVideoContainer) {
      return Promise.reject();
    }

    this.localUserVideoElement = localUserVideoElement;
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

    /* get possible connection options from backend */
    return Promise.resolve({
      videoSDKJWT: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJwXzlpblZhRFNkeUFKeVNrMDgyTzRnIiwiZXhwIjoxNzA2MDA2OTYxLCJpYXQiOjE3MDU5MjA1NjEsInRwYyI6InJvb20iLCJhcHBfa2V5IjoiUWRMZGttQkFUdi04bHQtMGI3Z21uUSIsInJvbGVfdHlwZSI6MX0.rUFVL8_EnUAKX0QvcjJJcL-o0750r8Xlui6Haw8K05Y',
      username: localUser.username,
      sessionName: classroom.roomNumber + '',
      sessionPasscode: 'STRONG-PASSWORD'
    });
  }

  private registerEventListeners(): void  {
    if (!this.client) {
      throw Error();
    }

    this.client.on('user-added', (participantProperties: any): void => {
      if (participantProperties[0]?.userId) {
        this.onUserAdded(participantProperties[0].userId);
      }
    })
    this.client.on('user-removed', (participantProperties: any): void => {
      if (participantProperties[0]?.userId) {
        this.onUserRemoved(participantProperties[0].userId);
      }
    })

    this.client.on('peer-video-state-change', (payload: { action: "Start" | "Stop"; userId: number }): void => {
      if (payload.action === 'Start') {
        this.startParticipantVideo(payload.userId);
      } else if (payload.action === 'Stop') {
        this.stopUserVideo(payload.userId);
      }
    })
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

  private startLocalVideo(): Promise<void> {
    if (!this.localUserVideoElement || !this.stream) {
      throw Error();
    }

    if (this.stream.isRenderSelfViewWithVideoElement()) {
      return this.stream.startVideo({videoElement: this.localUserVideoElement});
    } else {
      return Promise.reject();
    }
  }
  private stopLocalVideo(): void {
    if (!this.stream) {
      throw Error();
    }
    this.stream.stopVideo();
  }

  private startParticipantVideo(userId: number): void {
    if (!this.stream) {
      throw Error();
    }

    const remoteUserVideo: HTMLCanvasElement | null = document.querySelector(`#u_${userId}`);
    if (!remoteUserVideo) {
      return;
    }

    this.stream.renderVideo(remoteUserVideo, userId, 200, 112, 0, 0, 3)
  }
  private stopUserVideo(userId: number): void {
    if (!this.stream) {
      throw Error();
    }

    const remoteUserVideo: HTMLCanvasElement | null = document.querySelector(`#u_${userId}`);
    if (!remoteUserVideo) {
      return;
    }

    this.stream.stopRenderVideo(remoteUserVideo, userId);
  }

  private onJoin(): void {
    if (!this.client) {
      throw Error();
    }

    this.stream = this.client.getMediaStream();
    this.registerEventListeners();
    this.startLocalVideo().then(this.onLocalVideoStarted.bind(this));
  }

  private onLocalVideoStarted(): void {
    if (!this.client) {
      throw Error();
    }
    /* video rendered */
    const participants: Participant[] = this.client.getAllUser();

    participants.forEach((participant: Participant): void => {
      if (participant.userId === this.client.getSessionInfo().userId) {
        return;
      }

      this.onUserAdded(participant.userId);
      if (participant.bVideoOn) {
        this.startParticipantVideo(participant.userId);
      }
    });
  }
}
