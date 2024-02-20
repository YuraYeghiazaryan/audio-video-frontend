import {Injectable} from "@angular/core";
import {ZoomApiServiceService} from "./zoom-api-service.service";
import {User} from "../model/user";

@Injectable({
  providedIn: 'root'
})
export class AudioSubscriptionService {

  constructor(
    private zoomApiService: ZoomApiServiceService
  ) {}

  public muteUsers(users: User[]): void {
    for (const user of users) {
      // this.zoomApiService.muteUserAudioLocally(user.)
    }
  }

  public unmuteUsers(users: User[]): void {}
}
