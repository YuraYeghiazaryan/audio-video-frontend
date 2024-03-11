import {Component, ElementRef, OnDestroy, ViewChild} from '@angular/core';
import {NgIf} from "@angular/common";
import {Store} from "@ngxs/store";
import {LocalUser} from "../../../../model/local-user";
import {LocalUserState} from "../../../../state/local-user.state";
import {AudioVideoService} from "../../../../service/audio-video/audio-video.service";

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
  public set mediaWrapper(mediaWrapper: ElementRef<HTMLVideoElement | HTMLCanvasElement>) {
    if (mediaWrapper?.nativeElement) {
      this.audioVideoService.setLocalUserVideoElement(mediaWrapper.nativeElement);
    }
  }

  protected localUser: LocalUser = LocalUserState.defaults;

  constructor(
    private audioVideoService: AudioVideoService,
    private store: Store
  ) {
    this.listenStoreChanges();
  }

  public ngOnDestroy(): void {
    this.audioVideoService.removeLocalUserVideoElement();
  }

  private listenStoreChanges(): void {
    this.store.select(LocalUserState).subscribe((localUser: LocalUser): void => {
      this.localUser = localUser;
    });
  }
}
