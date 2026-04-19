import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { Message } from '../types';

interface Props {
  message: Message;
}

export function MessageBubble({ message }: Props) {
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!message.isStreaming) {
      cursorOpacity.setValue(0);
      return;
    }
    cursorOpacity.setValue(1);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [message.isStreaming, cursorOpacity]);

  const isUser = message.role === 'user';

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAssistant,
        ]}>
        {isUser ? (
          <Text style={styles.userText}>{message.content}</Text>
        ) : message.isStreaming ? (
          // Plain Text during streaming so the cursor sits inline at the insertion point.
          // Switches to Markdown once the response is complete.
          <Text style={styles.streamingText}>
            {message.content}
            <Animated.Text style={[styles.cursor, { opacity: cursorOpacity }]}>
              ▍
            </Animated.Text>
          </Text>
        ) : (
          <Markdown style={markdownStyles}>{message.content}</Markdown>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  rowUser: { alignItems: 'flex-end' },
  rowAssistant: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '80%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: '#de7e2fdb',
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: '#F0F0F0',
    borderBottomLeftRadius: 4,
  },
  userText: { fontSize: 16, lineHeight: 22, color: '#fff' },
  // Matches markdownStyles.body so the switch on completion is seamless
  streamingText: { fontSize: 16, lineHeight: 22, color: '#111' },
  cursor: { color: '#555', fontSize: 16 },
});

const markdownStyles = StyleSheet.create({
  body: { color: '#111', fontSize: 16, lineHeight: 22 },
  code_inline: {
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    fontFamily: 'monospace',
    fontSize: 14,
    paddingHorizontal: 4,
  },
  fence: {
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    padding: 10,
    fontFamily: 'monospace',
    fontSize: 13,
  },
  code_block: {
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    padding: 10,
    fontFamily: 'monospace',
    fontSize: 13,
  },
  heading1: { fontSize: 20, fontWeight: 'bold', marginVertical: 6 },
  heading2: { fontSize: 18, fontWeight: 'bold', marginVertical: 4 },
  heading3: { fontSize: 16, fontWeight: '600', marginVertical: 4 },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
  strong: { fontWeight: 'bold' },
  em: { fontStyle: 'italic' },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: '#aaa',
    paddingLeft: 10,
    color: '#555',
  },
});
