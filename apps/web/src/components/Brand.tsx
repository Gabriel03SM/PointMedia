export function Brand({
  tone = 'dark',
  className = '',
}: {
  tone?: 'dark' | 'light';
  className?: string;
}) {
  return (
    <span className={`brand ${className}`.trim()}>
      <img
        src={`/brand/point-${tone}.png`}
        width={1672}
        height={941}
        alt="Point Media"
        draggable={false}
      />
    </span>
  );
}
