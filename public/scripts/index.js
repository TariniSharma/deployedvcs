const constraints = {'video': true, 'audio': false };
navigator.getUserMedia(constraints, stream => {
    const localVideo = document.getElementById("localUserVideo");
    if(localVideo)
    {
        localVideo.srcObject = stream;
    }
    },
    error => {
        console.log(error.message);
    }
);