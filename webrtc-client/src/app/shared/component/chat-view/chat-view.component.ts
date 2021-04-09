import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Subscription } from 'rxjs';

import { User } from '../../class/User';
import { SharedService } from '../../service/shared.service';

@Component({
  selector: 'web-chat-view',
  templateUrl: './chat-view.component.html',
  styleUrls: ['./chat-view.component.scss']
})
export class ChatViewComponent implements OnInit, OnDestroy {

  private subscription: Subscription;
  isSmallScreen: boolean;

  constructor(private service: SharedService, private router: Router, private breakpointObserver: BreakpointObserver) {
    this.isSmallScreen = this.breakpointObserver.isMatched(Breakpoints.HandsetPortrait);
  }

  async ngOnInit() {
    this.subscription = this.service.eventCallback$.subscribe((event) => {
      if (event.eventName === 'CALL_OFFER_CONFIRM') {
        const otherUser = this.service.getUserFromSocketID(event.data.fromUserSocket);

        if (!this.hasSupportForCall) {
          this.service.emit("reject-call", {
            from: this.service.loggedInUser.socketId,
            to: event.data.fromUserSocket
          });
          return;
        }

        const confirmed = confirm(`User ${otherUser.displayName} wants to call you. Do accept this call?`);

        if (!confirmed) {
          this.service.emit("reject-call", {
            from: this.service.loggedInUser.socketId,
            to: event.data.fromUserSocket
          });
          return;
        }

        this.router.navigate(['/call'], {
          state: {
            calledUser: this.service.loggedInUser.socketId,
            data: event.data
          }
        });
      }
      else if (event.eventName === 'LOGIN_FAILED') {
        alert('login failed!!');
        this.router.navigate(['/login']);
      }
      else
      {
        console.log(event);
      }
    });
    try {
      await this.service.setIceServers();
    } catch (error) {
      console.log(error);
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  get loggedInUser(): User {
    return this.service.loggedInUser;
  }

  logout() {
    this.service.logoutUser();
  }

  get hasSupportForCall(): boolean {
    return window.RTCPeerConnection &&
      window.RTCIceCandidate &&
      window.RTCSessionDescription &&
      navigator.mediaDevices &&
      (typeof navigator.mediaDevices.getUserMedia === 'function') &&
      (typeof RTCPeerConnection.prototype.addTrack === 'function');
  }

}
