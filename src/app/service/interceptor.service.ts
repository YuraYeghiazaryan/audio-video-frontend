import {Injectable} from '@angular/core';
import {HttpEvent, HttpHandler, HttpInterceptor, HttpParams, HttpRequest,} from '@angular/common/http';
import {Observable} from 'rxjs';
import {Store} from '@ngxs/store';
import {Classroom} from "../model/classroom";
import {ClassroomState} from "../state/classroom.state";

@Injectable({
  providedIn: 'root'
})
export class InterceptorService implements HttpInterceptor {

  private classroom: Classroom = ClassroomState.defaults;

  constructor(private store: Store) {
    this.listenStoreChanges();
  }

  public intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Cross-origin reqs
    if (req.url.match(/^http:|https:/) && !req.url.startsWith(window.location.origin)) {
      return next.handle(req);
    }

    // Same-origin reqs
    else {
      const newReq: HttpRequest<any> = req.clone({
        url: req.url,
        params: (req.params || new HttpParams())
          .set('roomNumber', this.classroom.roomNumber)
      });
      return next.handle(newReq);
    }
  }

  private listenStoreChanges(): void {
    this.store.select(ClassroomState).subscribe((classroom: Classroom): void => {
      this.classroom = classroom;
    });
  }
}
