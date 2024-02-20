import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {

  constructor() { }

  public async connect(): Promise<void> {

  }

  public send(destination: string, data: any): void {

  }

  public subscribe(topic: string, callback: (data: any) => void): void {
    callback({})
  }
}
