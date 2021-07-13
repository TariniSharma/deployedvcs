"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;

//import express, socket.io, http, path and express-openid-connect(for user authentication)
var express_1 = __importDefault(require("express"));
var socket_io_1 = require("socket.io");
var http_1 = require("http");
var path_1 = __importDefault(require("path"));
require('dotenv').config();
const { auth, requiresAuth } = require('express-openid-connect');
//-----------------


//Server class
var Server = /** @class */ (function () {
    function Server() {
        this.port = process.env.PORT || 3000; 
        this.activeSockets = []; //stores the socketIds connected to http server
        this.activeUsers = []; //stores the username of the user connected to http server
        this.hash = new Map(); //key: socketId ; value:username
        this.newUser; //stores the most recent user logged into the system
        this.init(); 
        this.configureApp();
        this.handleRoutes();
        this.handleSocketConnections();
    }

    Server.prototype.init = function () {
        this.app = express_1.default();
        this.httpServer = http_1.createServer(this.app);
        this.io = new socket_io_1.Server(this.httpServer);
        this.app.use(
            auth({
              authRequired: false,
              auth0Logout: true,
              issuerBaseURL: process.env.ISSUER_BASE_URL,
              baseURL: process.env.BASE_URL,
              clientID: process.env.CLIENT_ID,
              secret: process.env.SECRET,
            })
        );
    };

    Server.prototype.configureApp = function () {
        this.app.use(express_1.default.static(path_1.default.join(__dirname, "/public")));
    };

    Server.prototype.handleRoutes = function () {
        var _this = this;
        this.app.get("/", requiresAuth(), function (req, res) {
            //add this user to list of existing users 
            var existingUser = _this.activeUsers.find(function (existingUser) { return existingUser === req.oidc.user.nickname; });
            if(!existingUser)
            {
                _this.activeUsers.push(req.oidc.user.nickname);
            }
            if(_this.hash.has(req.oidc.user.nickname))
            {
                _this.hash.delete(req.oidc.user.nickname);
            }
            _this.newUser = req.oidc.user.nickname;

            var options = { root: path_1.default.join(__dirname, "./public") };
            res.sendFile("webpage.html", options);
        });
        this.app.get('/profile', requiresAuth(), (req,res) => {
            res.send(JSON.stringify(req.oidc.user));
        });
    };

    Server.prototype.listen = function (callback) {
        var _this = this;
        this.httpServer.listen(this.port, function () {
            return callback(_this.port);
        });
    };

    Server.prototype.handleSocketConnections = function () {
        var _this = this;
        this.io.on("connection", function (socket) {
            var existingSocket = _this.activeSockets.find(function (existingSocket) { return existingSocket === socket.id; });
            if (!existingSocket) {
                _this.activeSockets.push(socket.id); //add current socketId to activeSockets[]
                if(_this.newUser)
                {
                    _this.hash.set(_this.newUser, socket.id); //update map
                    _this.newUser = null;
                }
              
                let keys = [];
                let vals = [];
                let c =0;
                for (let [key, value] of _this.hash.entries()) {
                    keys[c] = key;
                    vals[c] = value;
                    c++;
                  }
                
                //send to client the list of all other sockets except self
                socket.emit("update-user-list", {
                    users: _this.activeSockets.filter(function (existingSocket) { return existingSocket !== socket.id; }),
                    keys: keys,
                    vals: vals
                });
                //send to all other sockets the socket id of self
                socket.broadcast.emit("update-user-list", {
                    users: [socket.id],
                    keys: keys,
                    vals: vals
                });
            }

            socket.on("call-user", function (data) {
                socket.to(data.to).emit("call-made", {
                    offer: data.offer,
                    socket: socket.id
                });
            });

            socket.on("add-username", function(data) {
                let ind = 0;
                let c = 0;
                for (let [key, value] of _this.hash.entries()) {
                    if(value === data.from) {
                        ind = key;
                        break;
                    }
                }
                socket.to(data.from).emit("adding-username", {
                    user: ind
                });
            });

            socket.on("add-local", function(data) {
                let ind = 0;
                let c = 0;
                for (let [key, value] of _this.hash.entries()) {
                    if(value === data.from) {
                        ind = key;
                        break;
                    }
                }
                socket.to(data.from).emit("adding-local", {
                    user: ind
                });
            });

            socket.on("connect-to-others", function (data) {
                socket.to(data.to).emit("connecting-to-others", {
                    currentInCall: data.currentInCall,
                    socket: socket.id
                });
            });

            socket.on("housekeep", function (data) {
                socket.to(data.from).emit("housekeeped", {
                    socket: socket.id
                });
            });

            socket.on("make-answer", function (data) {
                socket.to(data.to).emit("answer-made", {
                    socket: socket.id,
                    answer: data.answer
                });
            });

            socket.on("reject-call", function (data) {
                socket.to(data.from).emit("call-rejected", {
                    socket: socket.id
                });
            });

            socket.on("disconnect", function () {
                _this.activeSockets = _this.activeSockets.filter(function (existingSocket) { return existingSocket !== socket.id; });
                socket.broadcast.emit("remove-user", {
                    socketId: socket.id
                });
            });
        });
    };
    
    return Server;
}());
exports.Server = Server;