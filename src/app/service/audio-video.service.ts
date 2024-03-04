import {Injectable} from "@angular/core";
import {ZoomApiService} from "./zoom-api.service";
import {RemoteUser} from "../model/remote-user";

@Injectable({
  providedIn: 'root'
})
export class AudioVideoService {

  constructor(
    private zoomApiService: ZoomApiService
  ) {}

  public async subscribe(remoteUsers: RemoteUser[]): Promise<void> {
    const mutePromises: Promise<void>[] = remoteUsers
      .map((remoteUser: RemoteUser): Promise<void> =>
        this.zoomApiService.muteUserAudioLocally(remoteUser)
      );

    return Promise.all(mutePromises).then();
  }

  public async unsubscribe(remoteUsers: RemoteUser[]): Promise<void> {
    const unmutePromises: Promise<void>[] = remoteUsers
      .map((remoteUser: RemoteUser): Promise<void> =>
        this.zoomApiService.unmuteUserAudioLocally(remoteUser)
      );

    return Promise.all(unmutePromises).then();
  }
}
