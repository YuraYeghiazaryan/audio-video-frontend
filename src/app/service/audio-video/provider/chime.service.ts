import {Injectable} from '@angular/core';
import {AudioVideoService} from "../audio-video.service";
import {Group} from "../../grouping.service";
import {UserId} from "../../../model/types";

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

  public removeLocalUserVideoElement(): void {
  }

  public removeRemoteUserVideoElement(userId: UserId): Promise<void> {
    return Promise.resolve(undefined);
  }

  public setLocalUserVideoElement(element: HTMLVideoElement | HTMLCanvasElement): void {
  }

  public setRemoteUserVideoElement(userId: UserId, element: HTMLCanvasElement): Promise<void> {
    return Promise.resolve(undefined);
  }
}
