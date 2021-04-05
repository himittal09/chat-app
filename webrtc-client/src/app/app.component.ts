import { Component, OnDestroy } from '@angular/core';
import { SharedService } from './shared/service/shared.service';

@Component({
  selector: 'web-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnDestroy {

  title = 'webrtc-client';

  constructor (private service: SharedService) { }

  ngOnDestroy ()
  {
    this.service.disconnectSocket();
  }
}
