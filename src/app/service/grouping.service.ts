import {Injectable} from "@angular/core";
import {User} from "../model/user";
import {UserId} from "../model/types";
import {AudioVideoService} from "./audio-video/audio-video.service";
import {LocalUser} from "../model/local-user";
import {LocalUserState} from "../state/local-user.state";
import {Store} from "@ngxs/store";
import {RemoteUsers, RemoteUsersState} from "../state/remote-users.state";
import {PrivateTalk, PrivateTalkState} from "../state/private-talk.state";
import {GameMode, GameModeState} from "../state/game-mode.state";


export interface Group {
  users: {[key: UserId]: User};
  isAudioAvailableForLocalUser: boolean;
  isVideoAvailableForLocalUser: boolean;
}


@Injectable({
  providedIn: 'root'
})
export class GroupingService {
  private localUser: LocalUser = LocalUserState.defaults;
  private remoteUsers: RemoteUsers = RemoteUsersState.defaults;

  private privateTalk: PrivateTalk = PrivateTalkState.defaults;
  private gameMode: GameMode = GameModeState.defaults;

  constructor(
    private audioVideoService: AudioVideoService,
    private store: Store
  ) {
    this.listenStoreChanges();
  }

  private async updateGroups(): Promise<void> {
    /* @TODO */
    this.privateTalk.userIds;
    Object.values(this.gameMode.teams);

    const groups: Group[] = [];
    await this.audioVideoService.breakRoomIntoGroups(groups);
  }


  private listenStoreChanges(): void {
    this.store.select(LocalUserState).subscribe((localUser: LocalUser): void => {
      this.localUser = localUser;
    });

    this.store.select(RemoteUsersState).subscribe((remoteUsers: RemoteUsers): void => {
      this.remoteUsers = remoteUsers;
    });

    this.store.select(PrivateTalkState).subscribe((privateTalk: PrivateTalk): void => {
      this.privateTalk = privateTalk;
      this.updateGroups().then();
    });

    this.store.select(GameModeState).subscribe((gameMode: GameMode): void => {
      this.gameMode = gameMode;
      this.updateGroups().then();
    });
  }
}
