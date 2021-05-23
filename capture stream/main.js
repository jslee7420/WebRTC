async function playVideoFromCamera() {
    try {
        const constraints = {
            'video': true,
            'audio': true
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        let videoElement = document.querySelector('#localVideo');
        videoElement.srcObject = stream;
        let new_stream = videoElement.captureStream();
        let videoOutElement = document.querySelector("#videoOutput");
        videoOutElement.srcObject = new_stream;
    } catch (error) {
        console.error('Error opening video camera.', error);
    }
}

playVideoFromCamera();