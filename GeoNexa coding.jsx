/**
 * GeoNexa — Complete Civil Engineering & Land Surveying Application
 * React + Tailwind CSS + localStorage (fully offline capable)
 *
 * MODULES:
 * 1. Dashboard
 * 2. Coordinate Input System (with live GPS)
 * 3. Distance Calculator
 * 4. Area Calculator (Shoelace formula)
 * 5. RL/Elevation Calculator (HI & Rise-Fall methods)
 * 6. Traverse Survey Calculator (with Bowditch adjustment)
 * 7. Unit Converter
 * 8. Map View (Leaflet + OpenStreetMap)
 * 9. Drawing / Plotting Tool (SVG canvas)
 * 10. Data Export (CSV, JSON, Print)
 * 11. Contour / Elevation Visualizer
 * 12. Total Station CSV Import
 * 13. Weather Section (placeholder, API-ready)
 * 14. AI Survey Check (error detection)
 * 15. Team Collaboration (local, Firebase-ready)
 */

import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONSTANTS & CONVERSIONS ─────────────────────────────────────────────────
const SQ_M_TO_ACRE = 1 / 4046.8564224;
const SQ_M_TO_HECTARE = 1 / 10000;
const SQ_M_TO_KANAL = 1 / 505.857;
const SQ_M_TO_MARLA = 1 / 25.2929;
const SQ_M_TO_SQFT = 10.7639;
const M_TO_FT = 3.28084;

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: "🏠" },
  { id: "coordinates", label: "Coordinates", icon: "📍" },
  { id: "distance", label: "Distance", icon: "📏" },
  { id: "area", label: "Area", icon: "🔷" },
  { id: "rl", label: "RL / Leveling", icon: "📐" },
  { id: "traverse", label: "Traverse", icon: "🧭" },
  { id: "converter", label: "Converter", icon: "🔄" },
  { id: "map", label: "Map View", icon: "🗺️" },
  { id: "plot", label: "Plot", icon: "📊" },
  { id: "export", label: "Export", icon: "💾" },
  { id: "contour", label: "Contour", icon: "🏔️" },
  { id: "import", label: "Import TS", icon: "📥" },
  { id: "weather", label: "Weather", icon: "⛅" },
  { id: "aicheck", label: "AI Check", icon: "🤖" },
  { id: "team", label: "Team", icon: "👥" },
];

// ─── UTILITY FUNCTIONS ────────────────────────────────────────────────────────
const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;
const round = (n, d = 4) => Math.round(n * 10 ** d) / 10 ** d;

function calcHorizontalDist(p1, p2) {
  const dE = (p2.easting || 0) - (p1.easting || 0);
  const dN = (p2.northing || 0) - (p1.northing || 0);
  return Math.sqrt(dE * dE + dN * dN);
}

function calcSlopeArea(points) {
  // Shoelace formula
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += (points[i].easting || 0) * (points[j].northing || 0);
    area -= (points[j].easting || 0) * (points[i].northing || 0);
  }
  return Math.abs(area) / 2;
}

// ─── LOCAL STORAGE HOOKS ──────────────────────────────────────────────────────
function useLocalStorage(key, initial) {
  const [val, setVal] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(val));
  }, [key, val]);
  return [val, setVal];
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Card({ children, className = "" }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 className="text-lg font-bold text-gray-800 mb-4">{children}</h2>;
}

function Input({ label, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>}
      <input
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
        {...props}
      />
    </div>
  );
}

function Select({ label, children, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>}
      <select
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", small = false, className = "" }) {
  const base = "rounded-lg font-semibold transition-all focus:outline-none focus:ring-2";
  const size = small ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-400",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-300",
    danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-400",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-400",
    outline: "border border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-400",
  };
  return (
    <button onClick={onClick} className={`${base} ${size} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

function Badge({ children, color = "blue" }) {
  const colors = {
    blue: "bg-blue-100 text-blue-800",
    green: "bg-emerald-100 text-emerald-800",
    red: "bg-red-100 text-red-800",
    yellow: "bg-yellow-100 text-yellow-800",
    gray: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors[color]}`}>{children}</span>
  );
}

function ResultTable({ headers, rows }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-100">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 text-gray-700">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── 1. DASHBOARD ─────────────────────────────────────────────────────────────
function Dashboard({ points, projects, setActiveTab }) {
  const lastProject = projects[projects.length - 1];
  const quickLinks = [
    { label: "Coordinate System", tab: "coordinates", icon: "📍", color: "from-blue-500 to-blue-700" },
    { label: "Distance Calc", tab: "distance", icon: "📏", color: "from-purple-500 to-purple-700" },
    { label: "Area Calc", tab: "area", icon: "🔷", color: "from-emerald-500 to-emerald-700" },
    { label: "RL Calculator", tab: "rl", icon: "📐", color: "from-amber-500 to-amber-700" },
    { label: "Traverse", tab: "traverse", icon: "🧭", color: "from-rose-500 to-rose-700" },
    { label: "Map View", tab: "map", icon: "🗺️", color: "from-teal-500 to-teal-700" },
    { label: "Export Data", tab: "export", icon: "💾", color: "from-indigo-500 to-indigo-700" },
    { label: "AI Survey Check", tab: "aicheck", icon: "🤖", color: "from-gray-600 to-gray-800" },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-700 to-blue-500 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🌐</span>
          <div>
            <h1 className="text-2xl font-black tracking-tight">GeoNexa</h1>
            <p className="text-blue-200 text-sm">Civil Engineering & Land Surveying Suite</p>
          </div>
        </div>
        <p className="text-blue-100 text-sm mt-2">Professional tools for field survey — offline capable</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Survey Points", value: points.length, icon: "📍", color: "text-blue-600" },
          { label: "Projects", value: projects.length, icon: "📁", color: "text-emerald-600" },
          { label: "Last Project", value: lastProject?.name || "None", icon: "🕐", color: "text-amber-600" },
        ].map((stat) => (
          <Card key={stat.label} className="text-center">
            <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
          </Card>
        ))}
      </div>

      {/* Quick Access */}
      <div>
        <SectionTitle>Quick Access</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickLinks.map((ql) => (
            <button
              key={ql.tab}
              onClick={() => setActiveTab(ql.tab)}
              className={`bg-gradient-to-br ${ql.color} text-white rounded-xl p-4 text-left shadow hover:shadow-md transition-all hover:scale-105 active:scale-95`}
            >
              <div className="text-2xl mb-2">{ql.icon}</div>
              <div className="text-xs font-bold">{ql.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Points preview */}
      {points.length > 0 && (
        <div>
          <SectionTitle>Recent Points</SectionTitle>
          <ResultTable
            headers={["ID", "Easting", "Northing", "Elevation", "Desc"]}
            rows={points.slice(-5).map((p) => [p.name, p.easting, p.northing, p.elevation, p.description || "—"])}
          />
        </div>
      )}
    </div>
  );
}

// ─── 2. COORDINATE INPUT ──────────────────────────────────────────────────────
function CoordinateSystem({ points, setPoints }) {
  const [form, setForm] = useState({ name: "", latitude: "", longitude: "", easting: "", northing: "", elevation: "", description: "" });
  const [editIdx, setEditIdx] = useState(null);
  const [gpsStatus, setGpsStatus] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = () => {
    if (!form.name) return alert("Point name is required!");
    if (points.find((p, i) => p.name === form.name && i !== editIdx)) return alert("Duplicate point name!");
    const point = { ...form, id: Date.now() };
    if (editIdx !== null) {
      const updated = [...points];
      updated[editIdx] = point;
      setPoints(updated);
      setEditIdx(null);
    } else {
      setPoints([...points, point]);
    }
    setForm({ name: "", latitude: "", longitude: "", easting: "", northing: "", elevation: "", description: "" });
  };

  const handleEdit = (idx) => {
    setForm(points[idx]);
    setEditIdx(idx);
  };

  const handleDelete = (idx) => {
    setPoints(points.filter((_, i) => i !== idx));
  };

  const getGPS = () => {
    setGpsStatus("Getting GPS...");
    if (!navigator.geolocation) return setGpsStatus("GPS not supported");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: round(pos.coords.latitude, 6),
          longitude: round(pos.coords.longitude, 6),
          elevation: round(pos.coords.altitude || 0, 2),
        }));
        setGpsStatus("✅ GPS acquired");
      },
      () => setGpsStatus("❌ GPS failed")
    );
  };

  return (
    <div className="space-y-5">
      <SectionTitle>Coordinate Input System</SectionTitle>
      <Card>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Input label="Point Name / ID *" name="name" value={form.name} onChange={handleChange} placeholder="e.g. P1" />
          <Input label="Description" name="description" value={form.description} onChange={handleChange} placeholder="Remarks..." />
          <Input label="Latitude" name="latitude" value={form.latitude} onChange={handleChange} type="number" placeholder="e.g. 31.5497" />
          <Input label="Longitude" name="longitude" value={form.longitude} onChange={handleChange} type="number" placeholder="e.g. 74.3436" />
          <Input label="Easting (m)" name="easting" value={form.easting} onChange={handleChange} type="number" placeholder="e.g. 289000" />
          <Input label="Northing (m)" name="northing" value={form.northing} onChange={handleChange} type="number" placeholder="e.g. 3485000" />
          <Input label="Elevation / RL (m)" name="elevation" value={form.elevation} onChange={handleChange} type="number" placeholder="e.g. 212.5" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Btn onClick={handleSave} variant={editIdx !== null ? "success" : "primary"}>
            {editIdx !== null ? "✏️ Update Point" : "💾 Save Point"}
          </Btn>
          <Btn onClick={getGPS} variant="outline">📡 Get GPS Location</Btn>
          {editIdx !== null && <Btn onClick={() => { setEditIdx(null); setForm({ name: "", latitude: "", longitude: "", easting: "", northing: "", elevation: "", description: "" }); }} variant="secondary">Cancel</Btn>}
          {gpsStatus && <span className="text-xs text-gray-500 self-center">{gpsStatus}</span>}
        </div>
      </Card>

      {points.length > 0 && (
        <Card>
          <h3 className="font-bold text-gray-700 mb-3">Saved Points ({points.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {["Name", "Lat", "Lon", "Easting", "Northing", "Elevation", "Desc", "Actions"].map((h) => (
                    <th key={h} className="px-2 py-2 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {points.map((p, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <td className="px-2 py-1.5 font-semibold text-blue-700">{p.name}</td>
                    <td className="px-2 py-1.5">{p.latitude || "—"}</td>
                    <td className="px-2 py-1.5">{p.longitude || "—"}</td>
                    <td className="px-2 py-1.5">{p.easting || "—"}</td>
                    <td className="px-2 py-1.5">{p.northing || "—"}</td>
                    <td className="px-2 py-1.5">{p.elevation || "—"}</td>
                    <td className="px-2 py-1.5 text-gray-500 text-xs">{p.description || "—"}</td>
                    <td className="px-2 py-1.5">
                      <div className="flex gap-1">
                        <Btn small onClick={() => handleEdit(i)} variant="outline">Edit</Btn>
                        <Btn small onClick={() => handleDelete(i)} variant="danger">Del</Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── 3. DISTANCE CALCULATOR ───────────────────────────────────────────────────
function DistanceCalc({ points }) {
  const [mode, setMode] = useState("select"); // select | manual
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [manual1, setManual1] = useState({ easting: "", northing: "", elevation: "" });
  const [manual2, setManual2] = useState({ easting: "", northing: "", elevation: "" });
  const [result, setResult] = useState(null);

  const calculate = () => {
    let pt1, pt2;
    if (mode === "select") {
      pt1 = points.find((p) => p.name === p1);
      pt2 = points.find((p) => p.name === p2);
      if (!pt1 || !pt2) return alert("Select valid saved points");
    } else {
      pt1 = manual1;
      pt2 = manual2;
    }
    const hDist = calcHorizontalDist(pt1, pt2);
    const rlDiff = (parseFloat(pt2.elevation) || 0) - (parseFloat(pt1.elevation) || 0);
    const sDist = Math.sqrt(hDist * hDist + rlDiff * rlDiff);
    setResult({ hDist, rlDiff, sDist });
  };

  return (
    <div className="space-y-5">
      <SectionTitle>Distance Calculator</SectionTitle>
      <Card>
        <div className="flex gap-2 mb-4">
          <Btn small onClick={() => setMode("select")} variant={mode === "select" ? "primary" : "secondary"}>Saved Points</Btn>
          <Btn small onClick={() => setMode("manual")} variant={mode === "manual" ? "primary" : "secondary"}>Manual Entry</Btn>
        </div>

        {mode === "select" ? (
          <div className="grid grid-cols-2 gap-3">
            <Select label="Point 1" value={p1} onChange={(e) => setP1(e.target.value)}>
              <option value="">— Select —</option>
              {points.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
            </Select>
            <Select label="Point 2" value={p2} onChange={(e) => setP2(e.target.value)}>
              <option value="">— Select —</option>
              {points.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
            </Select>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-500 uppercase">Point 1</p>
              <Input label="Easting (m)" value={manual1.easting} onChange={(e) => setManual1({ ...manual1, easting: e.target.value })} type="number" />
              <Input label="Northing (m)" value={manual1.northing} onChange={(e) => setManual1({ ...manual1, northing: e.target.value })} type="number" />
              <Input label="Elevation (m)" value={manual1.elevation} onChange={(e) => setManual1({ ...manual1, elevation: e.target.value })} type="number" />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-500 uppercase">Point 2</p>
              <Input label="Easting (m)" value={manual2.easting} onChange={(e) => setManual2({ ...manual2, easting: e.target.value })} type="number" />
              <Input label="Northing (m)" value={manual2.northing} onChange={(e) => setManual2({ ...manual2, northing: e.target.value })} type="number" />
              <Input label="Elevation (m)" value={manual2.elevation} onChange={(e) => setManual2({ ...manual2, elevation: e.target.value })} type="number" />
            </div>
          </div>
        )}

        <Btn onClick={calculate} className="mt-4">Calculate Distance</Btn>
      </Card>

      {result && (
        <Card className="border-l-4 border-blue-500">
          <h3 className="font-bold text-gray-700 mb-3">Results</h3>
          <ResultTable
            headers={["Measurement", "Meters", "Feet"]}
            rows={[
              ["Horizontal Distance", `${round(result.hDist)} m`, `${round(result.hDist * M_TO_FT)} ft`],
              ["RL Difference (Elevation)", `${round(result.rlDiff)} m`, `${round(result.rlDiff * M_TO_FT)} ft`],
              ["Slope Distance", `${round(result.sDist)} m`, `${round(result.sDist * M_TO_FT)} ft`],
            ]}
          />
          <div className="mt-3 flex gap-2 text-sm">
            <span className="font-bold text-blue-700">{round(result.hDist)} m</span>
            <span className="text-gray-400">horizontal</span>
            <span className="mx-1">·</span>
            <span className="font-bold text-emerald-700">{round(result.sDist)} m</span>
            <span className="text-gray-400">slope</span>
          </div>
        </Card>
      )}

      <Card className="bg-blue-50 border-blue-100">
        <p className="text-xs text-blue-700 font-semibold">Formulas Used</p>
        <p className="text-xs text-blue-600 font-mono mt-1">Horizontal = √((E₂−E₁)² + (N₂−N₁)²)</p>
        <p className="text-xs text-blue-600 font-mono">RL Diff = RL₂ − RL₁</p>
        <p className="text-xs text-blue-600 font-mono">Slope = √(Horizontal² + RLDiff²)</p>
      </Card>
    </div>
  );
}

// ─── 4. AREA CALCULATOR ───────────────────────────────────────────────────────
function AreaCalc({ points }) {
  const [selected, setSelected] = useState([]);
  const [manualPoints, setManualPoints] = useState([{ easting: "", northing: "" }]);
  const [mode, setMode] = useState("saved");
  const [result, setResult] = useState(null);

  const togglePoint = (name) => {
    setSelected((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]);
  };

  const addManual = () => setManualPoints([...manualPoints, { easting: "", northing: "" }]);
  const updateManual = (i, field, val) => {
    const updated = [...manualPoints];
    updated[i][field] = val;
    setManualPoints(updated);
  };
  const removeManual = (i) => setManualPoints(manualPoints.filter((_, idx) => idx !== i));

  const calculate = () => {
    let pts;
    if (mode === "saved") {
      pts = selected.map((name) => points.find((p) => p.name === name)).filter(Boolean);
    } else {
      pts = manualPoints.map((p) => ({ easting: parseFloat(p.easting), northing: parseFloat(p.northing) })).filter((p) => !isNaN(p.easting) && !isNaN(p.northing));
    }
    if (pts.length < 3) return alert("Need at least 3 points for area calculation");
    const areaSqM = calcSlopeArea(pts);
    setResult({
      sqm: areaSqM,
      sqft: areaSqM * SQ_M_TO_SQFT,
      acres: areaSqM * SQ_M_TO_ACRE,
      hectares: areaSqM * SQ_M_TO_HECTARE,
      kanals: areaSqM * SQ_M_TO_KANAL,
      marlas: areaSqM * SQ_M_TO_MARLA,
    });
  };

  return (
    <div className="space-y-5">
      <SectionTitle>Area Calculator</SectionTitle>
      <Card>
        <div className="flex gap-2 mb-4">
          <Btn small onClick={() => setMode("saved")} variant={mode === "saved" ? "primary" : "secondary"}>Saved Points</Btn>
          <Btn small onClick={() => setMode("manual")} variant={mode === "manual" ? "primary" : "secondary"}>Manual Points</Btn>
        </div>

        {mode === "saved" ? (
          <div>
            <p className="text-xs text-gray-500 mb-2">Select 3+ points to form polygon (in order):</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {points.map((p) => (
                <button
                  key={p.name}
                  onClick={() => togglePoint(p.name)}
                  className={`px-3 py-1 rounded-full text-sm font-semibold transition-all ${selected.includes(p.name) ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
                >
                  {p.name}
                </button>
              ))}
            </div>
            {selected.length > 0 && (
              <p className="text-xs text-gray-400">Order: {selected.join(" → ")} → {selected[0]}</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {manualPoints.map((mp, i) => (
              <div key={i} className="flex gap-2 items-center">
                <span className="text-xs text-gray-500 w-6">P{i + 1}</span>
                <Input placeholder="Easting" value={mp.easting} onChange={(e) => updateManual(i, "easting", e.target.value)} type="number" />
                <Input placeholder="Northing" value={mp.northing} onChange={(e) => updateManual(i, "northing", e.target.value)} type="number" />
                <Btn small variant="danger" onClick={() => removeManual(i)}>✕</Btn>
              </div>
            ))}
            <Btn small variant="outline" onClick={addManual}>+ Add Point</Btn>
          </div>
        )}

        <Btn onClick={calculate} className="mt-4">Calculate Area</Btn>
      </Card>

      {result && (
        <Card className="border-l-4 border-emerald-500">
          <h3 className="font-bold text-gray-700 mb-3">Area Results</h3>
          <ResultTable
            headers={["Unit", "Value"]}
            rows={[
              ["Square Meters (m²)", `${round(result.sqm, 3)} m²`],
              ["Square Feet (ft²)", `${round(result.sqft, 2)} ft²`],
              ["Acres", `${round(result.acres, 4)} acres`],
              ["Hectares", `${round(result.hectares, 4)} ha`],
              ["Kanals", `${round(result.kanals, 2)} kanals`],
              ["Marlas", `${round(result.marlas, 2)} marlas`],
            ]}
          />
        </Card>
      )}
    </div>
  );
}

// ─── 5. RL / LEVELING CALCULATOR ──────────────────────────────────────────────
function RLCalc() {
  const [method, setMethod] = useState("hi"); // hi | rf
  // HI Method
  const [hiRows, setHiRows] = useState([{ station: "", bs: "", is: "", fs: "", rl: "", remarks: "" }]);
  const [hiResult, setHiResult] = useState([]);
  // Rise & Fall
  const [rfRows, setRfRows] = useState([{ station: "", reading: "", type: "BS" }]);
  const [rfFirstRL, setRfFirstRL] = useState("");
  const [rfResult, setRfResult] = useState([]);

  const addHiRow = () => setHiRows([...hiRows, { station: "", bs: "", is: "", fs: "", rl: "", remarks: "" }]);
  const updateHiRow = (i, f, v) => { const r = [...hiRows]; r[i][f] = v; setHiRows(r); };

  const calcHI = () => {
    const rows = [];
    let currentHI = 0;
    let currentRL = parseFloat(hiRows[0].rl) || 0;

    for (let i = 0; i < hiRows.length; i++) {
      const row = hiRows[i];
      const bs = parseFloat(row.bs) || 0;
      const is_ = parseFloat(row.is) || 0;
      const fs = parseFloat(row.fs) || 0;

      let rl = i === 0 ? currentRL : currentRL;
      let hi = "";

      if (row.bs) {
        currentHI = rl + bs;
        hi = round(currentHI);
      }
      if (row.fs && i > 0) {
        currentRL = currentHI - fs;
        rl = round(currentRL);
      } else if (row.is && i > 0) {
        rl = round(currentHI - is_);
      }

      rows.push({
        station: row.station || `S${i + 1}`,
        bs: row.bs || "—",
        is: row.is || "—",
        fs: row.fs || "—",
        hi: hi || "—",
        rl: round(rl),
        remarks: row.remarks || "",
      });
    }
    setHiResult(rows);
  };

  const addRfRow = () => setRfRows([...rfRows, { station: "", reading: "", type: "IS" }]);
  const updateRfRow = (i, f, v) => { const r = [...rfRows]; r[i][f] = v; setRfRows(r); };

  const calcRF = () => {
    const rows = [];
    let prevReading = parseFloat(rfRows[0].reading) || 0;
    let currentRL = parseFloat(rfFirstRL) || 0;

    for (let i = 0; i < rfRows.length; i++) {
      const row = rfRows[i];
      const reading = parseFloat(row.reading) || 0;
      let rise = "", fall = "";
      let rl = currentRL;

      if (i > 0) {
        const diff = prevReading - reading;
        if (diff > 0) { rise = round(diff); rl = round(currentRL + diff); currentRL = rl; }
        else if (diff < 0) { fall = round(Math.abs(diff)); rl = round(currentRL - Math.abs(diff)); currentRL = rl; }
        else { rl = round(currentRL); }
      }

      rows.push({
        station: row.station || `S${i + 1}`,
        reading: row.reading || "—",
        type: row.type,
        rise: rise || "—",
        fall: fall || "—",
        rl: round(rl),
      });

      prevReading = reading;
    }
    setRfResult(rows);

    // Arithmetic check
    const sumBS = rfRows.filter((r) => r.type === "BS").reduce((a, r) => a + (parseFloat(r.reading) || 0), 0);
    const sumFS = rfRows.filter((r) => r.type === "FS").reduce((a, r) => a + (parseFloat(r.reading) || 0), 0);
    const sumRise = rows.reduce((a, r) => a + (parseFloat(r.rise) || 0), 0);
    const sumFall = rows.reduce((a, r) => a + (parseFloat(r.fall) || 0), 0);
    const check1 = round(sumBS - sumFS);
    const check2 = round(sumRise - sumFall);
    const check3 = round(rows[rows.length - 1].rl - rows[0].rl);
    alert(`Arithmetic Check:\nΣBS − ΣFS = ${check1}\nΣRise − ΣFall = ${check2}\nLast RL − First RL = ${check3}\n${check1 === check2 && check2 === check3 ? "✅ Check OK" : "❌ Check Failed"}`);
  };

  return (
    <div className="space-y-5">
      <SectionTitle>Elevation / RL Calculator</SectionTitle>
      <Card>
        <div className="flex gap-2 mb-4">
          <Btn small onClick={() => setMethod("hi")} variant={method === "hi" ? "primary" : "secondary"}>HI Method</Btn>
          <Btn small onClick={() => setMethod("rf")} variant={method === "rf" ? "primary" : "secondary"}>Rise & Fall</Btn>
        </div>

        {method === "hi" ? (
          <div>
            <div className="overflow-x-auto mb-3">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {["Station", "BS", "IS", "FS", "RL", "Remarks"].map((h) => (
                      <th key={h} className="px-2 py-2 text-left text-xs font-bold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hiRows.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                      {["station", "bs", "is", "fs", "rl", "remarks"].map((f) => (
                        <td key={f} className="px-1 py-1">
                          <input
                            className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                            value={row[f]}
                            onChange={(e) => updateHiRow(i, f, e.target.value)}
                            placeholder={f === "station" ? `S${i + 1}` : ""}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <Btn small variant="outline" onClick={addHiRow}>+ Add Row</Btn>
              <Btn small onClick={calcHI}>Calculate HI</Btn>
            </div>
          </div>
        ) : (
          <div>
            <Input label="Known RL of First Station (m)" value={rfFirstRL} onChange={(e) => setRfFirstRL(e.target.value)} type="number" className="mb-3 w-48" />
            <div className="overflow-x-auto mb-3">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {["Station", "Staff Reading", "Type"].map((h) => (
                      <th key={h} className="px-2 py-2 text-left text-xs font-bold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rfRows.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                      <td className="px-1 py-1"><input className="w-full border border-gray-200 rounded px-2 py-1 text-xs" value={row.station} onChange={(e) => updateRfRow(i, "station", e.target.value)} placeholder={`S${i + 1}`} /></td>
                      <td className="px-1 py-1"><input className="w-full border border-gray-200 rounded px-2 py-1 text-xs" value={row.reading} onChange={(e) => updateRfRow(i, "reading", e.target.value)} type="number" /></td>
                      <td className="px-1 py-1">
                        <select className="w-full border border-gray-200 rounded px-2 py-1 text-xs" value={row.type} onChange={(e) => updateRfRow(i, "type", e.target.value)}>
                          <option>BS</option><option>IS</option><option>FS</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <Btn small variant="outline" onClick={addRfRow}>+ Add Row</Btn>
              <Btn small onClick={calcRF}>Calculate Rise & Fall</Btn>
            </div>
          </div>
        )}
      </Card>

      {hiResult.length > 0 && method === "hi" && (
        <Card>
          <h3 className="font-bold text-gray-700 mb-3">HI Method Results</h3>
          <ResultTable
            headers={["Station", "BS", "IS", "FS", "HI", "RL", "Remarks"]}
            rows={hiResult.map((r) => [r.station, r.bs, r.is, r.fs, r.hi, r.rl, r.remarks])}
          />
        </Card>
      )}

      {rfResult.length > 0 && method === "rf" && (
        <Card>
          <h3 className="font-bold text-gray-700 mb-3">Rise & Fall Results</h3>
          <ResultTable
            headers={["Station", "Reading", "Type", "Rise", "Fall", "RL"]}
            rows={rfResult.map((r) => [r.station, r.reading, r.type, r.rise, r.fall, r.rl])}
          />
        </Card>
      )}
    </div>
  );
}

// ─── 6. TRAVERSE CALCULATOR ───────────────────────────────────────────────────
function TraverseCalc() {
  const [rows, setRows] = useState([{ station: "", bearing: "", distance: "" }]);
  const [startE, setStartE] = useState("0");
  const [startN, setStartN] = useState("0");
  const [result, setResult] = useState(null);

  const addRow = () => setRows([...rows, { station: "", bearing: "", distance: "" }]);
  const updateRow = (i, f, v) => { const r = [...rows]; r[i][f] = v; setRows(r); };

  const calculate = () => {
    const stations = rows.filter((r) => r.bearing && r.distance);
    if (!stations.length) return alert("Enter at least one traverse leg");

    let E = parseFloat(startE) || 0;
    let N = parseFloat(startN) || 0;
    const raw = [];
    let sumLat = 0, sumDep = 0, totalDist = 0;

    for (const s of stations) {
      const bearing = parseFloat(s.bearing);
      const dist = parseFloat(s.distance);
      const rad = toRad(bearing);
      const lat = dist * Math.cos(rad);   // Latitude
      const dep = dist * Math.sin(rad);   // Departure
      E += dep;
      N += lat;
      sumLat += lat;
      sumDep += dep;
      totalDist += dist;
      raw.push({ station: s.station, bearing, distance: dist, lat: round(lat), dep: round(dep), E: round(E), N: round(N) });
    }

    // Closing error
    const closeE = round(E - (parseFloat(startE) || 0));
    const closeN = round(N - (parseFloat(startN) || 0));
    const closingError = Math.sqrt(closeE * closeE + closeN * closeN);
    const precision = totalDist / closingError;

    // Bowditch correction
    const adjusted = raw.map((r) => ({
      ...r,
      corrLat: round(r.lat - (r.distance / totalDist) * sumLat),
      corrDep: round(r.dep - (r.distance / totalDist) * sumDep),
    }));

    // Adjusted coords
    let adjE = parseFloat(startE) || 0;
    let adjN = parseFloat(startN) || 0;
    adjusted.forEach((r) => {
      adjE += r.corrDep;
      adjN += r.corrLat;
      r.adjE = round(adjE);
      r.adjN = round(adjN);
    });

    setResult({ raw, adjusted, closeE, closeN, closingError: round(closingError, 4), precision: round(precision) });
  };

  return (
    <div className="space-y-5">
      <SectionTitle>Traverse Survey Calculator</SectionTitle>
      <Card>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Input label="Starting Easting (m)" value={startE} onChange={(e) => setStartE(e.target.value)} type="number" />
          <Input label="Starting Northing (m)" value={startN} onChange={(e) => setStartN(e.target.value)} type="number" />
        </div>
        <div className="overflow-x-auto mb-3">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Station", "Bearing (°)", "Distance (m)"].map((h) => (
                  <th key={h} className="px-2 py-2 text-left text-xs font-bold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                  <td className="px-1 py-1"><input className="w-full border border-gray-200 rounded px-2 py-1 text-xs" value={row.station} onChange={(e) => updateRow(i, "station", e.target.value)} placeholder={`L${i + 1}`} /></td>
                  <td className="px-1 py-1"><input className="w-full border border-gray-200 rounded px-2 py-1 text-xs" value={row.bearing} onChange={(e) => updateRow(i, "bearing", e.target.value)} type="number" placeholder="0-360" /></td>
                  <td className="px-1 py-1"><input className="w-full border border-gray-200 rounded px-2 py-1 text-xs" value={row.distance} onChange={(e) => updateRow(i, "distance", e.target.value)} type="number" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-2">
          <Btn small variant="outline" onClick={addRow}>+ Add Leg</Btn>
          <Btn small onClick={calculate}>Calculate Traverse</Btn>
        </div>
      </Card>

      {result && (
        <>
          <Card className="border-l-4 border-blue-500">
            <h3 className="font-bold text-gray-700 mb-1">Closing Error</h3>
            <div className="flex gap-4 text-sm flex-wrap">
              <span>ΔE: <strong>{result.closeE} m</strong></span>
              <span>ΔN: <strong>{result.closeN} m</strong></span>
              <span>Linear Error: <strong>{result.closingError} m</strong></span>
              <span>Precision: <strong>1 : {result.precision}</strong></span>
              <Badge color={result.precision > 1000 ? "green" : "red"}>
                {result.precision > 1000 ? "✅ Acceptable" : "⚠️ Too High"}
              </Badge>
            </div>
          </Card>
          <Card>
            <h3 className="font-bold text-gray-700 mb-3">Raw Traverse Table</h3>
            <ResultTable
              headers={["Station", "Bearing", "Distance", "Latitude", "Departure", "Easting", "Northing"]}
              rows={result.raw.map((r) => [r.station, `${r.bearing}°`, `${r.distance}m`, r.lat, r.dep, r.E, r.N])}
            />
          </Card>
          <Card>
            <h3 className="font-bold text-gray-700 mb-3">Bowditch Adjusted Coordinates</h3>
            <ResultTable
              headers={["Station", "Corr Lat", "Corr Dep", "Adj Easting", "Adj Northing"]}
              rows={result.adjusted.map((r) => [r.station, r.corrLat, r.corrDep, r.adjE, r.adjN])}
            />
          </Card>
        </>
      )}
    </div>
  );
}

// ─── 7. UNIT CONVERTER ────────────────────────────────────────────────────────
function UnitConverter() {
  const [val, setVal] = useState("");
  const [from, setFrom] = useState("meter");
  const [result, setResult] = useState(null);

  const conversions = {
    meter: { feet: (v) => v * 3.28084, label: "m → ft" },
    feet: { meter: (v) => v / 3.28084, label: "ft → m" },
    sqm_acre: { result: (v) => v * SQ_M_TO_ACRE, label: "m² → acres" },
    acre_sqm: { result: (v) => v / SQ_M_TO_ACRE, label: "acres → m²" },
    ha_acre: { result: (v) => v * 2.47105, label: "ha → acres" },
    acre_ha: { result: (v) => v / 2.47105, label: "acres → ha" },
    deg_rad: { result: (v) => toRad(v), label: "° → rad" },
    rad_deg: { result: (v) => toDeg(v), label: "rad → °" },
    sqm_sqft: { result: (v) => v * SQ_M_TO_SQFT, label: "m² → ft²" },
    sqft_sqm: { result: (v) => v / SQ_M_TO_SQFT, label: "ft² → m²" },
    km_miles: { result: (v) => v * 0.621371, label: "km → miles" },
    miles_km: { result: (v) => v / 0.621371, label: "miles → km" },
    sqm_kanal: { result: (v) => v * SQ_M_TO_KANAL, label: "m² → kanals" },
    sqm_marla: { result: (v) => v * SQ_M_TO_MARLA, label: "m² → marlas" },
  };

  const convert = () => {
    const v = parseFloat(val);
    if (isNaN(v)) return alert("Enter a valid number");
    const conv = conversions[from];
    const fn = conv.feet || conv.meter || conv.result;
    setResult({ value: round(fn(v), 6), label: conv.label });
  };

  return (
    <div className="space-y-5">
      <SectionTitle>Unit Converter</SectionTitle>
      <Card>
        <div className="grid grid-cols-1 gap-3">
          <Input label="Value" value={val} onChange={(e) => setVal(e.target.value)} type="number" placeholder="Enter value..." />
          <Select label="Conversion Type" value={from} onChange={(e) => setFrom(e.target.value)}>
            {Object.entries(conversions).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </Select>
          <Btn onClick={convert}>Convert</Btn>
        </div>
      </Card>
      {result && (
        <Card className="border-l-4 border-emerald-500 text-center">
          <p className="text-xs text-gray-500 mb-1">{result.label}</p>
          <p className="text-3xl font-black text-emerald-700">{result.value}</p>
        </Card>
      )}

      {/* Quick reference table */}
      <Card>
        <h3 className="font-bold text-gray-700 mb-3">Quick Reference</h3>
        <ResultTable
          headers={["Unit", "Equivalent"]}
          rows={[
            ["1 meter", "3.28084 feet"],
            ["1 acre", "4046.856 m²"],
            ["1 hectare", "10,000 m² / 2.47105 acres"],
            ["1 kanal", "505.857 m²"],
            ["1 marla", "25.2929 m²"],
            ["1 mile", "1.60934 km"],
            ["1 radian", "57.2958°"],
            ["1 degree", "0.01745 rad"],
          ]}
        />
      </Card>
    </div>
  );
}

// ─── 8. MAP VIEW (Leaflet) ────────────────────────────────────────────────────
function MapView({ points }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    // Dynamically load Leaflet
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => {
      const L = window.L;
      const lat = points[0]?.latitude ? parseFloat(points[0].latitude) : 31.5;
      const lng = points[0]?.longitude ? parseFloat(points[0].longitude) : 74.3;

      mapInstance.current = L.map(mapRef.current).setView([lat, lng], 14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(mapInstance.current);

      // Add markers
      const latlngs = [];
      points.forEach((p) => {
        if (p.latitude && p.longitude) {
          const m = L.marker([parseFloat(p.latitude), parseFloat(p.longitude)]).addTo(mapInstance.current);
          m.bindPopup(`<b>${p.name}</b><br>E: ${p.easting || "—"}<br>N: ${p.northing || "—"}<br>RL: ${p.elevation || "—"}<br>${p.description || ""}`);
          latlngs.push([parseFloat(p.latitude), parseFloat(p.longitude)]);
        }
      });
      if (latlngs.length > 1) {
        L.polyline(latlngs, { color: "#3b82f6", weight: 2 }).addTo(mapInstance.current);
      }
      setLoaded(true);
    };
    document.head.appendChild(script);
  }, []);

  return (
    <div className="space-y-4">
      <SectionTitle>Map View (OpenStreetMap)</SectionTitle>
      {points.filter((p) => p.latitude && p.longitude).length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
          ⚠️ No points with latitude/longitude saved. Add points with lat/lon in Coordinate Input first.
        </div>
      )}
      <Card className="p-0 overflow-hidden">
        <div ref={mapRef} style={{ height: "450px", width: "100%", borderRadius: "0.75rem" }} />
      </Card>
      {points.length > 0 && (
        <Card>
          <p className="text-xs text-gray-500 font-semibold mb-2">Points on Map</p>
          <div className="flex flex-wrap gap-2">
            {points.filter((p) => p.latitude && p.longitude).map((p) => (
              <Badge key={p.name} color="blue">{p.name} ({p.latitude}, {p.longitude})</Badge>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── 9. PLOTTING TOOL (SVG Canvas) ────────────────────────────────────────────
function PlotTool({ points }) {
  const [selected, setSelected] = useState([]);
  const [showPolygon, setShowPolygon] = useState(true);
  const svgSize = 400;
  const padding = 40;

  const plotPoints = points.filter((p) => p.easting && p.northing).map((p) => ({
    ...p,
    E: parseFloat(p.easting),
    N: parseFloat(p.northing),
  }));

  const filtered = selected.length > 0 ? plotPoints.filter((p) => selected.includes(p.name)) : plotPoints;

  const minE = Math.min(...filtered.map((p) => p.E)) || 0;
  const maxE = Math.max(...filtered.map((p) => p.E)) || 1;
  const minN = Math.min(...filtered.map((p) => p.N)) || 0;
  const maxN = Math.max(...filtered.map((p) => p.N)) || 1;
  const rangeE = maxE - minE || 1;
  const rangeN = maxN - minN || 1;
  const scale = (svgSize - 2 * padding) / Math.max(rangeE, rangeN);

  const toSvg = (E, N) => ({
    x: padding + (E - minE) * scale,
    y: svgSize - padding - (N - minN) * scale,
  });

  const toggle = (name) => setSelected((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]);

  return (
    <div className="space-y-5">
      <SectionTitle>Survey Plot (2D)</SectionTitle>
      <Card>
        <p className="text-xs text-gray-500 mb-2">Select points to plot (default: all):</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {plotPoints.map((p) => (
            <button key={p.name} onClick={() => toggle(p.name)}
              className={`px-2 py-1 rounded-full text-xs font-semibold transition-all ${selected.includes(p.name) ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}>
              {p.name}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mb-3">
          <label className="flex items-center gap-1 text-xs text-gray-600">
            <input type="checkbox" checked={showPolygon} onChange={(e) => setShowPolygon(e.target.checked)} />
            Show Polygon
          </label>
          <Btn small variant="secondary" onClick={() => setSelected([])}>Reset</Btn>
        </div>
      </Card>

      {filtered.length > 0 ? (
        <Card className="p-2">
          <svg width="100%" viewBox={`0 0 ${svgSize} ${svgSize}`} className="border border-gray-100 rounded-lg bg-gray-50">
            {/* Grid */}
            {[0, 1, 2, 3, 4].map((i) => (
              <g key={i}>
                <line x1={padding + i * (svgSize - 2 * padding) / 4} y1={padding} x2={padding + i * (svgSize - 2 * padding) / 4} y2={svgSize - padding} stroke="#e5e7eb" strokeWidth="0.5" />
                <line x1={padding} y1={padding + i * (svgSize - 2 * padding) / 4} x2={svgSize - padding} y2={padding + i * (svgSize - 2 * padding) / 4} stroke="#e5e7eb" strokeWidth="0.5" />
              </g>
            ))}

            {/* Polygon fill */}
            {showPolygon && filtered.length >= 3 && (
              <polygon
                points={filtered.map((p) => { const s = toSvg(p.E, p.N); return `${s.x},${s.y}`; }).join(" ")}
                fill="rgba(59,130,246,0.1)" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4"
              />
            )}

            {/* Lines */}
            {filtered.length > 1 && filtered.map((p, i) => {
              if (i === 0) return null;
              const a = toSvg(filtered[i - 1].E, filtered[i - 1].N);
              const b = toSvg(p.E, p.N);
              return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#6366f1" strokeWidth="1.5" />;
            })}

            {/* Points */}
            {filtered.map((p) => {
              const { x, y } = toSvg(p.E, p.N);
              return (
                <g key={p.name}>
                  <circle cx={x} cy={y} r="5" fill="#ef4444" stroke="white" strokeWidth="2" />
                  <text x={x + 7} y={y - 5} fontSize="10" fill="#1f2937" fontWeight="bold">{p.name}</text>
                  <text x={x + 7} y={y + 5} fontSize="8" fill="#6b7280">{`E:${round(p.E)} N:${round(p.N)}`}</text>
                </g>
              );
            })}

            {/* Axes labels */}
            <text x={svgSize / 2} y={svgSize - 5} textAnchor="middle" fontSize="9" fill="#9ca3af">Easting →</text>
            <text x={8} y={svgSize / 2} textAnchor="middle" fontSize="9" fill="#9ca3af" transform={`rotate(-90, 8, ${svgSize / 2})`}>Northing ↑</text>
          </svg>
        </Card>
      ) : (
        <Card className="text-center text-gray-400 py-8">
          No points with Easting/Northing to plot. Add coordinates first.
        </Card>
      )}
    </div>
  );
}

// ─── 10. DATA EXPORT ──────────────────────────────────────────────────────────
function DataExport({ points, projects }) {
  const [projectName, setProjectName] = useState("Survey Project 1");

  const exportCSV = () => {
    const headers = ["Name", "Latitude", "Longitude", "Easting", "Northing", "Elevation", "Description"];
    const rows = points.map((p) => [p.name, p.latitude, p.longitude, p.easting, p.northing, p.elevation, p.description || ""].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    download(csv, "geosurvey_points.csv", "text/csv");
  };

  const exportJSON = () => {
    const data = JSON.stringify({ projectName, date: new Date().toISOString(), points, projects }, null, 2);
    download(data, "geosurvey_data.json", "application/json");
  };

  const download = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    const w = window.open("", "_blank");
    w.document.write(`
      <html><head><title>GeoNexa Report</title>
      <style>body{font-family:Arial,sans-serif;padding:20px;color:#1f2937}h1{color:#1e40af}table{border-collapse:collapse;width:100%}th,td{border:1px solid #e5e7eb;padding:8px;text-align:left}th{background:#f9fafb;font-weight:bold}@media print{button{display:none}}</style>
      </head><body>
      <h1>🌐 GeoNexa — Field Survey Report</h1>
      <p><strong>Project:</strong> ${projectName}</p>
      <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
      <p><strong>Total Points:</strong> ${points.length}</p>
      <h2>Coordinate Table</h2>
      <table><thead><tr><th>Name</th><th>Latitude</th><th>Longitude</th><th>Easting</th><th>Northing</th><th>Elevation</th><th>Description</th></tr></thead>
      <tbody>${points.map((p) => `<tr><td>${p.name}</td><td>${p.latitude || "—"}</td><td>${p.longitude || "—"}</td><td>${p.easting || "—"}</td><td>${p.northing || "—"}</td><td>${p.elevation || "—"}</td><td>${p.description || "—"}</td></tr>`).join("")}</tbody>
      </table>
      <p style="margin-top:40px;color:#6b7280;font-size:12px">Generated by GeoNexa</p>
      <button onclick="window.print()">🖨️ Print / Save as PDF</button>
      </body></html>`);
    w.document.close();
  };

  return (
    <div className="space-y-5">
      <SectionTitle>Data Export</SectionTitle>
      <Card>
        <Input label="Project Name (for report)" value={projectName} onChange={(e) => setProjectName(e.target.value)} className="mb-4" />
        <div className="grid grid-cols-1 gap-3">
          <button onClick={exportCSV} className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all text-left">
            <span className="text-2xl">📄</span>
            <div>
              <p className="font-bold text-gray-700">Export Coordinates as CSV</p>
              <p className="text-xs text-gray-400">{points.length} points — compatible with Excel, AutoCAD</p>
            </div>
          </button>
          <button onClick={exportJSON} className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all text-left">
            <span className="text-2xl">🗂️</span>
            <div>
              <p className="font-bold text-gray-700">Export Project as JSON</p>
              <p className="text-xs text-gray-400">Full data backup — all points and projects</p>
            </div>
          </button>
          <button onClick={printReport} className="flex items-center gap-3 p-4 border border-emerald-200 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-all text-left">
            <span className="text-2xl">🖨️</span>
            <div>
              <p className="font-bold text-emerald-700">Print / PDF Report</p>
              <p className="text-xs text-emerald-600">Opens printable report — Save as PDF from browser</p>
            </div>
          </button>
        </div>
      </Card>
    </div>
  );
}

// ─── 11. CONTOUR VISUALIZATION ────────────────────────────────────────────────
function ContourView({ points }) {
  const elevPoints = points.filter((p) => p.easting && p.northing && p.elevation);
  if (!elevPoints.length) {
    return (
      <div className="space-y-4">
        <SectionTitle>Contour / Elevation Map</SectionTitle>
        <Card className="text-center py-10 text-gray-400">
          🏔️ No points with Easting, Northing, and Elevation saved.<br />
          Add elevation data in Coordinate Input first.
        </Card>
      </div>
    );
  }

  const minEl = Math.min(...elevPoints.map((p) => parseFloat(p.elevation)));
  const maxEl = Math.max(...elevPoints.map((p) => parseFloat(p.elevation)));
  const range = maxEl - minEl || 1;
  const minE = Math.min(...elevPoints.map((p) => parseFloat(p.easting)));
  const maxE = Math.max(...elevPoints.map((p) => parseFloat(p.easting)));
  const minN = Math.min(...elevPoints.map((p) => parseFloat(p.northing)));
  const maxN = Math.max(...elevPoints.map((p) => parseFloat(p.northing)));
  const rangeE = maxE - minE || 1;
  const rangeN = maxN - minN || 1;
  const svgW = 380, svgH = 300, pad = 40;

  const toColor = (el) => {
    const t = (parseFloat(el) - minEl) / range;
    const r = Math.round(34 + t * 200);
    const g = Math.round(197 - t * 100);
    const b = Math.round(94 - t * 60);
    return `rgb(${r},${g},${b})`;
  };

  const toSvg = (E, N) => ({
    x: pad + ((parseFloat(E) - minE) / rangeE) * (svgW - 2 * pad),
    y: svgH - pad - ((parseFloat(N) - minN) / rangeN) * (svgH - 2 * pad),
  });

  return (
    <div className="space-y-5">
      <SectionTitle>Contour / Elevation Map</SectionTitle>
      <Card>
        <p className="text-xs text-gray-500 mb-2">Color-coded elevation visualization (green = low, red = high)</p>
        <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} className="border border-gray-100 rounded-lg bg-gray-50">
          {elevPoints.map((p) => {
            const { x, y } = toSvg(p.easting, p.northing);
            const color = toColor(p.elevation);
            const r = 12 + ((parseFloat(p.elevation) - minEl) / range) * 8;
            return (
              <g key={p.name}>
                <circle cx={x} cy={y} r={r} fill={color} opacity="0.7" />
                <text x={x} y={y + 4} textAnchor="middle" fontSize="9" fill="white" fontWeight="bold">{p.name}</text>
                <text x={x} y={y + 18} textAnchor="middle" fontSize="8" fill="#374151">{p.elevation}m</text>
              </g>
            );
          })}
        </svg>
        <div className="flex items-center gap-2 mt-2">
          <div className="h-3 flex-1 rounded" style={{ background: "linear-gradient(to right, rgb(34,197,94), rgb(234,97,34))" }} />
          <span className="text-xs text-gray-500">{minEl}m → {maxEl}m</span>
        </div>
      </Card>
      <ResultTable
        headers={["Point", "Easting", "Northing", "Elevation (m)"]}
        rows={elevPoints.map((p) => [p.name, p.easting, p.northing, p.elevation])}
      />
    </div>
  );
}

// ─── 12. TOTAL STATION IMPORT ─────────────────────────────────────────────────
function TSImport({ setPoints }) {
  const [preview, setPreview] = useState([]);
  const [raw, setRaw] = useState("");

  const parseCSV = (text) => {
    const lines = text.trim().split("\n").filter((l) => l.trim());
    const parsed = lines.map((line) => {
      const cols = line.split(/[,\t]/).map((c) => c.trim());
      return {
        name: cols[0] || "",
        easting: cols[1] || "",
        northing: cols[2] || "",
        elevation: cols[3] || "",
        description: cols[4] || "",
        latitude: "",
        longitude: "",
      };
    });
    return parsed.filter((p) => p.name);
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      setRaw(text);
      setPreview(parseCSV(text));
    };
    reader.readAsText(file);
  };

  const importPoints = () => {
    if (!preview.length) return;
    setPoints((prev) => {
      const names = new Set(prev.map((p) => p.name));
      const newPts = preview.filter((p) => !names.has(p.name)).map((p) => ({ ...p, id: Date.now() + Math.random() }));
      alert(`✅ Imported ${newPts.length} new points (${preview.length - newPts.length} duplicates skipped)`);
      return [...prev, ...newPts];
    });
    setPreview([]);
    setRaw("");
  };

  return (
    <div className="space-y-5">
      <SectionTitle>Total Station Data Import</SectionTitle>
      <Card>
        <p className="text-sm text-gray-600 mb-3">Upload a CSV or TXT file with columns: <code className="bg-gray-100 px-1 rounded text-xs">PointID, Easting, Northing, Elevation, Description</code></p>
        <input type="file" accept=".csv,.txt" onChange={handleFile} className="border border-dashed border-gray-300 rounded-lg p-4 w-full text-sm text-gray-500 cursor-pointer" />
        <div className="mt-3">
          <p className="text-xs text-gray-500 mb-1">Or paste data directly:</p>
          <textarea
            className="w-full border border-gray-200 rounded-lg p-2 text-xs font-mono h-20 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={raw}
            onChange={(e) => { setRaw(e.target.value); setPreview(parseCSV(e.target.value)); }}
            placeholder="P1,289100,3485200,212.5,BM1&#10;P2,289250,3485350,215.0,Corner"
          />
        </div>
      </Card>

      {preview.length > 0 && (
        <Card>
          <h3 className="font-bold text-gray-700 mb-3">Preview ({preview.length} points)</h3>
          <ResultTable
            headers={["Name", "Easting", "Northing", "Elevation", "Description"]}
            rows={preview.map((p) => [p.name, p.easting, p.northing, p.elevation, p.description])}
          />
          <Btn onClick={importPoints} className="mt-3" variant="success">✅ Import All Points</Btn>
        </Card>
      )}
    </div>
  );
}

// ─── 13. WEATHER (Placeholder) ────────────────────────────────────────────────
function WeatherSection() {
  // TODO: Connect to OpenWeatherMap API:
  // const API_KEY = "your_key_here";
  // const API_URL = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`;
  const mockData = {
    city: "Lahore, PK",
    temp: 34,
    condition: "Partly Cloudy",
    wind: 18,
    humidity: 55,
    rain: "Low",
    recommendation: "✅ Good conditions for field survey. Carry water and sun protection.",
  };

  return (
    <div className="space-y-5">
      <SectionTitle>Weather — Field Survey Conditions</SectionTitle>
      <div className="bg-gradient-to-br from-sky-400 to-blue-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-sky-200 text-sm">📍 {mockData.city}</p>
            <p className="text-4xl font-black">{mockData.temp}°C</p>
            <p className="text-sky-200">{mockData.condition}</p>
          </div>
          <span className="text-5xl">⛅</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Wind", value: `${mockData.wind} km/h`, icon: "💨" },
            { label: "Humidity", value: `${mockData.humidity}%`, icon: "💧" },
            { label: "Rain Risk", value: mockData.rain, icon: "🌧️" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/20 rounded-xl p-3 text-center">
              <p className="text-xl">{stat.icon}</p>
              <p className="text-white font-bold text-sm">{stat.value}</p>
              <p className="text-sky-200 text-xs">{stat.label}</p>
            </div>
          ))}
        </div>
        <div className="bg-white/20 rounded-xl p-3 mt-3">
          <p className="text-sm font-semibold">Survey Recommendation</p>
          <p className="text-sky-100 text-xs mt-1">{mockData.recommendation}</p>
        </div>
      </div>
      <Card className="bg-amber-50 border-amber-200">
        <p className="text-xs text-amber-700 font-semibold">⚙️ Developer Note</p>
        <p className="text-xs text-amber-600 mt-1">Connect to OpenWeatherMap API by replacing mockData with live API call. API key placeholder is in the source code comments.</p>
      </Card>
    </div>
  );
}

// ─── 14. AI SURVEY CHECK ──────────────────────────────────────────────────────
function AISurveyCheck({ points }) {
  const [warnings, setWarnings] = useState(null);

  const runCheck = () => {
    const issues = [];

    // Missing coordinate values
    points.forEach((p) => {
      if (!p.easting || !p.northing) issues.push({ type: "warning", msg: `Point "${p.name}": Missing Easting/Northing` });
      if (!p.elevation) issues.push({ type: "info", msg: `Point "${p.name}": No elevation/RL entered` });
    });

    // Duplicate names
    const names = points.map((p) => p.name);
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    dupes.forEach((n) => issues.push({ type: "error", msg: `Duplicate point name: "${n}"` }));

    // Unrealistic distance jumps
    for (let i = 1; i < points.length; i++) {
      if (points[i].easting && points[i - 1].easting) {
        const dist = calcHorizontalDist(points[i - 1], points[i]);
        if (dist > 10000) issues.push({ type: "warning", msg: `Large distance jump between ${points[i - 1].name} and ${points[i].name}: ${round(dist)} m` });
      }
    }

    // Not enough points for area
    if (points.length > 0 && points.length < 3) {
      issues.push({ type: "info", msg: "Less than 3 points — cannot calculate area" });
    }

    if (issues.length === 0) issues.push({ type: "success", msg: "✅ No issues found. Survey data looks clean!" });

    setWarnings(issues);
  };

  const colors = {
    error: "bg-red-50 border-red-300 text-red-700",
    warning: "bg-amber-50 border-amber-300 text-amber-700",
    info: "bg-blue-50 border-blue-300 text-blue-700",
    success: "bg-emerald-50 border-emerald-300 text-emerald-700",
  };

  const icons = { error: "❌", warning: "⚠️", info: "ℹ️", success: "✅" };

  return (
    <div className="space-y-5">
      <SectionTitle>🤖 AI Survey Check</SectionTitle>
      <Card>
        <p className="text-sm text-gray-600 mb-3">Automatically checks your survey data for common errors, missing values, and anomalies.</p>
        <Btn onClick={runCheck}>Run AI Check ({points.length} points)</Btn>
      </Card>

      {warnings && (
        <div className="space-y-2">
          {warnings.map((w, i) => (
            <div key={i} className={`flex items-start gap-2 border rounded-lg p-3 text-sm ${colors[w.type]}`}>
              <span>{icons[w.type]}</span>
              <span>{w.msg}</span>
            </div>
          ))}
        </div>
      )}

      <Card className="bg-gray-50">
        <p className="text-xs font-bold text-gray-500 mb-2">Checks Performed</p>
        {["Missing coordinate values", "Duplicate point names", "Unrealistic distance jumps (>10km)", "Missing RL/elevation values", "Minimum points for area calculation"].map((c) => (
          <p key={c} className="text-xs text-gray-500 flex items-center gap-1"><span>🔍</span>{c}</p>
        ))}
      </Card>
    </div>
  );
}

// ─── 15. TEAM COLLABORATION ───────────────────────────────────────────────────
function TeamCollab() {
  // TODO: Connect to Firebase Firestore for real-time sync
  const [members, setMembers] = useLocalStorage("gnx_team_members", [
    { name: "Ahmed Khan", role: "Admin", status: "Active" },
    { name: "Sara Malik", role: "Surveyor", status: "Active" },
  ]);
  const [tasks, setTasks] = useLocalStorage("gnx_tasks", [
    { text: "Set up traverse stations", done: false },
    { text: "Record benchmark elevations", done: true },
  ]);
  const [notes, setNotes] = useLocalStorage("gnx_notes", "");
  const [newMember, setNewMember] = useState({ name: "", role: "Surveyor" });
  const [newTask, setNewTask] = useState("");

  const addMember = () => {
    if (!newMember.name) return;
    setMembers([...members, { ...newMember, status: "Active" }]);
    setNewMember({ name: "", role: "Surveyor" });
  };

  const toggleTask = (i) => {
    const updated = [...tasks];
    updated[i].done = !updated[i].done;
    setTasks(updated);
  };

  const addTask = () => {
    if (!newTask) return;
    setTasks([...tasks, { text: newTask, done: false }]);
    setNewTask("");
  };

  return (
    <div className="space-y-5">
      <SectionTitle>👥 Team Collaboration</SectionTitle>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
        ⚙️ Currently local/offline. Firebase Firestore connection points are marked in the source code for future real-time sync.
      </div>

      {/* Members */}
      <Card>
        <h3 className="font-bold text-gray-700 mb-3">Project Members</h3>
        {members.map((m, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                {m.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">{m.name}</p>
                <p className="text-xs text-gray-400">{m.status}</p>
              </div>
            </div>
            <Badge color={m.role === "Admin" ? "blue" : m.role === "Surveyor" ? "green" : "gray"}>{m.role}</Badge>
          </div>
        ))}
        <div className="flex gap-2 mt-3">
          <input className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-400" value={newMember.name} onChange={(e) => setNewMember({ ...newMember, name: e.target.value })} placeholder="Member name" />
          <select className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" value={newMember.role} onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}>
            <option>Admin</option><option>Surveyor</option><option>Viewer</option>
          </select>
          <Btn small onClick={addMember}>Add</Btn>
        </div>
      </Card>

      {/* Tasks */}
      <Card>
        <h3 className="font-bold text-gray-700 mb-3">Task Checklist</h3>
        {tasks.map((t, i) => (
          <label key={i} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0 cursor-pointer">
            <input type="checkbox" checked={t.done} onChange={() => toggleTask(i)} className="w-4 h-4 accent-blue-600" />
            <span className={`text-sm ${t.done ? "line-through text-gray-400" : "text-gray-700"}`}>{t.text}</span>
          </label>
        ))}
        <div className="flex gap-2 mt-3">
          <input className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-400" value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="New task..." onKeyDown={(e) => e.key === "Enter" && addTask()} />
          <Btn small onClick={addTask}>Add</Btn>
        </div>
      </Card>

      {/* Notes */}
      <Card>
        <h3 className="font-bold text-gray-700 mb-2">Shared Notes</h3>
        <textarea
          className="w-full border border-gray-200 rounded-lg p-3 text-sm h-28 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Field notes, observations, instructions for the team..."
        />
        <p className="text-xs text-gray-400 mt-1">Auto-saved locally</p>
      </Card>
    </div>
  );
}

// ─── PROJECT MANAGER ──────────────────────────────────────────────────────────
function ProjectManager({ projects, setProjects, setPoints }) {
  const [name, setName] = useState("");

  const createProject = () => {
    if (!name) return;
    setProjects([...projects, { name, date: new Date().toLocaleString(), id: Date.now() }]);
    setName("");
  };

  return (
    <Card className="mb-4">
      <div className="flex gap-2 items-end">
        <Input label="Project Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Land Survey - Block C" className="flex-1" />
        <Btn small onClick={createProject}>+ Create</Btn>
      </div>
      {projects.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {projects.map((p) => (
            <Badge key={p.id} color="blue">{p.name} <span className="text-blue-400 text-xs ml-1">{p.date}</span></Badge>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function GeoNexa() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [points, setPoints] = useLocalStorage("gnx_points", []);
  const [projects, setProjects] = useLocalStorage("gnx_projects", []);

  const renderTab = () => {
    switch (activeTab) {
      case "dashboard": return <Dashboard points={points} projects={projects} setActiveTab={setActiveTab} />;
      case "coordinates": return <CoordinateSystem points={points} setPoints={setPoints} />;
      case "distance": return <DistanceCalc points={points} />;
      case "area": return <AreaCalc points={points} />;
      case "rl": return <RLCalc />;
      case "traverse": return <TraverseCalc />;
      case "converter": return <UnitConverter />;
      case "map": return <MapView points={points} />;
      case "plot": return <PlotTool points={points} />;
      case "export": return <DataExport points={points} projects={projects} />;
      case "contour": return <ContourView points={points} />;
      case "import": return <TSImport setPoints={setPoints} />;
      case "weather": return <WeatherSection />;
      case "aicheck": return <AISurveyCheck points={points} />;
      case "team": return <TeamCollab />;
      default: return <Dashboard points={points} projects={projects} setActiveTab={setActiveTab} />;
    }
  };

  const activeTabData = TABS.find((t) => t.id === activeTab);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <span className="text-lg font-black text-blue-700">🌐 GeoNexa</span>
          <Badge color="green">Offline</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 hidden sm:block">{activeTabData?.icon} {activeTabData?.label}</span>
          <Badge color="gray">{points.length} pts</Badge>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`fixed lg:static inset-y-0 left-0 z-40 bg-white border-r border-gray-200 w-56 pt-16 lg:pt-0 transform transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} flex flex-col shadow-lg lg:shadow-none`}>
          <div className="p-3 overflow-y-auto flex-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2 mb-2">Navigation</p>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition-all text-left ${activeTab === tab.id ? "bg-blue-50 text-blue-700 font-bold" : "text-gray-600 hover:bg-gray-50"}`}
              >
                <span className="text-base">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
          <div className="p-3 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">v1.0 — All data local</p>
          </div>
        </aside>

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 max-w-4xl mx-auto w-full">
          <ProjectManager projects={projects} setProjects={setProjects} setPoints={setPoints} />
          {renderTab()}
        </main>
      </div>
    </div>
  );
}
