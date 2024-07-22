// src/App.tsx
import { Box, Container, Heading, Select, VStack } from "@chakra-ui/react";
import React, { useState } from "react";
import DeviceList from "./components/DeviceList";
import MediaStreamWithConstraints from "./components/MediaStreamWithContraints";
import VideoCall from "./components/VideoCall";

const App: React.FC = () => {
  const [selectedCamera, setSelectedCamera] = useState<string | undefined>(
    undefined
  );
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  const [minWidth, setMinWidth] = useState<number>(1280);
  const [minHeight, setMinHeight] = useState<number>(720);

  const handleResolutionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [width, height] = e.target.value.split("x").map(Number);
    setMinWidth(width);
    setMinHeight(height);
  };

  console.log(selectedCamera);
  return (
    <Container maxW="container.md" p={4}>
      <VStack spacing={4} align="stretch">
        <Heading as="h1" size="lg">
          Media Devices
        </Heading>

        <Box>
          <Heading as="h2" size="md">
            Select Camera
          </Heading>
          <DeviceList
            type="videoinput"
            onSelect={(deviceId) => setSelectedCamera(deviceId)}
            setDeviceId={setDeviceId}
          />
        </Box>

        <Box>
          <Heading as="h2" size="md">
            Select Resolution
          </Heading>
          <Select onChange={handleResolutionChange} defaultValue="1280x720">
            <option value="640x480">640x480</option>
            <option value="1280x720">1280x720</option>
            <option value="1920x1080">1920x1080</option>
          </Select>
        </Box>

        {/* <Box>
          <Heading as="h2" size="md">
            Camera Stream
          </Heading>
          <MediaStreamWithConstraints
            cameraId={deviceId}
            minWidth={minWidth}
            minHeight={minHeight}
          />
        </Box> */}
      </VStack>
      <Container maxW="container.md" p={4}>
        <VStack spacing={4} align="stretch">
          <Heading as="h1" size="lg">
            WebRTC Video Call
          </Heading>
          <VideoCall />
        </VStack>
      </Container>
    </Container>
  );
};

export default App;
