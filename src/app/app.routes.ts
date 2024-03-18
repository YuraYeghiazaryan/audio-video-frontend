import {Routes} from '@angular/router';
import {LoginComponent} from "./component/login/login.component";
import {ClassroomComponent} from "./component/classroom/classroom.component";
import {IncorrectUrlComponent} from "./component/incorrect-url/incorrect-url.component";

export const routes: Routes = [
  {path: ':roomNum/login', component: LoginComponent},
  {path: ':roomNum/', component: ClassroomComponent},
  {path: ':roomNum', redirectTo: ':roomNum/'},

  // PAGE ISN'T FOUND
  {path: 'incorrect-url', component: IncorrectUrlComponent},
  {path: '**', redirectTo: '/incorrect-url'}
];
