import { motion, useSpring, useTransform } from 'motion/react';
import { useEffect } from 'react';
import './Counter.css';

function Number({ mv, number, height }) {
  const y = useTransform(mv, latest => {
    const placeValue = latest % 10;
    const offset = (10 + number - placeValue) % 10;
    let memo = offset * height;
    if (offset > 5) memo -= 10 * height;
    return memo;
  });
  return (
    <motion.span className="counter-number" style={{ y }}>
      {number}
    </motion.span>
  );
}

function normalizeNearInteger(num) {
  const nearest = Math.round(num);
  const tolerance = 1e-9 * Math.max(1, Math.abs(num));
  return Math.abs(num - nearest) < tolerance ? nearest : num;
}

function getValueRoundedToPlace(value, place) {
  return Math.floor(normalizeNearInteger(value / place));
}

function Digit({ place, value, height, digitStyle, visible = true }) {
  const isDecimal = place === '.';
  const valueRoundedToPlace = isDecimal ? 0 : getValueRoundedToPlace(value, place);
  const animatedValue = useSpring(0, { stiffness: 180, damping: 22 });

  useEffect(() => {
    if (!isDecimal) animatedValue.set(valueRoundedToPlace);
  }, [animatedValue, valueRoundedToPlace, isDecimal]);

  if (isDecimal) {
    return <span className="counter-digit" style={{ height, ...digitStyle, width: 'fit-content' }}>.</span>;
  }

  return (
    <motion.span
      className="counter-digit"
      style={{ height, ...digitStyle }}
      animate={{ width: visible ? '1ch' : 0, opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      {Array.from({ length: 10 }, (_, i) => (
        <Number key={i} mv={animatedValue} number={i} height={height} />
      ))}
    </motion.span>
  );
}

export default function Counter({
  value,
  fontSize = 100,
  padding = 0,
  places = [...value.toString()].map((ch, i, a) => {
    if (ch === '.') return '.';
    return 10 ** (a.indexOf('.') === -1 ? a.length - i - 1 : i < a.indexOf('.') ? a.indexOf('.') - i - 1 : -(i - a.indexOf('.')));
  }),
  gap = 8,
  borderRadius = 4,
  horizontalPadding = 8,
  textColor = 'inherit',
  fontWeight = 'inherit',
  digitPlaceHolders = true,
  containerStyle = undefined,
  counterStyle = undefined,
  digitStyle = undefined,
  gradientHeight = 16,
  gradientFrom = 'black',
  gradientTo = 'transparent',
  topGradientStyle = undefined,
  bottomGradientStyle = undefined,
}) {
  const height = fontSize + padding;

  const numericPlaces = places.filter(p => p !== '.');
  let firstSignificantIdx = numericPlaces.length - 1;
  if (!digitPlaceHolders) {
    for (let i = 0; i < numericPlaces.length - 1; i++) {
      if (getValueRoundedToPlace(value, numericPlaces[i]) !== 0) {
        firstSignificantIdx = i;
        break;
      }
    }
  }

  const defaultCounterStyle = { fontSize, gap, borderRadius, paddingLeft: horizontalPadding, paddingRight: horizontalPadding, color: textColor, fontWeight, direction: 'ltr' };

  let numericIdx = -1;

  return (
    <span className="counter-container" style={containerStyle}>
      <span className="counter-counter" style={{ ...defaultCounterStyle, ...counterStyle }}>
        {places.map(place => {
          const isNumeric = place !== '.';
          if (isNumeric) numericIdx++;
          const visible = digitPlaceHolders || !isNumeric || numericIdx >= firstSignificantIdx;
          return <Digit key={place} place={place} value={value} height={height} digitStyle={digitStyle} visible={visible} />;
        })}
      </span>
      <span className="gradient-container">
        <span className="top-gradient" style={topGradientStyle ?? { height: gradientHeight, background: `linear-gradient(to bottom, ${gradientFrom}, ${gradientTo})` }} />
        <span className="bottom-gradient" style={bottomGradientStyle ?? { height: gradientHeight, background: `linear-gradient(to top, ${gradientFrom}, ${gradientTo})` }} />
      </span>
    </span>
  );
}
