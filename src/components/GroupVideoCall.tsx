import React, { useEffect, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";

const configuration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    // Add other TURN servers here if needed
  ],
};

interface PeerConnectionMap {
  [userId: string]: RTCPeerConnection;
}

const VideoCall: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [inCall, setInCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState<string | null>(null);
  const peersRef = useRef<PeerConnectionMap>({});
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRefs = useRef<{ [userId: string]: HTMLVideoElement }>({});
  const roomId = "your-room-id"; // Replace with dynamic room ID if necessary

  useEffect(() => {
    const socketInstance = io("http://localhost:5000");
    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    const initLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        socket.emit("join-room", roomId);
      } catch (error) {
        console.error("Error accessing media devices.", error);
      }
    };

    initLocalStream();

    socket.on("user-connected", (userId) => {
      console.log(`User connected: ${userId}`);
      setIncomingCall(userId);
    });

    socket.on("offer", async (data) => {
      console.log("Received offer: ", data);
      await handleOffer(data);
    });

    socket.on("answer", (data) => {
      console.log("Received answer: ", data);
      handleAnswer(data);
    });

    socket.on("ice-candidate", (data) => {
      console.log("Received ICE candidate: ", data);
      handleIceCandidate(data);
    });

    socket.on("user-disconnected", (userId) => {
      console.log(`User disconnected: ${userId}`);
      handleUserDisconnected(userId);
    });

    return () => {
      socket.off("user-connected");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("user-disconnected");
    };
  }, [socket]);

  const handleCall = async () => {
    if (!socket || !localStream) return;
    setInCall(true);

    for (const userId in remoteVideoRefs.current) {
      const peerConnection = createPeerConnection(userId);
      peersRef.current[userId] = peerConnection;

      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.emit("offer", { offer, to: userId, roomId });
    }
  };

  const handleAcceptCall = async () => {
    if (!socket || !localStream || !incomingCall) return;
    console.log("Accepting call from: ", incomingCall);
    const peerConnection = createPeerConnection(incomingCall);
    peersRef.current[incomingCall] = peerConnection;

    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("offer", { offer, to: incomingCall, roomId });
    setIncomingCall(null);
  };

  const handleOffer = async (data: {
    from: string;
    offer: RTCSessionDescriptionInit;
  }) => {
    const peerConnection = createPeerConnection(data.from);
    peersRef.current[data.from] = peerConnection;

    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(data.offer)
    );

    if (localStream) {
      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });
    }

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket?.emit("answer", { answer, to: data.from, roomId });
  };

  const handleAnswer = (data: {
    from: string;
    answer: RTCSessionDescriptionInit;
  }) => {
    const peerConnection = peersRef.current[data.from];
    peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
  };
  const handleIceCandidate = (data: {
    from: string;
    candidate: RTCIceCandidateInit;
  }) => {
    const peerConnection = peersRef.current[data.from];
    peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
  };

  const handleUserDisconnected = (userId: string) => {
    const peerConnection = peersRef.current[userId];
    if (peerConnection) {
      peerConnection.close();
      delete peersRef.current[userId];
    }
    const remoteVideo = remoteVideoRefs.current[userId];
    if (remoteVideo) {
      remoteVideo.srcObject = null;
      remoteVideo.remove();
      delete remoteVideoRefs.current[userId];
    }
  };
  const createPeerConnection = (userId: string): RTCPeerConnection => {
    const peerConnection = new RTCPeerConnection(configuration);

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit("ice-candidate", {
          candidate: event.candidate,
          to: userId,
          roomId,
        });
      }
    };

    peerConnection.ontrack = (event) => {
      console.log(`Received remote stream from ${userId}`);
      const [remoteStream] = event.streams;
      if (remoteStream) {
        let remoteVideo = remoteVideoRefs.current[userId];
        if (!remoteVideo) {
          // Create a new video element if it doesn't exist
          remoteVideo = document.createElement("video");
          remoteVideo.autoplay = true;
          remoteVideo.playsInline = true;
          remoteVideo.style.width = "300px";
          document.getElementById("remote-videos")?.appendChild(remoteVideo);
          remoteVideoRefs.current[userId] = remoteVideo;
        }
        remoteVideo.srcObject = remoteStream;
      }
    };

    return peerConnection;
  };

  return (
    <div>
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        style={{ width: "300px" }}
      />
      <div id="remote-videos">
        {Object.keys(remoteVideoRefs.current).map((userId) => (
          <video
            key={userId}
            ref={(ref) => {
              if (ref) remoteVideoRefs.current[userId] = ref;
            }}
            autoPlay
            playsInline
            style={{ width: "300px" }}
          />
        ))}
      </div>
      {!inCall && <button onClick={handleCall}>Start Call</button>}
      {incomingCall && (
        <button onClick={handleAcceptCall}>
          Accept Call from {incomingCall}
        </button>
      )}
    </div>
  );
};

export default VideoCall;
