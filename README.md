# WebRTC

For study &amp; practice purposes

# What is WebRTC?

WebRTC(Web Real-Time Communication) is a free, **open-source project providing web browsers and mobile applicaitons with real-time communication via simple APIs.** It allows audio, video, and data communication to work inside web pages by allowing direct p2p communication without downloading of plugins or native apps. The technologies behind WebRTC are available as regular JavaScript APIs in all major browsers.

# Getting started with WebRTC

The WebRTC standard covers, on a high level, two different technologies: media capture devices and peer-to-peer connectivity.

**media cpature divces**

- For cameras and microphones: `navigator.mediaDevices.getUserMedia()`
- For screen recording: `navigator.mediaDevices.getDisplayMedia()`

**p2p connectivity**  
The p2p connectivity is handled by the `RTCPeerConnection` interface. This is the central point for establishing and controlling the connection between two peers in WebRTC.

# Media Devices

WebRTC standard provides APIs for accessing cameras and microphones connected to the computer or smartphone. From `navigator.mediaDevices` object we can enumerate all connected devices, listen for device changes (when a device is connected or disconnected), and open a device to retrieve a Media Stream.

The function `getUserMedia()` takes a single MediaStreamConstraints object that specifies the requirements that we have and returns a promise that will resolve to a MediaStream for the matching media devices. For instance, to simply open the default microphone and camera, we would do the following.

```javascript
const openMediaDevices = async (constraints) => {
  return await navigator.mediaDevices.getUserMedia(constraints);
};

try {
  const stream = openMediaDevices({ video: true, audio: true });
  console.log("Got MediaStream:", stream);
} catch (error) {
  console.error("Error accessing media devices.", error);
}
```

# Peer connections

Peer connections is the part of the WebRTC specifications that deals with connecting two applications on different computers to communicate using a peer-to-peer protocol. The communication between peers can be video, audio or arbitrary binary data (for clients supporting the RTCDataChannel API). In order to discover how two peers can connect, both clients need to provide an ICE Server configuration. This is either a STUN or a TURN-server, and their role is to provide ICE candidates to each client which is then transferred to the remote peer. This transferring of ICE candidates is commonly called signaling.

## Signaling

The WebRTC spec includes APIs for communicationg with an ICE Server but the signaling component is not part of it. Signaling is needed for two peers to share how they should connect. Usually this is solved through regular HTTP-based Web API(REST or othre RPC).

The follow code snippet shows how this fictious signaling service can be used to send and receive messages asynchronously.

```javascript
// Set up an async communication channel that will be
//used during the peer conncetion setup
const signalingChannel = new SignalingChannel(remoteClientId);
signalingChannel.addEventListener("message", (messge) => {
  //New message from remote client recieved
});

// Send an async message to the remote clinet
signalingChannel.send("Hello!");
```

## Initiating peer connections

**Calling side**

1. Create `RTCPeerConnection` obj by passing RTCConfiguration obj as constructor parameter.
2. Create SDP offer(from calling peer)/answer(from recieving peer) by calling `createOffer()`. This Creates RTCSessionDescription object.
3. This must be sent to the remote peer through a different channel. Passing SDP objects to remote peers is called signaling and is not covered by the WebRTC specification.
4. Session description is set as the local description using `setLocalDescription()` and is then sent over our signaling channel to the receiving side.
5. Set up a listener to our signaling channel for when an answer to our offered session description is received from the receiving side.

```javascript
async function makeCall(){
  const config = {'iceServers':['urls':'stun:stun.1.google.com:19302'}]};
  const peerConnection = new RTCPeerConnection(config);
  signalingChannel.addEventListener('message', async message => {
    if(message.answer){
      const remoteDesc = new RTCSessionDescription(message.answer);
      await peerConnection.setRemoteDescription(remoteDesc);
    }
  });
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  signalingChannel.send({'offer':offer});
}
```

**Receiving side**

1. Wait for an incoming offer before we create our `RTCPeerConnection` instance.
2. Set the received offer using `setRemoteDescription()`.
3. Call `createAnswer()` to create an answer to the received offer.
4. This answer is set as the local description using `setLocalDescription()` and then sent to the calling side over our signaling server.

```javascript
const config = {'iceServers':['urls':'stun:stun.1.google.com:19302'}]};
const peerConnection = new RTCPeerConnection(config);
signalingChannel.addEventListener('message', async message => {
  if(message.offer){
    peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    signalingChannel.send({'answer':answer});
  }
});
```

**RTCPeerConnection:** handles each peer connection
**RTCConfiguration:** defines how the peer connection is set up and should contain information about the ICE servers to use

Once the two peers have set both the local and remote session descriptions they know the capabilities of the remote peer. This doesn't mean that the connection between the peers is ready. For this to work we need to collect the ICE candidates at each peer and transfer (over the signaling channel) to the other peer.

## ICE candidates

Before two peers can communitcate using WebRTC, they need to exchange connectivity information. Since the network conditions can vary dependning on a number of factors, an external service is usually used for discovering the possible candidates for connecting to a peer. This service is called ICE and is using either a STUN or a TURN server. The WebRTC API supports both STUN and TURN directly.

- **STUN(Session Traversal Utilities for NAT):** usually used indirectly in most WebRTC applications.
- **TURN(Traversal Using Relay NAT):** more advanced solution that incorporates the STUN protocols and most commercial WebRTC based services use a TURN server

## Trickle ICE

The event `icegatheringstatechange` on `RTCPeerConnection` signals in what state the ICE gathering is (`new`, `gathering` or `complete`). To use a "trickle ice" technique and transmit each ICE candidate to the remote peer as it gets discovered significantly reduce the setup time for the peer connectivity and allow a video call to get started faster.

Add a listener for the `icecandidate` event. The `RTCPeerConnectionIceEvent` emitted on that listener will contain `candidate` property that represents a new candidate that should be sent to the remote peer (See Signaling).

```javascript
// Listen for local ICE candidates on the local RTCPeerConnection
peerConnection.addEventListener("icecandidate", (event) => {
  if (event.candidate) {
    signalingChannel.send({ "new-ice-candidate": event.candidate });
  }
});

// Listen for remote ICE candidates and add them to the local RTCPeerConnection
signalingChannel.addEventListener("message", async (message) => {
  if (message.iceCandidate) {
    try {
      await peerConnection.addIceCandidate(message.iceCandidate);
    } catch (e) {
      console.log("Error adding received ice candidate", e);
    }
  }
});
```

## Connection established

To detect state change for our peer connection to connected, we add a listener to our `RTCPeerConnection` where we listen for `connectionstatechange` events.

```javascript
// Listen for connectionstatechange on the local RTCPeerConnection
peerConnection.addEventListener("connectionstatechange", (event) => {
  if (peerConnection.connectionState === "connected") {
    // Peers connected!
  }
});
```

# References

https://www.html5rocks.com/ko/tutorials/webrtc/basics/
https://webrtc.org/
