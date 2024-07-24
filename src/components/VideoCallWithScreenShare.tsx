import {
  Button,
  Flex,
  HStack,
  IconButton,
  Input,
  Text,
  useToast,
  VStack,
} from "@chakra-ui/react";
import React, { useEffect, useRef, useState } from "react";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
} from "react-icons/fa";
import { ImCross } from "react-icons/im";

import { LuScreenShare, LuScreenShareOff } from "react-icons/lu";
import { io } from "socket.io-client";

const VideoCallWithScreenShare: React.FC = () => {
  const socket = io("http://localhost:5000");
  const [me, setMe] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | undefined>();
  const [receivingCall, setReceivingCall] = useState<boolean>(false);
  const [caller, setCaller] = useState<string | null>(null);
  const [callerSignal, setCallerSignal] =
    useState<RTCSessionDescriptionInit | null>(null);
  const [callAccepted, setCallAccepted] = useState<boolean>(false);
  const [isCallStarted, setIsCallStarted] = useState<boolean>(false);
  const [idToCall, setIdToCall] = useState<string>("");
  const [callEnded, setCallEnded] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
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
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setStream(stream);
        if (myVideo.current) {
          myVideo.current.srcObject = stream;
        }
      })
      .catch((error) => console.error("Error accessing user media:", error));

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
        socket.emit("answerCall", { signal: answer, to: caller });
      });
    setReceivingCall(false);
    setIsCallStarted(true);
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

  const startScreenSharing = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });

      // Update local video stream
      if (myVideo.current) {
        myVideo.current.srcObject = screenStream;
      }

      // Replace peer connection tracks
      const videoTrack = screenStream.getVideoTracks()[0];
      if (peerConnectionRef.current) {
        peerConnectionRef.current.getSenders().forEach((sender) => {
          if (sender.track?.kind === videoTrack.kind) {
            sender.replaceTrack(videoTrack);
          }
        });
        setIsScreenSharing(true);

        videoTrack.onended = () => {
          // Revert to webcam when screensharing ends
          if (stream) {
            const videoTrack = stream.getVideoTracks()[0];
            if (myVideo.current) {
              myVideo.current.srcObject = stream;
            }
            peerConnectionRef.current?.getSenders().forEach((sender) => {
              if (sender.track?.kind === videoTrack.kind) {
                sender.replaceTrack(videoTrack);
              }
            });
          }
          setIsScreenSharing(false);
        };
      }
    } catch (error) {
      console.error("Error capturing screen:", error);
      toast({
        title: "Error",
        description: "Unable to capture the screen.",
        status: "error",
        duration: 2000,
        isClosable: true,
      });
    }
  };

  const stopScreenSharing = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (myVideo.current) {
        myVideo.current.srcObject = stream;
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.getSenders().forEach((sender) => {
          if (sender.track?.kind === videoTrack.kind) {
            sender.replaceTrack(videoTrack);
          }
        });
      }
      setIsScreenSharing(false);
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
    <VStack
      spacing={6}
      p={6}
      align="center"
      bg="gray.900"
      borderRadius="md"
      boxShadow="md"
    >
      {!isCallStarted && (
        <HStack spacing={6} align="center">
          {!isCallStarted && !callAccepted && (
            <Button onClick={copyIdToClipboard} colorScheme="teal" size="lg">
              Copy ID
            </Button>
          )}
          {!callAccepted && !callEnded && (
            <HStack spacing={6}>
              <Input
                placeholder="Enter ID to call..."
                value={idToCall}
                onChange={(e) => setIdToCall(e.target.value)}
                size="lg"
                borderRadius="md"
                bg="gray.700"
                color="white"
              />
              <Button
                onClick={() => callUser(idToCall)}
                colorScheme="blue"
                size="lg"
              >
                Call
              </Button>
            </HStack>
          )}
        </HStack>
      )}

      {receivingCall && !callAccepted && (
        <HStack spacing={6} align="center">
          <Text fontSize="lg" color="white">
            {caller} is calling...
          </Text>
          <Button onClick={answerCall} colorScheme="blue" size="lg">
            Answer
          </Button>
          <Button
            onClick={() => setReceivingCall(false)}
            colorScheme="red"
            size="lg"
          >
            Decline
          </Button>
        </HStack>
      )}

      <Flex
        position="relative"
        width="100%"
        height="auto"
        borderRadius="md"
        overflow="hidden"
        bg="gray.800"
        boxShadow="md"
      >
        <video
          ref={userVideo}
          autoPlay
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />

        <Flex
          position="absolute"
          bottom="16px"
          right="16px"
          width="150px"
          height="auto"
          borderRadius="md"
          overflow="hidden"
          boxShadow="md"
          border="2px solid white"
          bg="gray.800"
        >
          <video
            ref={myVideo}
            autoPlay
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </Flex>
      </Flex>

      <HStack spacing={6} align="center">
        <IconButton
          aria-label="Toggle audio"
          icon={audioEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
          onClick={toggleAudio}
          size="lg"
          colorScheme={audioEnabled ? "green" : "red"}
        />
        <IconButton
          aria-label="Toggle video"
          icon={videoEnabled ? <FaVideo /> : <FaVideoSlash />}
          onClick={toggleVideo}
          size="lg"
          colorScheme={videoEnabled ? "green" : "red"}
        />
        <IconButton
          aria-label={
            isScreenSharing ? "Stop Screen Share" : "Start Screen Share"
          }
          onClick={isScreenSharing ? stopScreenSharing : startScreenSharing}
          icon={isScreenSharing ? <LuScreenShareOff /> : <LuScreenShare />}
          size="lg"
          colorScheme={isScreenSharing ? "red" : "blue"}
        />

        <IconButton
          aria-label="end call"
          icon={<ImCross />}
          onClick={leaveCall}
          size="lg"
          color={"white"}
          bg={"red.600"}
        />
      </HStack>
    </VStack>
  );
};

export default VideoCallWithScreenShare;
