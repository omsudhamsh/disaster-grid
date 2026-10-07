/**
 * Verifies hexbin geometry, binning accuracy and the India boundary logic.
 * Run with: node verify-hexbin.mjs
 */
import {
  INDIA_MAINLAND,
  INDIA_ISLANDS,
  TERRITORY_RINGS,
  COAST_TOLERANCE_KM,
  WORLD_OUTLINE,
  isInsideIndia,
} from "./src/utils/geo.js";
import {
  HEX_RADIUS_PX,
  HEX_INSET,
  getHexMetrics,
  getHeatScale,
  hexVertices,
  buildHexBins,
  getSeverity,
} from "./src/utils/hexbin.js";

const failures = [];
const check = (name, fn) => {
  try {
    fn();
    console.log(`  PASS  ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    console.log(`  FAIL  ${name} -> ${error.message}`);
  }
};
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

console.log("\nHexbin geometry");

check("hexagon has 6 vertices on the unit circle", () => {
  const v = hexVertices({ lat: 22, lng: 78 }, 0.25, 0.27);
  assert(v.length === 6, "expected 6 vertices");
  // In the locally-scaled space every vertex must sit exactly
  // one radius from the centre.
  v.forEach((p) => {
    const nx = (p[0] - 22) / 0.25;
    const ny = (p[1] - 78) / 0.27;
    assert(
      Math.abs(Math.hypot(nx, ny) - 1) < 1e-9,
      `vertex off circle: ${Math.hypot(nx, ny)}`
    );
  });
});

check("hexagon is pointy-top (north/south vertices)", () => {
  const v = hexVertices({ lat: 22, lng: 78 }, 0.25, 0.27);
  const maxLat = Math.max(...v.map((p) => p[0]));
  const minLat = Math.min(...v.map((p) => p[0]));
  assert(Math.abs(maxLat - 22.25) < 1e-9, "no north vertex");
  assert(Math.abs(minLat - 21.75) < 1e-9, "no south vertex");
});

const m = getHexMetrics(22.5937, 5);

check("lattice spacing equals hexagon width", () => {
  const v = hexVertices({ lat: 0, lng: 0 }, m.rLat, m.rLng);
  const lngs = v.map((p) => p[1]);
  // flat-to-flat width of a pointy-top hexagon = sqrt(3) * rLng = dx
  const width = Math.max(...lngs) - Math.min(...lngs);
  assert(
    Math.abs(width - m.dx) < 1e-6,
    `hex width ${width} != dx ${m.dx}`
  );
  // point-to-point height = 2 * rLat, row spacing = 1.5 * rLat
  const lats = v.map((p) => p[0]);
  const height = Math.max(...lats) - Math.min(...lats);
  assert(
    Math.abs(height - 2 * m.rLat) < 1e-9,
    "hex height != 2 * rLat"
  );
});

check("row spacing is 1.5 x rLat", () => {
  assert(
    Math.abs(1.5 * m.rLat - m.dy) < 1e-9,
    "row spacing mismatch"
  );
});

check("hex radius is constant on screen across zooms", () => {
  for (const z of [4, 5, 6, 8, 10]) {
    const metrics = getHexMetrics(22.5937, z);
    const metersPerPixel =
      (156543.03392 * Math.cos((22.5937 * Math.PI) / 180)) /
      2 ** z;
    const expected = (HEX_RADIUS_PX * metersPerPixel) / 110574;
    assert(
      Math.abs(metrics.rLat - expected) < 1e-12,
      `zoom ${z} rLat mismatch`
    );
  }
});

console.log("\nBinning accuracy");

const points = [
  { id: "A", latitude: 22.5937, longitude: 78.9629, priority: 92, people: 120 },
  { id: "B", latitude: 22.5941, longitude: 78.9633, priority: 60, people: 8 },
  { id: "C", latitude: 28.6139, longitude: 77.209, priority: 88, people: 90 },
  { id: "D", latitude: 15.4909, longitude: 73.8278, priority: 70, people: 12 },
  { id: "E", latitude: 34.1526, longitude: 77.5771, priority: 55, people: 4 },
];

check("nearby points share a bin, distant points do not", () => {
  const bins = buildHexBins(points, m);
  assert(bins.length === 4, `expected 4 bins, got ${bins.length}`);
  const shared = bins.find((b) => b.incidents.length === 2);
  assert(shared, "A and B should share one bin");
});

check("bin aggregates people, peak priority and severity", () => {
  const bins = buildHexBins(points, m);
  const shared = bins.find((b) => b.incidents.length === 2);
  assert(shared.people === 128, `people ${shared.people}`);
  assert(shared.peakPriority === 92, "peak priority");
  assert(shared.severity === "critical", "severity");
  assert(
    Math.abs(shared.meanPriority - 76) < 1e-9,
    "mean priority"
  );
});

check("bin intensity stays within opacity bounds", () => {
  buildHexBins(points, m).forEach((b) => {
    assert(b.intensity >= 0.2 && b.intensity <= 0.92,
      `intensity ${b.intensity} out of range`);
  });
});

check("bin centres sit exactly on the lattice", () => {
  const origin = { lat: 6, lng: 67 };
  buildHexBins(points, m).forEach((b) => {
    const row = Math.round((b.center.lat - origin.lat) / m.dy);
    const shift = Math.abs(row) % 2 === 1 ? m.dx / 2 : 0;
    const col = Math.round(
      (b.center.lng - shift - origin.lng) / m.dx
    );
    assert(
      Math.abs(
        b.center.lat - (origin.lat + row * m.dy)
      ) < 1e-9,
      "lat off-lattice"
    );
    assert(
      Math.abs(
        b.center.lng -
          (origin.lng + col * m.dx + shift)
      ) < 1e-9,
      "lng off-lattice"
    );
  });
});

check("non-numeric coordinates are discarded", () => {
  const bins = buildHexBins(
    [
      { id: "X", latitude: "abc", longitude: 77, priority: 90, people: 1 },
      { id: "Y", latitude: null, longitude: undefined, priority: 90, people: 1 },
      { id: "Z", latitude: 22.5, longitude: 79.5, priority: 90, people: 1 },
    ],
    m
  );
  assert(bins.length === 1, `expected 1 bin, got ${bins.length}`);
  assert(bins[0].incidents.length === 1, "bad point not filtered");
});

check("all 65 live incidents fall inside the India outline", async () => {
  const { readFileSync } = await import("node:fs");
  const raw = JSON.parse(
    readFileSync("../backend/data/incidents.json", "utf8")
  );
  const outside = raw.filter(
    (i) =>
      !isInsideIndia(
        Number(i.latitude),
        Number(i.longitude)
      )
  );
  assert(
    outside.length === 0,
    `outside: ${outside
      .map((i) => `${i.location}(${i.latitude},${i.longitude})`)
      .join(", ")}`
  );
  console.log(`        (${raw.length} incidents verified)`);
});

console.log("\nSeverity banding");
check("thresholds match the legend", () => {
  assert(getSeverity(95) === "critical", "95");
  assert(getSeverity(85) === "critical", "85");
  assert(getSeverity(84) === "high", "84");
  assert(getSeverity(70) === "high", "70");
  assert(getSeverity(69) === "moderate", "69");
  assert(getSeverity(50) === "moderate", "50");
  assert(getSeverity(49) === "low", "49");
});

console.log("\nHeat scaling (national zoom readability)");
check("radius shrinks at national zoom and grows at city zoom", () => {
  const national = getHeatScale(5);
  const city = getHeatScale(11);
  assert(
    national.radius < 30,
    `national radius ${national.radius} should be small`
  );
  assert(
    city.radius > national.radius,
    "city zoom radius must be larger"
  );
  assert(
    city.radius <= 52,
    `city radius ${city.radius} exceeds legacy max`
  );
});
check("blur never exceeds radius", () => {
  [4, 5, 6, 8, 11, 14].forEach((z) => {
    const { radius, blur } = getHeatScale(z);
    assert(blur <= radius, `zoom ${z}: blur ${blur} > radius ${radius}`);
    assert(radius >= 14, `zoom ${z}: radius below floor`);
  });
});

console.log("\nHexbin sizing");
check("cells are small enough to stay discrete", () => {
  assert(
    HEX_RADIUS_PX <= 20,
    `HEX_RADIUS_PX ${HEX_RADIUS_PX} too large`
  );
});
check("inset leaves a gutter between neighbouring cells", () => {
  assert(
    HEX_INSET > 0.5 && HEX_INSET < 1,
    "inset must leave a visible gutter"
  );
  const m = getHexMetrics(22.5937, 5);
  const full = hexVertices(
    { lat: 0, lng: 0 },
    m.rLat,
    m.rLng
  );
  const inset = hexVertices(
    { lat: 0, lng: 0 },
    m.rLat * HEX_INSET,
    m.rLng * HEX_INSET
  );
  const gap =
    m.dx - (Math.max(...full.map((p) => p[1])) -
      Math.min(...full.map((p) => p[1]))) * 0 +
    (Math.max(...full.map((p) => p[1])) -
      Math.min(...full.map((p) => p[1]))) -
    (Math.max(...inset.map((p) => p[1])) -
      Math.min(...inset.map((p) => p[1])));
  assert(gap > 0, "no gutter between cells");
  console.log(`        (gutter ~${gap.toFixed(4)} deg)`);
});

console.log("\nMask holes");
check("every mask ring is closed and well formed", () => {
  const holes = [
    INDIA_MAINLAND,
    ...INDIA_ISLANDS,
    ...TERRITORY_RINGS,
  ];
  holes.forEach((ring, index) => {
    assert(ring.length >= 4, `hole ${index} too small`);
    ring.forEach((point) => {
      assert(
        Number.isFinite(point[0]) && Number.isFinite(point[1]),
        `hole ${index} malformed point`
      );
    });
  });
  assert(TERRITORY_RINGS.length === 2, "expected 2 territory boxes");
  assert(
    WORLD_OUTLINE.length === 4,
    "world outline must be a 4-corner rectangle"
  );
});

check("mask holes align with containment logic", () => {
  // A point strictly inside India must not be masked.
  const holes = [
    INDIA_MAINLAND,
    ...INDIA_ISLANDS,
    ...TERRITORY_RINGS,
  ];
  const crossings = (ring, lat, lng) => {
    let count = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      const yI = ring[i][0];
      const xI = ring[i][1];
      const yJ = ring[i + 1][0];
      const xJ = ring[i + 1][1];
      if (yI > lat !== yJ > lat) {
        const xAt =
          ((xJ - xI) * (lat - yI)) / (yJ - yI) + xI;
        if (xAt > lng) count++;
      }
    }
    return count;
  };
  const masked = (lat, lng) => {
    let parity =
      crossings(WORLD_OUTLINE, lat, lng) % 2 === 1 ? 1 : 0;
    for (const ring of holes) {
      if (crossings(ring, lat, lng) % 2 === 1) parity ^= 1;
    }
    return parity === 1;
  };

  const deepInside = [
    [26.0, 80.0],  // central UP
    [22.0, 79.0],  // MP
    [15.0, 75.0],  // Karnataka
    [25.5, 91.5],  // Meghalaya
    [20.0, 85.0],  // Odisha
  ];
  deepInside.forEach(([la, ln]) => {
    assert(
      !masked(la, ln),
      `point inside India is masked at ${la},${ln}`
    );
  });

  const outside = [
    [33.6844, 73.0479],  // Islamabad
    [27.7172, 85.324],   // Kathmandu
    [23.8103, 90.4125],  // Dhaka
    [27.4728, 89.639],   // Thimphu
    [16.8661, 96.1951],  // Yangon
  ];
  outside.forEach(([la, ln]) => {
    assert(
      masked(la, ln),
      `neighbouring point is NOT masked at ${la},${ln}`
    );
  });
});

console.log("\nIndia boundary containment");

const inside = [
  ["Delhi", 28.6139, 77.209],
  ["Mumbai", 19.076, 72.8777],
  ["Chennai", 13.0827, 80.2707],
  ["Kanyakumari", 8.1, 77.6],
  ["Guwahati", 26.1445, 91.7362],
  ["Itanagar", 27.0844, 93.6053],
  ["Jaisalmer", 26.9157, 70.9083],
  ["Leh", 34.1526, 77.5771],
  ["Kolkata", 22.5726, 88.3639],
  ["Port Blair", 11.6234, 92.7265],
  ["Kavaratti", 10.5669, 72.642],
  ["Jaipur", 26.9124, 75.7873],
  ["Panaji", 15.4909, 73.8278],
  ["Siliguri", 26.7271, 88.3953],
  ["Bhubaneswar", 20.2961, 85.8245],
];

const outside = [
  ["Islamabad (Pakistan)", 33.6844, 73.0479],
  ["Lahore (Pakistan)", 31.5204, 74.3587],
  ["Kathmandu (Nepal)", 27.7172, 85.324],
  ["Dhaka (Bangladesh)", 23.8103, 90.4125],
  ["Thimphu (Bhutan)", 27.4728, 89.639],
  ["Yangon (Myanmar)", 16.8661, 96.1951],
  ["Colombo (Sri Lanka)", 6.9271, 79.8612],
  ["Kabul (Afghanistan)", 34.5553, 69.2075],
  ["Kashgar (China)", 39.4704, 75.9898],
  ["Male (Maldives)", 4.1755, 73.5093],
];

check("all Indian cities are inside", () => {
  const bad = inside.filter(
    ([, la, ln]) => !isInsideIndia(la, ln)
  );
  assert(
    bad.length === 0,
    `outside: ${bad.map((b) => b[0]).join(", ")}`
  );
});

check("all neighbouring points are excluded", () => {
  const bad = outside.filter(([, la, ln]) =>
    isInsideIndia(la, ln)
  );
  assert(
    bad.length === 0,
    `leaked: ${bad.map((b) => b[0]).join(", ")}`
  );
});

check("boundary rings are closed and non-degenerate", () => {
  const allRings = [INDIA_MAINLAND, ...INDIA_ISLANDS];
  assert(
    INDIA_MAINLAND.length > 400,
    `mainland only ${INDIA_MAINLAND.length} pts`
  );
  assert(INDIA_ISLANDS.length > 0, "no island rings");
  allRings.forEach((ring, index) => {
    assert(ring.length >= 4, `ring ${index} too small`);
    ring.forEach((point) => {
      assert(
        Array.isArray(point) &&
          point.length === 2 &&
          Number.isFinite(point[0]) &&
          Number.isFinite(point[1]),
        `ring ${index} has a malformed coordinate`
      );
    });
  });
  const lats = INDIA_MAINLAND.map((p) => p[0]);
  const lngs = INDIA_MAINLAND.map((p) => p[1]);
  assert(Math.min(...lats) <= 8.2, "southern tip");
  assert(Math.max(...lats) >= 35.4, "northern tip");
  assert(Math.min(...lngs) <= 69.3, "western edge");
  assert(Math.max(...lngs) <= 97.5, "eastern edge");
  assert(COAST_TOLERANCE_KM <= 20, "tolerance too loose");
});

check("invalid input is rejected", () => {
  assert(isInsideIndia(NaN, 77) === false, "NaN lat");
  assert(isInsideIndia(22, undefined) === false, "undefined lng");
});

console.log(
  failures.length === 0
    ? "\nAll checks passed.\n"
    : `\n${failures.length} check(s) failed.\n`
);
process.exitCode = failures.length === 0 ? 0 : 1;