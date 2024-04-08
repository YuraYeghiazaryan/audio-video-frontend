import {Injectable} from '@angular/core';
import {AudioVideoService} from "../../audio-video.service";
import {Group, Groups} from '../../../grouping.service';
import OT, {Stream} from '@opentok/client';
import {ConnectionOptions} from "../../../../model/opentok/connection-options";
import {lastValueFrom} from "rxjs";
import {AudioVideoUtilService} from "../audio-video-util.service";
import {HttpClient} from "@angular/common/http";
import {Store} from "@ngxs/store";
import {LocalUser} from "../../../../model/local-user";
import {LocalUserAction, LocalUserState} from "../../../../state/local-user.state";
import {Classroom} from "../../../../model/classroom";
import {ClassroomState} from "../../../../state/classroom.state";
import {AudioVideoUserId, UserId} from "../../../../model/types";
import {AudioVideoUser} from "../../../../model/user";
import {RemoteUser} from "../../../../model/remote-user";
import {RemoteUsers, RemoteUsersAction, RemoteUsersState} from "../../../../state/remote-users.state";
import SetAudioListenable = RemoteUsersAction.SetAudioListenable;
import SetVideoVisible = RemoteUsersAction.SetVideoVisible;

export interface Meeting {
  session: OT.Session;
  publisher?: OT.Publisher,
  token: string;
}

export interface VideoElement {
  htmlElement?: HTMLElement;
  subscriber?: OT.Subscriber;
  stream?: Stream;
}

@Injectable({
  providedIn: 'root'
})
export class OpentokService extends AudioVideoService {
  private classroom: Classroom = ClassroomState.defaults;
  private localUser: LocalUser = LocalUserState.defaults;
  private remoteUsers: RemoteUsers = RemoteUsersState.defaults;

  private localUserVideoElement: VideoElement | undefined = undefined;
  private remoteUserVideoElements: {[key: AudioVideoUserId]: VideoElement} = {};

  private meeting?: Meeting;

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

    const session: OT.Session = OT.initSession(String(connectionOptions.apiKey), connectionOptions.sessionId);

    this.meeting = {
      session,
      token: connectionOptions.token
    };
  }

  public override async join(): Promise<void> {
    return new Promise((resolve, reject): void => {

      if (this.localUserVideoElement?.htmlElement) {
        this.initPublisher(this.localUserVideoElement.htmlElement);
      }

      this.meeting?.session.on('streamCreated', (event: OT.Event<'streamCreated', OT.Session> & {stream: Stream}): void => {
        console.log(typeof event);
        console.log(event);

        const audioVideoUserId: AudioVideoUserId = event.stream.connection.data;

        this.remoteUserVideoElements[audioVideoUserId].stream = event.stream;

        this.startRemoteVideo(audioVideoUserId).then();
      });

      this.meeting?.session.connect(this.meeting.token, (error?: OT.OTError): void => {
        if (!this.meeting?.session || !this.meeting.publisher) {
          reject('Can\'t join to not initialized session');
          return;
        }

        if (error) {
          reject(`Can't join to session because of error: ${error}`);
          return;
        }

        this.meeting.session.publish(this.meeting.publisher);

        this.onJoin();

        resolve();
      });
    });
  }
  public override leave(): void {
    this.meeting?.session.disconnect();
  }

  public override setLocalUserVideoElement(element: HTMLElement): void {
    if (this.localUserVideoElement) {
      this.localUserVideoElement.htmlElement = element;
    } else {
      this.localUserVideoElement = {
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
    if (this.localUserVideoElement) {
      this.localUserVideoElement.htmlElement = undefined;
    }
  }

  public override async setRemoteUserVideoElement(userId: UserId, element: HTMLElement): Promise<void> {
    const remoteUser: RemoteUser | undefined = this.remoteUsers[userId];
    if (!remoteUser) {
      await Promise.reject();
    }

    if (this.remoteUserVideoElements[remoteUser.audioVideoUser.id]) {
      this.remoteUserVideoElements[remoteUser.audioVideoUser.id].htmlElement = element;
    } else {
      this.remoteUserVideoElements[remoteUser.audioVideoUser.id] = {
        htmlElement: element
      };
    }

    if (remoteUser.audioVideoUser.isVideoOn) {
      await this.startRemoteVideo(remoteUser.audioVideoUser.id);
    }
  }
  public override async removeRemoteUserVideoElement(userId: UserId): Promise<void> {
    const remoteUser: RemoteUser | undefined = this.remoteUsers[userId];
    delete this.remoteUserVideoElements[remoteUser.audioVideoUser.id].htmlElement;
  }

  public override async startLocalVideo(): Promise<void> {
    if (!this.meeting?.publisher || !this.localUserVideoElement?.htmlElement) {
      throw Error();
    }

    if (!this.meeting?.publisher) {
      await this.initPublisher(this.localUserVideoElement?.htmlElement);
    }

    this.meeting?.publisher?.publishVideo(true);

    this.store.dispatch(new LocalUserAction.SetIsVideoOn(true));
  }
  public override async stopLocalVideo(): Promise<void> {
    if (!this.meeting?.publisher) {
      throw Error();
    }

    this.meeting.publisher?.publishVideo(false);

    this.store.dispatch(new LocalUserAction.SetIsVideoOn(false));
  }

  public override async muteLocalAudio(): Promise<void> {
    this.meeting?.publisher?.publishAudio(false);

    this.store.dispatch(new LocalUserAction.SetIsAudioOn(false));
  }
  public override async unmuteLocalAudio(): Promise<void> {
    this.meeting?.publisher?.publishAudio(true);

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
    this.remoteUserVideoElements[remoteUser.audioVideoUser.id]?.subscriber?.subscribeToAudio(false);
  }

  private async unmuteUserAudioLocally(remoteUser: RemoteUser): Promise<void> {
    this.remoteUserVideoElements[remoteUser.audioVideoUser.id]?.subscriber?.subscribeToAudio(true);
  }

  private async startRemoteVideo(userId: AudioVideoUserId): Promise<void> {
    const remoteUserVideoElement: VideoElement | null = this.remoteUserVideoElements[userId];

    if (!this.meeting || !remoteUserVideoElement?.htmlElement || !remoteUserVideoElement?.stream) {
      return;
    }

    remoteUserVideoElement.subscriber = this.meeting.session.subscribe(
      remoteUserVideoElement.stream,
      this.remoteUserVideoElements[userId].htmlElement, {
        insertMode: "replace",
        width: 200,
        height: 122,
        style: {
          audioLevelDisplayMode: 'off',
          backgroundImageURI: 'off',
          buttonDisplayMode: 'off',
          nameDisplayMode: 'off',
          videoDisabledDisplayMode: 'off',
        },
        testNetwork: true
      }, (error?: OT.OTError): void => {
        if (error) {
          throw Error(error.message);
        }
      }
    );
  }
  private async stopRemoteVideo(userId: AudioVideoUserId): Promise<void> {
    const remoteUserVideoElement: VideoElement | null = this.remoteUserVideoElements[userId];
    if (!remoteUserVideoElement.htmlElement) {
      return;
    }

    const subscriber: OT.Subscriber | undefined = this.remoteUserVideoElements[userId].subscriber;

    if (subscriber) {
      this.meeting?.session.unsubscribe(subscriber);
    }
  }

  private getConnectionOptions(roomName: string): Promise<ConnectionOptions> {
    return lastValueFrom(this.httpClient.get<ConnectionOptions>(
      '/api/audio-video/connection-options', {
      params: {
        roomNumber: this.classroom.roomNumber,
        roomName,
        username: this.localUser.username
      }
    }));
  }

  private onJoin(): void {
    if (!this.meeting?.session?.connection?.data) {
      throw Error();
    }

    /* initialize local zoom state */
    const audioVideoUser: AudioVideoUser = {
      id: this.meeting.session.connection.data,
      joined: true,
      isVideoOn: false,
      isAudioOn: false,
    };

    this.store.dispatch(new LocalUserAction.SetAudioVideoUser(audioVideoUser));
  }

  private async initPublisher(htmlElement: HTMLElement): Promise<void> {
    return new Promise<void>((resolve, reject): void => {

      if (!this.meeting) {
        reject();
        return;
      }

      this.meeting.publisher = OT.initPublisher(
        htmlElement,
        {
          insertMode: "replace",
          width: 200,
          height: 122,
          echoCancellation: true,
          noiseSuppression: true,
          style: {
            audioLevelDisplayMode: 'off',
            backgroundImageURI: 'off',
            buttonDisplayMode: 'off',
            nameDisplayMode: 'off',
            videoDisabledDisplayMode: 'off',
          },
          publishAudio: false,
          publishVideo: false
        }, (error?: OT.OTError): void => {
          if (error) {
            reject(error);
          }
        });

      resolve();
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
