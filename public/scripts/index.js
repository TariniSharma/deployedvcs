//variable declaration
const localVideo = document.getElementById("localUserVideo");
const remoteVideo1 = document.getElementById("remoteUserVideo1");
const remoteVideo2 = document.getElementById("remoteUserVideo2");
const remoteVideo3 = document.getElementById("remoteUserVideo3");
const remoteVideo4 = document.getElementById("remoteUserVideo4");
const remoteVideo5 = document.getElementById("remoteUserVideo5");
const remoteVideo6 = document.getElementById("remoteUserVideo6");
const remoteVideo7 = document.getElementById("remoteUserVideo7");
const remoteVideo8 = document.getElementById("remoteUserVideo8");
const localUserAudioButton = document.getElementById("localUserAudioButton");
const localUserVideoButton = document.getElementById("localUserVideoButton");
const constraints = {'video': true, 'audio': true };
const config = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]};

var connections =[];
var currentInCall = [];
let usersInCall = 0;
let called = false;
let repeating = false;
let joiningSecondaryPeers = false;
const {RTCPeerConnection, RTCSessionDescription} = window;

for(let i=0;i<=7;i++)
{
    connections.push(new RTCPeerConnection(config));
}

//-----------------


const socket = io.connect();


//Event Listeners 
//Checking if media streams are reachable
localVideo.addEventListener('loadedmetadata', function() {
    console.log("Got local stream");
});
remoteVideo1.addEventListener('loadedmetadata', function() {
    console.log("Got remote stream1");
});
remoteVideo2.addEventListener('loadedmetadata', function() {
    console.log("Got remote stream2");
});
remoteVideo3.addEventListener('loadedmetadata', function() {
    console.log("Got remote stream3");
});
remoteVideo4.addEventListener('loadedmetadata', function() {
    console.log("Got remote stream4");
});
remoteVideo5.addEventListener('loadedmetadata', function() {
    console.log("Got remote stream5");
});
remoteVideo6.addEventListener('loadedmetadata', function() {
    console.log("Got remote stream6");
});
remoteVideo7.addEventListener('loadedmetadata', function() {
    console.log("Got remote stream7");
});
remoteVideo8.addEventListener('loadedmetadata', function() {
    console.log("Got remote stream8");
});

//Clicking A/V buttons
localUserAudioButton.addEventListener("click", function() {
    localVideo.srcObject.getAudioTracks().forEach(track => track.enabled = !track.enabled);
});
localUserVideoButton.addEventListener("click", function() {
    localVideo.srcObject.getVideoTracks().forEach(track => track.enabled = !track.enabled);
    localUserVideoButton.toggle();
});
//-----------------



//Socket methods

socket.on("update-user-list", ({users, keys, vals}) => {
    updateUserList(users, keys, vals);
});

socket.on("call-made", async data => {
    if(!repeating)
    {
        const confirmed = window.confirm(
            `User "Socket: ${data.socket}" wants to call. Do you accept this call?`
        );
        if(!confirmed)
        {
            socket.emit("reject-call", {
                from : data.socket
            });
            return;
        }
    }
    await connections[usersInCall].setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await connections[usersInCall].createAnswer();
    await connections[usersInCall].setLocalDescription(new RTCSessionDescription(answer));

    socket.emit("make-answer", {
        answer,
        to : data.socket
    });
    repeating = true;   
});


socket.on("answer-made", async data => {
    await connections[usersInCall].setRemoteDescription(new RTCSessionDescription(data.answer));
    if(!called)
    {
        callUser(data.socket);
        called = true;
    }
    else
    {
        currentInCall.push(data.socket);
        usersInCall = usersInCall+1;
        repeating = false;
        called = false;

        socket.emit("add-username", {
            from: data.socket
        });
        
        socket.emit("housekeep", {
            from : data.socket
        });
        if(joiningSecondaryPeers===false)
        {
            socket.emit("connect-to-others", { 
                currentInCall,
                to : data.socket
            });
        }
    }
});

socket.on("adding-username", async data => {
    let temp = "remoteUserHeading"+(usersInCall+1);
    let userTitle = document.getElementById(temp);
    userTitle.innerHTML = data.user;
});

socket.on("adding-local", async data => {
    let temp = "localUserHeading";
    let userTitle = document.getElementById(temp);
    userTitle.innerHTML = data.user;
});

socket.on("connecting-to-others", async data => {
    let toJoin = data.currentInCall;
    joiningSecondaryPeers = true;
    for (let i = 0; i<toJoin.length; i++)
    {
        if(socket.id !== toJoin[i])
        {
            await callUser(toJoin[i]);
            await timer(7000); 
        }
    }
    joiningSecondaryPeers = false;
});
const timer = ms => new Promise(res => setTimeout(res, ms))

socket.on("housekeeped", data => {
    called = false;
    repeating = false;
    usersInCall = usersInCall+1;
})

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

socket.emit("add-local-username", {
    from:socket.id
});
//-----------------

//Event listener when mediastream track received
for(let i = 0;i<connections.length;i++)
{
    let idx = i;
    connections[idx].ontrack = function({streams : [stream]}) {
        let temp = "remoteUserVideo"+(idx+1);
        const remoteVideo = document.getElementById(temp);
        if(remoteVideo)
        {
           remoteVideo.srcObject = stream;
        }
    
    };
}
//-----------------

//Getting local stream
navigator.getUserMedia(constraints, stream => {
    const localVideo = document.getElementById("localUserVideo");
    if(localVideo)
    {
        localVideo.srcObject = stream;
    }
    for(let i=0;i<connections.length;i++)
    {
        let idx = i;
        stream.getTracks().forEach(track => connections[idx].addTrack(track, stream));
    }
    },
    error => {
        console.log(error.message);
    }
);
//-----------------

//Helper functions
function updateUserList(socketIds, keys, vals) 
{
    const activeUserContainer = document.getElementById("activeUsers");
    socketIds.forEach(socketId => {
        const alreadyExisitingUser = document.getElementById(socketId);
        if(!alreadyExisitingUser)
        {
            let userName = getKey(keys, vals, socketId);
            const userContainerEl = createUserItemContainer(socketId, userName);
            activeUserContainer.appendChild(userContainerEl);
        }
    });
}

function getKey(keys, vals, searchValue) 
{
    for (let ind = 0; ind<vals.length; ind++)
    {
        if(vals[ind] === searchValue)
        {
            return keys[ind];
        }
    }
}
  
function createUserItemContainer(socketId, userName)
{
    const userContainerEl = document.createElement("div");
    const usernameEl = document.createElement("p");

    userContainerEl.setAttribute("class", "active-user");//necessary?
    userContainerEl.setAttribute("id", socketId);
    usernameEl.setAttribute("class", "username");
    usernameEl.innerHTML = `User: ${userName}`;

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
    const offer = await connections[usersInCall].createOffer();
    await connections[usersInCall].setLocalDescription(new RTCSessionDescription(offer));//D

    socket.emit("call-user", {
        offer,
        to : socketId
    });

}