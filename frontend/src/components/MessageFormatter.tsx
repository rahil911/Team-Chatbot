import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageFormatterProps {
  content: string;
}

const AGENT_COLORS: Record<string, string> = {
  '@Rahil': '#7E57C2',
  '@Mathew': '#2196F3',
  '@Shreyas': '#4CAF50',
  '@Siddarth': '#FF9800',
};

// Custom component to highlight @mentions
const TextWithMentions = ({ children }: { children: string }) => {
  if (typeof children !== 'string') return <>{children}</>;
  
  // Match @mentions
  const mentionRegex = /(@\w+)/g;
  const parts = children.split(mentionRegex);
  
  return (
    <>
      {parts.map((part, idx) => {
        if (part.match(mentionRegex)) {
          const color = AGENT_COLORS[part] || '#38BDF8';
          return (
            <span
              key={idx}
              style={{
                color: color,
                fontWeight: 600,
                backgroundColor: `${color}20`,
                padding: '2px 6px',
                borderRadius: '4px',
                border: `1px solid ${color}40`,
              }}
            >
              {part}
            </span>
          );
        }
        return <span key={idx}>{part}</span>;
      })}
    </>
  );
};

export const MessageFormatter = ({ content }: MessageFormatterProps) => {
  return (
    <div className="message-formatter">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-2 mt-3" {...props} />,
          h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-2 mt-3" {...props} />,
          h3: ({node, ...props}) => <h3 className="text-base font-semibold mb-1.5 mt-2" {...props} />,
          h4: ({node, ...props}) => <h4 className="text-sm font-semibold mb-1 mt-2" {...props} />,
          
          // Paragraphs - with mention highlighting
          p: ({node, children, ...props}) => (
            <p className="mb-2 leading-relaxed" {...props}>
              {typeof children === 'string' ? (
                <TextWithMentions>{children}</TextWithMentions>
              ) : (
                children
              )}
            </p>
          ),
          
          // Lists
          ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
          ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
          li: ({node, children, ...props}) => (
            <li className="ml-2" {...props}>
              {typeof children === 'string' ? (
                <TextWithMentions>{children}</TextWithMentions>
              ) : (
                children
              )}
            </li>
          ),
          
          // Emphasis
          strong: ({node, children, ...props}) => (
            <strong className="font-semibold text-white" {...props}>
              {typeof children === 'string' ? (
                <TextWithMentions>{children}</TextWithMentions>
              ) : (
                children
              )}
            </strong>
          ),
          em: ({node, ...props}) => <em className="italic text-blue-300" {...props} />,
          
          // Code
          code: ({node, inline, ...props}: any) => 
            inline ? (
              <code className="px-1.5 py-0.5 bg-dark-800 rounded text-xs font-mono text-blue-400" {...props} />
            ) : (
              <code className="block px-3 py-2 bg-dark-800 rounded-lg text-xs font-mono text-blue-300 overflow-x-auto my-2" {...props} />
            ),
          
          // Links
          a: ({node, ...props}) => (
            <a 
              className="text-blue-400 hover:text-blue-300 underline transition-colors" 
              target="_blank" 
              rel="noopener noreferrer" 
              {...props} 
            />
          ),
          
          // Blockquote
          blockquote: ({node, ...props}) => (
            <blockquote className="border-l-4 border-blue-500 pl-3 py-1 my-2 italic text-gray-300" {...props} />
          ),
          
          // Text - with mention highlighting
          text: ({node, children, ...props}: any) => {
            if (typeof children === 'string') {
              return <TextWithMentions>{children}</TextWithMentions>;
            }
            return <>{children}</>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
