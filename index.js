"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var dotenv = require("dotenv");
var res = dotenv.config();
var express = require("express");
var socket_io_1 = require("socket.io");
var http = require("http");
var path = require("path");
var cors = require("cors");
var bodyParser = require("body-parser");
var Twilio = require("twilio");
var admin = require("firebase-admin");
var serviceAccount = require(path.join(__dirname, './chat-app-8e7de-firebase-adminsdk-led1t-071d1057e1.json'));
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://chat-app-8e7de-default-rtdb.firebaseio.com"
});
var sid = '', token = '';
if (process.env.NODE_ENV === 'production') {
    sid = process.env.TWILLIO_ACC_SID_PROD;
    token = process.env.TWILLIO_AUTH_TOKEN_PROD;
}
else {
    sid = process.env.TWILLIO_ACC_SID_TEST;
    token = process.env.TWILLIO_AUTH_TOKEN_TEST;
}
var twillioClient = Twilio(sid, token);
var firestore = admin.firestore();
var app = express();
var server = http.createServer(app);
var socketIOServerConfig = {};
if (process.env.NODE_ENV !== 'production') {
    socketIOServerConfig = {
        cors: {
            origin: true
        }
    };
}
var io = new socket_io_1.Server(server, socketIOServerConfig);
var MessageType;
(function (MessageType) {
    MessageType[MessageType["text"] = 0] = "text";
    MessageType[MessageType["geolocation"] = 1] = "geolocation";
})(MessageType || (MessageType = {}));
if (process.env.NODE_ENV !== 'production') {
    app.use(cors({
        origin: true
    }));
}
app.use(express.static(path.join(__dirname, "./webrtc-client/dist")));
app.use(bodyParser.json());
var activeUsers = [];
// manage this thing via rooms instread of a map like this
var connectedCalls = new Map();
var lastFetchedCreds = new Date();
var iceServers = [];
function getUserFromFirebase(email, password) {
    var _this = this;
    return new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
        var docRef, user, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setTimeout(function () { return reject(new Error('Timeout for logging in into the Server!')); }, 1500);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, firestore.collection('users')
                            .where('email', '==', email)
                            .where('password', '==', password)
                            .limit(1)
                            .get()];
                case 2:
                    docRef = _a.sent();
                    if (docRef.empty) {
                        reject('No Users with given credentials found!');
                        return [2 /*return*/];
                    }
                    user = docRef.docs[0].data();
                    user.firebaseDocId = docRef.docs[0].id;
                    resolve(user);
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    reject(error_1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); });
}
function setUserIntoFirebase(userBody) {
    var _this = this;
    return new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
        var docRef, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setTimeout(function () { return reject(new Error('Timeout for logging in into the Server!')); }, 1500);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, firestore.collection('users').add(userBody)];
                case 2:
                    docRef = _a.sent();
                    userBody.firebaseDocId = docRef.id;
                    resolve(userBody);
                    return [3 /*break*/, 4];
                case 3:
                    error_2 = _a.sent();
                    reject(error_2);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); });
}
function valiateUserInput(req, res, next) {
    var userBody = req.body;
    // do better validation here
    if (!userBody) {
        res.status(400).send(new Error('No User Received'));
        return;
    }
    var currentlyLoggedIn = activeUsers.find(function (user) { return user.email === userBody.email; });
    if (currentlyLoggedIn) {
        res.status(200).send(currentlyLoggedIn);
        return;
    }
    next();
}
app.post('/login', valiateUserInput, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userBody, user, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                userBody = req.body;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, getUserFromFirebase(userBody.email, userBody.password)];
            case 2:
                user = _a.sent();
                res.status(200).send(user);
                return [3 /*break*/, 4];
            case 3:
                error_3 = _a.sent();
                res.status(500).send(error_3);
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
app.post('/register', valiateUserInput, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userBody, user, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                userBody = req.body;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, setUserIntoFirebase(userBody)];
            case 2:
                user = _a.sent();
                res.status(200).send(user);
                return [3 /*break*/, 4];
            case 3:
                error_4 = _a.sent();
                res.status(500).send(error_4);
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
app.post('/geticeserver', function (req, res) {
    var now = new Date();
    var diff = now.getTime() - lastFetchedCreds.getTime();
    var diffInMinutes = diff / (1000 * 60);
    // caching for one hour
    if (iceServers.length && diffInMinutes < 60) {
        res.send(iceServers);
        return;
    }
    twillioClient.tokens.create().then(function (token) {
        iceServers = token.iceServers;
        lastFetchedCreds = token.dateCreated;
        res.send(token.iceServers);
    }, function (error) {
        res.status(500).send(error);
    });
});
io.on("connection", function (socket) {
    socket.on('login', function (message) {
        var userBody = message.data.user;
        if (!userBody) {
            socket.emit('login-failed');
        }
        var currentlyLoggedIn = activeUsers.find(function (user) { return user.email === userBody.email; });
        if (currentlyLoggedIn) {
            socket.emit("login-successful", {
                data: {
                    connectedUsers: activeUsers.filter(function (user) { return user.email !== userBody.email; })
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
    socket.on('createMessage', function (_a) {
        var from = _a.from, to = _a.to, data = _a.data;
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
            to: to,
            from: from,
            data: {
                message: data.message,
                messageType: MessageType.text,
                createdAt: new Date() // look for createdAt
            }
        });
    });
    socket.on('createLocationMessage', function (_a) {
        var from = _a.from, to = _a.to, data = _a.data;
        socket.to(to).emit('newMessage', {
            to: to,
            from: from,
            data: {
                latitude: data.latitude,
                longitude: data.longitude,
                messageType: MessageType.geolocation,
                createdAt: new Date() // look for createdAt
            }
        });
    });
    // a call has been made
    socket.on('call-user', function (data) {
        var offer = data.offer, to = data.to, fromUserSocket = data.fromUserSocket;
        connectedCalls.set(to, fromUserSocket);
        connectedCalls.set(fromUserSocket, to);
        socket.to(to).emit("call-offer", {
            description: offer,
            fromUserSocket: fromUserSocket
        });
    });
    // a positive answer has been made
    socket.on('answer-made', function (_a) {
        var to = _a.to, description = _a.description;
        socket.to(to).emit('call-accepted', {
            description: description
        });
    });
    // user has rejected call
    socket.on('reject-call', function (_a) {
        var to = _a.to;
        socket.to(to).emit('call-rejected');
    });
    socket.on('end-call', function (_a) {
        var to = _a.to;
        socket.to(to).emit('end-call');
    });
    socket.on('generate-ice-candidate', function (_a) {
        var candidate = _a.candidate, to = _a.to;
        socket.to(to).emit('ice-candidate-generated', { candidate: candidate });
    });
    socket.on("disconnect", function () {
        activeUsers = activeUsers.filter(function (user) { return user.socketId !== socket.id; });
        if (connectedCalls.has(socket.id)) {
            var otherPeer = connectedCalls.get(socket.id);
            connectedCalls["delete"](socket.id);
            connectedCalls["delete"](otherPeer);
            socket.to(otherPeer).emit('end-call');
        }
        socket.broadcast.emit("remove-user", {
            socketId: socket.id
        });
    });
});
server.listen(process.env.PORT || process.env.DEFAULT_PORT, function () {
    console.log("Server is up and running on port " + (process.env.PORT || process.env.DEFAULT_PORT));
});
