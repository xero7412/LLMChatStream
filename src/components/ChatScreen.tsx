import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useSSEStream } from '../hooks/useSSEStream';
import { Message } from '../types';
import { InputBar } from './InputBar';
import { MessageList } from './MessageList';

const STORAGE_KEY = 'chat_messages';

export function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  // Token queue: network tokens land here; a drain interval pops them into state
  // at a fixed cadence to prevent burst rendering
  const tokenQueueRef = useRef<string[]>([]);
  const drainIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Ref mirror of isStreaming so the drain interval callback sees the latest value
  const isStreamingRef = useRef(false);

  const { start: startStream, stop: stopStream } = useSSEStream();

  // Load persisted messages on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(data => {
        if (data) {
          setMessages(JSON.parse(data));
        }
      })
      .catch(() => { });
  }, []);

  // Persist whenever all messages are settled (none mid-stream)
  useEffect(() => {
    if (messages.length === 0 || messages.some(m => m.isStreaming)) {
      return;
    }
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(messages)).catch(() => { });
  }, [messages]);

  const stopDraining = useCallback(() => {
    if (drainIntervalRef.current !== null) {
      clearInterval(drainIntervalRef.current);
      drainIntervalRef.current = null;
    }
  }, []);

  // Start draining the token queue into the message identified by msgId.
  // Each tick appends one character so the render rate is decoupled from
  // how quickly the network delivers tokens.
  const startDraining = useCallback(
    (msgId: string) => {
      stopDraining();
      drainIntervalRef.current = setInterval(() => {
        const char = tokenQueueRef.current.shift();
        if (char !== undefined) {
          setMessages(prev =>
            prev.map(m =>
              m.id === msgId ? { ...m, content: m.content + char } : m,
            ),
          );
        } else if (!isStreamingRef.current) {
          // Queue drained and network is done — hide cursor and re-enable input
          stopDraining();
          setIsStreaming(false);
          setMessages(prev =>
            prev.map(m =>
              m.id === msgId ? { ...m, isStreaming: false } : m,
            ),
          );
        }
      }, 20);
    },
    [stopDraining],
  );

  const sendMessage = useCallback(
    (text: string) => {
      // Abort the current stream and discard any pending characters
      stopStream();
      stopDraining();
      tokenQueueRef.current = [];
      isStreamingRef.current = false;

      // Freeze the previous streaming bubble where it stopped
      setMessages(prev =>
        prev.map(m => (m.isStreaming ? { ...m, isStreaming: false } : m)),
      );

      const userMsg: Message = {
        id: `${Date.now()}-user`,
        role: 'user',
        content: text,
      };
      const assistantMsg: Message = {
        id: `${Date.now() + 1}-assistant`,
        role: 'assistant',
        content: '',
        isStreaming: true,
      };

      isStreamingRef.current = true;
      setIsStreaming(true);
      setMessages(prev => [...prev, userMsg, assistantMsg]);
      startDraining(assistantMsg.id);

      startStream(text, {
        onToken: token => {
          // Explode to characters so the drain produces a per-char typewriter effect
          tokenQueueRef.current.push(...token.split(''));
        },
        onDone: () => {
          // Mark network as done; the drain interval will call setIsStreaming(false)
          // once the queue is fully rendered — keeps the Stop button visible throughout
          isStreamingRef.current = false;
        },
        onError: err => {
          isStreamingRef.current = false;
          setIsStreaming(false);
          stopDraining();
          setMessages(prev =>
            prev.map(m =>
              m.isStreaming
                ? {
                  ...m,
                  isStreaming: false,
                  content: m.content + `\n[Error: ${err.message}]`,
                }
                : m,
            ),
          );
        },
      });
    },
    [startDraining, startStream, stopDraining, stopStream],
  );

  const handleStop = useCallback(() => {
    stopStream();
    isStreamingRef.current = false;
    tokenQueueRef.current = [];
    stopDraining();
    setIsStreaming(false);
    // Immediately freeze the bubble at whatever was displayed
    setMessages(prev =>
      prev.map(m => (m.isStreaming ? { ...m, isStreaming: false } : m)),
    );
  }, [stopDraining, stopStream]);

  // Cleanup on unmount
  useEffect(
    () => () => {
      stopDraining();
      stopStream();
    },
    [stopDraining, stopStream],
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <MessageList messages={messages} />
      <InputBar
        isStreaming={isStreaming}
        onSend={sendMessage}
        onStop={handleStop}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', marginTop: 80, },
});
