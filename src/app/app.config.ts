import {APP_INITIALIZER, ApplicationConfig, importProvidersFrom} from '@angular/core';
import {provideRouter} from '@angular/router';

import {routes} from './app.routes';
import {ClassroomService} from "./service/classroom.service";
import {provideHttpClient} from "@angular/common/http";
import {NgxsModule} from "@ngxs/store";
import {ClassroomState} from "./state/classroom.state";
import {LocalUserState} from "./state/local-user.state";
import {RemoteUsersState} from "./state/remote-users.state";
import {AudioVideoService} from "./service/audio-video/audio-video.service";
import {ZoomService} from "./service/audio-video/provider/zoom.service";

export function initializeApp(classroomService: ClassroomService): () => Promise<void> {
  return (): Promise<void> => {
    return classroomService.init();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: AudioVideoService,
      useClass: ZoomService
    },
    importProvidersFrom(
      NgxsModule.forRoot([
        ClassroomState,
        LocalUserState,
        RemoteUsersState
      ])
    ),
    provideRouter(routes),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      multi: true,
      deps: [ClassroomService],
    },
    provideHttpClient(),
  ]
};
