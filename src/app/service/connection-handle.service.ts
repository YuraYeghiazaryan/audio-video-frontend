import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {Classroom} from "../model/classroom";
import {ClassroomState} from "../state/classroom.state";
import {LocalUser} from "../model/local-user";
import {LocalUserState} from "../state/local-user.state";
import {Store} from "@ngxs/store";

@Injectable({
  providedIn: 'root'
})
export class ConnectionHandleService {
  private webSocketConnected?: boolean;
  private audioVideoConnected?: boolean;

  private classroom: Classroom = ClassroomState.defaults;
  private localUser: LocalUser = LocalUserState.defaults;

  constructor(
    private httpClient: HttpClient,
    private store: Store
  ) {
    this.listenStoreChanges();
  }

  public webSocketConnectionChanged(connected: boolean): void {
    this.webSocketConnected = connected;
    this.connectionStateChanged();
  }

  public audioVideoConnectionChanged(connected: boolean): void {
    this.audioVideoConnected = connected;
    this.connectionStateChanged();
  }

  private connectionStateChanged(): void {
    if (this.webSocketConnected === undefined || this.audioVideoConnected === undefined) {
      return;
    }

    /* user is connected, if connected to both VCR and Zoom services */
    const connected: boolean = !(this.webSocketConnected && this.audioVideoConnected);

    this.httpClient.post<void>(
      `/api/classroom/user-connection-state-changed`,
      {
        userId: this.localUser.id,
        connected
      }
    ).subscribe();
  }

  private listenStoreChanges(): void {
    this.store.select(ClassroomState).subscribe((classroom: Classroom): void => {
      this.classroom = classroom;
    });

    this.store.select(LocalUserState).subscribe((localUser: LocalUser): void => {
      this.localUser = localUser;
    });
  }
}
