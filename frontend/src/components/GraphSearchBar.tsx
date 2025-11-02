import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  VStack,
  HStack,
  Text,
  List,
  ListItem,
  Badge,
  Spinner,
  IconButton,
  Kbd,
  Button,
} from '@chakra-ui/react';
import { SearchIcon, CloseIcon } from '@chakra-ui/icons';
import { config } from '../config';

export interface SearchResult {
  id: string;
  label: string;
  type: string;
  person: string;
  score: number;
}

interface GraphSearchBarProps {
  onResultSelect: (result: SearchResult) => void;
  onFocusResults: (results: SearchResult[]) => void;
  placeholder?: string;
}

export const GraphSearchBar: React.FC<GraphSearchBarProps> = ({
  onResultSelect,
  onFocusResults,
  placeholder = 'Search nodes...',
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${config.apiEndpoint}/graph/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          max_results: 20,
        }),
      });

      const data = await response.json();
      setResults(data.results || []);
      setShowResults(true);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle input change with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(query);
      }, 300); // 300ms debounce
    } else {
      setResults([]);
      setShowResults(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, performSearch]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleResultClick(results[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowResults(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleResultClick = (result: SearchResult) => {
    onResultSelect(result);
    setQuery('');
    setShowResults(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleFocusAllResults = () => {
    onFocusResults(results);
    setShowResults(false);
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      person: 'purple',
      skill: 'green',
      technology: 'blue',
      project: 'orange',
      company: 'red',
      role: 'pink',
      education: 'cyan',
      certification: 'teal',
      achievement: 'yellow',
    };
    return colors[type] || 'gray';
  };

  const getPersonColor = (person: string) => {
    const colors: Record<string, string> = {
      rahil: '#7E57C2',
      mathew: '#2196F3',
      shreyas: '#4CAF50',
      siddarth: '#FF9800',
    };
    return colors[person] || '#94A3B8';
  };

  return (
    <Box position="relative" w="full" maxW="500px">
      <InputGroup size="md">
        <InputLeftElement>
          {isLoading ? (
            <Spinner size="sm" color="gray.400" />
          ) : (
            <SearchIcon color="gray.400" />
          )}
        </InputLeftElement>
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          placeholder={placeholder}
          bg="gray.800"
          border="1px solid"
          borderColor="gray.600"
          _hover={{ borderColor: 'gray.500' }}
          _focus={{
            borderColor: 'purple.500',
            boxShadow: '0 0 0 1px var(--chakra-colors-purple-500)',
          }}
          color="white"
        />
        {query && (
          <InputRightElement>
            <IconButton
              aria-label="Clear search"
              icon={<CloseIcon />}
              size="xs"
              variant="ghost"
              onClick={handleClear}
            />
          </InputRightElement>
        )}
      </InputGroup>

      {/* Search Results Dropdown */}
      {showResults && results.length > 0 && (
        <Box
          position="absolute"
          top="calc(100% + 4px)"
          left={0}
          right={0}
          bg="gray.900"
          border="1px solid"
          borderColor="gray.700"
          borderRadius="md"
          boxShadow="xl"
          zIndex={1000}
          maxH="400px"
          overflowY="auto"
        >
          <VStack align="stretch" spacing={0}>
            {/* Header with Focus All button */}
            <HStack
              justifyContent="space-between"
              p={2}
              borderBottom="1px solid"
              borderColor="gray.700"
              bg="gray.800"
            >
              <HStack>
                <Text fontSize="xs" color="gray.400">
                  {results.length} result{results.length !== 1 ? 's' : ''}
                </Text>
                <Kbd fontSize="xs">↑↓</Kbd>
                <Kbd fontSize="xs">Enter</Kbd>
              </HStack>
              <Button
                size="xs"
                colorScheme="purple"
                variant="ghost"
                onClick={handleFocusAllResults}
              >
                Focus All
              </Button>
            </HStack>

            {/* Results List */}
            <List spacing={0}>
              {results.map((result, index) => (
                <ListItem
                  key={result.id}
                  p={3}
                  cursor="pointer"
                  bg={selectedIndex === index ? 'purple.900' : 'transparent'}
                  _hover={{ bg: 'gray.800' }}
                  borderBottom={index < results.length - 1 ? '1px solid' : 'none'}
                  borderColor="gray.800"
                  onClick={() => handleResultClick(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <VStack align="stretch" spacing={1}>
                    <HStack justifyContent="space-between">
                      <Text
                        fontSize="sm"
                        fontWeight="medium"
                        color="white"
                        noOfLines={1}
                      >
                        {result.label}
                      </Text>
                      <Badge
                        colorScheme={getTypeColor(result.type)}
                        fontSize="xs"
                      >
                        {result.type}
                      </Badge>
                    </HStack>
                    <HStack spacing={2}>
                      <HStack spacing={1}>
                        <Box
                          w="8px"
                          h="8px"
                          borderRadius="full"
                          bg={getPersonColor(result.person)}
                        />
                        <Text fontSize="xs" color="gray.400">
                          {result.person}
                        </Text>
                      </HStack>
                      <Text fontSize="xs" color="gray.500">
                        •
                      </Text>
                      <Text fontSize="xs" color="gray.500" fontFamily="mono">
                        {result.id}
                      </Text>
                    </HStack>
                  </VStack>
                </ListItem>
              ))}
            </List>
          </VStack>
        </Box>
      )}

      {/* No Results */}
      {showResults && query.length >= 2 && results.length === 0 && !isLoading && (
        <Box
          position="absolute"
          top="calc(100% + 4px)"
          left={0}
          right={0}
          bg="gray.900"
          border="1px solid"
          borderColor="gray.700"
          borderRadius="md"
          boxShadow="xl"
          p={4}
          zIndex={1000}
        >
          <Text fontSize="sm" color="gray.400" textAlign="center">
            No results found for "{query}"
          </Text>
        </Box>
      )}

      {/* Too Short Query Hint */}
      {showResults && query.length === 1 && (
        <Box
          position="absolute"
          top="calc(100% + 4px)"
          left={0}
          right={0}
          bg="gray.900"
          border="1px solid"
          borderColor="gray.700"
          borderRadius="md"
          boxShadow="xl"
          p={4}
          zIndex={1000}
        >
          <Text fontSize="sm" color="gray.400" textAlign="center">
            Type at least 2 characters to search
          </Text>
        </Box>
      )}
    </Box>
  );
};
