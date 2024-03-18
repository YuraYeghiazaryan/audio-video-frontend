import {Component, OnInit} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {Router, RouterOutlet} from "@angular/router";
import {UserService} from "../../service/user.service";
import {Classroom} from "../../model/classroom";
import {Role} from '../../model/user';
import {Store} from "@ngxs/store";
import {ClassroomState} from "../../state/classroom.state";

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterOutlet,
    FormsModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  protected classroom: Classroom | undefined;

  protected readonly Role = Role;

  protected username: string = '';
  protected role: Role = Role.STUDENT;

  constructor(
    private userService: UserService,
    private store: Store,
    private router: Router
  ) {
    this.listenStoreChanges();
  }

  public ngOnInit(): void {}

  /** login app, then navigate to classroom */
  protected login(): void {
    if (this.classroom) {
      this.userService.login(this.username, this.role).then((): void => {
        this.userService.updateRemoteUsers().then((): void => {
          this.classroom && this.router.navigate([this.classroom.roomNumber]).then();
        });
      });
    } else {
      this.router.navigate(['incorrect-url']).then();
    }
  }

  /** listen for 'classroom' changes */
  private listenStoreChanges(): void {
    this.store.select(ClassroomState).subscribe((classroom: Classroom): void => {
      this.classroom = classroom;
    });
  }
}
