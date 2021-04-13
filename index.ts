import * as dotenv from 'dotenv';

let res = dotenv.config();

import * as express from "express";
import { Express, Request, Response, NextFunction } from 'express';
import { Server as SocketIOServer, Socket } from 'socket.io';
import * as http from "http";
import * as path from 'path';
import * as cors from 'cors';
import * as bodyParser from 'body-parser';
import * as Twilio from 'twilio';
import * as admin from 'firebase-admin';

const serviceAccount = require(
  path.join(__dirname, './chat-app-8e7de-firebase-adminsdk-led1t-071d1057e1.json')
);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://chat-app-8e7de-default-rtdb.firebaseio.com"
});

const sid = <string>process.env.TWILLIO_ACC_SID_PROD;
const token = <string>process.env.TWILLIO_AUTH_TOKEN_PROD;

const twillioClient  = Twilio(sid, token);
const firestore = admin.firestore();
const app: Express = express();
const server = http.createServer(app);
let socketIOServerConfig = {};
if (process.env.NODE_ENV !== 'production') {
  socketIOServerConfig = {
    cors: {
      origin: true
    }
  }
}
const io: SocketIOServer = new SocketIOServer(server, socketIOServerConfig);

interface User {
  displayName?: string;
  email?: string;
  photoURL?: string;
  socketId?: string;
  password?: string;
  firebaseDocId?: string;
}

type userClient = Omit<User, 'firebaseDocId'>;

enum MessageType {
  'text',
  'geolocation'
}

if (process.env.NODE_ENV !== 'production') {
  app.use(cors({
    origin: true
  }));
}
app.use(express.static(path.join(__dirname, "./webrtc-client/dist")));
app.use(bodyParser.json());

let activeUsers: User[] = [];
// manage this thing via rooms instread of a map like this
let connectedCalls = new Map<string, string>();
let lastFetchedCreds: Date = new Date();
let iceServers: string[] = [];

function getUserFromFirebase(email: string, password: string): Promise<User> {
  return new Promise<User>(async (resolve, reject) => {
    setTimeout(() => reject(new Error('Timeout for logging in into the Server!')), 1500);
    try {
      const docRef = await firestore.collection('users')
        .where('email', '==', email)
        .where('password', '==', password)
        .limit(1)
        .get();
      if (docRef.empty) {
        reject('No Users with given credentials found!')
        return;
      }
      const user: Partial<User> = docRef.docs[0].data();
      user.firebaseDocId = docRef.docs[0].id;
      resolve(user);
    } catch (error) {
      reject(error);
    }
  });
}

function setUserIntoFirebase(userBody: Partial<User>): Promise<User> {
  return new Promise<User>(async (resolve, reject) => {
    setTimeout(() => reject(new Error('Timeout for logging in into the Server!')), 1500);
    try {
      // check first if a user exists into firebase
      const docRef = await firestore.collection('users').add(userBody);
      userBody.firebaseDocId = docRef.id;
      resolve(userBody);
    } catch (error) {
      reject(error);
    }
  });
}

function valiateUserInput(req: Request, res: Response, next: NextFunction) {
  const userBody: Partial<User> = req.body;
  // do better validation here
  if (!userBody) {
    res.status(400).send(new Error('No User Received'));
    return;
  }

  const currentlyLoggedIn = activeUsers.find(
    user => user.email === userBody.email
  );
  if (currentlyLoggedIn) {
    res.status(200).send(currentlyLoggedIn);
    return;
  }

  next();
}

app.post('/login', valiateUserInput, async (req: Request, res: Response) => {
  const userBody: Partial<User> = req.body;
  try {
    const user = await getUserFromFirebase(<string>userBody.email, <string>userBody.password);
    res.status(200).send(user);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.post('/register', valiateUserInput, async (req: Request, res: Response) => {
  const userBody: Partial<User> = req.body;
  try {
    const user = await setUserIntoFirebase(userBody);
    res.status(200).send(user);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.post('/geticeserver', (req: Request, res: Response) => {
  const now = new Date();
  let diff = now.getTime() - lastFetchedCreds.getTime();
  let diffInMinutes = diff / (1000 * 60);
  // caching for one hour
  if (iceServers.length && diffInMinutes < 60)
  {
    res.send(iceServers);
    return;
  }
  twillioClient.tokens.create().then((token) => {
    iceServers = token.iceServers;
    lastFetchedCreds = token.dateCreated;
    res.send(token.iceServers);
  }, (error: Error) => {
    console.log(error);
    res.status(500).send(error);
  })
});

io.on("connection", (socket: Socket) => {

  socket.on('login', (message) => {
    const userBody: Partial<User> = message.data.user;
    if (!userBody) {
      socket.emit('login-failed');
    }

    const currentlyLoggedIn = activeUsers.find(
      user => user.email === userBody.email
    );

    if (currentlyLoggedIn) {
      socket.emit("login-successful", {
        data: {
          connectedUsers: activeUsers.filter(
            user => user.email !== userBody.email
          )
        }
      });
      socket.broadcast.emit("update-user-list", {
        data: {
          users: [currentlyLoggedIn]
        }
      });
    }

    userBody.socketId = socket.id;
    socket.emit("login-successful", {
      data: {
        connectedUsers: activeUsers
      }
    });
    socket.broadcast.emit("update-user-list", {
      data: {
        users: [userBody]
      }
    });
    activeUsers.push(userBody);
  });

  socket.on('createMessage', function ({ from, to, data }) {
    /**
     * message: {
     *   from: (socket)
     *   to: (socket)
     *   data: {
     *     message:
     *     messageType:
     *     createdAt: 
     *   }
     * }
     */
    socket.to(to).emit('newMessage', {
      to,
      from,
      data: {
        message: data.message,
        messageType: MessageType.text,
        createdAt: new Date() // look for createdAt
      }
    });
  });

  socket.on('createLocationMessage', function ({ from, to, data }) {
    socket.to(to).emit('newMessage', {
      to,
      from,
      data: {
        latitude: data.latitude,
        longitude: data.longitude,
        messageType: MessageType.geolocation,
        createdAt: new Date() // look for createdAt
      }
    });
  });

  // a call has been made
  socket.on('call-user', (data) => {
    const { offer, to, fromUserSocket } = data;
    connectedCalls.set(to, fromUserSocket);
    connectedCalls.set(fromUserSocket, to);
    socket.to(to).emit("call-offer", {
      description: offer,
      fromUserSocket
    });
  });

  // a positive answer has been made
  socket.on('answer-made', ({ to, description }) => {
    socket.to(to).emit('call-accepted', {
      description
    });
  });

  // user has rejected call
  socket.on('reject-call', ({ to }) => {
    socket.to(to).emit('call-rejected');
  });

  socket.on('end-call', ({ to }) => {
    socket.to(to).emit('end-call');
  });

  socket.on('generate-ice-candidate', ({ candidate, to }) => {
    socket.to(to).emit('ice-candidate-generated', { candidate });
  });

  socket.on("disconnect", () => {
    activeUsers = activeUsers.filter(
      user => user.socketId !== socket.id
    )
    if (connectedCalls.has(socket.id)) {
      const otherPeer = <string>connectedCalls.get(socket.id);
      connectedCalls.delete(socket.id);
      connectedCalls.delete(otherPeer);
      socket.to(otherPeer).emit('end-call');
    }
    socket.broadcast.emit("remove-user", {
      socketId: socket.id
    });
  });
});

server.listen(process.env.PORT || process.env.DEFAULT_PORT, () => {
  console.log(`Server is up and running on port ${process.env.PORT || process.env.DEFAULT_PORT}`);
});