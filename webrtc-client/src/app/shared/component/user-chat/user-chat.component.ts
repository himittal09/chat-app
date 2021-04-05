import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';

import { ChatMessage, User } from '../../class/User';
import { SharedService } from '../../service/shared.service';

@Component({
  selector: 'web-user-chat',
  templateUrl: './user-chat.component.html',
  styleUrls: ['./user-chat.component.scss']
})
export class UserChatComponent implements OnInit {

  msgToSend: string = '';
  sendingLocation: boolean = false;

  constructor(private service: SharedService, private sanitizer: DomSanitizer, private router: Router) { }

  ngOnInit() {
  }

  get hasSupportForCall(): boolean {
    return window.RTCPeerConnection &&
      window.RTCIceCandidate &&
      window.RTCSessionDescription &&
      navigator.mediaDevices &&
      (typeof navigator.mediaDevices.getUserMedia === 'function') &&
      (typeof RTCPeerConnection.prototype.addTrack === 'function');
  }

  get geoLocationSupported (): boolean
  {
    return !!navigator.geolocation;
  }
  

  get selectedUser (): User | null
  {
    return this.service.selectedUser;
  }

  sendMsg ()
  {
    this.msgToSend = this.msgToSend.trim();
    if (!this.msgToSend) {
      return;
    }
    this.service.sendMessage(this.msgToSend);
    this.msgToSend = '';
  }

  sendLocation()
  {
    this.sendingLocation = true;
    navigator.geolocation.getCurrentPosition((position: GeolocationPosition) => {
      this.service.sendLocation(position);
      this.sendingLocation = false;
    }, function (error: GeolocationPositionError) {
      alert(`Error in sending location: ${error.message}`);
      this.sendingLocation = false;
    }
    // ,{enableHighAccuracy: true}
    );
  }

  get selectedUserChat (): ChatMessage[]
  {
    return this.service.getChatMessages(this.service.selectedUser);
  }

  sanitizeLink (url: string): SafeResourceUrl
  {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url)
  }

  videoCall ()
  {
    this.router.navigate(['/call'], {
      state: {
        callingUser: this.service.loggedInUser.socketId
      }
    });
  }

}
