import {AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild} from '@angular/core';
import {RemoteUser} from "../../../../model/remote-user";
import {AudioVideoService} from "../../../../service/audio-video/audio-video.service";
import {NgIf} from "@angular/common";
import {LocalUser} from "../../../../model/local-user";
import {LocalUserState} from "../../../../state/local-user.state";
import {Store} from "@ngxs/store";
import {Role} from "../../../../model/user";
import {PrivateTalkService} from "../../../../service/private-talk.service";
import {PrivateTalk, PrivateTalkState} from "../../../../state/private-talk.state";

@Component({
  selector: 'app-remote-user',
  standalone: true,
  imports: [
    NgIf
  ],
  templateUrl: './remote-user.component.html',
  styleUrl: './remote-user.component.css'
})
export class RemoteUserComponent implements AfterViewInit, OnDestroy {
  @Input()
  public remoteUser: RemoteUser | undefined = undefined;

  @ViewChild("mediaWrapper")
  protected mediaWrapper: ElementRef<HTMLVideoElement> | undefined = undefined;

  protected localUser: LocalUser = LocalUserState.defaults;
  protected privateTalk: PrivateTalk = PrivateTalkState.defaults;

  protected readonly Role = Role;

  constructor(
    private audioVideoService: AudioVideoService,
    private privateTalkService: PrivateTalkService,
    private store: Store
  ) {
    this.listenStoreChanges();
  }

  public ngAfterViewInit(): void {
    if (this.remoteUser && this.mediaWrapper?.nativeElement) {
      this.audioVideoService.setRemoteUserVideoElement(this.remoteUser.id, this.mediaWrapper.nativeElement)
        .then((): void => console.log('user video element changed'))
        .catch((): void => console.log('user video element not changed'));
    }
  }

  public ngOnDestroy(): void {
    if (this.remoteUser) {
      this.audioVideoService.removeRemoteUserVideoElement(this.remoteUser.id)
        .then((): void => console.log('user video element removed'))
        .catch((): void => console.log('user video element not removed'));
    }
  }

  public includeToPrivateTalk(): void {
    if (!this.remoteUser) {
      throw `can't include to private talk. remote user ${this.remoteUser} is undefined`;
    }

    this.privateTalkService.addUserToPrivateTalk(this.remoteUser).then();
  }
  public excludeFromPrivateTalk(): void {
    if (!this.remoteUser) {
      throw `can't exclude from private talk. remote user ${this.remoteUser} is undefined`;
    }

    this.privateTalkService.removeUserFromPrivateTalk(this.remoteUser).then();
  }

  private listenStoreChanges(): void {
    this.store.select(LocalUserState).subscribe((localUser: LocalUser): void => {
      this.localUser = localUser;
    });
    this.store.select(PrivateTalkState).subscribe((privateTalk: PrivateTalk): void => {
      this.privateTalk = privateTalk;
    });
  }
}
