import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000"); // Replace with your server URL

const Test = () => {
  const localStreamRef = useRef<HTMLVideoElement | null>(null);
  const remoteStreamRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const [stream, setStream] = useState<MediaStream | undefined>();
  const [isCalling, setIsCalling] = useState<boolean>(false);
  const [roomId, setRoomId] = useState<string>("");
  const [isInRoom, setIsInRoom] = useState<boolean>(false);
  const [isInitiator, setIsInitiator] = useState<boolean>(false);

  const configuration = {
    iceServers: [
      {
        urls: "stun:stun.l.google.com:19302",
      },
    ],
  };

  useEffect(() => {
    // Handle signaling messages from the server
    socket.on("offer", async (data) => {
      console.log("Offer received:", data);
      if (!isInitiator) {
        await handleOffer(data.offer, data.from);
      }
    });

    socket.on("answer", async (data) => {
      console.log("Answer received:", data);
      if (isInitiator) {
        await handleAnswer(data.answer);
      }
    });

    socket.on("ice-candidate", async (data) => {
      console.log("ICE candidate received:", data);
      await handleICECandidate(data.candidate);
    });

    return () => {
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
    };
  }, [isInitiator]);

  const createPeerConnection = () => {
    peerConnectionRef.current = new RTCPeerConnection(configuration);

    if (stream) {
      stream.getTracks().forEach((track) => {
        peerConnectionRef.current?.addTrack(track, stream);
      });
    }

    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE candidate:", event.candidate);
        socket.emit("ice-candidate", {
          roomId,
          candidate: event.candidate,
        });
      }
    };

    peerConnectionRef.current.ontrack = (event) => {
      if (remoteStreamRef.current) {
        remoteStreamRef.current.srcObject = event.streams[0];
      }
    };

    console.log("Peer connection created");
  };

  const createOffer = async () => {
    if (peerConnectionRef.current) {
      try {
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);

        console.log("Offer created and set as local description");

        socket.emit("offer", {
          roomId,
          offer: offer,
        });
      } catch (error) {
        console.error("Error creating offer:", error);
      }
    } else {
      console.error("Peer connection not initialized");
    }
  };

  const handleOffer = async (
    offer: RTCSessionDescriptionInit,
    from: string
  ) => {
    createPeerConnection();
    await peerConnectionRef.current?.setRemoteDescription(
      new RTCSessionDescription(offer)
    );
    const answer = await peerConnectionRef.current?.createAnswer();
    await peerConnectionRef.current?.setLocalDescription(answer);

    socket.emit("answer", {
      roomId,
      from,
      answer: answer,
    });
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    await peerConnectionRef.current?.setRemoteDescription(
      new RTCSessionDescription(answer)
    );
  };

  const handleICECandidate = async (candidate: RTCIceCandidateInit) => {
    await peerConnectionRef.current?.addIceCandidate(
      new RTCIceCandidate(candidate)
    );
  };

  const joinRoom = () => {
    socket.emit("join-room", roomId);
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setStream(stream);
        if (localStreamRef.current) {
          localStreamRef.current.srcObject = stream;
        }
      })
      .catch((error) => console.error("Error accessing user media:", error));
    setIsInRoom(true);
  };

  const startCall = () => {
    if (isInitiator) {
      createPeerConnection();
      createOffer();
      setIsCalling(true);
    } else {
      console.log("Waiting for offer from initiator...");
    }
  };

  const handleRoleChange = () => {
    // Toggle initiator role on button click
    setIsInitiator((prev) => !prev);
  };

  return (
    <div>
      <h1>WebRTC Test</h1>
      {!isInRoom ? (
        <div>
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Enter Room ID"
          />
          <button onClick={joinRoom}>Join Room</button>
        </div>
      ) : (
        <div>
          <button onClick={handleRoleChange}>
            {isInitiator ? "Switch to Receiver" : "Switch to Initiator"}
          </button>
          <button onClick={startCall} disabled={isCalling}>
            {isInitiator ? "Start Call" : "Wait for Call"}
          </button>
          <h2>Local Stream:</h2>
          <video ref={localStreamRef} autoPlay playsInline muted />

          <h2>Remote Stream:</h2>
          <video ref={remoteStreamRef} autoPlay playsInline />
        </div>
      )}
    </div>
  );
};

export default Test;
