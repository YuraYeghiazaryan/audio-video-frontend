import {APP_INITIALIZER, ApplicationConfig} from '@angular/core';
import {provideRouter} from '@angular/router';

import {routes} from './app.routes';
import {ClassroomService} from "./service/classroom.service";
import {Classroom} from "./model/classroom";
import {provideHttpClient} from "@angular/common/http";

export function initializeApp(classroomService: ClassroomService): () => Promise<void> {
  return (): Promise<void> => {
    return classroomService.init();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      multi: true,
      deps: [ClassroomService],
    },
    provideHttpClient()
  ]
};
