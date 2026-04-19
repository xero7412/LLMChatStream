import React, {useCallback, useEffect, useRef} from 'react';
import {
  FlatList,
  Keyboard,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
import {Message} from '../types';
import {MessageBubble} from './MessageBubble';

interface Props {
  messages: Message[];
  onClear: () => void;
}

function ClearButton({onClear}: {onClear: () => void}) {
  return (
    <Pressable
      style={({pressed}) => [styles.clearButton, pressed && styles.clearButtonPressed]}
      onPress={onClear}>
      <Text style={styles.clearText}>🗑 Clear chat</Text>
    </Pressable>
  );
}

export function MessageList({messages, onClear}: Props) {
  const flatListRef = useRef<FlatList<Message>>(null);
  const userScrolledUpRef = useRef(false);

  const scrollToEnd = useCallback((animated = false) => {
    if (!userScrolledUpRef.current) {
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToEnd({animated});
      });
    }
  }, []);

  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', () =>
      scrollToEnd(true),
    );
    return () => sub.remove();
  }, [scrollToEnd]);

  const handleScrollBeginDrag = useCallback(() => {
    userScrolledUpRef.current = true;
  }, []);

  const handleScroll = useCallback(
    ({nativeEvent}: NativeSyntheticEvent<NativeScrollEvent>) => {
      const {layoutMeasurement, contentOffset, contentSize} = nativeEvent;
      const distFromBottom =
        contentSize.height - layoutMeasurement.height - contentOffset.y;
      if (distFromBottom < 20) {
        userScrolledUpRef.current = false;
      }
    },
    [],
  );

  return (
    <FlatList
      ref={flatListRef}
      style={styles.list}
      contentContainerStyle={styles.content}
      data={messages}
      keyExtractor={item => item.id}
      renderItem={({item}) => <MessageBubble message={item} />}
      ListFooterComponent={
        messages.length > 0 ? <ClearButton onClear={onClear} /> : null
      }
      onContentSizeChange={() => scrollToEnd(false)}
      onScrollBeginDrag={handleScrollBeginDrag}
      onScroll={handleScroll}
      scrollEventThrottle={100}
      keyboardShouldPersistTaps="handled"
    />
  );
}

const styles = StyleSheet.create({
  list: {flex: 1},
  content: {paddingVertical: 12},
  clearButton: {
    alignSelf: 'center',
    marginVertical: 16,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
  },
  clearButtonPressed: {
    backgroundColor: '#f0f0f0',
  },
  clearText: {
    fontSize: 13,
    color: '#999',
  },
});
