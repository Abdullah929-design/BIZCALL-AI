import { useState, useCallback, useRef, useEffect } from 'react';

export const useStreamingResponse = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [error, setError] = useState(null);
  const eventSourceRef = useRef(null);
  const accumulatedTextRef = useRef('');

  const startStreaming = useCallback((streamUrl, onChunk, onComplete, onError) => {
    setIsStreaming(true);
    setError(null);
    setStreamedText('');
    accumulatedTextRef.current = '';

    // Create EventSource for Server-Sent Events
    const eventSource = new EventSource(streamUrl);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.error) {
          setError(data.message || 'Streaming error occurred');
          onError?.(data);
          return;
        }

        if (data.finished) {
          setIsStreaming(false);
          onComplete?.(accumulatedTextRef.current);
          eventSource.close();
          return;
        }

        if (data.chunk) {
          accumulatedTextRef.current += data.chunk;
          setStreamedText(accumulatedTextRef.current);
          onChunk?.(data.chunk, data);
        }
      } catch (err) {
        console.error('Error parsing stream data:', err);
        setError('Failed to parse stream data');
        onError?.({ error: 'parse_error', message: 'Failed to parse stream data' });
      }
    };

    eventSource.onerror = (event) => {
      console.error('EventSource error:', event);
      setError('Connection error during streaming');
      setIsStreaming(false);
      onError?.({ error: 'connection_error', message: 'Connection error during streaming' });
      eventSource.close();
    };

    return eventSource;
  }, []);

  const stopStreaming = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const reset = useCallback(() => {
    stopStreaming();
    setStreamedText('');
    setError(null);
    accumulatedTextRef.current = '';
  }, [stopStreaming]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return {
    isStreaming,
    streamedText,
    error,
    startStreaming,
    stopStreaming,
    reset,
  };
};
