import type { PropsWithChildren } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const colors = {
  bg: '#F5F7F2',
  ink: '#183E35',
  muted: '#65756D',
  green: '#26714D',
  lime: '#D6F27C',
  line: '#DDE5DC',
  white: '#FFFFFF',
  amber: '#80591E',
};
export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: 24,
    gap: 20,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingBottom: 40,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  eyebrow: {
    color: colors.green,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: { color: colors.ink, fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -1 },
  h2: { color: colors.ink, fontSize: 21, fontWeight: '700' },
  text: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  card: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 22,
    padding: 20,
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    backgroundColor: colors.white,
    padding: 14,
    color: colors.ink,
    fontSize: 15,
    minHeight: 48,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  selected: { backgroundColor: colors.ink, borderColor: colors.ink },
  selectedText: { color: colors.white },
  badge: {
    color: colors.green,
    backgroundColor: '#EEF6E8',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '700',
    alignSelf: 'flex-start',
  },
});
export function Page({ children }: PropsWithChildren) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={s.page}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export function Button({
  title,
  onPress,
  disabled,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        padding: 16,
        borderRadius: 14,
        backgroundColor: secondary ? '#E8EEDF' : colors.ink,
        opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
        minHeight: 50,
        alignItems: 'center',
      })}
    >
      <Text
        style={{ color: secondary ? colors.ink : colors.white, fontWeight: '700', fontSize: 14 }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Notice({ children }: PropsWithChildren) {
  return (
    <View style={{ padding: 14, backgroundColor: '#FFF5DF', borderRadius: 14 }}>
      <Text style={{ color: colors.amber, lineHeight: 20, fontSize: 13 }}>{children}</Text>
    </View>
  );
}
export function Loading() {
  return (
    <ActivityIndicator accessibilityLabel="Loading" color={colors.green} style={{ padding: 30 }} />
  );
}
