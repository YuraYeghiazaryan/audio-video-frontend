import {APP_INITIALIZER, ApplicationConfig, importProvidersFrom} from '@angular/core';
import {provideRouter} from '@angular/router';

import {routes} from './app.routes';
import {ClassroomService} from "./service/classroom.service";
import {HTTP_INTERCEPTORS, provideHttpClient, withInterceptors, withInterceptorsFromDi} from "@angular/common/http";
import {NgxsModule} from "@ngxs/store";
import {ClassroomState} from "./state/classroom.state";
import {LocalUserState} from "./state/local-user.state";
import {RemoteUsersState} from "./state/remote-users.state";
import {AudioVideoService} from "./service/audio-video/audio-video.service";
import {GameModeState} from "./state/game-mode.state";
import {ChimeService} from "./service/audio-video/provider/chime/chime.service";
import {PrivateTalkState} from "./state/private-talk.state";
import {OpentokService} from "./service/audio-video/provider/opentok/opentok.service";
import {InterceptorService} from "./service/interceptor.service";

export function initializeApp(classroomService: ClassroomService): () => Promise<void> {
  return (): Promise<void> => {
    return classroomService.init();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: AudioVideoService,
      // useClass: ChimeService
      // useClass: ZoomService
      useClass: OpentokService
    },
    importProvidersFrom(
      NgxsModule.forRoot([
        ClassroomState,
        LocalUserState,
        RemoteUsersState,
        GameModeState,
        PrivateTalkState
      ])
    ),
    provideHttpClient(
      withInterceptorsFromDi()
    ),
    provideRouter(routes),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      multi: true,
      deps: [ClassroomService],
    },
    {
      provide: HTTP_INTERCEPTORS,
      multi: true,
      useClass: InterceptorService
    },
    {
      provide: AudioVideoService,
      useClass: ChimeService
      // useClass: ZoomService
    },
  ]
};
