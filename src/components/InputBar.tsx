import React, {useState} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

interface Props {
  isStreaming: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}

export function InputBar({isStreaming, onSend, onStop}: Props) {
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    onSend(trimmed);
    setText('');
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Message…"
        placeholderTextColor="#999"
        multiline
        maxLength={2000}
      />
      {isStreaming ? (
        <Pressable style={[styles.button, styles.stopButton]} onPress={onStop}>
          <Text style={styles.stopIcon}>■</Text>
        </Pressable>
      ) : (
        <Pressable
          style={[
            styles.button,
            styles.sendButton,
            !text.trim() && styles.sendDisabled,
          ]}
          onPress={handleSend}
          disabled={!text.trim()}>
          <Text style={styles.sendIcon}>↑</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ddd',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    marginRight: 8,
    backgroundColor: '#fafafa',
    color: '#000',
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {backgroundColor: '#0A7AFF'},
  sendDisabled: {backgroundColor: '#ccc'},
  stopButton: {backgroundColor: '#FF3B30'},
  sendIcon: {color: '#fff', fontSize: 20, fontWeight: 'bold'},
  stopIcon: {color: '#fff', fontSize: 14},
});
