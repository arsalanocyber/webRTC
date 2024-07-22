import {
  Button,
  Flex,
  HStack,
  IconButton,
  Input,
  Text,
  VStack,
  useToast,
} from "@chakra-ui/react";
import React, { useEffect, useRef, useState } from "react";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
} from "react-icons/fa";
import { io, Socket } from "socket.io-client";
import Chat from "./Chat";
import FileSender from "./FileSender";
import FileReceiver from "./FileReceiver";
import { LuScreenShare, LuScreenShareOff } from "react-icons/lu";

const VideoCall: React.FC = () => {
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
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [screenShareEnabled, setScreenShareEnabled] = useState(false);
  const [messages, setMessages] = useState<{ user: string; message: string }[]>(
    []
  );
  const [receivedFiles, setReceivedFiles] = useState<
    { filename: string; file: ArrayBuffer }[]
  >([]);
  const myVideo = useRef<HTMLVideoElement | null>(null);
  const userVideo = useRef<HTMLVideoElement | null>(null);
  const screenShare = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
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

    // Handle file receiving
    socket.on("receiveFile", (data) => {
      console.log("Received file data:", data);
      const { file, filename } = data;
      setReceivedFiles((prevFiles) => [...prevFiles, { filename, file }]);
    });

    return () => {
      socket.off("me");
      socket.off("callUser");
      socket.off("callAccepted");
      socket.off("receiveFile");
    };
  }, []);

  const enableScreenShare = async () => {
    if (!screenShareEnabled) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        if (screenShare.current) {
          screenShare.current.srcObject = stream;
          stream.getTracks().forEach((track) => {
            track.onended = () => {
              if (screenShare.current) screenShare.current.srcObject = null;
              setScreenShareEnabled(false);
            };
          });
        }
        setScreenShareEnabled(true);
      } catch (error) {
        console.error("Error accessing display media:", error);
      }
    } else {
      if (screenShare.current) {
        const stream = screenShare.current.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
          screenShare.current.srcObject = null;
        }
      }
      setScreenShareEnabled(false);
    }
  };

  useEffect(() => {
    return () => {
      if (screenShare.current) {
        const stream = screenShare.current.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
      }
    };
  }, []);

  const callUser = (id: string) => {
    if (!stream) return;

    const peerConnection = new RTCPeerConnection(configuration);
    peerConnectionRef.current = peerConnection;

    stream
      .getTracks()
      .forEach((track) => peerConnection.addTrack(track, stream));

    const dataChannel = peerConnection.createDataChannel("chat");
    dataChannelRef.current = dataChannel;

    dataChannel.onmessage = (event) => {
      setMessages((prevMessages) => [
        ...prevMessages,
        { user: name, message: event.data },
      ]);
    };

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

    peerConnection.ondatachannel = (event) => {
      const dataChannel = event.channel;
      dataChannelRef.current = dataChannel;

      dataChannel.onmessage = (event) => {
        setMessages((prevMessages) => [
          ...prevMessages,
          { user: name, message: event.data },
        ]);
      };
    };

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

  const handleSendMessage = (message: string) => {
    if (dataChannelRef.current) {
      dataChannelRef.current.send(message);
      setMessages((prevMessages) => [...prevMessages, { user: "Me", message }]);
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

              <video
                ref={screenShare}
                autoPlay
                style={{ width: "100%", borderRadius: "8px" }}
              />
            </Flex>

            <HStack spacing={4}>
              <IconButton
                aria-label="toggle audio"
                icon={audioEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
                onClick={toggleAudio}
              />
              <IconButton
                aria-label="toggle video"
                icon={videoEnabled ? <FaVideo /> : <FaVideoSlash />}
                onClick={toggleVideo}
              />
              <IconButton
                aria-label="Screen Share"
                onClick={enableScreenShare}
                icon={
                  screenShareEnabled ? <LuScreenShareOff /> : <LuScreenShare />
                }
              />
            </HStack>
          </VStack>
          <video
            ref={userVideo}
            autoPlay
            style={{ width: "100%", borderRadius: "8px" }}
          />
        </VStack>
      </HStack>

      <Chat
        messages={messages}
        sendMessage={handleSendMessage}
        userName={name}
        setUserName={setName}
      />

      <FileSender socket={socket} />
      <FileReceiver socket={socket} allFiles={receivedFiles} />
    </VStack>
  );
};

export default VideoCall;
