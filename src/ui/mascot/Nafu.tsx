import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { palette } from '../theme/colors';

export type NafuExpression =
  | 'happy'
  | 'wave'
  | 'celebrate'
  | 'sleep'
  | 'remind';

export interface NafuProps {
  size?: number;
  expression?: NafuExpression;
  /** İnce hareket + duygu animasyonu (nefes, zıplama, selam, göz kırpma). */
  animated?: boolean;
}

const VIEW_W = 220;
const VIEW_H = 230;
const INK = palette.gray[900];
const CHEEK = palette.coral[300];
const ARM = 'url(#nafuArm)';

const OPEN_EYE_EXPRESSIONS: NafuExpression[] = ['happy', 'wave', 'remind'];

/**
 * Nafu — Nafu Planlayıcı'nın maskotu.
 *
 * Yuvarlak, yumuşak, tüylü özgün bir yaratık (teal tonlarında). Küresel 3B
 * gövde, öne gelen belirgin patiler ve duruma göre ifadeler. Yerleşik Animated
 * API'siyle ince nefes/zıplama/selam/göz kırpma animasyonları (ekstra bağımlılık
 * yok).
 */
export function Nafu({ size = 160, expression = 'happy', animated = true }: NafuProps) {
  const height = (size * VIEW_H) / VIEW_W;

  // Animated değerleri tembel olarak bir kez oluştur (kararlı referans).
  const [bob] = useState(() => new Animated.Value(0));
  const [sway] = useState(() => new Animated.Value(0));
  const [bounce] = useState(() => new Animated.Value(0));
  const [blink, setBlink] = useState(false);

  // Sürekli ince hareketler.
  useEffect(() => {
    if (!animated) return;
    const running: Animated.CompositeAnimation[] = [];

    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    breathe.start();
    running.push(breathe);

    if (expression === 'wave') {
      const wave = Animated.loop(
        Animated.sequence([
          Animated.timing(sway, {
            toValue: 1,
            duration: 480,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(sway, {
            toValue: -1,
            duration: 480,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      wave.start();
      running.push(wave);
    }

    if (expression === 'celebrate') {
      const hop = Animated.loop(
        Animated.sequence([
          Animated.timing(bounce, {
            toValue: 1,
            duration: 360,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(bounce, {
            toValue: 0,
            duration: 420,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      );
      hop.start();
      running.push(hop);
    }

    return () => running.forEach((animation) => animation.stop());
  }, [animated, expression, bob, sway, bounce]);

  // Periyodik göz kırpma (yalnızca gözleri açık ifadelerde).
  useEffect(() => {
    if (!animated || !OPEN_EYE_EXPRESSIONS.includes(expression)) return;
    let blinkTimer: ReturnType<typeof setTimeout>;
    let openTimer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      blinkTimer = setTimeout(
        () => {
          setBlink(true);
          openTimer = setTimeout(() => {
            setBlink(false);
            schedule();
          }, 130);
        },
        2600 + Math.random() * 2400,
      );
    };
    schedule();
    return () => {
      clearTimeout(blinkTimer);
      clearTimeout(openTimer);
    };
  }, [animated, expression]);

  const translateY = Animated.add(
    bob.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }),
    bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }),
  );
  const scale = Animated.multiply(
    bob.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] }),
    bounce.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }),
  );
  const rotate = sway.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-6deg', '6deg'],
  });

  return (
    <Animated.View
      style={{ width: size, height, transform: [{ translateY }, { rotate }, { scale }] }}
    >
      <Svg width={size} height={height} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} accessibilityRole="image">
        <Defs>
          <RadialGradient id="nafuBody" cx="0.4" cy="0.34" r="0.78">
            <Stop offset="0" stopColor="#54CFC1" />
            <Stop offset="0.55" stopColor={palette.teal[500]} />
            <Stop offset="1" stopColor="#0A6A60" />
          </RadialGradient>
          <LinearGradient id="nafuArm" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#2BB6A8" />
            <Stop offset="1" stopColor="#0C7A70" />
          </LinearGradient>
          <LinearGradient id="nafuTuft" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={palette.teal[500]} />
            <Stop offset="1" stopColor={palette.teal[700]} />
          </LinearGradient>
          <LinearGradient id="nafuFoot" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={palette.teal[600]} />
            <Stop offset="1" stopColor="#0A625A" />
          </LinearGradient>
          <RadialGradient id="nafuGloss" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.55" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Zemin gölgesi */}
        <Ellipse cx="110" cy="218" rx="66" ry="9" fill="#0A3A35" opacity={0.18} />

        {/* Ayaklar (gövdenin arkasından) */}
        <Ellipse cx="92" cy="200" rx="16" ry="10" fill="url(#nafuFoot)" />
        <Ellipse cx="128" cy="200" rx="16" ry="10" fill="url(#nafuFoot)" />

        {/* Kulak ve tepe tüyleri (gövdenin arkasından) */}
        <Path d="M66 56 C52 24 84 18 90 48 C93 64 76 70 66 56 Z" fill="url(#nafuTuft)" />
        <Path d="M154 56 C168 24 136 18 130 48 C127 64 144 70 154 56 Z" fill="url(#nafuTuft)" />
        <Path
          d="M103 32 C103 15 117 15 117 30 C123 23 131 32 122 41 C115 47 105 46 103 32 Z"
          fill="url(#nafuTuft)"
        />

        {/* Gövde (küresel 3B) */}
        <Ellipse cx="110" cy="120" rx="88" ry="82" fill="url(#nafuBody)" />
        {/* Alt hacim gölgesi */}
        <Ellipse cx="110" cy="166" rx="72" ry="42" fill="#074F49" opacity={0.16} />
        {/* Parlama */}
        <Ellipse
          cx="84"
          cy="74"
          rx="30"
          ry="20"
          fill="url(#nafuGloss)"
          transform="rotate(-18 84 74)"
        />
        <Ellipse cx="72" cy="66" rx="7" ry="5" fill="#FFFFFF" opacity={0.5} />

        {/* Yüz alanı (oturma gölgesi + açık alan) */}
        <Ellipse cx="110" cy="132" rx="60" ry="55" fill="#0C7A70" opacity={0.28} />
        <Ellipse cx="110" cy="136" rx="58" ry="53" fill="#F1FCFA" />

        {/* Yanaklar */}
        <Ellipse cx="68" cy="150" rx="12" ry="8" fill={CHEEK} opacity={0.8} />
        <Ellipse cx="152" cy="150" rx="12" ry="8" fill={CHEEK} opacity={0.8} />

        {/* Yüz (gözler + ağız) */}
        {renderFace(expression, blink)}

        {/* Kollar / patiler (önde, belirgin) */}
        <Arm shoulder={[76, 160]} paw={[52, 178]} rot={-10} />
        {expression === 'wave' ? (
          <Arm shoulder={[146, 120]} paw={[184, 64]} rot={14} open />
        ) : (
          <Arm shoulder={[144, 160]} paw={[168, 178]} rot={10} />
        )}

        {/* Kutlama parıltıları */}
        {expression === 'celebrate' ? renderSparkles() : null}

        {/* Uyku Zzz */}
        {expression === 'sleep' ? (
          <G>
            <SvgText x="170" y="72" fill={palette.teal[600]} fontSize="20" fontWeight="bold">
              z
            </SvgText>
            <SvgText x="184" y="54" fill={palette.teal[500]} fontSize="26" fontWeight="bold">
              Z
            </SvgText>
          </G>
        ) : null}
      </Svg>
    </Animated.View>
  );
}

function Arm({
  shoulder,
  paw,
  rot,
  open = false,
}: {
  shoulder: [number, number];
  paw: [number, number];
  rot: number;
  open?: boolean;
}) {
  const [sx, sy] = shoulder;
  const [px, py] = paw;
  return (
    <G>
      <Path d={`M${sx} ${sy} L${px} ${py}`} stroke={ARM} strokeWidth={15} strokeLinecap="round" />
      <Ellipse
        cx={px}
        cy={py}
        rx={16}
        ry={18}
        fill={ARM}
        transform={`rotate(${rot} ${px} ${py})`}
      />
      <Ellipse cx={px - 4} cy={py - 7} rx={5} ry={7} fill="#FFFFFF" opacity={open ? 0.28 : 0.22} />
    </G>
  );
}

function renderFace(expression: NafuExpression, blink: boolean) {
  switch (expression) {
    case 'celebrate':
      return (
        <G>
          {happyArcEye(86, 118)}
          {happyArcEye(134, 118)}
          {openMouth()}
        </G>
      );
    case 'sleep':
      return (
        <G>
          {closedEye(86, 120)}
          {closedEye(134, 120)}
          <Path
            d="M100 154 Q110 160 120 154"
            stroke={INK}
            strokeWidth={4}
            strokeLinecap="round"
            fill="none"
          />
        </G>
      );
    case 'remind':
      return (
        <G>
          <Path
            d="M74 98 Q86 90 98 98"
            stroke={INK}
            strokeWidth={4}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M122 98 Q134 90 146 98"
            stroke={INK}
            strokeWidth={4}
            strokeLinecap="round"
            fill="none"
          />
          {blink ? blinkEye(86, 120) : openEye(86, 120)}
          {blink ? blinkEye(134, 120) : openEye(134, 120)}
          <Circle cx="110" cy="158" r="7" fill={INK} />
        </G>
      );
    case 'wave':
    case 'happy':
    default:
      return (
        <G>
          {blink ? blinkEye(86, 118) : openEye(86, 118)}
          {blink ? blinkEye(134, 118) : openEye(134, 118)}
          <Path
            d="M92 152 Q110 168 128 152"
            stroke={INK}
            strokeWidth={4.5}
            strokeLinecap="round"
            fill="none"
          />
        </G>
      );
  }
}

function openEye(cx: number, cy: number) {
  return (
    <G>
      <Ellipse cx={cx} cy={cy} rx={11} ry={14} fill={INK} />
      <Circle cx={cx + 3.5} cy={cy - 4.5} r={4.2} fill="#FFFFFF" />
      <Circle cx={cx - 2.5} cy={cy + 3.5} r={2} fill="#FFFFFF" opacity={0.85} />
    </G>
  );
}

function blinkEye(cx: number, cy: number) {
  return (
    <Path
      d={`M${cx - 9} ${cy} Q${cx} ${cy + 4} ${cx + 9} ${cy}`}
      stroke={INK}
      strokeWidth={4}
      strokeLinecap="round"
      fill="none"
    />
  );
}

function happyArcEye(cx: number, cy: number) {
  return (
    <Path
      d={`M${cx - 12} ${cy + 3} Q${cx} ${cy - 11} ${cx + 12} ${cy + 3}`}
      stroke={INK}
      strokeWidth={4.5}
      strokeLinecap="round"
      fill="none"
    />
  );
}

function closedEye(cx: number, cy: number) {
  return (
    <Path
      d={`M${cx - 11} ${cy - 2} Q${cx} ${cy + 8} ${cx + 11} ${cy - 2}`}
      stroke={INK}
      strokeWidth={4}
      strokeLinecap="round"
      fill="none"
    />
  );
}

function openMouth() {
  return (
    <G>
      <Path d="M90 152 Q110 158 130 152 Q122 176 110 176 Q98 176 90 152 Z" fill={INK} />
      <Ellipse cx="110" cy="172" rx="9" ry="5" fill={CHEEK} />
    </G>
  );
}

function renderSparkles() {
  const star = (x: number, y: number, s: number, color: string) => (
    <Path
      d={`M${x} ${y - s} L${x + s * 0.28} ${y - s * 0.28} L${x + s} ${y} L${x + s * 0.28} ${y + s * 0.28} L${x} ${y + s} L${x - s * 0.28} ${y + s * 0.28} L${x - s} ${y} L${x - s * 0.28} ${y - s * 0.28} Z`}
      fill={color}
    />
  );
  return (
    <G>
      {star(38, 58, 9, palette.gold[500])}
      {star(184, 76, 7, palette.gold[300])}
      {star(56, 36, 6, palette.coral[500])}
      {star(166, 42, 8, palette.gold[500])}
    </G>
  );
}
