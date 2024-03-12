import {Injectable} from '@angular/core';
import {AudioVideoService} from "../audio-video.service";
import {Group} from "../../grouping.service";
import {AudioVideoUserId, UserId} from "../../../model/types";
import {
  ConsoleLogger,
  DefaultDeviceController,
  DefaultMeetingSession,
  LogLevel,
  MeetingSessionConfiguration, VideoTileState, VoiceFocusDeviceTransformer, VoiceFocusTransformDevice
} from "amazon-chime-sdk-js";
import {HttpClient} from "@angular/common/http";
import {ConnectionOptions} from "../../../model/chime/connection-options";
import {lastValueFrom} from "rxjs";
import {Classroom} from "../../../model/classroom";
import {ClassroomState} from "../../../state/classroom.state";
import {LocalUser} from "../../../model/local-user";
import {LocalUserAction, LocalUserState} from "../../../state/local-user.state";
import {RemoteUsers, RemoteUsersState} from "../../../state/remote-users.state";
import {Store} from "@ngxs/store";
import {RemoteUser} from "../../../model/remote-user";
import {ConnectionHandleService} from "../../connection-handle.service";
import {AudioVideoUser} from "../../../model/user";

interface VideoTile1 {
  id?: number;
  mediaStream?: MediaStream;
  htmlElement?: HTMLVideoElement;
}

@Injectable({
  providedIn: 'root'
})
export class ChimeService extends AudioVideoService {
  private classroom : Classroom = ClassroomState.defaults;
  private localUser: LocalUser = LocalUserState.defaults;
  private remoteUsers: RemoteUsers = RemoteUsersState.defaults;

  private meetingSession: DefaultMeetingSession | undefined;

  private localUserVideoTile: VideoTile1 | undefined = undefined;
  private remoteUserVideoTiles: {[key: AudioVideoUserId]: VideoTile1} = {};

  constructor(
    private connectionHandleService: ConnectionHandleService,
    private httpClient: HttpClient,
    private store: Store
  ) {
    super();
    this.listenStoreChanges();
  }

  public override async init(): Promise<void> {
    const logger: ConsoleLogger = new ConsoleLogger('ChimeConsoleLogger', LogLevel.INFO);
    const deviceController: DefaultDeviceController = new DefaultDeviceController(logger, {enableWebAudio: true});

    const connectionOptions: ConnectionOptions = await this.getConnectionOptions();

    const meetingResponse: any = connectionOptions.meeting;
    const attendeeResponse: any = connectionOptions.attendee;

    const configuration: MeetingSessionConfiguration = new MeetingSessionConfiguration(meetingResponse, attendeeResponse);

    this.meetingSession = new DefaultMeetingSession(
      configuration,
      logger,
      deviceController
    );

    const audioInputDevices: MediaDeviceInfo[] = await this.meetingSession.audioVideo.listAudioInputDevices();
    const audioOutputDevices: MediaDeviceInfo[] = await this.meetingSession.audioVideo.listAudioOutputDevices();
    const videoInputDevices: MediaDeviceInfo[] = await this.meetingSession.audioVideo.listVideoInputDevices();

    const audioInputDeviceInfo: MediaDeviceInfo = audioInputDevices[0];
    if (audioInputDeviceInfo) {
      if (await VoiceFocusDeviceTransformer.isSupported()) {
        try {
          const voiceFocusDeviceTransformer: VoiceFocusDeviceTransformer = await VoiceFocusDeviceTransformer.create({variant: 'auto'});
          const voiceFocusTransformDevice: VoiceFocusTransformDevice | undefined = await voiceFocusDeviceTransformer.createTransformDevice(audioInputDeviceInfo.deviceId);

          if (voiceFocusTransformDevice) {
            await this.meetingSession.audioVideo.startAudioInput(voiceFocusTransformDevice);
          } else {
            await this.meetingSession.audioVideo.startAudioInput(audioInputDeviceInfo.deviceId);
          }
        } catch (cause) {
          this.meetingSession?.audioVideo?.startAudioInput(audioInputDeviceInfo.deviceId);
          throw "VoiceFocus is not supported";
        }
      }
      await this.muteLocalAudio();
    }

    const audioOutputDeviceInfo: MediaDeviceInfo = audioOutputDevices[0];
    if (audioOutputDeviceInfo) {
      await this.meetingSession.audioVideo.chooseAudioOutput(audioOutputDeviceInfo.deviceId);
    }

    const videoInputDeviceInfo: MediaDeviceInfo = videoInputDevices[0];
    if (videoInputDeviceInfo) {
      await this.meetingSession.audioVideo.startVideoInput(videoInputDeviceInfo.deviceId);
    }

    const audioElement: HTMLAudioElement = document.createElement('audio');
    document.body.appendChild(audioElement);

    await this.meetingSession.audioVideo.bindAudioElement(audioElement);

    this.meetingSession.audioVideo.realtimeSubscribeToAttendeeIdPresence((presentAttendeeId: string, present: boolean): void => {
      console.log(`Attendee ID: ${presentAttendeeId} Present: ${present}`);
    });

    this.meetingSession.audioVideo.addObserver({
      videoTileDidUpdate: (tileState: VideoTileState): void => {
        if (!this.meetingSession?.audioVideo) {
          throw Error();
        }

        if (!tileState.boundAttendeeId || !tileState.boundExternalUserId || !tileState.tileId) {
          return;
        }

        if (tileState.localTile) {
          if (!this.localUserVideoTile || !this.localUserVideoTile.htmlElement) {
            throw Error();
          }

          this.meetingSession.audioVideo.bindVideoElement(tileState.tileId, this.localUserVideoTile.htmlElement);
        } else {
          const remoteUserVideoElement: VideoTile1 | null = this.remoteUserVideoTiles[tileState.boundAttendeeId];

          if (!remoteUserVideoElement) {
            throw Error();
          }

          if (tileState.boundVideoStream) {
            remoteUserVideoElement.mediaStream = tileState.boundVideoStream;
          }

          this.startRemoteVideo(tileState.boundAttendeeId);
        }
      }
    });
  }


  public async join(): Promise<void> {
    if (!this.meetingSession) {
      return Promise.reject();
    }

    this.meetingSession.audioVideo.start();

    /* initialize local zoom state */
    const audioVideoUser: AudioVideoUser = {
      id: this.meetingSession.configuration.credentials?.attendeeId + '',
      isVideoOn: false,
      isAudioOn: false,
    };

    this.store.dispatch(new LocalUserAction.SetAudioVideoUser(audioVideoUser));

    // this.connectionHandleService.audioVideoConnectionChanged(true);
  }
  public leave(): void {
    if (!this.meetingSession) {
      return;
    }

    this.meetingSession.audioVideo.stop();

    // this.connectionHandleService.audioVideoConnectionChanged(false);
  }


  public override setLocalUserVideoElement(element: HTMLVideoElement): void {
    if (this.localUserVideoTile) {
      this.localUserVideoTile.htmlElement = element;
    } else {
      this.localUserVideoTile = {
        htmlElement: element
      };
    }

    if (!this.localUser.audioVideoUser) {
      return;
    }

    if (this.localUser.audioVideoUser.isVideoOn) {
      this.startLocalVideo().then();
    }
  }
  public override removeLocalUserVideoElement(): void {
    if (this.localUserVideoTile) {
      this.localUserVideoTile.htmlElement = undefined;
    }
  }

  public override async setRemoteUserVideoElement(userId: UserId, element: HTMLVideoElement): Promise<void> {
    const remoteUser: RemoteUser | undefined = this.remoteUsers[userId];
    if (!remoteUser) {
      await Promise.reject();
    }

    if (this.remoteUserVideoTiles[remoteUser.audioVideoUser.id]) {
      this.remoteUserVideoTiles[remoteUser.audioVideoUser.id].htmlElement = element;
    } else {
      this.remoteUserVideoTiles[remoteUser.audioVideoUser.id] = {
        htmlElement: element
      };
    }

    if (remoteUser.audioVideoUser.isVideoOn) {
      await this.startRemoteVideo(remoteUser.audioVideoUser.id);
    }
  }
  public override async removeRemoteUserVideoElement(userId: UserId): Promise<void> {
    const remoteUser: RemoteUser | undefined = this.remoteUsers[userId];
    delete this.remoteUserVideoTiles[remoteUser.audioVideoUser.id].htmlElement;
  }

  public override async startLocalVideo(): Promise<void> {
    if (!this.meetingSession) {
      return;
    }

    this.meetingSession.audioVideo.startLocalVideoTile();

    this.store.dispatch(new LocalUserAction.SetIsVideoOn(true));
  }

  public override async stopLocalVideo(): Promise<void> {
    if (!this.meetingSession) {
      return;
    }

    this.meetingSession.audioVideo.stopLocalVideoTile();

    this.store.dispatch(new LocalUserAction.SetIsVideoOn(false));
  }

  public override async unmuteLocalAudio(): Promise<void> {
    if (!this.meetingSession) {
      return;
    }

    this.meetingSession.audioVideo.realtimeUnmuteLocalAudio();

    this.store.dispatch(new LocalUserAction.SetIsAudioOn(true));
  }

  public override async muteLocalAudio(): Promise<void> {
    if (!this.meetingSession) {
      return;
    }
    this.meetingSession.audioVideo.realtimeMuteLocalAudio();

    this.store.dispatch(new LocalUserAction.SetIsAudioOn(false));
  }

  public override async breakRoomIntoGroups(groups: Group[]): Promise<void> {}

  private async startRemoteVideo(userId: AudioVideoUserId): Promise<void> {
    const remoteUserVideoTile: VideoTile1 | null = this.remoteUserVideoTiles[userId];

    if (!remoteUserVideoTile?.htmlElement || !remoteUserVideoTile?.mediaStream) {
      return;
    }

    remoteUserVideoTile.htmlElement.srcObject = remoteUserVideoTile.mediaStream;
    await remoteUserVideoTile.htmlElement.play();
  }

  private async stopRemoteVideo(userId: AudioVideoUserId): Promise<void> {
    const remoteUserVideoTile: VideoTile1 | null = this.remoteUserVideoTiles[userId];
    if (!remoteUserVideoTile.htmlElement) {
      return;
    }

    remoteUserVideoTile.htmlElement.pause();
    remoteUserVideoTile.htmlElement.srcObject = null;
  }

  private getConnectionOptions(): Promise<ConnectionOptions> {
    return lastValueFrom(this.httpClient.get<ConnectionOptions>('http://localhost:8090/chime/attendee', {
      params: {
        roomNumber: this.classroom.roomNumber,
        username: this.localUser.username
      }
    }));
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
