import React from 'react';

interface ScoreGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  requiredCriteriaMet?: boolean;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  score,
  size = 'md',
  showLabel = true,
  requiredCriteriaMet = true,
}) => {
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));

  let colorClass = 'score--high';
  if (!requiredCriteriaMet) {
    colorClass = 'score--warning';
  } else if (normalizedScore < 60) {
    colorClass = 'score--low';
  } else if (normalizedScore < 80) {
    colorClass = 'score--mid';
  }

  const radius = size === 'lg' ? 38 : size === 'sm' ? 18 : 28;
  const strokeWidth = size === 'lg' ? 7 : size === 'sm' ? 4 : 5.5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;
  const dimension = (radius + strokeWidth) * 2;

  return (
    <div className={`score-gauge score-gauge--${size} ${colorClass}`}>
      <div className="score-gauge__circle">
        <svg width={dimension} height={dimension} className="score-gauge__svg">
          <circle
            className="score-gauge__bg"
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            strokeWidth={strokeWidth}
          />
          <circle
            className="score-gauge__progress"
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            strokeWidth={strokeWidth}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: strokeDashoffset,
            }}
          />
        </svg>
        <span className="score-gauge__value">{normalizedScore}%</span>
      </div>
      {showLabel && (
        <div className="score-gauge__label">
          {requiredCriteriaMet ? 'Aderência' : 'Faltam Requisitos'}
        </div>
      )}
    </div>
  );
};
