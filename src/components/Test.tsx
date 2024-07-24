import React, { useEffect, useRef, useState } from "react";
import {
  Button,
  Flex,
  HStack,
  IconButton,
  Input,
  Text,
  useToast,
  VStack,
  Box,
} from "@chakra-ui/react";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
} from "react-icons/fa";
import { ImCross } from "react-icons/im";
import { LuScreenShare, LuScreenShareOff } from "react-icons/lu";
import { io } from "socket.io-client";
import Chat from "./Chat";

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
  const [fileToSend, setFileToSend] = useState<File | null>(null);
  const [recipientId, setRecipientId] = useState<string>("");
  const [receivedFiles, setReceivedFiles] = useState<ArrayBuffer[]>([]);
  const myVideo = useRef<HTMLVideoElement | null>(null);
  const userVideo = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const toast = useToast();
  const [messages, setMessages] = useState<{ user: string; message: string }[]>(
    []
  );
  const [newName, setNewName] = useState<string>("");

  const dataChannelRef = useRef<RTCDataChannel | null>(null);
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
      console.log(id);
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
        setName(data.name); // Ensure name is being set
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

    socket.on("fileReceived", (data: { file: ArrayBuffer; from: string }) => {
      console.log("File received from", data.from);
      setReceivedFiles((prev) => [...prev, data.file]);
    });

    return () => {
      socket.off("me");
      socket.off("callUser");
      socket.off("callAccepted");
      socket.off("fileReceived");
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

    const dataChannel = peerConnection.createDataChannel("chat");
    dataChannelRef.current = dataChannel;

    dataChannel.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        setReceivedFiles((prev) => [...prev, event.data]);
      } else {
        setMessages((prevMessages) => [
          ...prevMessages,
          { user: newName || "User 1", message: event.data },
        ]);
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

    peerConnection.ondatachannel = (event) => {
      const dataChannel = event.channel;
      dataChannelRef.current = dataChannel;

      dataChannel.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          setReceivedFiles((prev) => [...prev, event.data]);
        } else {
          setMessages((prevMessages) => [
            ...prevMessages,
            { user: newName || "User 2", message: event.data },
          ]);
        }
      };
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

      if (myVideo.current) {
        myVideo.current.srcObject = screenStream;
      }

      const videoTrack = screenStream.getVideoTracks()[0];
      if (peerConnectionRef.current) {
        peerConnectionRef.current.getSenders().forEach((sender) => {
          if (sender.track?.kind === videoTrack.kind) {
            sender.replaceTrack(videoTrack);
          }
        });
        setIsScreenSharing(true);

        videoTrack.onended = () => {
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

  const handleSendMessage = (message: string) => {
    if (dataChannelRef.current) {
      dataChannelRef.current.send(message);
      setMessages((prevMessages) => [...prevMessages, { user: "Me", message }]);
    }
  };

  const handleNameChange = () => {
    if (newName.trim()) {
      console.log("Setting new name:", newName); // Debugging line
      setNewName(newName);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFileToSend(event.target.files[0]);
    }
  };

  const sendFile = () => {
    if (dataChannelRef.current && fileToSend) {
      const fileReader = new FileReader();

      fileReader.onload = (event) => {
        if (event.target?.result instanceof ArrayBuffer) {
          // Send the entire file at once
          if (dataChannelRef.current)
            dataChannelRef.current.send(event.target.result);
        }
      };

      fileReader.readAsArrayBuffer(fileToSend);
    }
  };

  const downloadFile = (file: ArrayBuffer, index: number) => {
    const blob = new Blob([file]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `file_${index}`;
    a.click();
    URL.revokeObjectURL(url);
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
      <HStack spacing={2} mb={4}>
        <Input
          placeholder="Enter your name..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          bg="gray.700"
          color="white"
          border="none"
          borderRadius="md"
          _placeholder={{ color: "gray.400" }}
        />
        <Button
          onClick={handleNameChange}
          colorScheme="blue"
          size="md"
          disabled={!newName.trim()}
        >
          Set Name
        </Button>
      </HStack>
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

      <HStack spacing={6} align="center">
        <Input
          placeholder="Enter recipient ID..."
          value={recipientId}
          onChange={(e) => setRecipientId(e.target.value)}
          size="lg"
          borderRadius="md"
          bg="gray.700"
          color="white"
        />
        <Input
          type="file"
          onChange={handleFileChange}
          border="none"
          color="white"
        />
        <Button
          onClick={sendFile}
          colorScheme="blue"
          size="lg"
          disabled={!fileToSend || !recipientId}
        >
          Send File
        </Button>
      </HStack>

      <Box width="100%" mt={6}>
        {receivedFiles.map((file, index) => (
          <HStack key={index} spacing={4} mb={4}>
            <Text color="white">Received file {index + 1}</Text>
            <Button
              onClick={() => downloadFile(file, index)}
              colorScheme="teal"
              size="md"
            >
              Download
            </Button>
          </HStack>
        ))}
      </Box>

      <Chat
        messages={messages}
        sendMessage={handleSendMessage}
        userName={newName}
      />
    </VStack>
  );
};

export default VideoCallWithScreenShare;
