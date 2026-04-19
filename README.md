# LLMChatStream

A minimal React Native chat app that connects to a streaming LLM endpoint and renders responses smoothly on both iOS and Android — built as a solution to the SSE streaming mobile assignment.

---

## Demo

https://github.com/user-attachments/assets/70dd2b81-cb92-40cf-9480-781b47699a3c


---

## Features

| Feature | Details |
|---|---|
| **Smooth streaming** | Incoming tokens are pushed into a queue and drained one character at a time at a fixed 20 ms cadence — decouples network burst delivery from the render rate, eliminating the jumping/bursting effect |
| **Blinking cursor ▍** | Rendered inline at the active insertion point using `Animated` opacity loop on the native driver — no layout shift |
| **Stop button** | Shown when streaming with no text typed; aborts the XHR, clears the token queue, and freezes the bubble instantly with no ghost state |
| **Interrupt mid-stream** | Typing a new message and tapping Send while a response is rendering stops the current stream immediately and starts a fresh one — no separate Stop step required |
| **Smart auto-scroll** | Follows new content automatically; disengages when the user scrolls up; re-engages when they scroll back to the bottom |
| **Markdown rendering** | Completed assistant responses are rendered as Markdown (bold, italic, code blocks, lists, headings, blockquotes); plain text is used during streaming so the cursor stays inline |
| **Chat persistence** | Conversation history is saved to AsyncStorage and restored on next app launch |
| **Clear chat** | A "Clear chat" button at the bottom of the conversation wipes history from both state and storage |
| **Keyboard avoiding** | Input bar lifts correctly when the keyboard appears on both iOS and Android |
| **Free LLM API** | Uses [Groq](https://console.groq.com) (`llama-3.1-8b-instant`) — free tier, no credit card. Falls back to a built-in mock stream if no API key is set |

---

## Prerequisites

- Node.js >= 22
- React Native CLI environment set up — follow the [official guide](https://reactnative.dev/docs/set-up-your-environment)
- **iOS**: Xcode + CocoaPods (`bundle install` sets it up)
- **Android**: Android Studio + an emulator or physical device

---

## Installation

### 1. Clone and install dependencies

```sh
git clone <repo-url>
cd LLMChatStream
npm install
```

### 2. Set up the API key

```sh
cp .env.example .env
```

Open `.env` and replace the placeholder with your Groq API key:

```
GROQ_API_KEY=gsk_your_key_here
```

Get a free key at [console.groq.com](https://console.groq.com). If you skip this step the app runs in **mock mode** — all features work with a simulated response, no key required.

### 3. iOS — install native dependencies

```sh
bundle install
LANG=en_US.UTF-8 bundle exec pod install
```

### 4. Start Metro

```sh
npm start -- --reset-cache
```

> The `--reset-cache` flag is required on first run (and after any `.env` change) to pick up the environment variables.

### 5. Run the app

**iOS**
```sh
npm run ios
```

**Android**
```sh
npm run android
```

---

## Project Structure

```
src/
  hooks/
    useSSEStream.ts       # XHR-based SSE fetch, SSE parser, AbortController, mock fallback
  components/
    ChatScreen.tsx        # Root screen — owns all state, token queue, drain interval
    MessageList.tsx       # FlatList with scroll-lock and keyboard listener
    MessageBubble.tsx     # Plain Text (streaming) → Markdown (complete) + blinking cursor
    InputBar.tsx          # TextInput + Send / Stop button
  types.ts                # Message interface
  env.d.ts                # @env module type declaration
```

---

## How streaming works

React Native's `fetch` does not expose `response.body` as a `ReadableStream`. This app uses `XMLHttpRequest` with an `onprogress` handler, which delivers incremental `responseText` as chunks arrive — the correct approach for SSE on bare React Native without third-party streaming libraries.

```
Network chunk → XHR onprogress → parse SSE lines → push chars to queue
                                                           ↓
                                        setInterval (20 ms) drains one char
                                                           ↓
                                              setMessages → re-render
```

---

## Interrupting a stream

The input button adapts to context:

| Input state | Streaming? | Button shown | Action |
|---|---|---|---|
| Empty | No | Send (disabled) | — |
| Has text | No | Send ↑ | Send message |
| Empty | Yes | Stop ■ | Abort stream, freeze bubble |
| Has text | Yes | Send ↑ | Abort current stream, start new one |

When a new message is sent mid-stream:

1. `AbortController.abort()` cancels the in-flight XHR immediately
2. The token queue is cleared — no stale characters will render
3. The drain interval is stopped
4. The previous assistant bubble is frozen at whatever text was displayed
5. A new stream starts for the new message

No race conditions, no ghost state.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `NativeModule is null` (AsyncStorage) | Rebuild the app — native modules require a full build, not just a Metro reload |
| `model decommissioned` error | The model name in `useSSEStream.ts` may be outdated; replace with a current model from [console.groq.com/docs/models](https://console.groq.com/docs/models) |
| Env variable is `undefined` | Run Metro with `--reset-cache` after editing `.env` |
| Pod install encoding error | Run with `LANG=en_US.UTF-8 bundle exec pod install` |
