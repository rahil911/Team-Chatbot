import { useState, useEffect } from 'react';
import { HStack, Text, Icon, Tooltip } from '@chakra-ui/react';
import { InfoIcon } from '@chakra-ui/icons';

export const RestartTimer = () => {
  const [timeUntilRestart, setTimeUntilRestart] = useState('');

  useEffect(() => {
    const calculateTimeUntilRestart = () => {
      const now = new Date();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();
      
      const minutesUntilRestart = 9 - (minutes % 10);
      const secondsUntilRestart = 59 - seconds;
      
      const secStr = String(secondsUntilRestart).padStart(2, '0');
      return minutesUntilRestart + ':' + secStr;
    };

    const interval = setInterval(() => {
      setTimeUntilRestart(calculateTimeUntilRestart());
    }, 1000);

    setTimeUntilRestart(calculateTimeUntilRestart());

    return () => clearInterval(interval);
  }, []);

  return (
    <HStack
      spacing={2}
      px={3}
      py={1.5}
      bg="orange.900"
      bgGradient="linear(to-r, orange.900, orange.800)"
      rounded="md"
      borderWidth="1px"
      borderColor="orange.600"
    >
      <Tooltip
        label="Server restarts every 10 minutes (hosted in student dev environment)"
        placement="bottom"
        hasArrow
      >
        <InfoIcon color="orange.300" boxSize={3} />
      </Tooltip>
      <Text fontSize="xs" fontWeight="semibold" color="orange.200">
        Restarting in: {timeUntilRestart}
      </Text>
    </HStack>
  );
};
