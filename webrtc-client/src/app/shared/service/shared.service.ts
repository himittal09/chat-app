import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';

// development
// import { io, Socket } from 'socket.io-client';

// production
declare var io: any;
type Socket = any;

import { environment } from '../../../environments/environment';
import { User, ChatMessage, MessageType } from '../class/User';

@Injectable({
  providedIn: 'root'
})
export class SharedService {
  private socket: Socket;
  private users: BehaviorSubject<User[]>;
  private _selectedUser: User | null = null;
  private _loggedInUser: User | null = null;
  private chats: Map<string, ChatMessage[]>;
  private eventCallback = new Subject<{
    eventName: string,
    data?: any
  }>();
  eventCallback$ = this.eventCallback.asObservable();

  private peerConnection: RTCPeerConnection | null = null;
  private makingOffer: boolean = false;
  private polite: boolean = true;
  private finishSDPVideoOffer = false;
  private iceCandidates: RTCIceCandidate[] = [];
  private otherUser: User | null = null;

  private audioTrack: MediaStreamTrack | null = null;
  private videoTrack: MediaStreamTrack | null = null;
  private videoTransceiver: RTCRtpTransceiver | null = null;
  private audioTransceiver: RTCRtpTransceiver | null = null;
  private sendingVideo: boolean = false;
  private sendingAudio: boolean = false;
  private config: RTCConfiguration = {
    iceServers: []
  };

  constructor(private router: Router, private http: HttpClient) {
    if (environment.production)
    {
      this.socket = io({autoConnect: false});
    }
    else
    {
      this.socket = io(environment.serverURL, {autoConnect: false});
    }
    this.users = new BehaviorSubject([]);
    this.chats = new Map();

    // DONE
    this.socket.on('login-successful', ({ data }: { data: any }) => {
      this.users.next(data.connectedUsers);
    });

    // DONE
    this.socket.on('login-failed', () => {
      this.eventCallback.next({
        eventName: 'LOGIN_FAILED'
      });
      this._loggedInUser = null;
    });

    // DONE
    this.socket.on("update-user-list", ({ data }: { data: any }) => {
      const users: User[] = data.users;

      // it is only one user imo
      // check if that user already exists
      for (const user of users)
      {
        let found = false;
        for (const u of this.users.value)
        {
          if (u.email === user.email)
          {
            found = true;
            break;
          }
        }
        if (found)
        {
          continue;
        }
        else
        {
          this.users.value.push(user);
        }
      }
    });

    // DONE
    this.socket.on("remove-user", (data: any) => {
      const socketId: string = data.socketId;
      if (this.selectedUser && this.selectedUser.socketId === socketId)
      {
        this.selectedUser = null;
      }
      this.users.next(this.users.value.filter(
        (user) => user.socketId !== socketId
      ));
    });

    // DONE
    // TODO: add delivery receipets
    this.socket.on('newMessage', ({ from, to, data }) => {
      const sendingUser = this.getUserFromSocketID(from);
      let msg = '';
      if (data.messageType === MessageType.text) {
        msg = data.message;
      }
      else {
        msg = `https://www.google.com/maps/embed/v1/place?q=${data.latitude},${data.longitude}&zoom=17&key=${environment.mapsAPIKey}`;
      }
      const messageToAppend: ChatMessage = {
        createdAt: data.createdAt,
        messageType: data.messageType,
        senderName: sendingUser.displayName,
        loggedInUserIsSender: false,
        message: msg
      };
      this.setChatMessages(sendingUser, messageToAppend);
    });

    // DONE
    this.socket.on('call-offer', (data) => {
      this.otherUser = this.getUserFromSocketID(data.fromUserSocket);
      if (!this.otherUser) {
        return;
      }
      this.polite = this.amIPolite(this._loggedInUser.socketId, this.otherUser.socketId);
      this.eventCallback.next({
        eventName: 'CALL_OFFER_CONFIRM',
        data
      });
    });

    // DONE
    this.socket.on("ice-candidate-generated", async ({ candidate }: { candidate: RTCIceCandidate }) => {
      if (!this.finishSDPVideoOffer) {
        this.iceCandidates.push(candidate);
        return;
      }
      try {
        let cdd = new RTCIceCandidate(candidate);
        await this.peerConnection?.addIceCandidate(cdd);
      } catch (err) {
        this.eventCallback.next({
          eventName: 'ICE_CANDIDATE_GENERATE_ERROR',
          data: err
        });
      }
    });

    // DONE
    this.socket.on("call-accepted", async ({ description }: { description: RTCSessionDescription }) => {
      try {
        await this.peerConnection?.setRemoteDescription(description);
        this.finishSDPVideoOffer = true;
        while (this.iceCandidates.length) {
          const candidate = this.iceCandidates.shift();
          const cdd = new RTCIceCandidate(candidate);
          // do we really need to await this?
          await this.peerConnection?.addIceCandidate(cdd);
        }
      } catch (err) {
        this.eventCallback.next({
          eventName: 'ICE_CANDIDATE_GENERATE_ERROR',
          data: err
        });
      } finally {
        this.iceCandidates = [];
      }
    });

    // DONE
    this.socket.on('call-rejected', () => {
      this.close(false);
      this.eventCallback.next({
        eventName: 'CALL_REJECTED'
      });
    });

    // DONE
    this.socket.on('end-call', () => {
      this.close(false);
      this.eventCallback.next({
        eventName: 'CALL_ENDED'
      });
    });
  }

  async setIceServers ()
  {
    let iceServers = await this.http.post<RTCIceServer[]>(`${environment.serverURL}/geticeserver`, {}).toPromise();
    this.config.iceServers.push(...iceServers);
  }

  // done
  disconnectSocket () {
    if (this.socket.connected)
    {
      this.socket.disconnect();
    }
  }

  // done
  on(event: string, callback: any): void {
    this.socket.on(event, callback);
  }

  // done
  emit(event: string, ...args: any[]): void {
    this.socket.emit(event, ...args);
  }

  // done
  async loginUser(userData: User, action: string = 'login') {
    let endPoint = action === 'login' ? 'login' : 'register';
    this.socket.connect();
    const user = await this.http.post<Partial<User>>(`${environment.serverURL}/${endPoint}`, userData).toPromise();
    user.socketId = this.socket.id;
    this._loggedInUser = user;
    this.socket.emit('login', {
      data: {user}
    });
  }

  logoutUser() {
    this._selectedUser = null;
    this._loggedInUser = null;
    this.close(false);
    this.users.next([]);
    this.socket.disconnect();
    this.router.navigate(['/login']);
  }

  get selectedUser(): User | null {
    return this._selectedUser;
  }

  set selectedUser(user: User) {
    this._selectedUser = user;
  }

  get isUserLoggedIn(): boolean {
    return this._loggedInUser !== null;
  }

  get loggedInUser(): User | null {
    return this._loggedInUser;
  }

  get userList(): User[] {
    return this.users.value;
  }

  getChatMessages(user: User): ChatMessage[] {
    if (this.chats.has(user.email)) {
      return this.chats.get(user.email);
    }
    return [];
  }

  setChatMessages(user: User, message: ChatMessage): void {
    if (this.chats.has(user.email)) {
      this.chats.get(user.email).push(message);
    }
    else {
      this.chats.set(user.email, [message]);
    }
  }

  clearChatAgainstUser (user: User): boolean
  {
    return this.chats.delete(user.email);
  }

  getUserFromSocketID(socketId: string): User | undefined {
    return this.users.value.find(
      user => user.socketId === socketId
    )
  }

  sendMessage(message: string) {
    this.socket.emit('createMessage', {
      from: this._loggedInUser.socketId,
      to: this._selectedUser.socketId,
      data: {
        message
      }
    });
    const myMsg: ChatMessage = {
      createdAt: new Date(),
      message,
      messageType: MessageType.text,
      senderName: this._loggedInUser.displayName,
      loggedInUserIsSender: true
    };
    this.setChatMessages(this._selectedUser, myMsg);
  }

  sendLocation(position: GeolocationPosition) {
    this.socket.emit('createLocationMessage', {
      from: this._loggedInUser.socketId,
      to: this._selectedUser.socketId,
      data: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: position.timestamp
      }
    });
    const messageToAppend: ChatMessage = {
      createdAt: position.timestamp,
      messageType: MessageType.geolocation,
      senderName: this._loggedInUser.displayName,
      loggedInUserIsSender: true,
      message: `https://www.google.com/maps/embed/v1/place?q=${position.coords.latitude},${position.coords.longitude}&zoom=17&key=${environment.mapsAPIKey}`
    };
    this.setChatMessages(this._selectedUser, messageToAppend);
  }

  initValues() {

    this.polite = true;
    this.makingOffer = false;
    this.finishSDPVideoOffer = false;
    this.iceCandidates = [];
    this.otherUser = null;
    this.peerConnection = new RTCPeerConnection(this.config);

    this.audioTrack = null;
    this.videoTrack = null;
    this.videoTransceiver = null;
    this.audioTransceiver = null;
    this.sendingVideo = true;
    this.sendingAudio = true;

    
    // peerConnection?.addEventListener('icecandidateerror', (err: RTCPeerConnectionIceErrorEvent) => { });
    // peerConnection?.addEventListener('connectionstatechange', () => { });
    // peerConnection?.addEventListener('statsended', () => { });
    // "icegatheringstatechange": Event;
    // "signalingstatechange": Event;
    this.peerConnection.addEventListener("track", (e: RTCTrackEvent) => {
      this.eventCallback.next({
        eventName: 'PEER_TRACK',
        data: e
      });
    });
    this.peerConnection.addEventListener("icecandidate", ({ candidate }: { candidate: RTCIceCandidate | null }) => {
      if (candidate && this.otherUser) {
        this.socket.emit("generate-ice-candidate", {
          candidate,
          to: this.otherUser.socketId
        });
      }
    });
    this.peerConnection.addEventListener("iceconnectionstatechange", (e: Event) => {
      switch (this.peerConnection?.iceConnectionState) {
        case "closed":
          // this.close();
          break;
  
        case "failed":
          try {
            if ((this.peerConnection as unknown as any).restartIce)
            {
              (this.peerConnection as unknown as any)?.restartIce();
            }
            else
            {
              this.peerConnection.onnegotiationneeded(<any>{ iceRestart: true });
            }        
          } catch (error) { }
          break;
      }
    });
  }

  async giveCallOfferAnswer(data: {description: RTCSessionDescription, fromUserSocket: string}, stream: MediaStream) {

    this.otherUser = this.getUserFromSocketID(data.fromUserSocket);
    try {
      const offerCollision = (this.makingOffer || this.peerConnection?.signalingState !== "stable");

      let ignoreOffer = !(this.polite) && offerCollision;
      if (ignoreOffer) {
        console.log("ignoring offer", offerCollision, this.makingOffer, this.peerConnection?.signalingState !== "stable");
        // TODO: review and probably degug this segment
        this.close(false);
        return;
      }

      const description: RTCSessionDescription = data.description;
      await this.peerConnection?.setRemoteDescription(description);
      this.finishSDPVideoOffer = true;

      try {
        while (this.iceCandidates.length) {
          const candidate = this.iceCandidates.shift();
          let cdd = new RTCIceCandidate(candidate);
          // do we really need to await this?
          await this.peerConnection?.addIceCandidate(cdd);
        }
      } catch (err) {
        this.eventCallback.next({
          eventName: 'ICE_CANDIDATE_GENERATE_ERROR',
          data: err
        });
      } finally {
        this.iceCandidates = [];
      }

      await this.attachMediaTracksFromOtherEnd(stream);
      const answer = await this.peerConnection?.createAnswer();
      await this.peerConnection?.setLocalDescription(new RTCSessionDescription(answer));
      this.socket.emit("answer-made", {
        description: this.peerConnection?.localDescription,
        to: this.otherUser.socketId
      });
    } catch (err) {
      this.eventCallback.next({
        eventName: 'CALL_OFFER_ERROR',
        data: err
      });
    }
  }

  // done
  close(echoSocketCall) {
    if (echoSocketCall && this.otherUser) {
      this.socket.emit('end-call', {
        to: this.otherUser.socketId
      });
    }
    this.polite = true;
    if (this.peerConnection) {
      this.peerConnection.removeEventListener('negotiationneeded', (e: Event) => {});
      this.peerConnection.removeEventListener('track', ({ streams, track }) => {
        streams[0].removeTrack(track);
        track.stop();
      });
      this.peerConnection.removeEventListener('icecandidate', (e: RTCPeerConnectionIceEvent) => {});
      this.peerConnection.removeEventListener('iceconnectionstatechange', (e: Event) => {});
      this.iceCandidates = [];
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.eventCallback.next({
      eventName: 'close'
    });
  }

  async callUser() {
    this.otherUser = this.selectedUser;
    // TODO
    // set a flag for ongoing call
    // and use that flag here, instead of peerconnection
    // if (peerConnection)
    // {
    //   alert("You can't start a call because you already have one open!");
    //   return;
    // }

    this.peerConnection.addEventListener('negotiationneeded', async () => {
      try {
        this.makingOffer = true;
        this.polite = this.amIPolite(this._loggedInUser.socketId, this.otherUser.socketId);
        const offer = await this.peerConnection?.createOffer();
        await this.peerConnection?.setLocalDescription(new RTCSessionDescription(offer));
        this.socket.emit("call-user", {
          offer: this.peerConnection?.localDescription,
          to: this.otherUser.socketId,
          fromUserSocket: this._loggedInUser.socketId
        });
      } catch (err) {
        this.eventCallback.next({
          eventName: 'CALL_ERROR',
          data: err
        });
      } finally {
        this.makingOffer = false;
      }
    });
  }

  async turnOffVideo() {
    if (!this.videoTransceiver) {
      return;
    }
    if (this.sendingVideo) {
      await this.videoTransceiver.sender.replaceTrack(this.videoTrack);
      this.videoTransceiver.direction = 'sendonly';
    }
    else {
      await this.videoTransceiver.sender.replaceTrack(null);
      this.videoTransceiver.direction = 'inactive';
    }
    this.sendingVideo = !this.sendingVideo;
  }

  async turnOffAudio() {
    if (!this.audioTransceiver) {
      return;
    }
    if (this.sendingAudio) {
      await this.audioTransceiver.sender.replaceTrack(this.audioTrack);
      this.audioTransceiver.direction = 'sendonly';
    }
    else {
      await this.audioTransceiver.sender.replaceTrack(null);
      this.audioTransceiver.direction = 'inactive';
    }
    this.sendingAudio = !this.sendingAudio;
  }

  attachMediaTracksFromOtherEnd(stream: MediaStream) {
    // here select what media (audio, video) to send to other user
    // add tracks one by one
    if (!this.peerConnection) {
      return;
    }
    // this.audioTrack = stream.getAudioTracks()[0];
    // if (this.sendingAudio)
    // {
    //   this.audioTransceiver = this.peerConnection.addTransceiver(this.audioTrack, {
    //     direction: "sendonly",
    //     streams: [stream]
    //   });
    // }
    // else
    // {
    //   this.audioTransceiver = this.peerConnection.addTransceiver('audio', {
    //     direction: "inactive",
    //     streams: [stream]
    //   });
    // }
    // this.videoTrack = stream.getVideoTracks()[0];
    // if (this.sendingVideo)
    // {
    //   this.videoTransceiver = this.peerConnection.addTransceiver(this.videoTrack, {
    //     direction: 'sendonly',
    //     streams: [stream]
    //   });
    // }
    // else
    // {
    //   this.videoTransceiver = this.peerConnection.addTransceiver("video", {
    //     direction: "inactive",
    //     streams: [stream]
    //   });
    // }
    for (const track of stream.getTracks()) {
      this.peerConnection.addTrack(track, stream);
    }
  }

  private amIPolite(socketIdOne: string, socketIdTwo: string): boolean {
    if (!socketIdTwo) {
      return false;
    }
    if (socketIdOne === socketIdTwo) {
      return true;
    }
    let greaterSocketId = socketIdOne > socketIdTwo ? socketIdOne : socketIdTwo;
    return greaterSocketId === socketIdTwo;
  }


}