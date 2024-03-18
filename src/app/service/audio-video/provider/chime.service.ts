import {Injectable} from '@angular/core';
import {AudioVideoService} from "../audio-video.service";
import {Group} from "../../grouping.service";
import {AudioVideoUserId, UserId} from "../../../model/types";
import {
  ConsoleLogger,
  DefaultDeviceController,
  DefaultMeetingSession,
  LogLevel,
  MeetingSessionConfiguration,
  VideoTileState,
  VoiceFocusDeviceTransformer,
  VoiceFocusTransformDevice
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

  private meetingSubSessions: {[key: number]: DefaultMeetingSession} = {};

  private meetingMainSession: DefaultMeetingSession | undefined;

  private localUserVideoTile: VideoTile1 | undefined = undefined;
  private remoteUserVideoTiles: {[key: AudioVideoUserId]: VideoTile1} = {};

  constructor(
    private httpClient: HttpClient,
    private store: Store
  ) {
    super();
    this.listenStoreChanges();
  }

  public override async init(): Promise<void> {
    const connectionOptions: ConnectionOptions = await this.getMainSessionConnectionOptions();
    this.meetingMainSession = await this.createMeetingSession(connectionOptions, 'mainSessionLogger');
  }

  public async join(): Promise<void> {
    if (!this.meetingMainSession) {
      return Promise.reject();
    }

    this.meetingMainSession.audioVideo.start();

    /* initialize local zoom state */
    const audioVideoUser: AudioVideoUser = {
      id: this.meetingMainSession.configuration.credentials?.attendeeId + '',
      isVideoOn: false,
      isAudioOn: false,
    };

    this.store.dispatch(new LocalUserAction.SetAudioVideoUser(audioVideoUser));

    // this.connectionHandleService.audioVideoConnectionChanged(true);
  }
  public leave(): void {
    if (!this.meetingMainSession) {
      return;
    }

    this.meetingMainSession.audioVideo.stop();

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
    if (!this.meetingMainSession) {
      return;
    }

    this.meetingMainSession.audioVideo.startLocalVideoTile();

    this.store.dispatch(new LocalUserAction.SetIsVideoOn(true));
  }

  public override async stopLocalVideo(): Promise<void> {
    if (!this.meetingMainSession) {
      return;
    }

    this.meetingMainSession.audioVideo.stopLocalVideoTile();

    this.store.dispatch(new LocalUserAction.SetIsVideoOn(false));
  }

  public override async unmuteLocalAudio(): Promise<void> {
    if (!this.meetingMainSession) {
      return;
    }

    this.meetingMainSession.audioVideo.realtimeUnmuteLocalAudio();

    this.store.dispatch(new LocalUserAction.SetIsAudioOn(true));
  }

  public override async muteLocalAudio(): Promise<void> {
    if (!this.meetingMainSession) {
      return;
    }
    this.meetingMainSession.audioVideo.realtimeMuteLocalAudio();

    this.store.dispatch(new LocalUserAction.SetIsAudioOn(false));
  }

  public override async breakRoomIntoGroups(groups: Group[]): Promise<void> {
    this.meetingSubSessions = {};

    for (const group of groups) {
      const connectionOptions: ConnectionOptions = await this.getSubSessionConnectionOptions(group.id);
      this.meetingSubSessions[group.id] = await this.createMeetingSession(connectionOptions, `subSessionLogger_${group.id}`);
      this.meetingSubSessions[group.id].audioVideo.start();

      if (!group.isAudioAvailableForLocalUser) {
        this.meetingSubSessions[group.id].audioVideo.stopAudioInput().then();
      }
    }
  }

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

  private async createMeetingSession(connectionOptions: ConnectionOptions, loggerName: string): Promise<DefaultMeetingSession> {
    const logger: ConsoleLogger = new ConsoleLogger(loggerName, LogLevel.INFO);
    const deviceController: DefaultDeviceController = new DefaultDeviceController(logger, {enableWebAudio: true});

    const meetingResponse: any = connectionOptions.meeting;
    const attendeeResponse: any = connectionOptions.attendee;

    const configuration: MeetingSessionConfiguration = new MeetingSessionConfiguration(meetingResponse, attendeeResponse);

    const meetingMainSession: DefaultMeetingSession = new DefaultMeetingSession(
      configuration,
      logger,
      deviceController
    );

    const audioInputDevices: MediaDeviceInfo[] = await meetingMainSession.audioVideo.listAudioInputDevices();
    const audioOutputDevices: MediaDeviceInfo[] = await meetingMainSession.audioVideo.listAudioOutputDevices();
    const videoInputDevices: MediaDeviceInfo[] = await meetingMainSession.audioVideo.listVideoInputDevices();

    const audioInputDeviceInfo: MediaDeviceInfo = audioInputDevices[0];
    if (audioInputDeviceInfo) {
      if (await VoiceFocusDeviceTransformer.isSupported()) {
        try {
          const voiceFocusDeviceTransformer: VoiceFocusDeviceTransformer = await VoiceFocusDeviceTransformer.create({variant: 'auto'});
          const voiceFocusTransformDevice: VoiceFocusTransformDevice | undefined = await voiceFocusDeviceTransformer.createTransformDevice(audioInputDeviceInfo.deviceId);

          if (voiceFocusTransformDevice) {
            await meetingMainSession.audioVideo.startAudioInput(voiceFocusTransformDevice);
          } else {
            await meetingMainSession.audioVideo.startAudioInput(audioInputDeviceInfo.deviceId);
          }
        } catch (cause) {
          meetingMainSession?.audioVideo?.startAudioInput(audioInputDeviceInfo.deviceId);
          throw "VoiceFocus is not supported";
        }
      }
      await this.muteLocalAudio();
    }

    const audioOutputDeviceInfo: MediaDeviceInfo = audioOutputDevices[0];
    if (audioOutputDeviceInfo) {
      await meetingMainSession.audioVideo.chooseAudioOutput(audioOutputDeviceInfo.deviceId);
    }

    const videoInputDeviceInfo: MediaDeviceInfo = videoInputDevices[0];
    if (videoInputDeviceInfo) {
      await meetingMainSession.audioVideo.startVideoInput(videoInputDeviceInfo.deviceId);
    }

    const audioElement: HTMLAudioElement = document.createElement('audio');
    document.body.appendChild(audioElement);

    await meetingMainSession.audioVideo.bindAudioElement(audioElement);

    meetingMainSession.audioVideo.realtimeSubscribeToAttendeeIdPresence((presentAttendeeId: string, present: boolean): void => {
      console.log(`Attendee ID: ${presentAttendeeId} Present: ${present}`);
    });

    meetingMainSession.audioVideo.addObserver({
      videoTileDidUpdate: (tileState: VideoTileState): void => {
        if (!meetingMainSession?.audioVideo) {
          throw Error();
        }

        if (!tileState.boundAttendeeId || !tileState.boundExternalUserId || !tileState.tileId) {
          return;
        }

        if (tileState.localTile) {
          if (!this.localUserVideoTile || !this.localUserVideoTile.htmlElement) {
            throw Error();
          }

          meetingMainSession.audioVideo.bindVideoElement(tileState.tileId, this.localUserVideoTile.htmlElement);
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

    return meetingMainSession;
  }

  private getMainSessionConnectionOptions(): Promise<ConnectionOptions> {
    return lastValueFrom(this.httpClient.get<ConnectionOptions>('http://localhost:8090/audio-video/main-session/connection-options', {
      params: {
        roomNumber: this.classroom.roomNumber,
        username: this.localUser.username
      }
    }));
  }

  private getSubSessionConnectionOptions(groupId: number): Promise<ConnectionOptions> {
    return lastValueFrom(this.httpClient.get<ConnectionOptions>('http://localhost:8090/audio-video/sub-session/connection-options', {
      params: {
        roomNumber: this.classroom.roomNumber,
        groupId,
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
