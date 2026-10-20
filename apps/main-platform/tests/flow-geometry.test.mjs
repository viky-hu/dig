import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

// Use the app's TypeScript compiler so this also runs on the repo's Node 20 baseline.
const source = readFileSync(new URL("../app/insights/flowGeometry.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { createFlowRibbon: buildRibbon } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

const createFlowRibbon = (from, to, strength, reverseStrength, scale = 1) =>
  buildRibbon(from, to, strength, reverseStrength, scale);

const region = (x, y, regionNo = 1) => ({ point: { x, y }, nodeRadius: 15, regionNo });
function coordinates(path) {
  const tokens = path.match(/[MLCQZ]|-?\d+(?:\.\d+)?/g);
  const points = [];
  let index = 0;
  let current;
  const point = () => ({ x: Number(tokens[index++]), y: Number(tokens[index++]) });
  while (index < tokens.length) {
    const command = tokens[index++];
    if (command === "M" || command === "L") {
      current = point();
      points.push(current);
    } else if (command === "C" || command === "Q") {
      const start = current;
      const a = point();
      const b = point();
      const end = command === "C" ? point() : b;
      for (let sample = 1; sample <= 100; sample += 1) {
        const t = sample / 100, inv = 1 - t;
        points.push(command === "C" ? {
          x: inv ** 3 * start.x + 3 * inv ** 2 * t * a.x + 3 * inv * t ** 2 * b.x + t ** 3 * end.x,
          y: inv ** 3 * start.y + 3 * inv ** 2 * t * a.y + 3 * inv * t ** 2 * b.y + t ** 3 * end.y,
        } : {
          x: inv ** 2 * start.x + 2 * inv * t * a.x + t ** 2 * end.x,
          y: inv ** 2 * start.y + 2 * inv * t * a.y + t ** 2 * end.y,
        });
      }
      current = end;
    }
  }
  return points;
}

function sourceWidth(points) {
  return Math.hypot(points[0].x - points.at(-1).x, points[0].y - points.at(-1).y);
}

// Measure the actual filled contour on lines normal to the rendered centerline.
// A curved ribbon's screen-vertical bounding box is not its thickness.
function normalWidths(ribbon) {
  const outline = coordinates(ribbon.taperedArrowPath);
  const center = coordinates(ribbon.path);
  const widths = [];
  const cross = (a, b) => a.x * b.y - a.y * b.x;
  for (let i = 2; i <= 96; i += 2) {
    const current = center[i];
    const tangent = { x: center[i + 1].x - center[i - 1].x, y: center[i + 1].y - center[i - 1].y };
    const length = Math.hypot(tangent.x, tangent.y);
    const normal = { x: -tangent.y / length, y: tangent.x / length };
    const hits = [];
    for (let j = 0; j < outline.length; j += 1) {
      const a = outline[j], b = outline[(j + 1) % outline.length];
      const segment = { x: b.x - a.x, y: b.y - a.y };
      const denominator = cross(segment, normal);
      if (Math.abs(denominator) < 1e-10) continue;
      const u = cross({ x: current.x - a.x, y: current.y - a.y }, normal) / denominator;
      if (u >= 0 && u <= 1) hits.push((a.x + u * segment.x - current.x) * normal.x + (a.y + u * segment.y - current.y) * normal.y);
    }
    assert.ok(hits.length >= 2, "each centerline section must cross both boundaries");
    widths.push(Math.max(...hits) - Math.min(...hits));
  }
  return widths;
}

for (const [dx, dy] of [[260, 0], [85, 0], [0, 220], [-180, 130]]) {
  test(`ribbon thickness only decreases from the existing source aperture for ${dx},${dy}`, () => {
    const ribbon = createFlowRibbon(region(0, 0), region(dx, dy, 2), 1, 1);
    let previous = sourceWidth(coordinates(ribbon.taperedArrowPath));
    for (const width of normalWidths(ribbon)) {
      assert.ok(width <= previous + 0.06, `thickness increased from ${previous.toFixed(3)} to ${width.toFixed(3)}`);
      previous = width;
    }
    assert.ok(previous < 2, "flow must finish in a fine tip");
  });
}

test("the outer flank travels a longer complete arc from the source to the shared tip", () => {
  const ribbon = createFlowRibbon(region(0, 0), region(260, 0, 2), 1, 1);
  const points = coordinates(ribbon.taperedArrowPath);
  const tipIndex = points.findIndex(point => Math.hypot(point.x - ribbon.gradientEnd.x, point.y - ribbon.gradientEnd.y) < 0.02);
  assert.ok(tipIndex > 0 && tipIndex < points.length - 1);
  const length = (section) => section.slice(1).reduce((total, point, i) => total + Math.hypot(point.x - section[i].x, point.y - section[i].y), 0);
  assert.ok(length(points.slice(0, tipIndex + 1)) > length(points.slice(tipIndex)) * 1.05, "outer flank must have its own longer route instead of sharing the old body's shape");
});

test("the wider source aperture is attached inside the adjacent node ring", () => {
  const from = region(0, 0);
  const ribbon = createFlowRibbon(from, region(260, 0, 2), 1, 1);
  for (const path of [ribbon.taperedArrowPath, ribbon.path]) {
    const start = coordinates(path)[0];
    assert.ok(Math.hypot(start.x, start.y) < from.nodeRadius * 1.42 * 0.95, "source must begin inside the adjacent ring instead of ending in a detached fan");
  }
  const innerRoot = coordinates(ribbon.taperedArrowPath).at(-1);
  assert.ok(Math.hypot(innerRoot.x, innerRoot.y) < from.nodeRadius * 1.42 * 0.95, "both wide edges must extend inside the adjacent ring");
  assert.ok(sourceWidth(coordinates(ribbon.taperedArrowPath)) > from.nodeRadius * 1.95, "use the adjacent ring for a larger tail aperture than the core-based width");
  assert.ok(Math.hypot(ribbon.gradientStart.x, ribbon.gradientStart.y) < from.nodeRadius, "gradient must follow the extension back to the node");
});

// A direction reversal must put the *filled silhouettes*, not just their
// centerlines, on opposite sides of the region-to-region baseline.
for (const [dx, dy] of [[220, 0], [0, 220], [-180, 130]]) {
  test(`reciprocal filled ribbons stay separated for displacement ${dx},${dy}`, () => {
    const from = region(20, 30, 1);
    const to = region(20 + dx, 30 + dy, 2);
    const forward = createFlowRibbon(from, to, 1, 0.9);
    const reverse = createFlowRibbon(to, from, 0.9, 1);
    const distance = Math.hypot(dx, dy);
    const side = (point) => (dx * (point.y - from.point.y) - dy * (point.x - from.point.x)) / distance;
    assert.ok(Math.min(...coordinates(forward.taperedArrowPath).map(side)) >= 2, "forward silhouette needs a clear gap from baseline");
    assert.ok(Math.max(...coordinates(reverse.taperedArrowPath).map(side)) <= -2, "reverse silhouette must occupy the opposite lane");
  });
}

test("short routes keep their broad tails within a compact corridor", () => {
  const from = region(0, 0, 1);
  const to = region(85, 0, 2);
  const ribbon = createFlowRibbon(from, to, 1, 1);
  const points = coordinates(ribbon.taperedArrowPath);
  assert.ok(points.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y)));
  assert.ok(Math.max(...points.map(({ y }) => Math.abs(y))) <= 85 * 0.55, "short routes must not balloon into large arcs");
  assert.ok(Math.min(...points.map(({ y }) => y)) >= 1, "short reciprocal ribbons must remain on their own sides");
});

test("a strong flow keeps a broad tail and ends in a tip near its destination", () => {
  const ribbon = createFlowRibbon(region(0, 0), region(260, 0, 2), 1, 1);
  const points = coordinates(ribbon.taperedArrowPath);
  assert.ok(sourceWidth(points) >= 20, "retain the existing broad source aperture as the maximum thickness");
  assert.ok(points.some(({ x, y }) => Math.hypot(x - 260, y) < 26), "tip must reach the destination node perimeter");
});

test("flow strength changes the taper while preserving the existing source aperture", () => {
  const from = region(0, 0);
  const to = region(260, 0, 2);
  const weakRibbon = createFlowRibbon(from, to, 0.1, 1);
  const strongRibbon = createFlowRibbon(from, to, 1, 0.1);
  const weak = coordinates(weakRibbon.taperedArrowPath);
  const strong = coordinates(strongRibbon.taperedArrowPath);
  assert.ok(Math.abs(sourceWidth(strong) - sourceWidth(weak)) < 0.02, "the existing tail aperture is fixed, even for weak flows");
  assert.ok(normalWidths(strongRibbon)[24] > normalWidths(weakRibbon)[24] * 1.3, "stronger flows must retain a broader middle without exceeding their tail width");
  assert.ok(Math.min(...strong.map(({ y }) => y)) >= 2);
});

test("symbol compensation preserves separated silhouettes under map scaling", () => {
  const scale = 0.2;
  const from = { point: { x: 0, y: 0 }, nodeRadius: 3 };
  const to = { point: { x: 44, y: 0 }, nodeRadius: 3 };
  const forward = createFlowRibbon(from, to, 1, 1, scale);
  const reverse = createFlowRibbon(to, from, 1, 1, scale);
  assert.ok(Math.min(...coordinates(forward.taperedArrowPath).map(({ y }) => y)) >= 0.4);
  assert.ok(Math.max(...coordinates(reverse.taperedArrowPath).map(({ y }) => y)) <= -0.4);
});
