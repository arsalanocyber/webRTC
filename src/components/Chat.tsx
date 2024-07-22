import { Button, HStack, Input, Text, VStack } from "@chakra-ui/react";
import React, { useState } from "react";

interface ChatProps {
  messages: { user: string; message: string }[];
  sendMessage: (message: string) => void;
  userName: string;
  setUserName: (name: string) => void;
}

const Chat: React.FC<ChatProps> = ({
  messages,
  sendMessage,
  userName,
  setUserName,
}) => {
  const [newMessage, setNewMessage] = useState<string>("");
  const [newName, setNewName] = useState<string>(userName);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      sendMessage(newMessage);
      setNewMessage("");
    }
  };

  const handleNameChange = () => {
    if (newName.trim()) {
      setUserName(newName);
    }
  };

  return (
    <VStack spacing={4} p={2} align="start">
      <Text fontSize="xl" fontWeight="bold">
        Live Chat
      </Text>

      <Input
        placeholder="Enter your name..."
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        mb={2}
      />
      <Button onClick={handleNameChange} colorScheme="blue" mb={4}>
        Set Name
      </Button>

      <VStack spacing={2} align="start" w="100%">
        {messages.map((msg, index) => (
          <Text
            key={index}
            p={2}
            bg={msg.user === userName ? "blue.100" : "gray.100"}
            borderRadius="md"
            color={msg.user === userName ? "blue.800" : "gray.800"}
          >
            <strong>{msg.user}:</strong> {msg.message}
          </Text>
        ))}
      </VStack>

      <HStack spacing={2} w="100%">
        <Input
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <Button onClick={handleSendMessage} colorScheme="blue">
          Send
        </Button>
      </HStack>
    </VStack>
  );
};

export default Chat;
