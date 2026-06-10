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
}

const INK = palette.gray[900];
const CHEEK = palette.coral[300];

/**
 * Nafu — Nafu Planlayıcı'nın maskotu.
 *
 * Yuvarlak, yumuşak, tüylü özgün bir yaratık (teal tonlarında). Var olan bir
 * hayvan değil; sıcak ve aileye dostane. İfade desteği ile uygulamanın her
 * yerinde duruma uygun tepki verir.
 */
export function Nafu({ size = 160, expression = 'happy' }: NafuProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 220 220" accessibilityRole="image">
      <Defs>
        <LinearGradient id="nafuBody" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={palette.teal[400]} />
          <Stop offset="1" stopColor={palette.teal[600]} />
        </LinearGradient>
        <RadialGradient id="nafuShine" cx="0.35" cy="0.3" r="0.7">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.45" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="nafuTuft" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={palette.teal[500]} />
          <Stop offset="1" stopColor={palette.teal[700]} />
        </LinearGradient>
      </Defs>

      {/* Ayaklar */}
      <Ellipse cx="90" cy="198" rx="15" ry="9" fill={palette.teal[700]} />
      <Ellipse cx="130" cy="198" rx="15" ry="9" fill={palette.teal[700]} />

      {/* Kollar (ifadeye göre) */}
      {renderArms(expression)}

      {/* Kulak tüyleri */}
      <Path d="M70 58 C58 28 86 22 90 50 C92 64 78 70 70 58 Z" fill="url(#nafuTuft)" />
      <Path d="M150 58 C162 28 134 22 130 50 C128 64 142 70 150 58 Z" fill="url(#nafuTuft)" />
      {/* Tepe tüyü */}
      <Path
        d="M104 34 C104 18 116 18 116 32 C122 26 128 34 120 42 C114 48 106 46 104 34 Z"
        fill="url(#nafuTuft)"
      />

      {/* Gövde */}
      <Ellipse cx="110" cy="122" rx="86" ry="80" fill="url(#nafuBody)" />
      <Ellipse cx="110" cy="122" rx="86" ry="80" fill="url(#nafuShine)" />

      {/* Yüz alanı (açık) */}
      <Ellipse cx="110" cy="134" rx="60" ry="55" fill={palette.teal[50]} />

      {/* Yanaklar */}
      <Ellipse cx="66" cy="146" rx="12" ry="8" fill={CHEEK} opacity={0.75} />
      <Ellipse cx="154" cy="146" rx="12" ry="8" fill={CHEEK} opacity={0.75} />

      {/* Gözler + ağız + ekstra (ifadeye göre) */}
      {renderFace(expression)}

      {/* Kutlama parıltıları */}
      {expression === 'celebrate' ? renderSparkles() : null}

      {/* Uyku Zzz */}
      {expression === 'sleep' ? (
        <G>
          <SvgText x="168" y="70" fill={palette.teal[600]} fontSize="20" fontWeight="bold">
            z
          </SvgText>
          <SvgText x="182" y="54" fill={palette.teal[500]} fontSize="26" fontWeight="bold">
            Z
          </SvgText>
        </G>
      ) : null}
    </Svg>
  );
}

function renderArms(expression: NafuExpression) {
  const raised = expression === 'wave' || expression === 'celebrate';
  const pointing = expression === 'remind';
  return (
    <G>
      {/* Sol kol */}
      <Ellipse
        cx="34"
        cy={expression === 'celebrate' ? 92 : 150}
        rx="13"
        ry="20"
        fill={palette.teal[600]}
        transform={expression === 'celebrate' ? 'rotate(28 34 92)' : 'rotate(12 34 150)'}
      />
      {/* Sağ kol */}
      <Ellipse
        cx="186"
        cy={raised || pointing ? 92 : 150}
        rx="13"
        ry="20"
        fill={palette.teal[600]}
        transform={
          raised || pointing ? 'rotate(-28 186 92)' : 'rotate(-12 186 150)'
        }
      />
    </G>
  );
}

function renderFace(expression: NafuExpression) {
  switch (expression) {
    case 'celebrate':
      return (
        <G>
          {happyArcEye(86, 116)}
          {happyArcEye(134, 116)}
          {openMouth()}
        </G>
      );
    case 'sleep':
      return (
        <G>
          {closedEye(86, 118)}
          {closedEye(134, 118)}
          <Path
            d="M100 152 Q110 158 120 152"
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
          {/* Kaşlar */}
          <Path
            d="M74 96 Q86 88 98 96"
            stroke={INK}
            strokeWidth={4}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M122 96 Q134 88 146 96"
            stroke={INK}
            strokeWidth={4}
            strokeLinecap="round"
            fill="none"
          />
          {openEye(86, 118)}
          {openEye(134, 118)}
          {/* "o" ağız */}
          <Circle cx="110" cy="156" r="7" fill={INK} />
        </G>
      );
    case 'wave':
    case 'happy':
    default:
      return (
        <G>
          {openEye(86, 116)}
          {openEye(134, 116)}
          <Path
            d="M92 150 Q110 166 128 150"
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
      <Path
        d="M90 150 Q110 156 130 150 Q122 174 110 174 Q98 174 90 150 Z"
        fill={INK}
      />
      <Ellipse cx="110" cy="170" rx="9" ry="5" fill={CHEEK} />
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
      {star(40, 60, 9, palette.gold[500])}
      {star(182, 78, 7, palette.gold[300])}
      {star(58, 38, 6, palette.coral[500])}
      {star(166, 44, 8, palette.gold[500])}
    </G>
  );
}
