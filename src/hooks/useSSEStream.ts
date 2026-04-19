import {useCallback, useRef} from 'react';
import {GROQ_API_KEY} from '@env';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.1-8b-instant';

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: () => void;
  onError: (err: Error) => void;
}

function runMockStream(
  message: string,
  signal: AbortSignal,
  callbacks: StreamCallbacks,
) {
  const text =
    `Thanks for your message: "${message}". ` +
    `This is a mock streaming response demonstrating smooth token-by-token rendering. ` +
    `Incoming tokens are pushed into a queue and drained at a steady 20 ms cadence, ` +
    `so the display stays smooth regardless of how the network batches chunks. ` +
    `The blinking cursor shows the active insertion point, and the Stop button ` +
    `aborts cleanly with no ghost state.`;

  const tokens = text.split(/(\s+)/);
  let i = 0;

  const tick = () => {
    if (signal.aborted) {
      return;
    }
    if (i >= tokens.length) {
      callbacks.onDone();
      return;
    }
    callbacks.onToken(tokens[i++]);
    setTimeout(tick, 30 + Math.random() * 80);
  };

  setTimeout(tick, 200);
}

// React Native's fetch does not expose response.body as a ReadableStream.
// XHR fires onprogress with incremental responseText, which is the correct
// approach for SSE on RN without native modules or third-party libraries.
function runXHRStream(
  userMessage: string,
  signal: AbortSignal,
  callbacks: StreamCallbacks,
) {
  const xhr = new XMLHttpRequest();
  let processedLength = 0;
  let lineBuffer = '';

  signal.addEventListener('abort', () => xhr.abort());

  const parseLines = (chunk: string) => {
    lineBuffer += chunk;
    const lines = lineBuffer.split('\n');
    // Last element may be an incomplete line — keep it in the buffer
    lineBuffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) {
        continue;
      }
      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') {
        callbacks.onDone();
        return;
      }
      try {
        const parsed = JSON.parse(data);
        const token: string | undefined = parsed.choices?.[0]?.delta?.content;
        if (token) {
          callbacks.onToken(token);
        }
      } catch {
        // Ignore malformed JSON lines
      }
    }
  };

  xhr.onprogress = () => {
    const newData = xhr.responseText.slice(processedLength);
    processedLength = xhr.responseText.length;
    parseLines(newData);
  };

  xhr.onload = () => {
    if (signal.aborted) {
      return;
    }
    if (xhr.status !== 200) {
      callbacks.onError(new Error(`HTTP ${xhr.status}: ${xhr.responseText}`));
      return;
    }
    // Flush any remaining buffered data then signal done
    parseLines('');
    callbacks.onDone();
  };

  xhr.onerror = () => {
    if (signal.aborted) {
      return;
    }
    callbacks.onError(new Error('Network error'));
  };

  xhr.open('POST', GROQ_URL, true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Authorization', `Bearer ${GROQ_API_KEY}`);
  xhr.send(
    JSON.stringify({
      model: MODEL,
      messages: [{role: 'user', content: userMessage}],
      stream: true,
    }),
  );
}

export function useSSEStream() {
  const abortControllerRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  const start = useCallback((userMessage: string, callbacks: StreamCallbacks) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const useMock =
      !GROQ_API_KEY || GROQ_API_KEY === 'your_groq_api_key_here';

    if (useMock) {
      runMockStream(userMessage, controller.signal, callbacks);
    } else {
      runXHRStream(userMessage, controller.signal, callbacks);
    }
  }, []);

  return {start, stop};
}
