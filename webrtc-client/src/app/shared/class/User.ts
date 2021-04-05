export interface User {
  displayName?: string;
  email?: string;
  photoURL?: string;
  socketId?: string;
  password?: string;
  unreadMessages?: number;
}

export enum MessageType
{
  'text',
  'geolocation'
}

export interface ChatMessage {
  senderName: string;
  loggedInUserIsSender?: boolean;
  message: string;
  messageType: MessageType;
  createdAt: any;
};