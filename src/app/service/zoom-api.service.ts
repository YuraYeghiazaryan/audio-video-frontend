import {Injectable} from '@angular/core';
import ZoomVideo, {ConnectionChangePayload, ConnectionState, Participant} from '@zoom/videosdk';
import {ConnectionOptions} from "../model/connection-options";
import {UserService} from "./user.service";
import {Classroom} from "../model/classroom";
import {LocalUser} from "../model/local-user";
import {HttpClient} from "@angular/common/http";
import {lastValueFrom} from "rxjs";
import {LocalUserAction, LocalUserState} from "../state/local-user.state";
import {ClassroomState} from "../state/classroom.state";
import {Store} from "@ngxs/store";
import {ZoomUser} from "../model/user";
import {ZoomUserId} from "../model/types";
import {RemoteUser} from "../model/remote-user";
import {RemoteUsers, RemoteUsersState} from "../state/remote-users.state";
import {ConnectionHandleService} from "./connection-handle.service";

@Injectable({
  providedIn: 'root'
})
export class ZoomApiService {
  private classroom : Classroom = ClassroomState.defaults;
  private localUser: LocalUser = LocalUserState.defaults;
  private remoteUsers: RemoteUsers = RemoteUsersState.defaults;

  private initialized: boolean = false;
  private connectionOptions: ConnectionOptions | null = null;

  private client: any;
  private stream: any;

  public constructor(
    private userService: UserService,
    private connectionHandleService: ConnectionHandleService,
    private httpClient: HttpClient,
    private store: Store
  ) {
    this.listenStoreChanges();
  }

  /** zoom client creation, getting jwt token, initialize client */
  public init(): Promise<void> {
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

  /** join client to zoom */
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
    if (!this.stream || !this.localUser.zoomUser) {
      return Promise.reject(`Can't turn on local User video`);
    }

    const localUserVideoElement: HTMLElement | null = document.querySelector(`#u_${this.localUser.zoomUser.id}`)

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

    this.store.dispatch(new LocalUserAction.SetIsVideoOn(true));
  }

  public async stopLocalVideo(): Promise<void> {
    if (!this.stream) {
      return Promise.reject(`Trying to turn off local User video. Stream is not found`);
    }

    await this.stream.stopVideo();

    this.store.dispatch(new LocalUserAction.SetIsVideoOn(false));
  }

  public async unmuteLocalAudio(): Promise<void> {
    if (!this.stream) {
      return Promise.reject(`Trying to turn on local User audio. Stream is not found`);
    }

    await this.stream.unmuteAudio();

    this.store.dispatch(new LocalUserAction.SetIsAudioOn(true));
  }

  public async muteLocalAudio(): Promise<void> {
    if (!this.stream) {
      return Promise.reject(`Trying to turn off local User audio. Stream is not found`);
    }

    await this.stream.muteAudio();

    this.store.dispatch(new LocalUserAction.SetIsAudioOn(false));
  }

  public async muteUserAudioLocally(remoteUser: RemoteUser): Promise<void> {
    await this.stream.muteUserAudioLocally(remoteUser.zoomUser.id);
  }

  public async unmuteUserAudioLocally(remoteUser: RemoteUser): Promise<void> {
    await this.stream.unmuteUserAudioLocally(remoteUser.zoomUser.id);
  }

  /** if user is logged in, get connection options from BE */
  private getConnectionOptions(): Promise<ConnectionOptions> {
    if (!this.classroom) {
      return Promise.reject('Classroom is not initialized');
    }

    if (!this.userService.isLoggedIn()) {
      return Promise.reject('User is not logged in');
    }

    return lastValueFrom(this.httpClient.get<ConnectionOptions>(
      'http://localhost:8090/zoom/connection-options',
      {
        params: {
          sessionName: this.classroom.roomNumber,
          username: this.localUser.username
        }
      }
    ));
  }

  private registerEventListeners(): void  {
    if (!this.client) {
      throw Error();
    }

    this.client.on('connection-change', (connectionChangePayload: ConnectionChangePayload): void => {
      const localUserConnected: boolean = connectionChangePayload.state === ConnectionState.Connected;

      this.connectionHandleService.zoomConnectionChanged(localUserConnected);
    });

    this.client.on('peer-video-state-change', (payload: { action: "Start" | "Stop"; userId: number }): void => {
      if (payload.action === 'Start') {
        this.renderUserVideo(payload.userId);
      } else if (payload.action === 'Stop') {
        this.stopUserVideo(payload.userId);
      }
    });
  }

  /** render remote user video when joined to zoom or when user turn on video */
  private renderUserVideo(userId: ZoomUserId): void {
    if (!this.stream) {
      throw Error(`Trying to turn on ${userId} User video. Stream is not found`);
    }

    const remoteUserVideo: HTMLCanvasElement | null = document.querySelector(`#u_${userId}`);
    if (!remoteUserVideo) {
      return;
    }

    this.stream.renderVideo(remoteUserVideo, userId, 200, 112, 0, 0, 3)
  }

  /** stop remote user video when user turn off video */
  private stopUserVideo(userId: ZoomUserId): void {
    if (!this.stream) {
      throw Error(`Trying to turn off ${userId} User video. Stream is not found`);
    }

    const remoteUserVideo: HTMLCanvasElement | null = document.querySelector(`#u_${userId}`);
    if (!remoteUserVideo) {
      return;
    }

    this.stream.stopRenderVideo(remoteUserVideo, userId);
  }

  /** initialize stream, get media stream, register event listeners and render videos of remote users */
  private async onJoin(): Promise<void> {
    if (!this.client) {
      throw Error('Client is not found after joining');
    }

    this.stream = this.client.getMediaStream();
    await this.stream.startAudio({mute: true, backgroundNoiseSuppression: true});

    this.registerEventListeners();

    const localParticipantId: number = this.client.getSessionInfo().userId;
    const localParticipant: Participant = this.client.getUser(localParticipantId);

    /* initialize local zoom state */
    const zoomUser: ZoomUser = {
      id: localParticipant.userId,
      isVideoOn: localParticipant.bVideoOn,
      isAudioOn: localParticipant.muted || false,
    };

    this.store.dispatch(new LocalUserAction.SetZoomUser(zoomUser));

    /* video rendered */
    const participants: Participant[] = this.client.getAllUser();
    participants.forEach((participant: Participant): void => {
      if (participant.userId === this.localUser.zoomUser?.id) {
        return;
      }

      const remoteUser: RemoteUser | undefined = Object.values(this.remoteUsers).find((remoteUser: RemoteUser): boolean => {
        return remoteUser.zoomUser.id === participant.userId;
      });

      if (!remoteUser) {
        throw Error();
      }

      // this.addRemoteUser(remoteUser);
      if (participant.bVideoOn) {
        this.renderUserVideo(participant.userId);
      }
    });
  }

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
}
