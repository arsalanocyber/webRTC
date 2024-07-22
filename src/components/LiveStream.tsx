import {
  Button,
  HStack,
  IconButton,
  VStack,
  Text,
  useToast,
  Box,
  Flex,
  Icon,
} from "@chakra-ui/react";
import React, { useEffect, useRef, useState } from "react";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
  FaHeart,
  FaShareAlt,
  FaClock,
} from "react-icons/fa";
import { io } from "socket.io-client";

const Livestream: React.FC = () => {
  const socket = io("http://localhost:5000");
  const [stream, setStream] = useState<MediaStream | undefined>();
  const [livestreaming, setLivestreaming] = useState<boolean>(false);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [videoEnabled, setVideoEnabled] = useState<boolean>(true);
  const [timer, setTimer] = useState<number>(0);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (livestreaming) {
      startTimer();
    } else {
      stopTimer();
    }

    return () => stopTimer();
  }, [livestreaming]);

  const startLivestream = () => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setLivestreaming(true);
      })
      .catch((error) => console.error("Error accessing user media:", error));
  };

  const stopLivestream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setLivestreaming(false);
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

  const startTimer = () => {
    const id = setInterval(() => setTimer((prev) => prev + 1), 1000);
    setIntervalId(id);
  };

  const stopTimer = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(
      2,
      "0"
    )}`;
  };

  const showToast = (title: string, description: string) => {
    toast({
      title,
      description,
      status: "info",
      duration: 2000,
      isClosable: true,
    });
  };

  return (
    <Box position="relative" width="100%" maxWidth="600px">
      <video ref={videoRef} autoPlay muted style={{ width: "100%" }} />
      {livestreaming && (
        <Flex
          position="absolute"
          top="10px"
          left="10px"
          align="center"
          color="white"
          zIndex={1}
        >
          <Icon as={FaClock} boxSize="24px" />
          <Text fontSize="lg" ml={2}>
            {formatTime(timer)}
          </Text>
        </Flex>
      )}
      {livestreaming && (
        <Flex
          direction="column"
          position="absolute"
          bottom="10px"
          right="10px"
          color="white"
          zIndex={1}
        >
          <IconButton
            aria-label="Toggle Audio"
            icon={audioEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
            onClick={toggleAudio}
            variant={"ghost"}
            mb={2}
          />
          <IconButton
            aria-label="Toggle Video"
            icon={videoEnabled ? <FaVideo /> : <FaVideoSlash />}
            onClick={toggleVideo}
            variant={"ghost"}
            mb={2}
          />
          <IconButton
            aria-label="Like"
            icon={<FaHeart />}
            onClick={() => showToast("Liked", "You liked this livestream")}
            variant={"ghost"}
          />
          <IconButton
            aria-label="Share"
            icon={<FaShareAlt />}
            onClick={() => showToast("Shared", "You shared this livestream")}
            variant={"ghost"}
          />
        </Flex>
      )}

      <Flex
        position="absolute"
        bottom="10px"
        left="10px"
        zIndex={1}
        justifyContent="center"
      >
        {!livestreaming ? (
          <Button onClick={startLivestream} colorScheme="blue">
            Start Livestream
          </Button>
        ) : (
          <Button onClick={stopLivestream} colorScheme="red">
            Stop Livestream
          </Button>
        )}
      </Flex>
    </Box>
  );
};

export default Livestream;
