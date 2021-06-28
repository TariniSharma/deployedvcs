//p2p connection establishment 
//variables declaration ---
const localVideo = document.getElementById("localUserVideo");
const remoteVideo = document.getElementById("remoteUserVideo");
const constraints = {'video': true, 'audio': false };
const config = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]};

const {RTCPeerConnection, RTCSessionDescription} = window;
const peerConnection = new RTCPeerConnection(config);
const socket = io.connect();//change this
console.log("socket: "+socket);
let called = false;
let repeating = false;
//called - false initially, this is to make sure I dont keep calling callUser(data.socket) infinitely. To establish p2p connection, I need to callUser(socketId) and callUser(data.socket)
//repeating - false initially, this is to make sure that the dialog asking that user A is calling accept? is asked only once as we are calling callUser twice

//local stream reachable
localVideo.addEventListener('loadedmetadata', function() {
    console.log("Got local stream");
})
//remote stream reachable
remoteVideo.addEventListener('loadedmetadata', function() {
    console.log("Got remote stream");
})

//socket sock-it!
socket.on("update-user-list", ({users}) => {
    updateUserList(users);
});

socket.on("call-made", async data => {
    if(!repeating)
    {
        const confirmed = window.confirm(
            `User "Socket: ${data.socket}" wants to call. Do you accept this call?`
        );
        if(!confirmed)
        {
            console.log("call rejected!");
            socket.emit("reject-call", {
                from : data.socket
            });
            return;
        }
    }
        
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(new RTCSessionDescription(answer));

    socket.emit("make-answer", {
        answer,
        to : data.socket
    });
    repeating = true;
        
    
});

socket.on("answer-made", async data => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    console.log("all steps done");
    if(!called)
    {
        console.log("here too");
        callUser(data.socket);
        called = true;
    }
});

socket.on("call-rejected", data => {
    alert(`User: "Socket: ${data.socket}" rejected your call`);
    unselectUsersFromList();
});

socket.on("remove-user", ({socketId}) => {
    const elToRemove = document.getElementById(socketId);
    if(elToRemove)
    {
        elToRemove.remove();
    }
});

peerConnection.ontrack = function({streams : [stream]}) {
    const remoteVideo = document.getElementById("remoteUserVideo");
    if(remoteVideo)
    {
        remoteVideo.srcObject = stream;
    }
};

navigator.getUserMedia(constraints, stream => {
    const localVideo = document.getElementById("localUserVideo");
    if(localVideo)
    {
        localVideo.srcObject = stream;
    }
    stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
    },
    error => {
        console.log(error.message);
    }
);



//helper functions
function updateUserList(socketIds) 
{
    const activeUserContainer = document.getElementById("activeUsers");
    socketIds.forEach(socketId => {
        const alreadyExisitingUser = document.getElementById(socketId);
        if(!alreadyExisitingUser)
        {
            const userContainerEl = createUserItemContainer(socketId);
            activeUserContainer.appendChild(userContainerEl);
        }
    });
}
function createUserItemContainer(socketId)
{
    const userContainerEl = document.createElement("div");
    const usernameEl = document.createElement("p");

    userContainerEl.setAttribute("class", "active-user");//necessary?
    userContainerEl.setAttribute("id", socketId);
    usernameEl.setAttribute("class", "username");
    usernameEl.innerHTML = `Socket: ${socketId}`;

    userContainerEl.appendChild(usernameEl);

    userContainerEl.addEventListener('click', () => {
        unselectUsersFromList();
        userContainerEl.setAttribute("class" , "active-user active-user--selected");
        callUser(socketId);
    });

    return userContainerEl;
}
function unselectUsersFromList() 
{
    const alreadySelectedUser = document.querySelectorAll(
      ".active-user.active-user--selected"
    );
  
    alreadySelectedUser.forEach(el => {
      el.setAttribute("class", "active-user");
    });
}
async function callUser(socketId)
{
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(new RTCSessionDescription(offer));//D
    socket.emit("call-user", {
        offer,
        to : socketId
    });
}
  
