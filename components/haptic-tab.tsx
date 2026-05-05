import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

export function HapticTab(props: BottomTabBarButtonProps) {
  const [pressed, setPressed] = useState(false);

  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        setPressed(true);
        props.onPressIn?.(ev);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }}
      onPressOut={(ev) => {
        setPressed(false);
        props.onPressOut?.(ev);
      }}
      style={[
        { opacity: pressed ? 0.5 : 1 },
        styles.tab,
      ]}
    >
      {props.children}
    </PlatformPressable>
  );
}

const styles = StyleSheet.create({
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HapticTab;