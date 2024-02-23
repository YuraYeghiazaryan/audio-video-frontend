import {Injectable} from "@angular/core";
import {ZoomApiService} from "./zoom-api.service";
import {RemoteUser} from "../model/remote-user";

@Injectable({
  providedIn: 'root'
})
export class AudioSubscriptionService {

  constructor(
    private zoomApiService: ZoomApiService
  ) {}

  public async subscribe(remoteUsers: RemoteUser[]): Promise<void> {
    const mutePromises: Promise<void>[] = remoteUsers
      .map((remoteUser: RemoteUser): Promise<void> =>
        this.zoomApiService.muteUserAudioLocally(remoteUser.zoomParticipant.userId)
      );

    return Promise.all(mutePromises).then();
  }

  public async unsubscribe(remoteUsers: RemoteUser[]): Promise<void> {
    const unmutePromises: Promise<void>[] = remoteUsers
      .map((remoteUser: RemoteUser): Promise<void> =>
        this.zoomApiService.unmuteUserAudioLocally(remoteUser.zoomParticipant.userId)
      );

    return Promise.all(unmutePromises).then();
  }
}
