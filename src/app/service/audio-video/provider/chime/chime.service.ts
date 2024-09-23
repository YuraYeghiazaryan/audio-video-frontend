import {Injectable} from '@angular/core';
import {AudioVideoService} from "../../audio-video.service";
import {Groups, TeamGroup} from "../../../grouping.service";
import {AudioVideoUserId, UserId} from "../../../../model/types";
import {
  AudioInputDevice,
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
import {ConnectionOptions} from "../../../../model/chime/connection-options";
import {lastValueFrom} from "rxjs";
import {Classroom} from "../../../../model/classroom";
import {ClassroomState} from "../../../../state/classroom.state";
import {LocalUser} from "../../../../model/local-user";
import {LocalUserAction, LocalUserState} from "../../../../state/local-user.state";
import {RemoteUsers, RemoteUsersState} from "../../../../state/remote-users.state";
import {Store} from "@ngxs/store";
import {RemoteUser} from "../../../../model/remote-user";
import {AudioVideoUser} from "../../../../model/user";
import {AudioVideoUtilService} from "../audio-video-util.service";
import MeetingSessionStatus from "amazon-chime-sdk-js/build/meetingsession/MeetingSessionStatus";
import AudioVideoObserver from "amazon-chime-sdk-js/build/audiovideoobserver/AudioVideoObserver";

interface VideoTile {
  id?: number;
  mediaStream?: MediaStream;
  htmlElement?: HTMLVideoElement;
}
interface Meeting {
  session: DefaultMeetingSession,
  audioElement: HTMLAudioElement,
  audioInputDevice: MediaDeviceInfo,
  audioOutputDevice: MediaDeviceInfo,
  videoInputDevice: MediaDeviceInfo,
}

interface Meetings {
  main?: Meeting,
  teamTalk?: Meeting,
  privateTalk?: Meeting,
}

@Injectable({
  providedIn: 'root'
})
export class ChimeService extends AudioVideoService {
  private classroom : Classroom = ClassroomState.defaults;
  private localUser: LocalUser = LocalUserState.defaults;
  private remoteUsers: RemoteUsers = RemoteUsersState.defaults;

  private meetings: Meetings = {}

  private localUserVideoTile: VideoTile | undefined = undefined;
  private remoteUserVideoTiles: {[key: AudioVideoUserId]: VideoTile} = {};

  constructor(
    private audioVideoUtilService: AudioVideoUtilService,
    private httpClient: HttpClient,
    private store: Store
  ) {
    super();
    this.listenStoreChanges();
  }

  public override async init(): Promise<void> {
    const mainRoomName: string = this.audioVideoUtilService.buildMainRoomName();

    const connectionOptions: ConnectionOptions = await this.getConnectionOptions(mainRoomName);
    this.meetings.main = await this.createMeetingSession(
      connectionOptions,
      'mainSessionLogger',
      true,
      true,
      true, {
      audioVideoDidStop: (sessionStatus: MeetingSessionStatus): void => {
        console.warn(sessionStatus);
      },
      videoTileDidUpdate: (tileState: VideoTileState): void => {
        if (!this.meetings.main?.session?.audioVideo) {
          throw Error();
        }

        if (!tileState.boundAttendeeId || !tileState.boundExternalUserId || !tileState.tileId) {
          return;
        }

        if (tileState.localTile) {
          if (!this.localUserVideoTile || !this.localUserVideoTile.htmlElement) {
            throw Error();
          }

          this.meetings.main.session.audioVideo.bindVideoElement(tileState.tileId, this.localUserVideoTile.htmlElement);
        } else {
          const remoteUserVideoTile: VideoTile | null = this.remoteUserVideoTiles[tileState.boundExternalUserId];

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
  }

  public async join(): Promise<void> {
    if (!this.meetings.main) {
      return Promise.reject();
    }

    this.meetings.main.session.audioVideo.start();

    /* initialize local zoom state */
    const audioVideoUser: AudioVideoUser = {
      id: this.meetings.main.session.configuration.credentials?.externalUserId + '',
      joined: true,
      isVideoOn: true,
      isAudioOn: true,
    };

    this.store.dispatch(new LocalUserAction.SetAudioVideoUser(audioVideoUser));
  }
  public leave(): void {
    this.meetings.main?.session.audioVideo.stop();
    this.meetings.privateTalk?.session.audioVideo.stop();
    this.meetings.teamTalk?.session.audioVideo.stop();
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
    if (this.meetings.main?.session.audioVideo) {
      this.meetings.main.session.audioVideo.startLocalVideoTile();
    }

    Object.values(this.allMeetings)
      .forEach((meeting: Meeting): void => {
        meeting.session.audioVideo.startLocalVideoTile();
      });

    this.store.dispatch(new LocalUserAction.SetIsVideoOn(true));
  }
  public override async stopLocalVideo(): Promise<void> {
    if (this.meetings.main?.session.audioVideo) {
      this.meetings.main.session.audioVideo.stopLocalVideoTile();
    }

    Object.values(this.allMeetings)
      .forEach((meeting: Meeting): void => {
        meeting.session.audioVideo.stopLocalVideoTile();
      });

    this.store.dispatch(new LocalUserAction.SetIsVideoOn(false));
  }

  public override async unmuteLocalAudio(): Promise<void> {
    if (this.meetings.main?.session.audioVideo) {
      this.meetings.main.session.audioVideo.realtimeUnmuteLocalAudio();
    }

    Object.values(this.allMeetings)
      .forEach((meeting: Meeting): void => {
        meeting.session.audioVideo.realtimeUnmuteLocalAudio();
      });

    this.store.dispatch(new LocalUserAction.SetIsAudioOn(true));
  }
  public override async muteLocalAudio(): Promise<void> {
    if (this.meetings.main?.session.audioVideo) {
      this.meetings.main.session.audioVideo.realtimeMuteLocalAudio();
    }

    Object.values(this.allMeetings)
      .forEach((meeting: Meeting): void => {
        meeting.session.audioVideo.realtimeMuteLocalAudio();
      });

    this.store.dispatch(new LocalUserAction.SetIsAudioOn(false));
  }

  public override async breakRoomIntoGroups(groups: Groups): Promise<void> {
    if (groups.main && groups.main.userIds.has(this.localUser.id) && groups.main.isAudioAvailableForLocalUser) {
      await this.meetings.main?.session.audioVideo.startAudioInput(this.meetings.main?.audioInputDevice);
      await this.meetings.main?.audioElement?.play();
    } else {
      this.meetings.main?.audioElement?.pause();
      this.meetings.main?.session.audioVideo.stopAudioInput().then();
    }

    if (groups.teamTalk) {
      const localUserTeam: TeamGroup | undefined = groups.teamTalk.find((team: TeamGroup): boolean => {
        return team.userIds.has(this.localUser.id);
      });

      if (localUserTeam && localUserTeam.isAudioAvailableForLocalUser) {

        const teamRoomName: string = this.audioVideoUtilService.buildTeamTalkRoomName(localUserTeam.id);
        this.meetings.teamTalk = await this.createMeeting(teamRoomName, true);

      } else {
        this.meetings.teamTalk?.audioElement?.pause();
        this.meetings.teamTalk?.session.audioVideo.stop();
        this.meetings.teamTalk = undefined;
      }
    } else {
      this.meetings.teamTalk?.audioElement?.pause();
      this.meetings.teamTalk?.session.audioVideo.stop();
      this.meetings.teamTalk = undefined;
    }

    if (groups.privateTalk && groups.privateTalk.userIds.has(this.localUser.id) && groups.privateTalk.isAudioAvailableForLocalUser) {
      const privateTalkRoomName: string = this.audioVideoUtilService.buildPrivateTalkRoomName();
      this.meetings.privateTalk = await this.createMeeting(privateTalkRoomName, true);
    } else {
      this.meetings.privateTalk?.audioElement?.pause();
      this.meetings.privateTalk?.session.audioVideo.stop();
      this.meetings.privateTalk = undefined;
    }
  }

  private async createMeeting(roomName: string, isAudioAvailableForLocalUser: boolean): Promise<Meeting> {
    const connectionOptions: ConnectionOptions = await this.getConnectionOptions(roomName);
    const meeting: Meeting = await this.createMeetingSession(
      connectionOptions,
      `subSessionLogger_${roomName}`,
      isAudioAvailableForLocalUser,
      isAudioAvailableForLocalUser,
      false
    );
    meeting.session.audioVideo.start();

    if (this.localUser.audioVideoUser?.isVideoOn) {
      meeting.session.audioVideo.startLocalVideoTile();
    }

    if (this.localUser.audioVideoUser?.isAudioOn) {
      meeting.session.audioVideo.realtimeUnmuteLocalAudio();
    } else {
      meeting.session.audioVideo.realtimeMuteLocalAudio();
    }

    return meeting;
  }

  private async startRemoteVideo(userId: AudioVideoUserId): Promise<void> {
    const remoteUserVideoTile: VideoTile | null = this.remoteUserVideoTiles[userId];

    if (!remoteUserVideoTile?.htmlElement || !remoteUserVideoTile?.mediaStream) {
      return;
    }

    remoteUserVideoTile.htmlElement.srcObject = remoteUserVideoTile.mediaStream;
    await remoteUserVideoTile.htmlElement.play();
  }
  private async stopRemoteVideo(userId: AudioVideoUserId): Promise<void> {
    const remoteUserVideoTile: VideoTile | null = this.remoteUserVideoTiles[userId];
    if (!remoteUserVideoTile.htmlElement) {
      return;
    }

    remoteUserVideoTile.htmlElement.pause();
    remoteUserVideoTile.htmlElement.srcObject = null;
  }

  private async createMeetingSession(connectionOptions: ConnectionOptions,
                                     loggerName: string,
                                     isInputAudioOn: boolean = true,
                                     isOutputAudioOn: boolean = true,
                                     isInputVideoOn: boolean = true,
                                     audioVideoObserver?: AudioVideoObserver): Promise<Meeting> {

    const logger: ConsoleLogger = new ConsoleLogger(loggerName, LogLevel.INFO);
    const deviceController: DefaultDeviceController = new DefaultDeviceController(logger, {enableWebAudio: true});

    const meetingResponse: any = connectionOptions.meeting;
    const attendeeResponse: any = connectionOptions.attendee;

    const configuration: MeetingSessionConfiguration = new MeetingSessionConfiguration(meetingResponse, attendeeResponse);

    const meetingSession: DefaultMeetingSession = new DefaultMeetingSession(
      configuration,
      logger,
      deviceController
    );

    const audioOutputDevices: MediaDeviceInfo[] = await meetingSession.audioVideo.listAudioOutputDevices();
    const audioOutputDevice: MediaDeviceInfo = audioOutputDevices[0];
    if (isOutputAudioOn && audioOutputDevice) {
      await meetingSession.audioVideo.chooseAudioOutput(audioOutputDevice.deviceId);
    }

    let audioElement: HTMLAudioElement = document.createElement('audio')
    document.body.appendChild(audioElement);
    if (isInputAudioOn) {
      audioElement.pause();
    }

    await meetingSession.audioVideo.bindAudioElement(audioElement);

    const videoInputDevices: MediaDeviceInfo[] = await meetingSession.audioVideo.listVideoInputDevices();
    const videoInputDevice: MediaDeviceInfo = videoInputDevices[0];
    if (isInputVideoOn && videoInputDevice) {
      await meetingSession.audioVideo.startVideoInput(videoInputDevice.deviceId);
    }

    const audioInputDevices: MediaDeviceInfo[] = await meetingSession.audioVideo.listAudioInputDevices();
    const audioInputDevice: MediaDeviceInfo = audioInputDevices[0];

    if (isInputAudioOn && audioInputDevice) {
      let voiceFocusTransformDevice: VoiceFocusTransformDevice | undefined = undefined;

      if (await VoiceFocusDeviceTransformer.isSupported()) {
        try {
          const voiceFocusDeviceTransformer: VoiceFocusDeviceTransformer = await VoiceFocusDeviceTransformer.create({variant: 'auto'});
          voiceFocusTransformDevice = await voiceFocusDeviceTransformer.createTransformDevice(audioInputDevice.deviceId);
        } catch (cause) {}
      }

      if (voiceFocusTransformDevice) {
        await meetingSession.audioVideo.startAudioInput(voiceFocusTransformDevice);
      } else {
        console.warn('Voice focus is not supported')
        await meetingSession.audioVideo.startAudioInput(audioInputDevice.deviceId);
      }
      // await meetingSession.audioVideo.startAudioInput(audioInputDevice.deviceId);
    }

    meetingSession.audioVideo.realtimeSubscribeToAttendeeIdPresence((presentAttendeeId: string, present: boolean): void => {
      console.log(`Attendee ID: ${presentAttendeeId} Present: ${present}`);
    });

    if (audioVideoObserver) {
      meetingSession.audioVideo.addObserver(audioVideoObserver);
    }

    return {
      session: meetingSession,
      audioElement: audioElement,
      audioInputDevice,
      audioOutputDevice,
      videoInputDevice
    };
  }

  private getConnectionOptions(roomName: string): Promise<ConnectionOptions> {
    return lastValueFrom(this.httpClient.get<ConnectionOptions>(
      '/api/audio-video/connection-options', {
      params: {
        roomName,
        username: this.localUser.username
      }
    }));
  }

  private get allMeetings(): Meeting[] {
    const meetings: Meeting[] = [];

    if (this.meetings.main) {
      meetings.push(this.meetings.main);
    }

    if (this.meetings.privateTalk) {
      meetings.push(this.meetings.privateTalk);
    }

    if (this.meetings.teamTalk) {
      meetings.push(this.meetings.teamTalk);
    }

    return meetings;
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
