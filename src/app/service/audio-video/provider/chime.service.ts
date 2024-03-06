import {Injectable} from '@angular/core';
import {AudioVideoService} from "../audio-video.service";
import {Group} from "../../grouping.service";

@Injectable({
  providedIn: 'root'
})
export class ChimeService extends AudioVideoService {

  constructor() {
    super();
  }

  public override async init(): Promise<void> {
    return Promise.resolve(undefined);
  }

  public override async join(): Promise<void> {
    return Promise.resolve(undefined);
  }
  public override leave(): void {
  }

  public override async startLocalVideo(): Promise<void> {
    return Promise.resolve(undefined);
  }
  public override async stopLocalVideo(): Promise<void> {
    return Promise.resolve(undefined);
  }

  public override async muteLocalAudio(): Promise<void> {
    return Promise.resolve(undefined);
  }
  public override async unmuteLocalAudio(): Promise<void> {
    return Promise.resolve(undefined);
  }

  public override async breakRoomIntoGroups(groups: Group[]): Promise<void> {}
}
