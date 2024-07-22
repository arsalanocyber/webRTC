import { Box, Button, HStack, Input, Text, VStack } from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const Test: React.FC = () => {
  const socket = io("http://localhost:5000");
  const [message, setMessage] = useState<string>("");
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    socket.on("message", (msg) => {
      setMessages((prevMessages) => [...prevMessages, msg]);
    });

    return () => {
      socket.off("message");
    };
  }, []);

  const handleSendMessage = () => {
    if (message.trim()) {
      socket.emit("message", message);
      setMessage("");
    }
  };

  return (
    <VStack spacing={4} p={4} align="stretch" maxW="600px" mx="auto">
      <Box
        p={4}
        borderWidth="1px"
        borderRadius="md"
        overflow="hidden"
        bg="gray.100"
        height="400px"
        overflowY="auto"
      >
        {messages.map((msg, index) => (
          <Box key={index} p={2} borderBottomWidth="1px">
            <Text>{msg}</Text>
          </Box>
        ))}
      </Box>
      <HStack spacing={2}>
        <Input
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSendMessage();
          }}
        />
        <Button colorScheme="blue" onClick={handleSendMessage}>
          Send
        </Button>
      </HStack>
    </VStack>
  );
};

export default Test;
