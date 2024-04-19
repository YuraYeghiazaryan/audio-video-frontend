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
  publisher?: OT.Publisher;
  token: string;
}

export interface VideoElement {
  htmlElement?: HTMLVideoElement;
  stream?: Stream;
}
export interface RemoteUserVideoElement extends VideoElement {
  subscriber?: OT.Subscriber;
}

@Injectable({
  providedIn: 'root'
})
export class OpentokService extends AudioVideoService {
  private classroom: Classroom = ClassroomState.defaults;
  private localUser: LocalUser = LocalUserState.defaults;
  private remoteUsers: RemoteUsers = RemoteUsersState.defaults;

  private localUserVideoElement?: VideoElement;
  private remoteUserVideoElements: {[key: AudioVideoUserId]: RemoteUserVideoElement} = {};

  private meeting?: Meeting;

  constructor(
    private audioVideoUtilService: AudioVideoUtilService,
    private httpClient: HttpClient,
    private store: Store
  ) {
    super();
    this.listenStoreChanges();
  }


  /** Init Session */
  public override async init(): Promise<void> {
    const mainRoomName: string = this.audioVideoUtilService.buildMainRoomName();

    const connectionOptions: ConnectionOptions = await this.getConnectionOptions(mainRoomName);

    const session: OT.Session = OT.initSession(String(connectionOptions.apiKey), connectionOptions.sessionId);

    this.meeting = {
      session,
      token: connectionOptions.token
    };
  }

  /** Init Publisher, listen events, connect to Session, publish Stream */
  public override async join(): Promise<void> {
    return new Promise((resolve, reject): void => {

      if (this.localUserVideoElement?.htmlElement) {
        this.initPublisher();
      }

      this.listenClientEvents();

      this.meeting?.session.connect(this.meeting.token, (error?: OT.OTError): void => {
        if (!this.meeting?.session || !this.meeting.publisher) {
          reject('Can\'t join to not initialized session');
          return;
        }

        if (error) {
          reject(`Can't join to session because of error: ${error}`);
          return;
        }

        this.onJoin();

        resolve();
      });
    });
  }
  public override leave(): void {
    this.meeting?.session.disconnect();
  }

  public override setLocalUserVideoElement(element: HTMLVideoElement): void {
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

  public override async setRemoteUserVideoElement(userId: UserId, element: HTMLVideoElement): Promise<void> {
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
    if (!this.localUserVideoElement?.htmlElement) {
      throw Error();
    }

    if (!this.meeting?.publisher) {
      await this.initPublisher();
    }

    this.meeting?.publisher?.publishVideo(true);

    this.store.dispatch(new LocalUserAction.SetIsVideoOn(true));
  }
  public override async stopLocalVideo(): Promise<void> {
    this.meeting?.publisher?.publishVideo(false);

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
    const remoteUserVideoElement: RemoteUserVideoElement | null = this.remoteUserVideoElements[userId];

    if (!this.meeting || !remoteUserVideoElement?.htmlElement || !remoteUserVideoElement?.stream) {
      return;
    }

    remoteUserVideoElement.subscriber = this.meeting.session.subscribe(
      remoteUserVideoElement.stream,
      undefined,
      {
        insertDefaultUI: false,
        subscribeToVideo: true,
        subscribeToAudio: true,
        testNetwork: true
      },
      (error?: OT.OTError): void => {
        if (error) {
          throw Error(error.message);
        }
      }
    );

    remoteUserVideoElement.subscriber.on('videoElementCreated', (event): void => {
      if (!remoteUserVideoElement.htmlElement) {
        return;
      }

      remoteUserVideoElement.htmlElement.srcObject = (event.element as HTMLVideoElement).srcObject;
      remoteUserVideoElement.htmlElement.play();
    });
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

  /** get api key,session Id, token from BE*/
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

  /** Publish Stream, create audioVideoUser object */
  private onJoin(): void {
    if (!this.meeting?.session?.connection?.data || !this.meeting.publisher) {
      throw Error();
    }

    this.meeting.session.publish(this.meeting.publisher);

    /* initialize local audioVideoUser state */
    const audioVideoUser: AudioVideoUser = {
      id: this.meeting.session.connection.data,
      joined: true,
      isVideoOn: true,
      isAudioOn: true,
    };

    this.store.dispatch(new LocalUserAction.SetAudioVideoUser(audioVideoUser));
  }

  private listenClientEvents(): void {
    this.meeting?.session.on('streamCreated', (event: OT.Event<'streamCreated', OT.Session> & {stream: Stream}): void => {
      const audioVideoUserId: AudioVideoUserId = event.stream.connection.data;

      if (this.remoteUserVideoElements[audioVideoUserId]) {
        this.remoteUserVideoElements[audioVideoUserId].stream = event.stream;
      } else {
        this.remoteUserVideoElements[audioVideoUserId] = {
          stream: event.stream
        };
      }

      this.startRemoteVideo(audioVideoUserId).then();
    });

    this.meeting?.session.on("videoDisabled", (event: OT.Event<string, any>): void => {

    });

    this.meeting?.session.on("videoEnabled", (event: OT.Event<string, any>): void => {

    });
  }

  private async initPublisher(): Promise<void> {
    return new Promise<void>((resolve, reject): void => {
      if (!this.meeting) {
        reject();
        return;
      }

      this.meeting.publisher = OT.initPublisher(
        undefined,
        {
          insertDefaultUI: false,
          noiseSuppression: true,
          echoCancellation: true,
          publishVideo: true,
          publishAudio: true,
        }, (error?: OT.OTError): void => {
          if (error) {
            reject(error);
          }
        });

      this.meeting.publisher.on('videoElementCreated', (event): void => {
        if (!this.localUserVideoElement?.htmlElement) {
          return;
        }

        this.localUserVideoElement.htmlElement.srcObject = (event.element as HTMLVideoElement).srcObject;
        this.localUserVideoElement.htmlElement.play();
        this.localUserVideoElement.htmlElement.muted = true;
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
