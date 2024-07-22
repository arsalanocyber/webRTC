// src/components/MediaStreamWithConstraints.tsx
import React, { useRef, useState } from "react";
import { Box, Text, IconButton, HStack, Button } from "@chakra-ui/react";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
} from "react-icons/fa";

interface MediaStreamWithConstraintsProps {
  cameraId: string | undefined;
  minWidth: number;
  minHeight: number;
}

const MediaStreamWithConstraints: React.FC<MediaStreamWithConstraintsProps> = ({
  cameraId,
  minWidth,
  minHeight,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [callActive, setCallActive] = useState(false);

  const getMediaStream = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: cameraId ? { exact: cameraId } : undefined,
          width: { min: minWidth },
          height: { min: minHeight },
        },
        audio: true,
      };
      console.log({ constraints });
      const mediaStream = await navigator.mediaDevices.getUserMedia(
        constraints
      );
      console.log({ mediaStream });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError("Error accessing media devices.");
      console.error(err);
    }
  };

  const stopMediaStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
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

  const getMediaTracksForTesting = () => {
    if (stream) {
      const allTracks = stream.getTracks();
      console.log({ allTracks });
    }
  };

  const handleCallToggle = () => {
    if (callActive) {
      stopMediaStream();
    } else {
      getMediaStream();
    }
    setCallActive(!callActive);
  };

  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      boxShadow="md"
      p={4}
      bg="gray.100"
      display="flex"
      flexDirection="column"
      alignItems="center"
      position="relative"
    >
      {error && (
        <Text color="red.500" position="absolute" top="10px" left="10px">
          {error}
        </Text>
      )}
      <Button
        onClick={handleCallToggle}
        colorScheme={callActive ? "red" : "green"}
        mt={4}
      >
        {callActive ? "Stop Call" : "Start Call"}
      </Button>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        controls={false}
        style={{
          width: "100%",
          height: "auto",
          borderRadius: "10px",
          marginTop: "10px",
        }}
      />
      <HStack spacing={4} mt={4}>
        <IconButton
          aria-label="Toggle Microphone"
          icon={audioEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
          onClick={toggleAudio}
          colorScheme={audioEnabled ? "green" : "red"}
          isDisabled={!callActive}
        />
        <IconButton
          aria-label="Toggle Camera"
          icon={videoEnabled ? <FaVideo /> : <FaVideoSlash />}
          onClick={toggleVideo}
          colorScheme={videoEnabled ? "green" : "red"}
          isDisabled={!callActive}
        />
        <Button
          onClick={getMediaTracksForTesting}
          variant={"solid"}
          colorScheme="green"
        >
          Get Media Tracks
        </Button>
      </HStack>
    </Box>
  );
};

export default MediaStreamWithConstraints;
