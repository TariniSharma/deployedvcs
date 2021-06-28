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
var Server = /** @class */ (function () {
    function Server() {
        this.port = process.env.PORT || 3000;
        this.activeSockets = [];
        this.init();
        this.configureApp();
        this.handleRoutes();
        this.handleSocketConnections();
    }
    Server.prototype.init = function () {
        this.app = express_1.default();
        this.httpServer = http_1.createServer(this.app);
        this.io = new socket_io_1.Server(this.httpServer);
    };
    Server.prototype.configureApp = function () {
        this.app.use(express_1.default.static(path_1.default.join(__dirname, "/public")));
    };
    Server.prototype.handleRoutes = function () {
        this.app.get("/", function (req, res) {
            var options = { root: path_1.default.join(__dirname, "./public") };
            res.sendFile("webpage.html", options);
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
                _this.activeSockets.push(socket.id);
                //send to client the list of all other sockets except self
                socket.emit("update-user-list", {
                    users: _this.activeSockets.filter(function (existingSocket) { return existingSocket !== socket.id; })
                });
                //send to all other sockets the socket id of self
                socket.broadcast.emit("update-user-list", {
                    users: [socket.id]
                });
            }
            socket.on("call-user", function (data) {
                socket.to(data.to).emit("call-made", {
                    offer: data.offer,
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