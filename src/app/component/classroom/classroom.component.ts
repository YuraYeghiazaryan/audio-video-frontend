import {AfterViewInit, Component, OnDestroy, OnInit, signal} from '@angular/core';
import {ZoomApiServiceService} from "../../service/zoom-api-service.service";
import {UserService} from "../../service/user.service";
import {Router} from "@angular/router";
import {ClassroomService} from "../../service/classroom.service";

@Component({
  selector: 'app-classroom',
  standalone: true,
  imports: [],
  templateUrl: './classroom.component.html',
  styleUrl: './classroom.component.css'
})
export class ClassroomComponent implements OnInit, AfterViewInit, OnDestroy {
  protected joined: boolean = false;

  constructor(
    protected userService: UserService,
    private zoomApiServiceService: ZoomApiServiceService,
    private classroomService: ClassroomService,
    private router: Router
  ) {}

  public ngOnInit(): void {
    let classroomNumber: number | undefined = undefined;
    try {
      classroomNumber = this.classroomService.classroom.roomNumber;
    } catch (error) {}

    const userLoggedIn: boolean = this.userService.isLoggedIn();

    if (!classroomNumber || !userLoggedIn) {
      this.router.navigate([classroomNumber, 'login']).then();
    }
  }

  public ngAfterViewInit(): void {
    const localUserVideoElement: HTMLVideoElement | null = document.querySelector('#my-self-view-video');
    const remoteUsersVideoContainer: HTMLDivElement | null = document.querySelector('#remote-users');

    if (!localUserVideoElement || !remoteUsersVideoContainer) {
      throw Error();
    }

    this.zoomApiServiceService.init(localUserVideoElement, remoteUsersVideoContainer)
      .then((): void => {
        this.zoomApiServiceService.join()
          .then((): void => {
            this.joined = true;
          })
          .catch((cause): void => { console.error(cause) });
      })
      .catch((): void => { /*@TODO*/ });
  }

  public ngOnDestroy(): void {
    this.zoomApiServiceService.leave();
  }

  public toggleVideo(): void {
    if (this.userService.localUser.zoomState.isVideoOn) {
      this.zoomApiServiceService.stopLocalVideo().then()
    } else {
      this.zoomApiServiceService.startLocalVideo().then()
    }
  };

  public toggleAudio(): void {
    if (this.userService.localUser.zoomState.isAudioOn) {
      this.zoomApiServiceService.offLocalAudio().then()
    } else {
      this.zoomApiServiceService.onLocalAudio().then()
    }
  };
}
