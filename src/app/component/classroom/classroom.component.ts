import {AfterViewInit, Component, OnDestroy, OnInit} from '@angular/core';
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
  protected initialized: boolean = false;

  constructor(
    private zoomApiServiceService: ZoomApiServiceService,
    private userService: UserService,
    private router: Router,
    private classroomService: ClassroomService
  ) {}

  public ngOnInit(): void {
    const classroomNumber: number | undefined = this.classroomService.classroom?.roomNumber;
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
        this.initialized = true;

        this.zoomApiServiceService.join()
          .then((): void => { /*@TODO*/ })
          .catch((): void => { /*@TODO*/ });
      })
      .catch((): void => { /*@TODO*/ });
  }

  public ngOnDestroy(): void {
    this.zoomApiServiceService.leave();
  }
}
