'use strict';

// Define peer connections, streams and video elements.
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

let localStream;
let remoteStream;

let localPeerConn;
let remotePeerConn;


// Define MediaStreams callbacks.

// Handles remote MediaStream success by adding it as the remoteVideo src.
function gotRemoteMediaStream(event) {
  const mediaStream = event.stream;
  remoteVideo.srcObject = mediaStream;
  remoteStream = mediaStream;
}


// Define RTC peer connection behavior.

// Connects with new peer candidate.
function handleConnection(event) {
  const peerConnection = event.target;
  const iceCandidate = event.candidate;

  if (iceCandidate) {
    const newIceCandidate = new RTCIceCandidate(iceCandidate);
    const otherPeer = getOtherPeer(peerConnection);

    otherPeer.addIceCandidate(newIceCandidate);
  }
}

// Logs offer creation and sets peer connection session descriptions.
async function createdOffer(description) {
  localPeerConn.setLocalDescription(description);
  remotePeerConn.setRemoteDescription(description);
  try{
    let description = await remotePeerConn.createAnswer();
    createdAnswer(description);
  }catch(e){
    console.log('createAnswer fail.',e);
  }
}

// Logs answer to offer creation and sets peer connection session descriptions.
function createdAnswer(description) {
  remotePeerConn.setLocalDescription(description);
  localPeerConn.setRemoteDescription(description);
}


// Define and add behavior to buttons.

// Define action buttons.
const startButton = document.getElementById('startButton');
const callButton = document.getElementById('callButton');
const hangupButton = document.getElementById('hangupButton');

// Set up initial action buttons status: disable call and hangup.
callButton.disabled = true;
hangupButton.disabled = true;


// Handles start button action: creates local MediaStream.
async function startAction() {
  startButton.disabled = true;
  const mediaStreamConstraints = {
    video: true,audio:true
  };

  try{
    let mediaStream = await navigator.mediaDevices.getUserMedia(mediaStreamConstraints);
    localVideo.srcObject = mediaStream;
    localStream = mediaStream;
    callButton.disabled = false;  // Enable call button.
  }catch(e){
    console.log('getUserMedia fail',e);
  }
}

// Handles call button action: creates peer connection.
async function callAction() {
  callButton.disabled = true;
  hangupButton.disabled = false;
  const servers = null;  // Allows for RTC server configuration.

  // Create peer connections and add behavior.
  localPeerConn = new RTCPeerConnection(servers);
  localPeerConn.addEventListener('icecandidate', handleConnection);
  
  remotePeerConn = new RTCPeerConnection(servers);
  remotePeerConn.addEventListener('icecandidate', handleConnection);
  remotePeerConn.addEventListener('addstream', gotRemoteMediaStream);

  // Add local stream to connection and create offer to connect.
  localPeerConn.addStream(localStream);
  
  try{
    let description = await localPeerConn.createOffer();
    createdOffer(description);
  }catch(e){
    console.log('createOffer fail.',e);
  }
}

// Handles hangup action: ends up call, closes connections and resets peers.
function hangupAction() {
  localPeerConn.close();
  remotePeerConn.close();
  localPeerConn = null;
  remotePeerConn = null;
  hangupButton.disabled = true;
  callButton.disabled = false;
}

// Add click event handlers for buttons.
startButton.addEventListener('click', startAction);
callButton.addEventListener('click', callAction);
hangupButton.addEventListener('click', hangupAction);


// Define helper functions.

// Gets the "other" peer connection.
function getOtherPeer(peerConnection) {
  return (peerConnection === localPeerConn) ?
      remotePeerConn : localPeerConn;
}

// Gets the name of a certain peer connection.
function getPeerName(peerConnection) {
  return (peerConnection === localPeerConn) ?
      'localPeerConn' : 'remotePeerConn';
}
