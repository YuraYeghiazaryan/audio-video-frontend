import {Injectable} from '@angular/core';
import {AudioVideoService} from "../audio-video.service";
import {Classroom} from "../../../model/classroom";
import {ClassroomState} from "../../../state/classroom.state";
import {LocalUser} from "../../../model/local-user";
import {LocalUserAction, LocalUserState} from "../../../state/local-user.state";
import {RemoteUsers, RemoteUsersAction, RemoteUsersState} from "../../../state/remote-users.state";
import {ConnectionOptions} from "../../../model/zoom/connection-options";
import {UserService} from "../../user.service";
import {ConnectionHandleService} from "../../connection-handle.service";
import {HttpClient} from "@angular/common/http";
import {Store} from "@ngxs/store";
import ZoomVideo, {ConnectionChangePayload, ConnectionState, Participant} from "@zoom/videosdk";
import {RemoteUser} from "../../../model/remote-user";
import {lastValueFrom} from "rxjs";
import {UserId, AudioVideoUserId} from "../../../model/types";
import {AudioVideoUser} from "../../../model/user";
import {Group, Groups} from "../../grouping.service";
import SetAudioListenable = RemoteUsersAction.SetAudioListenable;
import SetVideoVisible = RemoteUsersAction.SetVideoVisible;

@Injectable({
  providedIn: 'root'
})
export class ZoomService extends AudioVideoService {
  private classroom : Classroom = ClassroomState.defaults;
  private localUser: LocalUser = LocalUserState.defaults;
  private remoteUsers: RemoteUsers = RemoteUsersState.defaults;

  private initialized: boolean = false;
  private connectionOptions: ConnectionOptions | null = null;

  private localUserVideoElement: HTMLCanvasElement | undefined = undefined;
  private remoteUserVideoElements: {[key: UserId]: HTMLCanvasElement} = {};

  private client: any;
  private stream: any;

  public constructor(
    private userService: UserService,
    private connectionHandleService: ConnectionHandleService,
    private httpClient: HttpClient,
    private store: Store
  ) {
    super();
    this.listenStoreChanges();
  }

  /** zoom client creation, getting jwt token, initialize client */
  public override async init(): Promise<void> {
    this.client = ZoomVideo.createClient();

    const connectionOptionsPromise: Promise<void> = this.getConnectionOptions()
      .then((connectionOptions: ConnectionOptions): void => {
        this.connectionOptions = connectionOptions;
      });

    const initPromise: Promise<void> = this.client.init('en-US', 'Global', {patchJsMedia: true})
      .then((): void => {
        this.initialized = true;
      });

    await Promise.all([connectionOptionsPromise, initPromise]);
  }

  /** join client to zoom */
  public override join(): Promise<void> {
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
  public override leave(): void {
    this.client?.leave(true);
  }

  public override setLocalUserVideoElement(element: HTMLCanvasElement): void {
    this.localUserVideoElement = element;
    if (!this.localUser.audioVideoUser) {
      return;
    }

    if (this.localUser.audioVideoUser.isVideoOn) {
      this.startLocalVideo()
        .then((): void => console.log('local user video element changed'))
        .catch((): void => console.log('local user video element not changed'));
    }
  }
  public override removeLocalUserVideoElement(): void {
    this.localUserVideoElement = undefined;
  }

  public override async setRemoteUserVideoElement(userId: UserId, element: HTMLCanvasElement): Promise<void> {
    const remoteUser: RemoteUser | undefined = this.remoteUsers[userId];
    if (!remoteUser) {
      await Promise.reject();
    }

    this.remoteUserVideoElements[userId] = element;

    if (remoteUser.audioVideoUser.isVideoOn) {
      await this.renderUserVideo(remoteUser.audioVideoUser.id);
    }
  }
  public override async removeRemoteUserVideoElement(userId: UserId): Promise<void> {
    const remoteUser: RemoteUser | undefined = this.remoteUsers[userId];
    await this.stopUserVideo(remoteUser.audioVideoUser.id);

    delete this.remoteUserVideoElements[userId];
  }

  public override async startLocalVideo(): Promise<void> {
    if (!this.stream || !this.localUser.audioVideoUser) {
      return Promise.reject(`Can't turn on local User video`);
    }

    if (!this.localUserVideoElement) {
      return Promise.reject("Local User video element does not exist");
    }

    if (this.localUserVideoElement instanceof HTMLVideoElement) {
      await this.stream.startVideo({ videoElement: this.localUserVideoElement });
    } else if (this.localUserVideoElement instanceof HTMLCanvasElement) {
      const localUserZoomId: number = this.client.getCurrentUserInfo().userId;
      await this.stream.startVideo()
        .then((): Promise<void> => {
          return this.stream.renderVideo(this.localUserVideoElement, localUserZoomId, 200, 112, 0, 0, 3);
        });
    } else {
      return Promise.reject("Local User video element is not either HTMLVideoElement nor HTMLCanvasElement");
    }

    this.store.dispatch(new LocalUserAction.SetIsVideoOn(true));
  }
  public override async stopLocalVideo(): Promise<void> {
    if (!this.stream) {
      return Promise.reject(`Trying to turn off local User video. Stream is not found`);
    }

    await this.stream.stopVideo();

    this.store.dispatch(new LocalUserAction.SetIsVideoOn(false));
  }

  public override async muteLocalAudio(): Promise<void> {
    if (!this.stream) {
      return Promise.reject(`Trying to turn off local User audio. Stream is not found`);
    }

    await this.stream.muteAudio();

    this.store.dispatch(new LocalUserAction.SetIsAudioOn(false));
  }
  public override async unmuteLocalAudio(): Promise<void> {
    if (!this.stream) {
      return Promise.reject(`Trying to turn on local User audio. Stream is not found`);
    }

    await this.stream.unmuteAudio();

    this.store.dispatch(new LocalUserAction.SetIsAudioOn(true));
  }


  public override async breakRoomIntoGroups(groups: Groups): Promise<void> {
    const promises: Promise<void>[] = [];

    const allGroups: Group[] = [];
    if (groups.main) {
      allGroups.push(groups.main);
    }
    if (groups.privateTalk) {
      allGroups.push(groups.privateTalk);
    }
    if (groups.teamTalk) {
      allGroups.push(...groups.teamTalk);
    }

    allGroups.forEach((group: Group): void => {
      group.userIds.forEach((userId: UserId): void => {

        if (userId === this.localUser.id) {
          return;
        }

        const remoteUser: RemoteUser = this.remoteUsers[userId];

        this.store.dispatch(new SetAudioListenable(remoteUser, group.isAudioAvailableForLocalUser));
        this.store.dispatch(new SetVideoVisible(remoteUser, group.isVideoAvailableForLocalUser));

        if (group.isAudioAvailableForLocalUser) {
          promises.push(this.unmuteUserAudioLocally(remoteUser));
        } else {
          promises.push(this.muteUserAudioLocally(remoteUser));
        }

      });
    });

    await Promise.all(promises);
  }

  private async muteUserAudioLocally(remoteUser: RemoteUser): Promise<void> {
    await this.stream.muteUserAudioLocally(remoteUser.audioVideoUser.id);
  }

  private async unmuteUserAudioLocally(remoteUser: RemoteUser): Promise<void> {
    await this.stream.unmuteUserAudioLocally(remoteUser.audioVideoUser.id);
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
      'http://localhost:8090/audio-video/main-session/connection-options',
      {
        params: {
          roomNumber: this.classroom.roomNumber,
          groupId: 0,
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

      this.connectionHandleService.audioVideoConnectionChanged(localUserConnected);
    });

    this.client.on('peer-video-state-change', (payload: { action: "Start" | "Stop"; userId: number }): void => {
      if (payload.action === 'Start') {
        setTimeout((): void => {
          this.renderUserVideo(payload.userId + '').then();
        }, 100);
      } else if (payload.action === 'Stop') {
        this.stopUserVideo(payload.userId + '').then();
      }
    });
  }

  /** render remote user video when joined to zoom or when user turn on video */
  private async renderUserVideo(userId: AudioVideoUserId): Promise<void> {
    if (!this.stream) {
      throw Error(`Trying to turn on ${userId} User video. Stream is not found`);
    }

    const remoteUser: RemoteUser = Object.values(this.remoteUsers).find((remoteUser: RemoteUser): boolean => {
      return remoteUser.audioVideoUser.id === userId;
    })
    if (!remoteUser) {
      return;
    }

    const remoteUserVideo: HTMLCanvasElement | undefined = this.remoteUserVideoElements[remoteUser.id];
    if (!remoteUserVideo) {
      return;
    }

    await this.stream.renderVideo(remoteUserVideo, userId, 200, 112, 0, 0, 3);
  }

  /** stop remote user video when user turn off video */
  private async stopUserVideo(userId: AudioVideoUserId): Promise<void> {
    if (!this.stream) {
      throw Error(`Trying to turn off ${userId} User video. Stream is not found`);
    }

    const remoteUser: RemoteUser = Object.values(this.remoteUsers).find((remoteUser: RemoteUser): boolean => {
      return remoteUser.audioVideoUser.id === userId;
    })
    if (!remoteUser) {
      return;
    }

    const remoteUserVideo: HTMLCanvasElement | undefined = this.remoteUserVideoElements[remoteUser.id];
    if (!remoteUserVideo) {
      return;
    }

    await this.stream.stopRenderVideo(remoteUserVideo, userId);
  }

  /** initialize stream, get media stream, register event listeners and render videos of remote users */
  private async onJoin(): Promise<void> {
    if (!this.client) {
      throw Error('Client is not found after joining');
    }

    this.stream = this.client.getMediaStream();
    await this.stream.startAudio({mute: true, backgroundNoiseSuppression: false});

    this.registerEventListeners();

    const localParticipantId: number = this.client.getSessionInfo().userId;
    const localParticipant: Participant = this.client.getUser(localParticipantId);

    /* initialize local zoom state */
    const audioVideoUser: AudioVideoUser = {
      id: localParticipant.userId + '',
      joined: true,
      isVideoOn: localParticipant.bVideoOn,
      isAudioOn: localParticipant.muted || false,
    };

    this.store.dispatch(new LocalUserAction.SetAudioVideoUser(audioVideoUser));

    /* video rendered */
    const participants: Participant[] = this.client.getAllUser();
    participants.forEach((participant: Participant): void => {
      if (participant.userId + '' === this.localUser.audioVideoUser?.id) {
        return;
      }

      const remoteUser: RemoteUser | undefined = Object.values(this.remoteUsers)
        .find((remoteUser: RemoteUser): boolean => {
          return remoteUser.audioVideoUser.id === participant.userId + '';
        });

      if (!remoteUser) {
        return;
      }

      if (participant.bVideoOn) {
        this.renderUserVideo(participant.userId + '');
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
