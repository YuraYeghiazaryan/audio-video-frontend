import {AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild} from '@angular/core';
import {RemoteUser} from "../../../../model/remote-user";
import {AudioVideoService} from "../../../../service/audio-video/audio-video.service";
import {NgIf} from "@angular/common";

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
  private mediaWrapper: ElementRef<HTMLVideoElement> | undefined = undefined;

  constructor(
    private audioVideoService: AudioVideoService
  ) {}

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
}
