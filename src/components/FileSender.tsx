import React, { useState, ChangeEvent } from "react";
import { Button, Input, Box, Text } from "@chakra-ui/react";
import { io, Socket } from "socket.io-client";

interface FileSenderProps {
  socket: Socket;
}

const FileSender: React.FC<FileSenderProps> = ({ socket }) => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");
  const [recipientSocketId, setRecipientSocketId] = useState("");
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    }
  };

  const handleSendFile = () => {
    if (!file) {
      setStatus("No file selected");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        const base64File = reader.result;
        socket.emit("sendFile", {
          file: base64File,
          filename: file.name,
          recipientSocketId,
        });
        setStatus("File sent");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <Box p={4} borderWidth={1} borderRadius="md" boxShadow="md">
      <Input
        type="text"
        value={recipientSocketId}
        onChange={(r) => setRecipientSocketId(r.target.value)}
      ></Input>
      <Text mb={2}>Send a file:</Text>
      <Input type="file" onChange={handleFileChange} mb={3} />
      <Button colorScheme="blue" onClick={handleSendFile}>
        Send File
      </Button>
      <Text mt={2}>{status}</Text>
    </Box>
  );
};

export default FileSender;
