import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

export type NafuExpression =
  | 'happy'
  | 'wave'
  | 'celebrate'
  | 'sleep'
  | 'remind';

export interface NafuProps {
  size?: number;
  expression?: NafuExpression;
  /** İnce hareket + duygu animasyonu (nefes, kol-only selam, göz kırpma). */
  animated?: boolean;
}

const AnimatedG = Animated.createAnimatedComponent(G);

const VIEW = 240;
const BODY_BOT = '#0E8E82';
const EAR = '#15A091';
const ARM = '#13988B';
const ARM_HI = '#3CC6B7';
const BELLY = '#F3FBF9';
const BELLY_SHADE = '#D7F0EB';
const EYE = '#222B2D';
const CHEEK = '#FFAE9E';
const FOOT = '#0C8074';
const CONTACT = '#08443E';

const OPEN_EYE: NafuExpression[] = ['happy', 'wave', 'remind'];

/**
 * Nafu — Nafu Planlayıcı'nın maskotu.
 *
 * Yuvarlak, sıcak, modern bir yaratık (teal). Tek parça akıcı kollar, temiz
 * gölgeleme. Yerleşik Animated API'siyle ince animasyon: nefes, kol-only selam
 * ve göz kırpma (ekstra bağımlılık yok).
 */
export function Nafu({ size = 160, expression = 'happy', animated = true }: NafuProps) {
  const [breathe] = useState(() => new Animated.Value(0));
  const [waveVal] = useState(() => new Animated.Value(0));
  const [bounce] = useState(() => new Animated.Value(0));
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (!animated) return;
    const running: Animated.CompositeAnimation[] = [];

    const loopBreathe = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 1700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 1700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loopBreathe.start();
    running.push(loopBreathe);

    if (expression === 'wave') {
      const loopWave = Animated.loop(
        Animated.sequence([
          Animated.timing(waveVal, {
            toValue: 1,
            duration: 420,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(waveVal, {
            toValue: 0,
            duration: 420,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ]),
      );
      loopWave.start();
      running.push(loopWave);
    }

    if (expression === 'celebrate') {
      const loopHop = Animated.loop(
        Animated.sequence([
          Animated.timing(bounce, {
            toValue: 1,
            duration: 340,
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
      loopHop.start();
      running.push(loopHop);
    }

    return () => running.forEach((a) => a.stop());
  }, [animated, expression, breathe, waveVal, bounce]);

  useEffect(() => {
    if (!animated || !OPEN_EYE.includes(expression)) return;
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
        2800 + Math.random() * 2400,
      );
    };
    schedule();
    return () => {
      clearTimeout(blinkTimer);
      clearTimeout(openTimer);
    };
  }, [animated, expression]);

  const translateY = Animated.add(
    breathe.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }),
    bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }),
  );
  const scale = Animated.multiply(
    breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] }),
    bounce.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }),
  );
  const armRotation = waveVal.interpolate({ inputRange: [0, 1], outputRange: [-8, 16] });

  return (
    <Animated.View style={{ width: size, height: size, transform: [{ translateY }, { scale }] }}>
      <Svg width={size} height={size} viewBox={`0 0 ${VIEW} ${VIEW}`} accessibilityRole="image">
        <Defs>
          <LinearGradient id="nafuBody" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#2DB9AB" />
            <Stop offset="1" stopColor={BODY_BOT} />
          </LinearGradient>
        </Defs>

        <Ellipse cx="120" cy="226" rx="62" ry="8" fill={CONTACT} opacity={0.14} />
        <Ellipse cx="104" cy="206" rx="15" ry="10" fill={FOOT} />
        <Ellipse cx="136" cy="206" rx="15" ry="10" fill={FOOT} />

        {/* Kulaklar */}
        <Path d="M86 54 C80 28 106 24 110 48 C112 62 96 68 86 54 Z" fill={EAR} />
        <Path d="M154 54 C160 28 134 24 130 48 C128 62 144 68 154 54 Z" fill={EAR} />

        {/* Gövde */}
        <Ellipse cx="120" cy="126" rx="92" ry="86" fill="url(#nafuBody)" />
        <Ellipse cx="94" cy="80" rx="40" ry="26" fill="#FFFFFF" opacity={0.12} transform="rotate(-16 94 80)" />

        {/* Yüz alanı */}
        <Ellipse cx="120" cy="146" rx="64" ry="58" fill={BELLY_SHADE} />
        <Ellipse cx="120" cy="142" rx="62" ry="55" fill={BELLY} />

        {/* Yanaklar */}
        <Ellipse cx="78" cy="156" rx="12" ry="7.5" fill={CHEEK} opacity={0.62} />
        <Ellipse cx="162" cy="156" rx="12" ry="7.5" fill={CHEEK} opacity={0.62} />

        {renderFace(expression, blink)}

        {/* Kollar */}
        <RestPaw side="left" />
        {expression === 'wave' ? (
          <AnimatedG rotation={armRotation} originX={150} originY={132}>
            <WaveArm />
          </AnimatedG>
        ) : (
          <RestPaw side="right" />
        )}

        {expression === 'celebrate' ? renderSparkles() : null}

        {expression === 'sleep' ? (
          <G>
            <SvgText x="184" y="74" fill="#0B6F66" fontSize="20" fontWeight="bold">
              z
            </SvgText>
            <SvgText x="198" y="56" fill={EAR} fontSize="26" fontWeight="bold">
              Z
            </SvgText>
          </G>
        ) : null}
      </Svg>
    </Animated.View>
  );
}

function RestPaw({ side }: { side: 'left' | 'right' }) {
  if (side === 'left') {
    return (
      <G>
        <Path
          d="M74 150 C56 148 44 166 49 184 C53 197 70 200 80 189 C90 178 88 160 74 150 Z"
          fill={ARM}
        />
        <Ellipse cx={62} cy={170} rx={6} ry={8} fill={ARM_HI} opacity={0.55} transform="rotate(-20 62 170)" />
      </G>
    );
  }
  return (
    <G>
      <Path
        d="M166 150 C184 148 196 166 191 184 C187 197 170 200 160 189 C150 178 152 160 166 150 Z"
        fill={ARM}
      />
      <Ellipse cx={178} cy={170} rx={6} ry={8} fill={ARM_HI} opacity={0.55} transform="rotate(20 178 170)" />
    </G>
  );
}

function WaveArm() {
  return (
    <G>
      <Path
        d="M150 132 C146 108 156 82 176 64 C181 59 188 58 193 63 C197 56 205 57 208 65 C214 61 221 68 216 78 C208 98 190 118 174 130 C165 137 151 139 150 132 Z"
        fill={ARM}
      />
      <Path d="M193 64 q4 5 2 12" stroke={BODY_BOT} strokeWidth={2.4} strokeLinecap="round" fill="none" opacity={0.5} />
      <Path d="M205 67 q3 5 0 12" stroke={BODY_BOT} strokeWidth={2.4} strokeLinecap="round" fill="none" opacity={0.45} />
      <Ellipse cx={196} cy={76} rx={7} ry={9} fill={ARM_HI} opacity={0.5} transform="rotate(28 196 76)" />
    </G>
  );
}

function renderFace(expression: NafuExpression, blink: boolean) {
  const L = 96, R = 144, EY = 128;
  switch (expression) {
    case 'celebrate':
      return (
        <G>
          {arcEye(L, EY)}
          {arcEye(R, EY)}
          <Path d="M104 160 Q120 166 136 160 Q128 184 120 184 Q112 184 104 160 Z" fill={EYE} />
          <Ellipse cx="120" cy="180" rx="9" ry="5" fill={CHEEK} />
        </G>
      );
    case 'sleep':
      return (
        <G>
          {sleepEye(L, EY + 2)}
          {sleepEye(R, EY + 2)}
          <Path d="M110 162 Q120 168 130 162" stroke={EYE} strokeWidth={4.2} strokeLinecap="round" fill="none" />
        </G>
      );
    case 'remind':
      return (
        <G>
          <Path d="M84 106 Q96 98 108 106" stroke={EYE} strokeWidth={4.2} strokeLinecap="round" fill="none" />
          <Path d="M132 106 Q144 98 156 106" stroke={EYE} strokeWidth={4.2} strokeLinecap="round" fill="none" />
          {blink ? blinkEye(L, EY + 2) : openEye(L, EY + 2)}
          {blink ? blinkEye(R, EY + 2) : openEye(R, EY + 2)}
          <Circle cx="120" cy="166" r="7" fill={EYE} />
        </G>
      );
    case 'wave':
    case 'happy':
    default:
      return (
        <G>
          {blink ? blinkEye(L, EY) : openEye(L, EY)}
          {blink ? blinkEye(R, EY) : openEye(R, EY)}
          <Path d="M104 160 Q120 176 136 160" stroke={EYE} strokeWidth={5} strokeLinecap="round" fill="none" />
        </G>
      );
  }
}

function openEye(cx: number, cy: number) {
  return (
    <G>
      <Ellipse cx={cx} cy={cy} rx={12} ry={15.5} fill={EYE} />
      <Circle cx={cx + 4} cy={cy - 5} r={4.6} fill="#FFFFFF" />
      <Circle cx={cx - 3} cy={cy + 4} r={2.1} fill="#FFFFFF" opacity={0.9} />
    </G>
  );
}
function blinkEye(cx: number, cy: number) {
  return (
    <Path
      d={`M${cx - 10} ${cy} Q${cx} ${cy + 5} ${cx + 10} ${cy}`}
      stroke={EYE}
      strokeWidth={4.2}
      strokeLinecap="round"
      fill="none"
    />
  );
}
function arcEye(cx: number, cy: number) {
  return (
    <Path
      d={`M${cx - 13} ${cy + 3} Q${cx} ${cy - 12} ${cx + 13} ${cy + 3}`}
      stroke={EYE}
      strokeWidth={4.6}
      strokeLinecap="round"
      fill="none"
    />
  );
}
function sleepEye(cx: number, cy: number) {
  return (
    <Path
      d={`M${cx - 12} ${cy - 2} Q${cx} ${cy + 9} ${cx + 12} ${cy - 2}`}
      stroke={EYE}
      strokeWidth={4.2}
      strokeLinecap="round"
      fill="none"
    />
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
      {star(40, 58, 9, '#F4B740')}
      {star(196, 78, 7, '#F6D679')}
      {star(60, 34, 6, '#FF7A59')}
      {star(176, 40, 8, '#F4B740')}
    </G>
  );
}
