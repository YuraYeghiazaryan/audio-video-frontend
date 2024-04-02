import {Injectable} from "@angular/core";
import {User} from "../model/user";
import {PrivateTalk, PrivateTalkAction, PrivateTalkState} from "../state/private-talk.state";
import {Store} from "@ngxs/store";
import {lastValueFrom} from "rxjs";
import {HttpClient} from "@angular/common/http";
import {LocalUser} from "../model/local-user";
import {LocalUserState} from "../state/local-user.state";
import {Classroom} from "../model/classroom";
import {ClassroomState} from "../state/classroom.state";
import {GroupingService} from "./grouping.service";

@Injectable({
  providedIn: 'root'
})
export class PrivateTalkService {
  private localUser: LocalUser = LocalUserState.defaults;
  private classroom: Classroom = ClassroomState.defaults;
  private privateTalk: PrivateTalk = PrivateTalkState.defaults;

  constructor(
    private groupingService: GroupingService,
    private store: Store,
    private httpClient: HttpClient
  ) {
    this.listenStoreChanges();
  }

  public async startPrivateTalk(send: boolean = true): Promise<void> {
    this.store.dispatch(new PrivateTalkAction.StartPrivateTalk());

    if (send) {
      await this.groupingService.breakRoomIntoGroups(send);
      await lastValueFrom(this.httpClient.post<void>(
        `http://localhost:8090/classroom/${this.classroom.roomNumber}/private-talk`,
        {
          senderId: this.localUser.id,
          started: true
        }
      ));
    }

    await this.groupingService.updateGroups();
  }

  public async endPrivateTalk(send: boolean = true): Promise<void> {
    this.store.dispatch(new PrivateTalkAction.EndPrivateTalk());

    if (send) {
      await this.groupingService.breakRoomIntoGroups(send);
      await lastValueFrom(this.httpClient.post<void>(
        `http://localhost:8090/classroom/${this.classroom.roomNumber}/private-talk`,
        {
          senderId: this.localUser.id,
          started: false
        }
      ));
    }

    await this.groupingService.updateGroups();
  }

  public async addUserToPrivateTalk(user: User, send: boolean = true): Promise<void> {
    this.store.dispatch(new PrivateTalkAction.AddUser(user.id));
    if (!this.privateTalk.isStarted) {
      await this.startPrivateTalk(false);
    }

    if (send) {
      await this.groupingService.breakRoomIntoGroups(send);
      await lastValueFrom(this.httpClient.post<void>(
        `http://localhost:8090/classroom/${this.classroom.roomNumber}/add-user-to-private-talk`,
        {
          senderId: this.localUser.id,
          userId: user.id
        }
      ));
    }

    await this.groupingService.updateGroups();
  }

  public async removeUserFromPrivateTalk(user: User, send: boolean = true): Promise<void> {
    this.store.dispatch(new PrivateTalkAction.RemoveUser(user.id));
    if (this.privateTalk.userIds.size === 0) {
      await this.endPrivateTalk(false);
    }

    if (send) {
      await this.groupingService.breakRoomIntoGroups(send);
      await lastValueFrom(this.httpClient.post<void>(
        `http://localhost:8090/classroom/${this.classroom.roomNumber}/remove-user-from-private-talk`,
        {
          senderId: this.localUser.id,
          userId: user.id
        }
      ));
    }

    await this.groupingService.updateGroups();
  }

  private listenStoreChanges(): void {
    this.store.select(LocalUserState).subscribe((localUser: LocalUser): void => {
      this.localUser = localUser;
    });
    this.store.select(ClassroomState).subscribe((classroom: Classroom): void => {
      this.classroom = classroom;
    });
    this.store.select(PrivateTalkState).subscribe((privateTalk: PrivateTalk): void => {
      this.privateTalk = privateTalk;
    });
  }
}
