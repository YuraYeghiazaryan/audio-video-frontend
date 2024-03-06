import {Injectable} from "@angular/core";
import {User} from "../model/user";
import {PrivateTalkAction} from "../state/private-talk.state";
import {Store} from "@ngxs/store";

@Injectable({
  providedIn: 'root'
})
export class PrivateTalkService {

  constructor(
    private store: Store
  ) {}

  public startPrivateTalk(): void {
    this.store.dispatch(new PrivateTalkAction.StartPrivateTalk());
  }

  public endPrivateTalk(): void {
    this.store.dispatch(new PrivateTalkAction.EndPrivateTalk());
  }

  public addUserToPrivateTalk(user: User): void {
    this.store.dispatch(new PrivateTalkAction.AddUser(user.id));
  }

  public removeUserFromPrivateTalk(user: User): void {
    this.store.dispatch(new PrivateTalkAction.RemoveUser(user.id));
  }
}
