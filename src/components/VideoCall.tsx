import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import {
  Box,
  Button,
  HStack,
  IconButton,
  Input,
  Text,
  VStack,
  useToast,
} from "@chakra-ui/react";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
} from "react-icons/fa";

const VideoCall: React.FC = () => {
  const socket = io("http://localhost:5000");
  const [me, setMe] = useState<string | null>(null); // Represents the user's ID
  const [stream, setStream] = useState<MediaStream | undefined>(); // Represents the local video stream
  const [receivingCall, setReceivingCall] = useState<boolean>(false); // Indicates if a call is being received
  const [caller, setCaller] = useState<string | null>(null); // Represents the ID of the caller
  const [callerSignal, setCallerSignal] =
    useState<RTCSessionDescriptionInit | null>(null); // Represents the signal data from the caller
  const [callAccepted, setCallAccepted] = useState<boolean>(false); // Indicates if the call has been accepted
  const [idToCall, setIdToCall] = useState<string>(""); // Represents the ID of the user to call
  const [callEnded, setCallEnded] = useState<boolean>(false); // Indicates if the call has ended
  const [name, setName] = useState<string>(""); // Represents the user's name
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);

  const myVideo = useRef<HTMLVideoElement | null>(null);
  const userVideo = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const toast = useToast();

  const configuration = {
    iceServers: [
      {
        urls: "stun:stun.l.google.com:19302",
      },
    ],
  };

  useEffect(() => {
    // Access user media
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setStream(stream);
        if (myVideo.current) {
          myVideo.current.srcObject = stream;
        }
      })
      .catch((error) => console.error("Error accessing user media:", error));

    // Socket event listeners
    socket.on("me", (id: string) => {
      setMe(id);
    });

    socket.on(
      "callUser",
      (data: {
        from: string;
        signal: RTCSessionDescriptionInit;
        name: string;
      }) => {
        setReceivingCall(true);
        setCaller(data.from);
        setName(data.name);
        setCallerSignal(data.signal);
      }
    );

    socket.on("callAccepted", (signal: RTCSessionDescriptionInit) => {
      setCallAccepted(true);
      if (peerConnectionRef.current) {
        peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(signal)
        );
        peerConnectionRef.current.createAnswer().then((answer) => {
          peerConnectionRef.current!.setLocalDescription(answer);
          socket.emit("answerCall", { signal: answer, to: caller });
        });
      }
    });

    return () => {
      socket.off("me");
      socket.off("callUser");
      socket.off("callAccepted");
    };
  }, []);

  const callUser = (id: string) => {
    if (!stream) return;

    const peerConnection = new RTCPeerConnection(configuration);
    peerConnectionRef.current = peerConnection;

    stream
      .getTracks()
      .forEach((track) => peerConnection.addTrack(track, stream));

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("callUser", {
          userToCall: id,
          signalData: peerConnection.localDescription,
          from: me,
          name: name,
        });
      }
    };

    peerConnection.ontrack = (event) => {
      if (userVideo.current) {
        userVideo.current.srcObject = event.streams[0];
      }
    };

    peerConnection.createOffer().then((offer) => {
      peerConnection.setLocalDescription(offer);
    });
  };

  const answerCall = () => {
    if (!stream || !callerSignal) return;

    const peerConnection = new RTCPeerConnection(configuration);
    peerConnectionRef.current = peerConnection;

    stream
      .getTracks()
      .forEach((track) => peerConnection.addTrack(track, stream));

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("answerCall", {
          signal: peerConnection.localDescription,
          to: caller,
        });
      }
    };

    peerConnection.ontrack = (event) => {
      if (userVideo.current) {
        userVideo.current.srcObject = event.streams[0];
      }
    };

    peerConnection
      .setRemoteDescription(new RTCSessionDescription(callerSignal))
      .then(() => peerConnection.createAnswer())
      .then((answer) => {
        peerConnection.setLocalDescription(answer);
      });
    setReceivingCall(false);
  };

  const leaveCall = () => {
    setCallEnded(true);
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  };

  const copyIdToClipboard = () => {
    if (me) {
      navigator.clipboard.writeText(me);
      toast({
        title: "ID copied!",
        description: `Your ID ${me} has been copied to clipboard.`,
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    }
  };

  const toggleAudio = () => {
    if (stream) {
      stream
        .getAudioTracks()
        .forEach((track) => (track.enabled = !audioEnabled));
      setAudioEnabled(!audioEnabled);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      stream
        .getVideoTracks()
        .forEach((track) => (track.enabled = !videoEnabled));
      setVideoEnabled(!videoEnabled);
    }
  };

  return (
    <VStack spacing={4} p={2} align="center">
      <Text fontSize="xl" fontWeight="bold">
        Video Call
      </Text>
      <VStack p={2} bg={"gray.100"} rounded={"lg"}>
        <Text fontSize={"md"} fontWeight={"medium"} color={"gray.600"}>
          My Video
        </Text>
        <video
          ref={myVideo}
          autoPlay
          muted
          style={{ width: "300px", height: "200px", borderRadius: "8px" }}
        />
        <HStack spacing={4} mt={4}>
          <IconButton
            aria-label="Toggle Microphone"
            icon={audioEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
            onClick={toggleAudio}
            colorScheme={audioEnabled ? "gray" : "red"}
          />
          <IconButton
            aria-label="Toggle Camera"
            icon={videoEnabled ? <FaVideo /> : <FaVideoSlash />}
            onClick={toggleVideo}
            colorScheme={videoEnabled ? "gray" : "red"}
          />
        </HStack>
      </VStack>
      {userVideo && (
        <VStack p={2} bg={"gray.200"} rounded={"lg"}>
          <Text>Other User's Video</Text>

          <video
            ref={userVideo}
            autoPlay
            style={{ width: "300px", height: "200px", borderRadius: "8px" }}
          />
        </VStack>
      )}

      <VStack spacing={2} align="start">
        <Input
          placeholder="Enter your username"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          placeholder="ID to call"
          value={idToCall}
          onChange={(e) => setIdToCall(e.target.value)}
        />
        <Button
          colorScheme="teal"
          onClick={() => callUser(idToCall)}
          isDisabled={!idToCall}
        >
          Call User
        </Button>
        <Button colorScheme="blue" onClick={copyIdToClipboard} isDisabled={!me}>
          Copy ID
        </Button>
      </VStack>
      {receivingCall && !callAccepted && (
        <VStack spacing={2}>
          <Text fontSize="md">Incoming call from {name}</Text>
          <Button colorScheme="green" onClick={answerCall}>
            Answer Call
          </Button>
          <Button colorScheme="red" onClick={() => setReceivingCall(false)}>
            Decline Call
          </Button>
        </VStack>
      )}
      {callAccepted && (
        <Button colorScheme="red" onClick={leaveCall}>
          End Call
        </Button>
      )}
    </VStack>
  );
};

export default VideoCall;
