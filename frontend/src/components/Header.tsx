import {
  Box,
  Flex,
  Heading,
  Badge,
  IconButton,
  HStack,
} from '@chakra-ui/react';
import { HamburgerIcon } from '@chakra-ui/icons';

interface HeaderProps {
  connected: boolean;
  onTogglePanel: () => void;
  isPanelOpen: boolean;
}

export const Header = ({ connected, onTogglePanel }: HeaderProps) => {
  return (
    <Box
      borderBottom="1px"
      borderColor="whiteAlpha.100"
      bg="rgba(15, 23, 42, 0.8)"
      backdropFilter="blur(12px)"
      px={6}
      py={3}
      position="relative"
      zIndex={100}
    >
      <Box
        position="absolute"
        inset={0}
        opacity={0.3}
        bgGradient="radial(circle at 0% 50%, brand.blue.500 0%, transparent 50%)"
        pointerEvents="none"
      />
      
      <Flex align="center" justify="space-between" position="relative" zIndex={1}>
        <HStack spacing={3}>
          <IconButton
            aria-label="Toggle agent panel"
            icon={<HamburgerIcon />}
            size="sm"
            variant="ghost"
            onClick={onTogglePanel}
            color="gray.400"
            _hover={{ color: 'gray.200', bg: 'whiteAlpha.100' }}
          />
          
          <Flex
            align="center"
            justify="center"
            w={8}
            h={8}
            rounded="lg"
            bgGradient="linear(to-br, brand.blue, brand.purple)"
            fontWeight="bold"
            fontSize="sm"
            color="white"
          >
            AI
          </Flex>
          
          <Heading size="md" fontWeight="semibold" color="gray.50">
            AI Team Intelligence Platform
          </Heading>
        </HStack>
        
        <Badge
          colorScheme={connected ? 'green' : 'orange'}
          variant="subtle"
          fontSize="xs"
          px={3}
          py={1}
          rounded="full"
          display="flex"
          alignItems="center"
          gap={1.5}
        >
          <Box
            w={1.5}
            h={1.5}
            rounded="full"
            bg={connected ? 'green.400' : 'orange.400'}
            animation={connected ? 'pulse 2s infinite' : undefined}
          />
          {connected ? 'Connected' : 'Disconnected'}
        </Badge>
      </Flex>
    </Box>
  );
};

