//p2p connection establishment 
//variables declaration ---
const localVideo = document.getElementById("localUserVideo");
const remoteVideo1 = document.getElementById("remoteUserVideo1");
const remoteVideo2 = document.getElementById("remoteUserVideo2");
const remoteVideo3 = document.getElementById("remoteUserVideo3");
const constraints = {'video': true, 'audio': true };
const config = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]};

var connections =[];
var currentInCall = [];
const {RTCPeerConnection, RTCSessionDescription} = window;
//2 remote users
connections.push(new RTCPeerConnection(config));
connections.push(new RTCPeerConnection(config));
connections.push(new RTCPeerConnection(config));
let usersInCall = 0;
//const peerConnection = new RTCPeerConnection(config);
const socket = io.connect();//change this
console.log("socket: "+socket);
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


//socket sock-it!
socket.on("update-user-list", ({users}) => {
    updateUserList(users);
});

socket.on("call-made", async data => {
    console.log("call made");
    //adding new connection to called side
    if(!repeating)
    {
        //connections.push(new RTCPeerConnection(config));
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
    //console.log(connections.length);
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
    console.log("usersincall: "+usersInCall);
    await connections[usersInCall].setRemoteDescription(new RTCSessionDescription(data.answer));
    //console.log("all steps done");
    if(!called)
    {
        //console.log("here too");
        callUser(data.socket);
        called = true;
        //quotaFinished = true;
    }
    else
    {
        //console.log("1:"+data.socket); //other socket
        //console.log("2:"+socket.id); //current
       // connections.push(new RTCPeerConnection(config));
        currentInCall.push(data.socket);
        console.log(usersInCall+"before");
        usersInCall = usersInCall+1;
        console.log(usersInCall+"after");
        repeating = false;
        called = false;
        //housekeeping other
        socket.emit("housekeep", {
            from : data.socket
        });
        if(joiningSecondaryPeers===false)
        {
            console.log(connections);
            console.log("SHOULDNT BE HERE");
            socket.emit("connect-to-others", { //should i have this when I am already in connecting-to-others. no
                currentInCall,
                to : data.socket
            });
        }
    }
});

socket.on("connecting-to-others", async data => {
    console.log("sofarsogood"+data.currentInCall);
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
            console.log("have called: "+toJoin[i]);
        }
    }
    joiningSecondaryPeers = false;
});
const timer = ms => new Promise(res => setTimeout(res, ms))

socket.on("housekeeped", data => {
  //  console.log("in housekeeping for "+socket.id+" Request from "+data.socket);
   // connections.push(new RTCPeerConnection(config));
    called = false;
    repeating = false;
    usersInCall = usersInCall+1;
  //  console.log(connections);
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

console.log("c:"+connections.length);

for(let i = 0;i<connections.length;i++)
{
    let idx = i;
    connections[idx].ontrack = function({streams : [stream]}) {
        console.log(connections.length);
        let temp = "remoteUserVideo"+(idx+1);
        console.log("temp is :"+temp);
        const remoteVideo = document.getElementById(temp);
        if(remoteVideo)
        {
           remoteVideo.srcObject = stream;
        }
      //  console.log("connections: "+connections.length);
    
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
    //  stream.getTracks().forEach(track => connections[0].addTrack(track, stream));//alter this?
    //  stream.getTracks().forEach(track => connections[1].addTrack(track, stream));//alter this?
    //  stream.getTracks().forEach(track => connections[2].addTrack(track, stream));//alter this?
     console.log("tracks: "+stream.getTracks());
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
        //this is where I need to push connections for both the sockets
        // if(quotaFinished)
        // {
        //     called = false;
        //     repeating = false;
        //     connections.push(new RTCPeerConnection(config));
        //     socket.emit("add-conn", {
        //         to : socketId
        //     });
        // }
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