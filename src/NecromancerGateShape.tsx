export function NecromancerGateShape({
  x,
  y,
  fill,
  stroke,
  strokeWidth,
  strokeDasharray,
}: {
  x: number;
  y: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
}) {
  return (
    <path
      data-gate-silhouette="arch"
      transform={`translate(${x} ${y})`}
      d="M -42 32 L -42 6 Q -42 -34 0 -38 Q 42 -34 42 6 L 42 32 Z"
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={strokeDasharray}
    />
  );
}
