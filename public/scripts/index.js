//p2p connection establishment 
//variables declaration ---
const localVideo = document.getElementById("localUserVideo");
const remoteVideo1 = document.getElementById("remoteUserVideo1");
const remoteVideo2 = document.getElementById("remoteUserVideo2");
const remoteVideo3 = document.getElementById("remoteUserVideo3");
const remoteVideo4 = document.getElementById("remoteUserVideo4");
const remoteVideo5 = document.getElementById("remoteUserVideo5");
const remoteVideo6 = document.getElementById("remoteUserVideo6");
const remoteVideo7 = document.getElementById("remoteUserVideo7");
const remoteVideo8 = document.getElementById("remoteUserVideo8");
const constraints = {'video': true, 'audio': false };
const config = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]};

var connections =[];
var currentInCall = [];
const {RTCPeerConnection, RTCSessionDescription} = window;
//2 remote users
connections.push(new RTCPeerConnection(config));
connections.push(new RTCPeerConnection(config));
connections.push(new RTCPeerConnection(config));
connections.push(new RTCPeerConnection(config));
connections.push(new RTCPeerConnection(config));
connections.push(new RTCPeerConnection(config));
connections.push(new RTCPeerConnection(config));
connections.push(new RTCPeerConnection(config));
let usersInCall = 0;
//const peerConnection = new RTCPeerConnection(config);
const socket = io.connect();//change this
let called = false;
let repeating = false;
let joiningSecondaryPeers = false;
//called - false initially, this is to make sure I dont keep calling callUser(data.socket) infinitely. To establish p2p connection, I need to callUser(socketId) and callUser(data.socket)
//repeating - false initially, this is to make sure that the dialog asking that user A is calling accept? is asked only once as we are calling callUser twice

//local stream reachable
localVideo.addEventListener('loadedmetadata', function() {
    console.log("Got local stream");
});
//remote stream reachable
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


//socket sock-it!
socket.on("update-user-list", ({users, keys, vals}) => {
    updateUserList(users, keys, vals);
});

socket.on("call-made", async data => {
    //adding new connection to called side
    if(!repeating)
    {
        //connections.push(new RTCPeerConnection(config));
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
        //quotaFinished = true;
    }
    else
    {
        currentInCall.push(data.socket);
        usersInCall = usersInCall+1;
        repeating = false;
        called = false;
        //housekeeping other
        socket.emit("housekeep", {
            from : data.socket
        });
        if(joiningSecondaryPeers===false)
        {
            socket.emit("connect-to-others", { //should i have this when I am already in connecting-to-others. no
                currentInCall,
                to : data.socket
            });
        }
    }
});

socket.on("connecting-to-others", async data => {
    let toJoin = data.currentInCall;
    joiningSecondaryPeers = true;
    for (let i = 0; i<toJoin.length; i++)
    {
        if(socket.id !== toJoin[i])
        {
            //change
            //usersInCall = 1;
            await callUser(toJoin[i]);
            //usersInCall = usersInCall+1;
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
//for (let i=0;i<n;i++)
//{
//   (closure){} => applying i to something //only i = n would be applied
//}
//instead assign idx = i at the beginning


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
     console.log("tracks: "+stream.getTracks());
    },
    error => {
        console.log(error.message);
    }
);



//helper functions
function updateUserList(socketIds, keys, vals) 
{
    const activeUserContainer = document.getElementById("activeUsers");
    socketIds.forEach(socketId => {
        const alreadyExisitingUser = document.getElementById(socketId);
        if(!alreadyExisitingUser)
        {
            let userName = getKey(keys, vals, socketId);
            console.log("username: "+keys+":"+vals+":"+socketId);
            const userContainerEl = createUserItemContainer(socketId, userName);
            activeUserContainer.appendChild(userContainerEl);
        }
    });
}
function getKey(keys, vals, searchValue) 
{
    for (let ind = 0; ind<vals.length; ind++)
    {
        console.log("f:"+vals[ind]+"-"+searchValue);
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
    console.log("call user "+socketId);
    //append peer connection to connections
    //pushed new peer connection from caller side. to do from called side as well SIDELINING WHAT HAPPENS WHEN CALL IS REJECTED FOR NOW
    //connections.push(new RTCPeerConnection(config));
    const offer = await connections[usersInCall].createOffer();
    await connections[usersInCall].setLocalDescription(new RTCSessionDescription(offer));//D
    console.log("before emiting");
    socket.emit("call-user", {
        offer,
        to : socketId
    });
    console.log("after emiting");
}