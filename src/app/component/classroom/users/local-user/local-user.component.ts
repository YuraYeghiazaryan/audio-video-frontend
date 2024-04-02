import {Component, ElementRef, OnDestroy, ViewChild} from '@angular/core';
import {NgIf} from "@angular/common";
import {Store} from "@ngxs/store";
import {LocalUser} from "../../../../model/local-user";
import {LocalUserState} from "../../../../state/local-user.state";
import {AudioVideoService} from "../../../../service/audio-video/audio-video.service";
import {HttpClient} from "@angular/common/http";
import {Classroom} from "../../../../model/classroom";
import {ClassroomState} from "../../../../state/classroom.state";

@Component({
  selector: 'app-local-user',
  standalone: true,
    imports: [
        NgIf
    ],
  templateUrl: './local-user.component.html',
  styleUrl: './local-user.component.css'
})
export class LocalUserComponent implements OnDestroy {

  @ViewChild("mediaWrapper")
  public set mediaWrapper(mediaWrapper: ElementRef<HTMLVideoElement>) {
    if (mediaWrapper?.nativeElement) {
      this.audioVideoService.setLocalUserVideoElement(mediaWrapper.nativeElement);
    }
  }

  protected localUser: LocalUser = LocalUserState.defaults;
  protected classroom: Classroom = ClassroomState.defaults;

  constructor(
    private audioVideoService: AudioVideoService,
    private store: Store,
    private httpClient: HttpClient
  ) {
    this.listenStoreChanges();
  }

  public ngOnDestroy(): void {
    this.audioVideoService.removeLocalUserVideoElement();
  }

  public toggleVideo(): void {
    if (this.localUser.audioVideoUser?.isVideoOn) {
      this.audioVideoService.stopLocalVideo().then((): void => {
        this.httpClient.post<void>(
          `http://localhost:8090/user/${this.classroom?.roomNumber}/user-video-state-changed`,
          {
            userId: this.localUser.id,
            isOn: false
          }
        ).subscribe();
      });
    } else {
      this.audioVideoService.startLocalVideo().then((): void => {
        this.httpClient.post<void>(
          `http://localhost:8090/user/${this.classroom?.roomNumber}/user-video-state-changed`,
          {
            userId: this.localUser.id,
            isOn: true
          }
        ).subscribe();
      });
    }
  }

  public toggleAudio(): void {
    if (this.localUser.audioVideoUser?.isAudioOn) {
      this.audioVideoService.muteLocalAudio().then((): void => {
        this.httpClient.post<void>(
          `http://localhost:8090/user/${this.classroom?.roomNumber}/user-audio-state-changed`,
          {
            userId: this.localUser.id,
            isOn: true
          }
        ).subscribe();
      });
    } else {
      this.audioVideoService.unmuteLocalAudio().then((): void => {
        this.httpClient.post<void>(
          `http://localhost:8090/user/${this.classroom?.roomNumber}/user-audio-state-changed`,
          {
            userId: this.localUser.id,
            isOn: true
          }
        ).subscribe();
      });
    }
  }

  private listenStoreChanges(): void {
    this.store.select(LocalUserState).subscribe((localUser: LocalUser): void => {
      this.localUser = localUser;
    });
    this.store.select(ClassroomState).subscribe((classroom: Classroom): void => {
      this.classroom = classroom;
    });
  }
}
