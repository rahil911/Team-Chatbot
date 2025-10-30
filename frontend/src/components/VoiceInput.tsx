import { useVoiceRecording } from '../hooks/useVoiceRecording';

interface VoiceInputProps {
  onVoiceInput: (audioBlob: Blob) => void;
}

export const VoiceInput = ({ onVoiceInput }: VoiceInputProps) => {
  const { isRecording, startRecording, stopRecording, audioBlob, resetAudioBlob, error } = useVoiceRecording();
  
  const handleToggleRecording = async () => {
    if (isRecording) {
      const blob = await stopRecording();
      if (blob) {
        onVoiceInput(blob);
        resetAudioBlob();
      }
    } else {
      await startRecording();
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center py-8">
      {/* Recording Indicator */}
      {isRecording && (
        <div className="mb-6 flex items-center gap-3">
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-red-500 rounded-full animate-pulse"
                style={{
                  height: `${20 + Math.random() * 30}px`,
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '0.6s'
                }}
              />
            ))}
          </div>
          <span className="text-red-400 text-sm font-medium">Recording...</span>
        </div>
      )}
      
      {/* Microphone Button */}
      <button
        onClick={handleToggleRecording}
        className={`
          relative w-24 h-24 rounded-full flex items-center justify-center transition-all
          ${isRecording 
            ? 'bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-glow-orange animate-pulse-slow' 
            : 'bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 shadow-lg hover:shadow-glow-purple'
          }
        `}
      >
        {/* Ripple effect when recording */}
        {isRecording && (
          <>
            <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-20" />
            <div className="absolute inset-0 rounded-full bg-red-500 animate-pulse opacity-30" />
          </>
        )}
        
        <svg 
          className={`w-12 h-12 text-white z-10 transition-transform ${isRecording ? 'scale-90' : 'scale-100'}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          {isRecording ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          )}
        </svg>
      </button>
      
      {/* Instructions */}
      <p className="mt-4 text-sm text-gray-400 text-center">
        {isRecording ? 'Click to stop recording' : 'Click to start recording'}
      </p>
      
      {/* Error Message */}
      {error && (
        <div className="mt-4 px-4 py-2 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}
      
      {/* Audio Preview (optional) */}
      {audioBlob && !isRecording && (
        <div className="mt-4 px-4 py-2 bg-green-900/30 border border-green-700 rounded-lg text-green-400 text-sm">
          ✓ Recording complete!
        </div>
      )}
    </div>
  );
};
