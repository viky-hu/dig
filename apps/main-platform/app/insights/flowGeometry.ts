type FlowPoint = { x: number; y: number };
type FlowAnchor = { point: FlowPoint; nodeRadius: number };

export const FLOW_NODE_RING_SCALE = 1.42;

const pointValue = (point: FlowPoint) => `${point.x.toFixed(2)} ${point.y.toFixed(2)}`;

/** A node-attached ribbon whose normal thickness only decreases along its arc. */
export function createFlowRibbon(
  from: FlowAnchor,
  to: FlowAnchor,
  strength: number,
  reverseStrength: number,
  symbolScale: number,
) {
  const dx = to.point.x - from.point.x;
  const dy = to.point.y - from.point.y;
  const distance = Math.hypot(dx, dy) || 1;
  const unit = { x: dx / distance, y: dy / distance };
  const normal = { x: -unit.y, y: unit.x };
  const at = (along: number, offset: number): FlowPoint => ({
    x: from.point.x + unit.x * along + normal.x * offset,
    y: from.point.y + unit.y * along + normal.y * offset,
  });
  const sourceRadius = from.nodeRadius * FLOW_NODE_RING_SCALE;
  const targetRadius = to.nodeRadius * FLOW_NODE_RING_SCALE;
  const available = Math.max(distance - sourceRadius - targetRadius, symbolScale);
  const gap = Math.min(7 * symbolScale, available * 0.06);
  const innerOffset = (radius: number) => Math.max(radius * 0.22, Math.min(gap * 0.5, radius * 0.35));
  // The adjacent node ring defines the wider source aperture. Its chord is
  // normal, making it the actual maximum thickness rather than a narrow
  // attachment followed by a wider body.
  const outerRoot = at(-sourceRadius * 0.6, sourceRadius * 0.7);
  const innerRoot = at(sourceRadius * 0.78, innerOffset(sourceRadius));
  const rootCenter = { x: (outerRoot.x + innerRoot.x) * 0.5, y: (outerRoot.y + innerRoot.y) * 0.5 };
  const aperture = Math.hypot(outerRoot.x - innerRoot.x, outerRoot.y - innerRoot.y);
  const sourceNormal = { x: (outerRoot.x - innerRoot.x) / aperture, y: (outerRoot.y - innerRoot.y) / aperture };
  const sourceTangent = { x: sourceNormal.y, y: -sourceNormal.x };
  const widthLimit = available * 0.42;
  const tailWidth = Math.min(aperture, widthLimit);
  const reverseAperture = Math.hypot(targetRadius * 1.38, targetRadius * 0.7 - innerOffset(targetRadius));
  const reverseWidth = Math.min(reverseAperture, widthLimit);
  const taperExponent = 1 + (1 - strength) * 0.8;
  const arrivalRadius = targetRadius + Math.min(2 * symbolScale, available * 0.04);
  const endOffset = Math.min(arrivalRadius * 0.7, targetRadius * 0.55 + gap * 0.5);
  const endAlong = distance - Math.sqrt(arrivalRadius * arrivalRadius - endOffset * endOffset);
  const tip = at(endAlong, endOffset);
  // Give the initial turn enough radius for both offset edges, including
  // short routes, rather than independently swelling either boundary.
  const departureLead = Math.min(available * 0.5, Math.sqrt(available * (tailWidth + reverseWidth) * 0.5) * (0.85 + (strength + reverseStrength) * 0.05));
  const control1 = {
    x: rootCenter.x + sourceTangent.x * departureLead,
    y: rootCenter.y + sourceTangent.y * departureLead,
  };
  const startAlong = (rootCenter.x - from.point.x) * unit.x + (rootCenter.y - from.point.y) * unit.y;
  const lift = Math.min((tailWidth + reverseWidth) * 0.45 + gap, available * 0.22);
  const control2 = at(startAlong + (endAlong - startAlong) * 0.68, endOffset + lift);
  const samples: { point: FlowPoint; normal: FlowPoint; length: number }[] = [];
  let arcLength = 0;
  for (let i = 0; i <= 128; i += 1) {
    const t = i / 128, inv = 1 - t;
    const point = {
      x: inv ** 3 * rootCenter.x + 3 * inv ** 2 * t * control1.x + 3 * inv * t ** 2 * control2.x + t ** 3 * tip.x,
      y: inv ** 3 * rootCenter.y + 3 * inv ** 2 * t * control1.y + 3 * inv * t ** 2 * control2.y + t ** 3 * tip.y,
    };
    const tangentX = 3 * inv ** 2 * (control1.x - rootCenter.x) + 6 * inv * t * (control2.x - control1.x) + 3 * t ** 2 * (tip.x - control2.x);
    const tangentY = 3 * inv ** 2 * (control1.y - rootCenter.y) + 6 * inv * t * (control2.y - control1.y) + 3 * t ** 2 * (tip.y - control2.y);
    const speed = Math.hypot(tangentX, tangentY) || 1;
    const previous = samples.at(-1);
    if (previous) arcLength += Math.hypot(point.x - previous.point.x, point.y - previous.point.y);
    samples.push({ point, normal: { x: -tangentY / speed, y: tangentX / speed }, length: arcLength });
  }
  const outer: FlowPoint[] = [], inner: FlowPoint[] = [];
  for (const sample of samples) {
    // Taper by distance travelled: the existing source aperture is the maximum.
    // Weak flows narrow sooner; neither direction can grow beyond its tail.
    const halfWidth = tailWidth * Math.pow(1 - sample.length / arcLength, taperExponent) * 0.5;
    outer.push({ x: sample.point.x + sample.normal.x * halfWidth, y: sample.point.y + sample.normal.y * halfWidth });
    inner.push({ x: sample.point.x - sample.normal.x * halfWidth, y: sample.point.y - sample.normal.y * halfWidth });
  }
  return {
    path: `M ${pointValue(rootCenter)} C ${pointValue(control1)} ${pointValue(control2)} ${pointValue(tip)}`,
    taperedArrowPath: [
      `M ${pointValue(outer[0]!)}`,
      ...outer.slice(1).map(point => `L ${pointValue(point)}`),
      ...inner.slice(0, -1).reverse().map(point => `L ${pointValue(point)}`),
      "Z",
    ].join(" "),
    gradientStart: rootCenter,
    gradientEnd: tip,
  };
}
