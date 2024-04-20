import {Component, ElementRef, Input, OnDestroy, ViewChild} from '@angular/core';
import {NgIf} from "@angular/common";
import {Store} from "@ngxs/store";
import {LocalUser} from "../../../../model/local-user";
import {LocalUserState} from "../../../../state/local-user.state";
import {AudioVideoService} from "../../../../service/audio-video/audio-video.service";
import {HttpClient} from "@angular/common/http";
import {Classroom} from "../../../../model/classroom";
import {ClassroomState} from "../../../../state/classroom.state";
import {Team} from "../../../../model/team";
import {GameMode, GameModeState} from "../../../../state/game-mode.state";
import {Role, User} from "../../../../model/user";
import {TeamId} from "../../../../model/types";
import {GameModeService} from "../../../../service/game-mode.service";
import {RemoteUsers, RemoteUsersState} from "../../../../state/remote-users.state";

@Component({
  selector: 'app-local-user',
  standalone: true,
    imports: [
        NgIf
    ],
  templateUrl: './local-user.component.html',
  styleUrl: './local-user.component.css'
})
export class LocalUserComponent implements OnDestroy {
  @Input()
  public team: Team | undefined = undefined;

  protected localUser: LocalUser = LocalUserState.defaults;
  protected gameMode: GameMode = GameModeState.defaults
  protected classroom: Classroom = ClassroomState.defaults;
  protected remoteUsers: RemoteUsers = RemoteUsersState.defaults;

  protected readonly Role = Role;

  @ViewChild("mediaWrapper")
  public set mediaWrapper(mediaWrapper: ElementRef<HTMLVideoElement>) {
    if (mediaWrapper?.nativeElement) {
      this.audioVideoService.setLocalUserVideoElement(mediaWrapper.nativeElement);
    }
  }

  constructor(
    private audioVideoService: AudioVideoService,
    private gameModeService: GameModeService,
    private store: Store,
    private httpClient: HttpClient
  ) {
    this.listenStoreChanges();
  }

  public ngOnDestroy(): void {
    this.audioVideoService.removeLocalUserVideoElement();
  }

  public toggleVideo(): void {
    if (this.localUser.audioVideoUser?.isVideoOn) {
      this.audioVideoService.stopLocalVideo().then((): void => {
        this.httpClient.post<void>(
          `/api/user/user-video-state-changed`,
          {
            userId: this.localUser.id,
            isOn: false
          }
        ).subscribe();
      });
    } else {
      this.audioVideoService.startLocalVideo().then((): void => {
        this.httpClient.post<void>(
          `/api/user/user-video-state-changed`,
          {
            userId: this.localUser.id,
            isOn: true
          }
        ).subscribe();
      });
    }
  }

  public toggleAudio(): void {
    if (this.localUser.audioVideoUser?.isAudioOn) {
      this.audioVideoService.muteLocalAudio().then((): void => {
        this.httpClient.post<void>(
          `/api/user/user-audio-state-changed`,
          {
            userId: this.localUser.id,
            isOn: true
          }
        ).subscribe();
      });
    } else {
      this.audioVideoService.unmuteLocalAudio().then((): void => {
        this.httpClient.post<void>(
          `/api/user/user-audio-state-changed`,
          {
            userId: this.localUser.id,
            isOn: true
          }
        ).subscribe();
      });
    }
  }

  protected endGameMode(): void {
    this.gameModeService.endGameMode().then();
  }

  protected startGameMode(): void {
    const colors: any = {};
    colors[0] = '#33ff00';
    colors[2] = '#ff2015';
    colors[4] = '#1100f2';
    colors[5] = '#ee00ff';
    colors[1] = '#ff8800';
    colors[3] = '#00ff99';

    let teamId: TeamId = 0;

    const users: User[] = Object.values(this.remoteUsers);
    users.push(this.localUser);

    const teachers: User[] = users.filter((user: User): boolean => user.role === Role.TEACHER);
    const students: User[] = users.filter((user: User): boolean => user.role === Role.STUDENT);

    students.reduce((result: User[][], value: User, index: number, array: User[]): User[][] => {
      if (index % 2 === 0) {
        result.push(array.slice(index, index + 2));
      }

      return result;
    }, []).forEach((users: User[]): void => {
      if (users.length === 0) {
        return;
      }

      const teamMembers: User[] = Object.assign([], users);
      teamMembers.push(...teachers);

      this.gameModeService.createTeam(teamMembers, teamId, `team_${teamId}`, colors[teamId]);
      teamId++;
    });
    this.gameModeService.startGameMode().then();
  }

  protected toggleTeamTalk(): void {
    if (this.gameMode.isTeamTalkStarted) {
      this.gameModeService.endTeamTalk().then();
    } else {
      this.gameModeService.startTeamTalk().then();
    }
  }

  private listenStoreChanges(): void {
    this.store.select(LocalUserState).subscribe((localUser: LocalUser): void => {
      this.localUser = localUser;
    });

    this.store.select(RemoteUsersState).subscribe((remoteUsers: RemoteUsers): void => {
      this.remoteUsers = remoteUsers;
    });

    this.store.select(GameModeState).subscribe((gameMode: GameMode): void => {
      this.gameMode = gameMode;
    });

    this.store.select(ClassroomState).subscribe((classroom: Classroom): void => {
      this.classroom = classroom;
    });
  }
}
