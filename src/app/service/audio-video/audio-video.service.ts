import {Group, Groups} from "../grouping.service";
import {UserId} from "../../model/types";

export abstract class AudioVideoService {

  public abstract init(): Promise<void>;

  public abstract join(): Promise<void>;
  public abstract leave(): void;

  public abstract setLocalUserVideoElement(element: HTMLVideoElement | HTMLCanvasElement): void;
  public abstract removeLocalUserVideoElement(): void;

  public abstract setRemoteUserVideoElement(userId: UserId, element: HTMLCanvasElement | HTMLVideoElement): Promise<void>;
  public abstract removeRemoteUserVideoElement(userId: UserId): Promise<void>;

  public abstract startLocalVideo(): Promise<void>;
  public abstract stopLocalVideo(): Promise<void>;

  public abstract muteLocalAudio(): Promise<void>;
  public abstract unmuteLocalAudio(): Promise<void>;

  public abstract breakRoomIntoGroups(groups: Groups): Promise<void>;
}
