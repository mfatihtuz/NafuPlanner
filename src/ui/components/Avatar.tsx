import { Image } from 'expo-image';
import { View } from 'react-native';

import { palette } from '../theme/colors';
import { Text } from './Text';

const AVATAR_COLORS = [
  palette.teal[500],
  palette.coral[500],
  palette.gold[500],
  palette.teal[700],
  palette.coral[700],
  palette.gold[700],
];

function colorFor(seed: string): string {
  let sum = 0;
  for (let i = 0; i < seed.length; i++) sum += seed.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase('tr');
  return (parts[0][0] + parts[parts.length - 1][0]).toLocaleUpperCase('tr');
}

export interface AvatarProps {
  name: string;
  photoUrl?: string | null;
  /** Renk tutarlılığı için kimlik (uid); yoksa isim kullanılır. */
  seed?: string;
  size?: number;
}

export function Avatar({ name, photoUrl, seed, size = 40 }: AvatarProps) {
  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colorFor(seed ?? name),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{ color: '#FFFFFF', fontWeight: '700', fontSize: size * 0.38, lineHeight: size * 0.5 }}
      >
        {initials(name)}
      </Text>
    </View>
  );
}
