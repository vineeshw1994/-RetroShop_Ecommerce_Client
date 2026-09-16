import { useMemo } from 'react';
import { motion } from 'framer-motion';

const COLORS = ['#E11D48', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#A855F7', '#EC4899'];

interface ConfettiBurstProps {
  active?: boolean;
}

const ConfettiBurst = ({ active = true }: ConfettiBurstProps) => {
  const pieces = useMemo(
    () =>
      Array.from({ length: 48 }, (_, index) => ({
        id: index,
        left: `${Math.random() * 100}%`,
        delay: Math.random() * 0.35,
        duration: 2.4 + Math.random() * 1.4,
        size: 6 + Math.random() * 8,
        rotate: Math.random() * 360,
        color: COLORS[index % COLORS.length],
        drift: -40 + Math.random() * 80,
      })),
    []
  );

  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((piece) => (
        <motion.span
          key={piece.id}
          initial={{ opacity: 1, y: -20, x: 0, rotate: piece.rotate }}
          animate={{
            opacity: [1, 1, 0],
            y: ['0vh', '95vh'],
            x: [0, piece.drift],
            rotate: piece.rotate + 540,
          }}
          transition={{
            duration: piece.duration,
            delay: piece.delay,
            ease: 'easeOut',
          }}
          className="absolute top-0 block rounded-sm"
          style={{
            left: piece.left,
            width: piece.size,
            height: piece.size * 0.55,
            backgroundColor: piece.color,
          }}
        />
      ))}
    </div>
  );
};

export default ConfettiBurst;
