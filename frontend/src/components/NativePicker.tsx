import { forwardRef } from "react";
import { Platform, TextInput, TextInputProps, StyleSheet } from "react-native";

import { colors, radius, fontSizes, spacing } from "@/src/theme";

/**
 * Cross-platform native date/time input. On web renders a real
 * <input type="date"> / <input type="time"> so the user gets the
 * browser's native picker (calendar for date, wheel for time) with
 * the locale-appropriate display format. Value on web is always
 * kept in the HTML canonical format:
 *   - date: YYYY-MM-DD
 *   - time: HH:MM (24h)
 * On native mobile it falls back to a regular TextInput.
 */
type Props = {
  kind: "date" | "time";
  value: string;
  onChangeText: (v: string) => void;
  testID?: string;
  placeholder?: string;
  style?: TextInputProps["style"];
};

const webStyle = {
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: radius.md,
  padding: spacing.md,
  fontSize: fontSizes.md,
  color: colors.textPrimary,
  backgroundColor: colors.background,
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "inherit",
  outline: "none",
} as const;

const NativePicker = forwardRef<any, Props>(function NativePicker(
  { kind, value, onChangeText, testID, placeholder },
  ref,
) {
  if (Platform.OS === "web") {
    // React Native Web renders regular DOM. Fallback to a plain <input>.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const InputEl: any = "input";
    return (
      <InputEl
        ref={ref}
        data-testid={testID}
        type={kind}
        value={value}
        onChange={(e: any) => onChangeText(e.target.value)}
        placeholder={placeholder}
        style={webStyle}
      />
    );
  }
  return (
    <TextInput
      ref={ref}
      testID={testID}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textSecondary}
      style={StyleSheet.flatten([
        {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md,
          padding: spacing.md,
          fontSize: fontSizes.md,
          color: colors.textPrimary,
          backgroundColor: colors.background,
        },
      ])}
    />
  );
});

export default NativePicker;
