import React, {useCallback, useEffect, useRef} from 'react';
import {
  FlatList,
  Keyboard,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
} from 'react-native';
import {Message} from '../types';
import {MessageBubble} from './MessageBubble';

interface Props {
  messages: Message[];
}

export function MessageList({messages}: Props) {
  const flatListRef = useRef<FlatList<Message>>(null);
  const userScrolledUpRef = useRef(false);

  const scrollToEnd = useCallback((animated = false) => {
    if (!userScrolledUpRef.current) {
      // requestAnimationFrame defers the scroll until after the current paint,
      // giving Markdown (and any other async-layout components) time to settle
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToEnd({animated});
      });
    }
  }, []);

  // Re-scroll when keyboard appears so the last message isn't hidden behind it
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
});
