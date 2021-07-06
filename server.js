"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;
var express_1 = __importDefault(require("express"));
var socket_io_1 = require("socket.io");
var http_1 = require("http");
var path_1 = __importDefault(require("path"));

require('dotenv').config();
const { auth, requiresAuth } = require('express-openid-connect');

var Server = /** @class */ (function () {
    function Server() {
        this.port = process.env.PORT || 3000;
        this.activeSockets = [];
        this.activeUsers = []; //Constraint: user nickname must be unique => user email id must be unique
        this.hash = new Map();
        this.newUser;
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
              //idpLogout: true,
            })
        );
    };
    Server.prototype.configureApp = function () {
        this.app.use(express_1.default.static(path_1.default.join(__dirname, "/public")));
    };
    Server.prototype.handleRoutes = function () {
        var _this = this;
        this.app.get("/", requiresAuth(), function (req, res) {
            //console.log(req.oidc.user.nickname + " has logged in");
            //console.log(this);
            //add this user to list of existing users 
            var existingUser = _this.activeUsers.find(function (existingUser) { return existingUser === req.oidc.user.nickname; });
            if(!existingUser)
            {
                _this.activeUsers.push(req.oidc.user.nickname);
            }
            //del previous instance from hash
            if(_this.hash.has(req.oidc.user.nickname))
            {
                _this.hash.delete(req.oidc.user.nickname);
            }
            _this.newUser = req.oidc.user.nickname;
            //console.log("users in system:" + _this.activeUsers);

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
           // console.log("connected socket");
            var existingSocket = _this.activeSockets.find(function (existingSocket) { return existingSocket === socket.id; });
            if (!existingSocket) {
                _this.activeSockets.push(socket.id);
                if(_this.newUser)
                {
                    _this.hash.set(_this.newUser, socket.id);
                    _this.newUser = null;
                }
                // console.log("hash: ");
                // for (let [key, value] of _this.hash.entries()) {
                //     console.log(key + ' = ' + value)
                //   }
                //make keys and vals array
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
                    //hash: _this.hash
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
//# sourceMappingURL=server.js.map