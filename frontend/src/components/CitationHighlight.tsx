import React from 'react';
import { BookmarkIcon } from '@heroicons/react/24/solid';

interface CitationHighlightProps {
  text: string;
  onCitationClick?: (type: string, name: string) => void;
}

// Node type colors (matching EvidenceSidebar)
const NODE_TYPE_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  Skill: { text: 'text-blue-400', bg: 'bg-blue-400/15', border: 'border-blue-400/40' },
  Project: { text: 'text-purple-400', bg: 'bg-purple-400/15', border: 'border-purple-400/40' },
  Experience: { text: 'text-green-400', bg: 'bg-green-400/15', border: 'border-green-400/40' },
  Education: { text: 'text-amber-400', bg: 'bg-amber-400/15', border: 'border-amber-400/40' },
  Certification: { text: 'text-teal-400', bg: 'bg-teal-400/15', border: 'border-teal-400/40' },
  Tool: { text: 'text-indigo-400', bg: 'bg-indigo-400/15', border: 'border-indigo-400/40' },
  default: { text: 'text-gray-400', bg: 'bg-gray-400/15', border: 'border-gray-400/40' },
};

interface ParsedElement {
  type: 'text' | 'citation';
  content: string;
  citationType?: string;
  citationName?: string;
}

/**
 * Parse text and extract citations in format [Type: Name] or [Name]
 */
const parseTextWithCitations = (text: string): ParsedElement[] => {
  const elements: ParsedElement[] = [];

  // Pattern for [Type: Name] or [Name]
  const citationPattern = /\[([A-Z][a-z]+):\s*([^\]]+)\]|\[([A-Z][a-z\s]+)\]/g;

  let lastIndex = 0;
  let match;

  while ((match = citationPattern.exec(text)) !== null) {
    // Add text before citation
    if (match.index > lastIndex) {
      elements.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }

    // Add citation
    if (match[1] && match[2]) {
      // Format: [Type: Name]
      elements.push({
        type: 'citation',
        content: match[0],
        citationType: match[1],
        citationName: match[2].trim(),
      });
    } else if (match[3]) {
      // Format: [Name]
      elements.push({
        type: 'citation',
        content: match[0],
        citationType: 'default',
        citationName: match[3].trim(),
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    elements.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  return elements;
};

export const CitationHighlight: React.FC<CitationHighlightProps> = ({ text, onCitationClick }) => {
  const elements = parseTextWithCitations(text);

  return (
    <>
      {elements.map((element, index) => {
        if (element.type === 'text') {
          // Preserve whitespace and line breaks
          return (
            <React.Fragment key={index}>
              {element.content.split('\n').map((line, lineIndex, array) => (
                <React.Fragment key={lineIndex}>
                  {line}
                  {lineIndex < array.length - 1 && <br />}
                </React.Fragment>
              ))}
            </React.Fragment>
          );
        } else {
          // Citation
          const colors = NODE_TYPE_COLORS[element.citationType!] || NODE_TYPE_COLORS.default;
          return (
            <span
              key={index}
              className={`group relative inline-flex cursor-pointer items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-semibold transition hover:shadow-sm ${colors.bg} ${colors.border} ${colors.text}`}
              onClick={() => {
                if (onCitationClick && element.citationType && element.citationName) {
                  onCitationClick(element.citationType, element.citationName);
                }
              }}
              title={`${element.citationType}: ${element.citationName}`}
            >
              <BookmarkIcon className={`h-3 w-3 flex-shrink-0 ${colors.text}`} />
              <span className="inline-flex items-baseline gap-1">
                {element.citationType !== 'default' && (
                  <>
                    <span className="font-bold">{element.citationType}</span>
                    <span className="opacity-60">:</span>
                  </>
                )}
                <span>{element.citationName}</span>
              </span>
            </span>
          );
        }
      })}
    </>
  );
};

/**
 * Utility function to check if text contains citations
 */
export const hasCitations = (text: string): boolean => {
  const citationPattern = /\[([A-Z][a-z]+):\s*([^\]]+)\]|\[([A-Z][a-z\s]+)\]/;
  return citationPattern.test(text);
};

/**
 * Utility function to extract all citations from text
 */
export const extractCitations = (text: string): Array<{ type: string; name: string }> => {
  const citations: Array<{ type: string; name: string }> = [];
  const citationPattern = /\[([A-Z][a-z]+):\s*([^\]]+)\]|\[([A-Z][a-z\s]+)\]/g;

  let match;
  while ((match = citationPattern.exec(text)) !== null) {
    if (match[1] && match[2]) {
      citations.push({ type: match[1], name: match[2].trim() });
    } else if (match[3]) {
      citations.push({ type: 'default', name: match[3].trim() });
    }
  }

  return citations;
};
