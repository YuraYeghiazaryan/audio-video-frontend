import {Group} from "../grouping.service";

export abstract class AudioVideoService {

  public abstract init(): Promise<void>;

  public abstract join(): Promise<void>;
  public abstract leave(): void;

  public abstract startLocalVideo(): Promise<void>;
  public abstract stopLocalVideo(): Promise<void>;

  public abstract muteLocalAudio(): Promise<void>;
  public abstract unmuteLocalAudio(): Promise<void>;

  public abstract breakRoomIntoGroups(groups: Group[]): Promise<void>;
}
