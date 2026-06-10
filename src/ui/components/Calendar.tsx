import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { CALENDAR_WEEKDAYS_TR, MONTHS_TR } from '@/domain/constants';
import { dayKeyFromDate, dayKeyFromMs } from '@/domain/time';
import type { DayKey } from '@/domain/types';
import { useNow } from '@/hooks/useNow';

import { colors } from '../theme/colors';
import { radii } from '../theme/radii';
import { spacing } from '../theme/spacing';
import { Icon } from '../icons';
import { Text } from './Text';

export interface CalendarProps {
  selected?: DayKey | null;
  onSelect: (dayKey: DayKey) => void;
}

interface MonthCursor {
  year: number;
  month: number; // 0-11
}

function cursorFrom(dayKey: DayKey | null | undefined): MonthCursor {
  if (dayKey) {
    const [y, m] = dayKey.split('-').map(Number);
    return { year: y, month: (m ?? 1) - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

/** Pazartesi başlangıçlı hafta satırları; ay dışı hücreler null. */
function buildWeeks({ year, month }: MonthCursor): (DayKey | null)[][] {
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // 0 = Pzt
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (DayKey | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(dayKeyFromDate(new Date(year, month, d)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (DayKey | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Hafif, markaya uygun ay takvimi (tarih seçimi için). */
export function Calendar({ selected, onSelect }: CalendarProps) {
  const [cursor, setCursor] = useState<MonthCursor>(() => cursorFrom(selected));
  const weeks = buildWeeks(cursor);
  const today = dayKeyFromMs(useNow());

  const shiftMonth = (delta: number) => {
    setCursor((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.sm,
        }}
      >
        <Pressable hitSlop={8} onPress={() => shiftMonth(-1)} accessibilityLabel="Önceki ay">
          <Icon name="chevronLeft" size={22} color={colors.textSecondary} />
        </Pressable>
        <Text variant="bodyStrong">
          {MONTHS_TR[cursor.month]} {cursor.year}
        </Text>
        <Pressable hitSlop={8} onPress={() => shiftMonth(1)} accessibilityLabel="Sonraki ay">
          <Icon name="chevronRight" size={22} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row' }}>
        {CALENDAR_WEEKDAYS_TR.map((d) => (
          <Text key={d} variant="caption" tone="muted" center style={{ flex: 1 }}>
            {d}
          </Text>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={{ flexDirection: 'row', marginTop: spacing.xs }}>
          {week.map((dayKey, di) => {
            if (!dayKey) return <View key={di} style={{ flex: 1, height: 38 }} />;
            const isSelected = dayKey === selected;
            const isToday = dayKey === today;
            const dayNum = Number(dayKey.slice(-2));
            return (
              <Pressable
                key={di}
                onPress={() => onSelect(dayKey)}
                style={{ flex: 1, alignItems: 'center' }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isSelected ? colors.primary : 'transparent',
                    borderWidth: isToday && !isSelected ? 1.5 : 0,
                    borderColor: colors.primary,
                  }}
                >
                  <Text
                    variant="small"
                    style={{
                      color: isSelected
                        ? colors.onPrimary
                        : isToday
                          ? colors.primaryDark
                          : colors.textPrimary,
                      fontWeight: isSelected || isToday ? '700' : '400',
                    }}
                  >
                    {dayNum}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
