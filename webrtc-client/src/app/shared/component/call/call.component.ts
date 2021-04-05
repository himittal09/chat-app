import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, Renderer2, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SharedService } from '../../service/shared.service';

@Component({
  selector: 'web-call',
  templateUrl: './call.component.html',
  styleUrls: ['./call.component.scss']
})
export class CallComponent implements OnInit, AfterViewInit, OnDestroy {

  private usingFrontCamera: boolean = true;
  private unlistendersList: Function[] = [];
  private subscription: Subscription;

  @ViewChild('remoteVideo') remoteVideo: ElementRef<HTMLVideoElement>;
  @ViewChild('localVideo') selfVideo: ElementRef<HTMLVideoElement>;
  @ViewChild('btnEndCall') endCallButton: ElementRef<HTMLButtonElement>;
  @ViewChild('btnSwitchCamera') switchCameraButton: ElementRef<HTMLButtonElement>;
  @ViewChild('btnVideoToggle') videoButton: ElementRef<HTMLButtonElement>;
  @ViewChild('btnAudioToggle') audioButton: ElementRef<HTMLButtonElement>;

  constructor(private service: SharedService, private router: Router, private renderer: Renderer2) {
    this.usingFrontCamera = true;
  }

  async ngOnInit() {
    this.service.initValues();
    this.subscription = this.service.eventCallback$.subscribe(async (event) => {
      switch (event.eventName) {
        case 'close':
          this.close();
          break;

        case 'CALL_REJECTED':
          break;

        case 'ICE_CANDIDATE_GENERATE_ERROR':
          console.log(event.data);
          break;

        case 'CALL_ERROR':
          console.log(event.data);
          break;

        case 'CALL_OFFER_ERROR':
          console.log(event.data);
          break;

        case 'PEER_TRACK':
          this.handleIncomingTracks(event.data);
          break;

        default:
          console.log(event);
          break;
      }
    });
  }

  async ngAfterViewInit() {
    this.unlistendersList.push(this.renderer.listen(this.endCallButton.nativeElement, 'click', () => {
      this.service.close(true);
    }));
    this.unlistendersList.push(this.renderer.listen(this.switchCameraButton.nativeElement, 'click', this.flipCameraUse));
    this.unlistendersList.push(this.renderer.listen(this.videoButton.nativeElement, 'click', () => {
      this.service.turnOffVideo().then(() => { });
    }));
    this.unlistendersList.push(this.renderer.listen(this.audioButton.nativeElement, 'click', () => {
      this.service.turnOffAudio().then(() => { });
    }));

    if (window.history.state?.callingUser === this.service.loggedInUser.socketId) {
      // only for caller
      try {
        await this.attachTracks();
        await this.service.callUser();    
      } catch (error) {
        console.log(error);
      }
    }
    if (window.history.state?.calledUser === this.service.loggedInUser.socketId) {
      // only for user who got called
      try {
        await this.callOfferConfirm(window.history.state?.data);
      } catch (error) {
        console.log(error);
      }
    }
  }

  ngOnDestroy() {
    this.unlistendersList.forEach(callback => callback());
    this.unlistendersList = [];
    this.subscription.unsubscribe();
  }

  async attachTracks() {
    return new Promise <void> (async (resolve, reject) => {
      try {
        const stream: MediaStream = await navigator.mediaDevices.getUserMedia({
          // TODO: set the ratios here
          audio: {
            echoCancellation: true
          },
          video: {
            facingMode: "user"
          }
        });
        this.service.attachMediaTracksFromOtherEnd(stream);
        this.renderer.setProperty(this.selfVideo.nativeElement, 'srcObject', stream);
        resolve();
      } catch (error) {
        this.handleGetUserMediaError(error);
        this.service.close(false);
        reject(error);
      }
    });
  }

  handleGetUserMediaError<Er extends Error>(e: Er): void {
    switch (e.name) {
      case "NotFoundError":
        alert("Unable to open your call because no camera and/or microphone were found.");
        break;
      case "SecurityError":
      case "NotAllowedError":
      case "PermissionDeniedError":
        // Do nothing; this is the same as the user canceling the call.
        break;
      default:
        alert("Error opening your camera and/or microphone: " + e.message);
        break;
    }
  }

  handleIncomingTracks(e: RTCTrackEvent) {
    const { track, streams: [stream] } = e;

    // here do deal with the received tracks
    // do deal if any one track is not being received here
    track.addEventListener('unmute', () => {
      if (this.remoteVideo.nativeElement.srcObject) {
        return;
      }
      this.renderer.setProperty(this.remoteVideo.nativeElement, 'srcObject', stream);
    });
    track.addEventListener('ended', () => {
      if (!this.remoteVideo)
      {
        return;
      }
      this.renderer.setProperty(this.remoteVideo.nativeElement, 'srcObject', this.remoteVideo.nativeElement.srcObject);
    });
  }

  close() {
    if (this.remoteVideo.nativeElement && this.remoteVideo.nativeElement.srcObject) {
      (<MediaStream>this.remoteVideo.nativeElement.srcObject)?.getTracks()?.forEach(track => track.stop());
      this.renderer.setProperty(this.remoteVideo.nativeElement, 'srcObject', null);
    }
    if (this.selfVideo.nativeElement && this.selfVideo.nativeElement.srcObject) {
      (<MediaStream>this.selfVideo.nativeElement.srcObject)?.getTracks()?.forEach(track => track.stop());
      this.renderer.setProperty(this.selfVideo.nativeElement, 'srcObject', null);
    }
    this.router.navigate(['/']);
  }

  flipCameraUse() {
    this.usingFrontCamera = !this.usingFrontCamera;
  }

  callOfferConfirm(callData: { description: RTCSessionDescription, fromUserSocket: string }) {
    let userMediaError = true;
    return new Promise <void> (async (resolve, reject) => {
      try {
        // TODO: set the ratios here
        const stream: MediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true
          },
          video: {
            facingMode: "user"
          }
        });
        userMediaError = false;
        this.renderer.setProperty(this.selfVideo.nativeElement, 'srcObject', stream);
        await this.service.giveCallOfferAnswer(callData, stream);
        resolve();
      } catch (error) {
        if (userMediaError)
        {
          this.handleGetUserMediaError(error);
          this.service.emit('end-call', {
            to: callData.fromUserSocket
          });
        }
        this.service.close(true);
        reject(error);
      }
    });

  }

}
