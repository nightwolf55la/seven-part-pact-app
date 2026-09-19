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
      d="M -42 56.5 L -42 0 C -42 -31.204 -23.196 -56.5 0 -56.5 C 23.196 -56.5 42 -31.204 42 0 L 42 56.5 Z"
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={strokeDasharray}
    />
  );
}
