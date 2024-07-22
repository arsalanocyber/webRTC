import React from "react";
import { Box, Text, Flex, IconButton } from "@chakra-ui/react";
import { FaDownload } from "react-icons/fa";
import { Socket } from "socket.io-client";

type FileTypes = {
  filename: string;
  file: ArrayBuffer;
};

type FileReceiverProps = {
  allFiles: FileTypes[];
  socket: Socket;
};

const FileReceiver: React.FC<FileReceiverProps> = ({ socket, allFiles }) => {
  const downloadFile = (file: ArrayBuffer, filename: string) => {
    const blob = new Blob([file]); // Convert ArrayBuffer to Blob
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url); // Clean up
  };

  return (
    <Box p={4} borderWidth={1} borderRadius="md" boxShadow="md" bg="white">
      <Text mb={4} fontSize="lg" fontWeight="bold">
        Received Files:
      </Text>
      {allFiles.map((fileData, index) => (
        <Flex
          key={index}
          mb={3}
          p={3}
          borderWidth={1}
          borderRadius="md"
          alignItems="center"
          bg="gray.100"
          justifyContent="space-between"
        >
          <Text fontSize="md" fontWeight="semibold" w={"89%"}>
            {fileData.filename}
          </Text>
          <IconButton
            aria-label="Download file"
            icon={<FaDownload />}
            colorScheme="blue"
            variant="ghost"
            onClick={() => downloadFile(fileData.file, fileData.filename)}
            _hover={{
              bg: "blue.500",
              color: "white",
              transform: "scale(1.1)",
              transition: "all 0.2s ease-in-out",
            }}
          />
        </Flex>
      ))}
    </Box>
  );
};

export default FileReceiver;
