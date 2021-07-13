"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

//create server instance
var server_1 = require("./server");
var server = new server_1.Server();

server.listen(function (port) {
    console.log("Server is listening on https://testbootstrapheroku.herokuapp.com/");
});
