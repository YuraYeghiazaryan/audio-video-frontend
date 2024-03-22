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

/* @TODO RENAME*/
interface VideoTile1 {
  id?: number;
  mediaStream?: MediaStream;
  htmlElement?: HTMLVideoElement;
}
interface Meeting {
  session: DefaultMeetingSession,
  audioElement?: HTMLAudioElement
}

@Injectable({
  providedIn: 'root'
})
export class ChimeService extends AudioVideoService {
  private classroom : Classroom = ClassroomState.defaults;
  private localUser: LocalUser = LocalUserState.defaults;
  private remoteUsers: RemoteUsers = RemoteUsersState.defaults;

  private subMeetings: {[key: number]: Meeting} = {};

  private mainMeeting: Meeting | undefined;

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
    this.mainMeeting = await this.createMeetingSession(connectionOptions, 'mainSessionLogger');
  }

  public async join(): Promise<void> {
    if (!this.mainMeeting) {
      return Promise.reject();
    }

    this.mainMeeting.session.audioVideo.start();

    /* initialize local zoom state */
    const audioVideoUser: AudioVideoUser = {
      id: this.mainMeeting.session.configuration.credentials?.externalUserId + '',
      joined: true,
      isVideoOn: false,
      isAudioOn: false,
    };

    this.store.dispatch(new LocalUserAction.SetAudioVideoUser(audioVideoUser));

    // this.connectionHandleService.audioVideoConnectionChanged(true);
  }
  public leave(): void {
    if (!this.mainMeeting) {
      return;
    }

    this.mainMeeting.session.audioVideo.stop();

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
    if (this.mainMeeting?.session.audioVideo) {
      this.mainMeeting.session.audioVideo.startLocalVideoTile();
    }

    Object.values(this.subMeetings)
      .forEach((meeting: Meeting): void => {
        meeting.session.audioVideo.startLocalVideoTile();
      });

    this.store.dispatch(new LocalUserAction.SetIsVideoOn(true));
  }

  public override async stopLocalVideo(): Promise<void> {
    if (this.mainMeeting?.session.audioVideo) {
      this.mainMeeting.session.audioVideo.stopLocalVideoTile();
    }

    Object.values(this.subMeetings)
      .forEach((meeting: Meeting): void => {
        meeting.session.audioVideo.stopLocalVideoTile();
      });

    this.store.dispatch(new LocalUserAction.SetIsVideoOn(false));
  }

  public override async unmuteLocalAudio(): Promise<void> {
    if (this.mainMeeting?.session.audioVideo) {
      this.mainMeeting.session.audioVideo.realtimeUnmuteLocalAudio();
    }

    Object.values(this.subMeetings)
      .forEach((meeting: Meeting): void => {
        meeting.session.audioVideo.realtimeUnmuteLocalAudio();
      });

    this.store.dispatch(new LocalUserAction.SetIsAudioOn(true));
  }

  public override async muteLocalAudio(): Promise<void> {
    if (this.mainMeeting?.session.audioVideo) {
      this.mainMeeting.session.audioVideo.realtimeMuteLocalAudio();
    }

    Object.values(this.subMeetings)
      .forEach((meeting: Meeting): void => {
        meeting.session.audioVideo.realtimeMuteLocalAudio();
      });

    this.store.dispatch(new LocalUserAction.SetIsAudioOn(false));
  }

  public override async breakRoomIntoGroups(groups: Group[]): Promise<void> {
    Object.values(this.subMeetings)
      .forEach((meeting: Meeting): void => {
        meeting.audioElement?.remove();
        meeting.session.audioVideo.stop();
        meeting.session.destroy();
      });

    this.subMeetings = {};
    this.mainMeeting?.session?.audioVideo?.stop();
    this.mainMeeting?.session?.destroy()

    for (const group of groups) {
      if (!group.userIds.has(this.localUser.id)) {
        continue;
      }

      const connectionOptions: ConnectionOptions = await this.getSubSessionConnectionOptions(group.id);
      this.subMeetings[group.id] = await this.createMeetingSession(connectionOptions, `subSessionLogger_${group.id}`, group.isAudioAvailableForLocalUser);
      this.subMeetings[group.id].session.audioVideo.start();

      if (this.localUser.audioVideoUser?.isVideoOn) {
        this.subMeetings[group.id].session.audioVideo.startLocalVideoTile();
      }

      if (this.localUser.audioVideoUser?.isAudioOn) {
        this.subMeetings[group.id].session.audioVideo.realtimeUnmuteLocalAudio();
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

  private async createMeetingSession(connectionOptions: ConnectionOptions, loggerName: string, isAudioOn: boolean = true): Promise<Meeting> {
    const logger: ConsoleLogger = new ConsoleLogger(loggerName, LogLevel.INFO);
    const deviceController: DefaultDeviceController = new DefaultDeviceController(logger, {enableWebAudio: true});

    const meetingResponse: any = connectionOptions.createMeetingResult;
    const attendeeResponse: any = connectionOptions.createAttendeeResult;

    const configuration: MeetingSessionConfiguration = new MeetingSessionConfiguration(meetingResponse, attendeeResponse);

    const meetingSession: DefaultMeetingSession = new DefaultMeetingSession(
      configuration,
      logger,
      deviceController
    );

    const audioInputDevices: MediaDeviceInfo[] = await meetingSession.audioVideo.listAudioInputDevices();
    const audioOutputDevices: MediaDeviceInfo[] = await meetingSession.audioVideo.listAudioOutputDevices();
    const videoInputDevices: MediaDeviceInfo[] = await meetingSession.audioVideo.listVideoInputDevices();

    const mediaDeviceInfo: MediaDeviceInfo = audioInputDevices[0];
    meetingSession.audioVideo.realtimeMuteLocalAudio();

    if (mediaDeviceInfo) {
      let voiceFocusTransformDevice: VoiceFocusTransformDevice | undefined = undefined;

      if (await VoiceFocusDeviceTransformer.isSupported()) {
        try {
          const voiceFocusDeviceTransformer: VoiceFocusDeviceTransformer = await VoiceFocusDeviceTransformer.create({variant: 'auto'});
          voiceFocusTransformDevice = await voiceFocusDeviceTransformer.createTransformDevice(mediaDeviceInfo.deviceId);
        } catch (cause) {}
      }

      if (voiceFocusTransformDevice) {
        await meetingSession.audioVideo.startAudioInput(voiceFocusTransformDevice);
      } else {
        console.warn('Voice focus is not supported')
        await meetingSession.audioVideo.startAudioInput(mediaDeviceInfo.deviceId);
      }
    }

    const audioOutputDeviceInfo: MediaDeviceInfo = audioOutputDevices[0];
    if (audioOutputDeviceInfo) {
      await meetingSession.audioVideo.chooseAudioOutput(audioOutputDeviceInfo.deviceId);
    }

    const videoInputDeviceInfo: MediaDeviceInfo = videoInputDevices[0];
    if (videoInputDeviceInfo) {
      await meetingSession.audioVideo.startVideoInput(videoInputDeviceInfo.deviceId);
    }

    let audioElement: HTMLAudioElement | undefined = undefined;

    if (isAudioOn) {
      audioElement = document.createElement('audio')
      document.body.appendChild(audioElement);
      await meetingSession.audioVideo.bindAudioElement(audioElement);
    }

    meetingSession.audioVideo.realtimeSubscribeToAttendeeIdPresence((presentAttendeeId: string, present: boolean): void => {
      console.log(`Attendee ID: ${presentAttendeeId} Present: ${present}`);
    });

    meetingSession.audioVideo.addObserver({
      videoTileDidUpdate: (tileState: VideoTileState): void => {
        if (!meetingSession?.audioVideo) {
          throw Error();
        }

        if (!tileState.boundAttendeeId || !tileState.boundExternalUserId || !tileState.tileId) {
          return;
        }

        if (tileState.localTile) {
          if (!this.localUserVideoTile || !this.localUserVideoTile.htmlElement) {
            throw Error();
          }

          meetingSession.audioVideo.bindVideoElement(tileState.tileId, this.localUserVideoTile.htmlElement);
        } else {
          const remoteUserVideoTile: VideoTile1 | null = this.remoteUserVideoTiles[tileState.boundExternalUserId];

          if (!remoteUserVideoTile) {
            throw Error();
          }

          if (tileState.boundVideoStream) {
            remoteUserVideoTile.mediaStream = tileState.boundVideoStream;
          }

          this.startRemoteVideo(tileState.boundExternalUserId);
        }
      }
    });

    return {
      session: meetingSession,
      audioElement: audioElement
    };
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
