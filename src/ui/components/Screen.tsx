import { View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { spacing } from '../theme/spacing';
import { useColors } from '../theme/ThemeProvider';
import { KeyboardAwareScrollView } from './KeyboardAwareScrollView';

export interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  /** Arka plan rengi (varsayılan: tema arka planı). */
  background?: string;
  edges?: readonly Edge[];
  contentStyle?: ViewStyle;
}

export function Screen({
  children,
  scroll = false,
  padded = true,
  background,
  edges = ['top', 'left', 'right'],
  contentStyle,
}: ScreenProps) {
  const colors = useColors();
  const padding = padded ? spacing.lg : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: background ?? colors.background }} edges={edges}>
      {scroll ? (
        <KeyboardAwareScrollView contentContainerStyle={[{ padding, flexGrow: 1 }, contentStyle]}>
          {children}
        </KeyboardAwareScrollView>
      ) : (
        <View style={[{ flex: 1, padding }, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}
