import {
  Button,
  HStack,
  Input,
  Text,
  VStack,
  Box,
  Flex,
} from "@chakra-ui/react";
import React, { useState } from "react";

interface ChatProps {
  messages: { user: string; message: string }[];
  sendMessage: (message: string) => void;
  userName: string;
}

const Chat: React.FC<ChatProps> = ({ messages, sendMessage, userName }) => {
  const [newMessage, setNewMessage] = useState<string>("");

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      sendMessage(newMessage);
      setNewMessage("");
    }
  };

  return (
    <VStack
      spacing={4}
      p={4}
      align="stretch"
      bg="gray.800"
      borderRadius="md"
      boxShadow="md"
      w="100%"
      maxW="lg"
      h="full"
    >
      <Text fontSize="2xl" fontWeight="bold" color="white">
        Live Chat
      </Text>

      <Box
        p={4}
        bg="gray.900"
        borderRadius="md"
        overflowY="auto"
        h="300px"
        w="100%"
      >
        <VStack spacing={2} align="stretch">
          {messages.map((msg, index) => (
            <Flex
              key={index}
              p={2}
              bg={msg.user === userName ? "blue.700" : "gray.700"}
              borderRadius="md"
              color="white"
              alignSelf={msg.user === userName ? "flex-end" : "flex-start"}
              justifyContent={msg.user === userName ? "flex-end" : "flex-start"}
            >
              <Text fontWeight="bold">{msg.user}:</Text>
              <Text ml={2}>{msg.message}</Text>
            </Flex>
          ))}
        </VStack>
      </Box>

      <HStack spacing={2}>
        <Input
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          bg="gray.700"
          color="white"
          border="none"
          borderRadius="md"
          _placeholder={{ color: "gray.400" }}
        />
        <Button onClick={handleSendMessage} colorScheme="blue">
          Send
        </Button>
      </HStack>
    </VStack>
  );
};

export default Chat;
