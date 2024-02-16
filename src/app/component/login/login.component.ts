import {Component, OnInit} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {Router, RouterOutlet} from "@angular/router";
import {UserService} from "../../service/user.service";
import {ClassroomService} from "../../service/classroom.service";
import {Classroom} from "../../model/classroom";
import {Role} from "../../model/local-user";

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
  protected readonly Role = Role;

  protected username: string = '';
  protected role: Role = Role.STUDENT;

  constructor(
    private userService: UserService,
    private classroomService: ClassroomService,
    private router: Router
  ) {}

  public ngOnInit(): void {}

  protected login(): void {
    const classroom: Classroom | null = this.classroomService.classroom;
    if (classroom) {
      this.userService.login(this.username, this.role).then((): void => {
        this.router.navigate([classroom.roomNumber]).then();
      });
    } else {
      this.router.navigate(['incorrect-url']).then();
    }
  }
}
