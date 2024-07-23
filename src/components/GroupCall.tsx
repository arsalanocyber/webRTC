import {
  Button,
  Flex,
  HStack,
  Input,
  Text,
  useToast,
  VStack,
} from "@chakra-ui/react";
import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const GroupCall: React.FC = () => {
  const socket = io("http://localhost:5000");
  const [me, setMe] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | undefined>();
  const [receivingCall, setReceivingCall] = useState<boolean>(false);
  const [caller, setCaller] = useState<string | null>(null);
  const [callerSignal, setCallerSignal] =
    useState<RTCSessionDescriptionInit | null>(null);
  const [callAccepted, setCallAccepted] = useState<boolean>(false);
  const [idToCall, setIdToCall] = useState<string>("");
  const [callEnded, setCallEnded] = useState<boolean>(false);
  const [name, setName] = useState<string>("");

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

  return (
    <VStack spacing={4} p={4} align="center">
      <HStack spacing={4}>
        <Button onClick={copyIdToClipboard}>Copy ID</Button>
        {!callAccepted && !callEnded && (
          <HStack spacing={4}>
            <Input
              placeholder="Enter ID to call..."
              value={idToCall}
              onChange={(e) => setIdToCall(e.target.value)}
            />
            <Button onClick={() => callUser(idToCall)} colorScheme="blue">
              Call
            </Button>
          </HStack>
        )}
        {callAccepted && !callEnded && (
          <Button onClick={leaveCall} colorScheme="red">
            End Call
          </Button>
        )}
      </HStack>

      {receivingCall && !callAccepted && (
        <HStack spacing={4}>
          <Text>{caller} is calling...</Text>
          <Button onClick={answerCall} colorScheme="blue">
            Answer
          </Button>
          <Button onClick={() => setReceivingCall(false)} colorScheme="red">
            Decline
          </Button>
        </HStack>
      )}

      <HStack spacing={4} w="100%" justify="center">
        <VStack spacing={4} w="50%">
          <VStack>
            <Flex>
              <video
                ref={myVideo}
                autoPlay
                muted
                style={{ width: "100%", borderRadius: "8px" }}
              />
            </Flex>
          </VStack>
          <video
            ref={userVideo}
            autoPlay
            style={{ width: "100%", borderRadius: "8px" }}
          />
        </VStack>
      </HStack>
    </VStack>
  );
};

export default GroupCall;
