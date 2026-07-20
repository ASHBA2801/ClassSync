import {
  Pressable,
  Text,
  TextInput as RNTextInput,
  View,
  type PressableProps,
  type TextInputProps,
  type TextProps,
  type ViewProps,
} from 'react-native';

/** Shared ClassSync mobile tokens (aligned with web slate palette). */
export const tokens = {
  colors: {
    primary: '#0f172a',
    primaryForeground: '#ffffff',
    muted: '#f1f5f9',
    mutedForeground: '#64748b',
    border: '#e2e8f0',
    background: '#ffffff',
    danger: '#dc2626',
  },
  spacing: {
    sm: 8,
    md: 16,
    lg: 24,
  },
} as const;

export function Screen({ style, ...props }: ViewProps) {
  return (
    <View
      style={[{ flex: 1, backgroundColor: tokens.colors.muted, padding: tokens.spacing.lg }, style]}
      {...props}
    />
  );
}

export function Card({ style, ...props }: ViewProps) {
  return (
    <View
      style={[
        {
          backgroundColor: tokens.colors.background,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: tokens.colors.border,
          padding: tokens.spacing.md,
        },
        style,
      ]}
      {...props}
    />
  );
}

export function Title({ style, ...props }: TextProps) {
  return (
    <Text
      style={[{ fontSize: 22, fontWeight: '700', color: tokens.colors.primary }, style]}
      {...props}
    />
  );
}

export function Body({ style, ...props }: TextProps) {
  return (
    <Text style={[{ fontSize: 15, color: tokens.colors.mutedForeground }, style]} {...props} />
  );
}

export function Button({
  label,
  style,
  ...props
}: PressableProps & { label: string }) {
  return (
    <Pressable
      style={[
        {
          backgroundColor: tokens.colors.primary,
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderRadius: 8,
          alignItems: 'center',
        },
        style,
      ]}
      {...props}
    >
      <Text style={{ color: tokens.colors.primaryForeground, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

export function TextInput({ style, ...props }: TextInputProps) {
  return (
    <RNTextInput
      placeholderTextColor={tokens.colors.mutedForeground}
      style={[
        {
          borderWidth: 1,
          borderColor: tokens.colors.border,
          backgroundColor: tokens.colors.background,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 16,
          color: tokens.colors.primary,
        },
        style,
      ]}
      {...props}
    />
  );
}
