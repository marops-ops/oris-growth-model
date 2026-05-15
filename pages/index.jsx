import { useState, useMemo } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ReferenceLine } from "recharts";

// ─── Amidays / Oris brand palette ───────────────────────────────────────────
const C = {
  nearBlack: "#31353D",
  charcoal: "#707677",
  sage: "#6A6D62",
  warmBrown: "#AF8E72",
  dustyRose: "#C48374",
  grayGreen: "#A4A599",
  lightSage: "#C6C6B7",
  warmBeige: "#D3CBBB",
  cream: "#F1EFE9",
  white: "#FFFFFF",
  positive: "#6A6D62",
  negative: "#C48374",
};

// ─── Baseline from xlsx ──────────────────────────────────────────────────────
const BASELINE = {
  revenueBase2025: 2_314_835_000,   // Total omsetning 2025
  clinicsBase2025: 106,              // Antall klinikker 2025
  revenuePerClinic: 21_838_066,      // Gjennomsnitt per klinikk 2025
  aov: 4_300,                        // AOV per behandling
  churnRate: 0.25,                   // 25%
  organicGrowthPerClinic: 0.054,     // ~5,4% organisk vekst per klinikk 2025
  marketingDrivenShare: 0.50,        // 50% av bookinger er media-drevet
  cpaMarketing: 261,                 // CPA dagens plan
  revenuePerClinicNew: 21_838_066,   // Snittomsetning ny klinikk ved oppkjøp
};

const fmt = (n, decimals = 0) => {
  if (n === undefined || n === null || isNaN(n)) return "—";
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(decimals === 0 ? 2 : decimals)} mrd`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(decimals === 0 ? 0 : decimals)} MNOK`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toFixed(decimals);
};

const fmtPct = (n) => `${(n * 100).toFixed(1)}%`;

// ─── Slider component ────────────────────────────────────────────────────────
function Slider({ label, sublabel, value, min, max, step, onChange, formatValue, color = C.sage, highlight = false }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{
      marginBottom: 18,
      padding: "14px 16px",
      background: highlight ? `${color}18` : `${C.cream}`,
      borderRadius: 8,
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <div>
          <span style={{ fontFamily: "Montserrat, sans-serif", fontSize: 11, fontWeight: 600, color: C.nearBlack, letterSpacing: "0.5px", textTransform: "uppercase" }}>{label}</span>
          {sublabel && <div style={{ fontSize: 10, color: C.charcoal, marginTop: 1 }}>{sublabel}</div>}
        </div>
        <span style={{ fontFamily: "Montserrat, sans-serif", fontSize: 14, fontWeight: 700, color: color }}>{formatValue ? formatValue(value) : value}</span>
      </div>
      <div style={{ position: "relative", height: 6, background: C.lightSage, borderRadius: 3 }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.1s" }} />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ position: "absolute", top: -5, left: 0, width: "100%", height: 16, opacity: 0, cursor: "pointer", margin: 0 }}
        />
      </div>
    </div>
  );
}

// ─── KPI card ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color = C.sage, large = false }) {
  return (
    <div style={{ background: C.cream, borderRadius: 8, padding: "16px 18px", borderTop: `3px solid ${color}`, flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 10, fontFamily: "Montserrat, sans-serif", letterSpacing: "1px", textTransform: "uppercase", color: C.charcoal, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: large ? 28 : 22, fontFamily: "Montserrat, sans-serif", fontWeight: 700, color: C.nearBlack, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: C.charcoal, marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

// ─── Section header ──────────────────────────────────────────────────────────
function SectionHead({ label, color = C.sage }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, marginTop: 8 }}>
      <div style={{ width: 3, height: 16, background: color, borderRadius: 2, flexShrink: 0 }} />
      <span style={{ fontFamily: "Montserrat, sans-serif", fontSize: 10.5, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: color }}>{label}</span>
    </div>
  );
}

// ─── Custom tooltip ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: C.nearBlack, padding: "10px 14px", borderRadius: 6, fontSize: 11, fontFamily: "Roboto, sans-serif" }}>
      <div style={{ color: C.lightSage, marginBottom: 4, fontWeight: 600 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || C.white, display: "flex", gap: 8, justifyContent: "space-between" }}>
          <span>{p.name}:</span>
          <span style={{ fontWeight: 700 }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Main component ──────────────────────────────────────────────────────────
export default function OrisGrowthModel() {
  // ── Organisk vekst sliders
  const [organicGrowthRate, setOrganicGrowthRate] = useState(5.4);        // % per klinikk per år
  const [churnRate, setChurnRate] = useState(25);                          // % churn
  const [marketingBoost, setMarketingBoost] = useState(50);               // % av bookinger fra betalt media
  const [mediaSpendMNOK, setMediaSpendMNOK] = useState(15);            // MNOK mediebudsjett/år
  const [cpa, setCpa] = useState(261);                                     // CPA NOK

  // ── Klinikkvekst sliders
  const [newClinicsPerYear, setNewClinicsPerYear] = useState(12);          // Nye klinikker per år (1 pr mnd)
  const [avgRevenueNewClinic, setAvgRevenueNewClinic] = useState(21.8);  // MNOK snitt ny klinikk
  const [clinicGrowthRamp, setClinicGrowthRamp] = useState(70);          // % omsetning første år (ramp-up)

  // ── Synergi
  const [synergyRate, setSynergyRate] = useState(3);  // % synergi – organisk løft i eksisterende klinikker fra nettverkseffekt

  const YEARS = [2025, 2026, 2027, 2028, 2029];

  const model = useMemo(() => {
    const results = [];
    let clinics = BASELINE.clinicsBase2025;
    let revenueBase = BASELINE.revenueBase2025;

    for (let i = 0; i < YEARS.length; i++) {
      const year = YEARS[i];
      const isBaseline = i === 0;

      // New clinics added this year
      const newClinics = isBaseline ? 0 : newClinicsPerYear;
      const cumulativeNewClinics = isBaseline ? 0 : newClinicsPerYear * i;
      const totalClinics = clinics + (isBaseline ? 0 : newClinicsPerYear);

      // Revenue from existing clinics
      const organicRate = organicGrowthRate / 100;
      const synergyBonus = i > 0 ? (synergyRate / 100) * (cumulativeNewClinics / totalClinics) : 0;

      // Churn:
      // Organisk vekst (~5%) er allerede en netto størrelse som har absorbert baseline-churn (25%).
      // Churn-slideren modellerer delta i begge retninger:
      //   > 25% → ekstra tap trekkes fra omsetning
      //   < 25% → bedre retention gir positiv omsetningseffekt (pasienter som ellers ville falt fra, forblir)
      //   = 25% → ingen effekt (allerede absorbert i organisk vekst)
      const BASELINE_CHURN = 25;
      const churnDelta = churnRate - BASELINE_CHURN; // negativt = bedre retention, positivt = ekstra tap
      const churnLoss = isBaseline ? 0 : revenueBase * (churnDelta / 100); // kan være negativ (= gevinst)
      // Bruttoorganisk vekst (netto etter baseline-churn, per xlsx)
      const grossOrganicGrowth = isBaseline ? 0 : revenueBase * organicRate;
      const synergyNOK = isBaseline ? 0 : revenueBase * synergyBonus;
      // Netto organisk = organisk vekst minus churn-delta (fratrekk ved høy churn, tillegg ved lav)
      const organicGrowthNOK = isBaseline ? 0 : grossOrganicGrowth - churnLoss;

      // Marketing-drevet vekst:
      // - mediaSpendMNOK er TOTALBUDSJETT for kjeden i 2026 (baseline: 106+12=118 klinikker)
      // - Snitt per klinikk: totalbudsjett / klinikker i 2026
      // - Hvis antall klinikker øker utover 12/år, skalerer totalbudsjettet proporsjonalt
      // - marketingBoost = andel av total omsetning som er media-drevet (fra MMM: 50/50).
      //   Høyere andel betyr at mer av revenueBase aktivt drives av media → mer å hente
      //   ved økt spend, men også mer sårbart ved kutt. Brukes som effektivitetsmultiplikator:
      //   jo høyere andel, jo mer av mediabudsjettet omsettes til ny omsetning.
      const clinics2026 = BASELINE.clinicsBase2025 + 12; // 118 klinikker = baseline for budsjettet
      const budgetPerClinic = (mediaSpendMNOK * 1_000_000) / clinics2026;
      const effectiveMediaSpend = budgetPerClinic * totalClinics; // skalerer med faktisk antall klinikker
      const saturationDiscount = isBaseline ? 1 : Math.pow(0.98, i); // svak metning over tid (MMM-effekt)
      const mediaEfficiency = marketingBoost / 50; // normalisert mot MMM-baseline på 50%: >50% = mer effektiv kanal-miks
      const marketingBookings = Math.round((effectiveMediaSpend / cpa) * saturationDiscount * mediaEfficiency);
      const marketingRevenue = isBaseline ? 0 : marketingBookings * BASELINE.aov;

      // Revenue from new clinics (ramp-up first year)
      const revenueNewClinics = isBaseline ? 0 : newClinics * (avgRevenueNewClinic * 1_000_000) * (clinicGrowthRamp / 100);
      // Subsequent years new clinics run full speed
      const revenueMaturedClinics = i > 1 ? (newClinicsPerYear * (i - 1)) * (avgRevenueNewClinic * 1_000_000) * ((100 - clinicGrowthRamp) / 100) : 0;
      const acqRevNOK = revenueNewClinics + revenueMaturedClinics;

      const mktGrowthNOK = isBaseline ? 0 : marketingRevenue;

      // totalRevenue: baseline + netto organisk (etter churn) + synergi + marketing + oppkjøp
      const totalRevenue = revenueBase + organicGrowthNOK + synergyNOK + mktGrowthNOK + acqRevNOK;

      results.push({
        year,
        clinics: totalClinics,
        newClinicsAdded: newClinics,
        revenueBase: revenueBase,
        organicGrowthNOK,
        churnLoss,
        synergyNOK,
        mktGrowthNOK,
        acqRevNOK,
        totalRevenue,
        effectiveMediaSpend,
        budgetPerClinic: totalClinics > 0 ? effectiveMediaSpend / totalClinics : 0,
        marketingBookings: isBaseline ? Math.round(revenueBase * (marketingBoost / 100) / BASELINE.aov) : marketingBookings,
        revenuePerClinic: totalRevenue / totalClinics,
        yoyGrowth: i === 0 ? 0 : (totalRevenue - results[i - 1].totalRevenue) / results[i - 1].totalRevenue,
        acqShare: totalRevenue > 0 ? acqRevNOK / totalRevenue : 0,
        mktShare: totalRevenue > 0 ? mktGrowthNOK / totalRevenue : 0,
        organicShare: totalRevenue > 0 ? (organicGrowthNOK + synergyNOK) / totalRevenue : 0,
      });

      // Update baseline for next year
      revenueBase = totalRevenue;
      clinics = totalClinics;
    }
    return results;
  }, [organicGrowthRate, churnRate, marketingBoost, mediaSpendMNOK, cpa, newClinicsPerYear, avgRevenueNewClinic, clinicGrowthRamp, synergyRate]);

  const latest = model[model.length - 1];
  const year1 = model[1];
  const totalGrowth = latest.totalRevenue - model[0].totalRevenue;
  const totalGrowthPct = totalGrowth / model[0].totalRevenue;
  const nYears = model.length - 1; // 4 år: 2025→2029
  const cagr = Math.pow(latest.totalRevenue / model[0].totalRevenue, 1 / nYears) - 1;

  const chartData = model.map((r, i) => ({
    år: r.year,
    "Organisk (netto)": Math.round(r.organicGrowthNOK / 1_000_000),
    "Synergieffekt": Math.round(r.synergyNOK / 1_000_000),
    "Marketing-drevet": Math.round(r.mktGrowthNOK / 1_000_000),
    "Oppkjøp": Math.round(r.acqRevNOK / 1_000_000),
    "Baseline": Math.round(r.revenueBase / 1_000_000),
    "Total": Math.round(r.totalRevenue / 1_000_000),
    "Churn (tap)": -Math.round(r.churnLoss / 1_000_000),
    "CAGR-trend": Math.round((model[0].totalRevenue * Math.pow(1 + cagr, i)) / 1_000_000),
    "Klinikker": r.clinics,
  }));

  return (
    <div style={{
      fontFamily: "Roboto, sans-serif",
      background: "#ECEAE4",
      minHeight: "100vh",
      padding: "0 0 40px",
      color: C.nearBlack,
    }}>
      {/* Header */}
      <div style={{ background: C.nearBlack, padding: "20px 28px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 8, letterSpacing: "2px", color: C.lightSage, textTransform: "uppercase", marginBottom: 4 }}>Amidays · Oris Dental</div>
          <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 20, color: C.white, fontWeight: 400 }}>Vekstmodell</div>
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <img src="/logo.png" alt="Amidays" style={{ height: 36, width: "auto", display: "block" }} />
        </div>
      </div>

      {/* Sage accent bar */}
      <div style={{ height: 4, background: C.sage }} />

      <div style={{ padding: "24px 28px 0" }}>

        {/* Top KPIs */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <KpiCard label="Total omsetning 2029" value={fmt(latest.totalRevenue)} sub={`+${fmtPct(totalGrowthPct)} vs 2025`} color={C.sage} large />
          <KpiCard label="CAGR 2025–2029" value={fmtPct(cagr)} sub="Sammensatt årlig vekstrate" color={C.warmBrown} large />
          <KpiCard label="Vekst år 1 (2026)" value={fmt(year1.totalRevenue - model[0].totalRevenue)} sub={`${fmtPct(year1.yoyGrowth)} YoY`} color={C.dustyRose} />
          <KpiCard label="Antall klinikker 2029" value={latest.clinics} sub={`+${latest.clinics - BASELINE.clinicsBase2025} fra 2025`} color={C.grayGreen} />
          <KpiCard label="Omsetning per klinikk" value={fmt(latest.revenuePerClinic)} sub="Gjennomsnitt 2029" color={C.charcoal} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>

          {/* ── LEFT PANEL: Sliders ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

            {/* Eksisterende klinikker */}
            <div style={{ background: C.white, borderRadius: 10, padding: "18px 16px", marginBottom: 14 }}>
              <SectionHead label="Eksisterende klinikker" color={C.sage} />

              <Slider
                label="Organisk vekst per klinikk"
                sublabel="Økning uten marketing-investering"
                value={organicGrowthRate} min={0} max={15} step={0.1}
                onChange={setOrganicGrowthRate}
                formatValue={v => `${v.toFixed(1)}%`}
                color={C.sage}
              />
              <Slider
                label="Churn rate"
                sublabel="25% = baseline · under 25% øker omsetning · over 25% reduserer den"
                value={churnRate} min={10} max={40} step={1}
                onChange={setChurnRate}
                formatValue={v => v === 25
                  ? `${v}% (baseline)`
                  : v > 25
                    ? `${v}% (−${v - 25}% ekstra tap)`
                    : `${v}% (+${25 - v}% retention-gevinst)`}
                color={C.dustyRose}
              />
              <Slider
                label="Mediebudsjett – totalt for kjeden (2026)"
                sublabel={`Snitt per klinikk: ${((mediaSpendMNOK * 1_000_000) / (BASELINE.clinicsBase2025 + 12) / 1_000_000).toFixed(2)} MNOK · skalerer ved flere klinikker`}
                value={mediaSpendMNOK} min={2} max={80} step={0.5}
                onChange={setMediaSpendMNOK}
                formatValue={v => `${v} MNOK`}
                color={C.warmBrown}
                highlight
              />
              {/* Live budsjett-info */}
              <div style={{ background: `${C.warmBrown}12`, border: `1px solid ${C.warmBrown}40`, borderRadius: 6, padding: "8px 12px", marginTop: -10, marginBottom: 14, fontSize: 10, fontFamily: "Roboto, sans-serif" }}>
                {model.slice(1).map(r => (
                  <div key={r.year} style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                    <span style={{ color: C.charcoal }}>{r.year} · {r.clinics} klinikker</span>
                    <span style={{ color: C.warmBrown, fontWeight: 600 }}>{(r.effectiveMediaSpend / 1_000_000).toFixed(1)} MNOK totalt</span>
                  </div>
                ))}
              </div>
              <Slider
                label="CPA (kostnad per booking)"
                sublabel="NOK per ny booking via betalt media"
                value={cpa} min={150} max={500} step={5}
                onChange={setCpa}
                formatValue={v => `${v} kr`}
                color={C.warmBrown}
              />
              <Slider
                label="Media-andel (MMM-effektivitet)"
                sublabel="50% = MMM-baseline · høyere = bedre kanal-miks/konvertering"
                value={marketingBoost} min={20} max={80} step={1}
                onChange={setMarketingBoost}
                formatValue={v => `${v}%`}
                color={C.warmBrown}
              />
            </div>

            {/* Nye klinikker */}
            <div style={{ background: C.white, borderRadius: 10, padding: "18px 16px", marginBottom: 14 }}>
              <SectionHead label="Vekstarm – oppkjøp" color={C.grayGreen} />

              <Slider
                label="Nye klinikker per år"
                sublabel="Antall klinikker kjøpt/integrert"
                value={newClinicsPerYear} min={0} max={20} step={1}
                onChange={setNewClinicsPerYear}
                formatValue={v => `${v} stk`}
                color={C.grayGreen}
                highlight
              />
              <Slider
                label="Snittomsetning ny klinikk"
                sublabel="MNOK per klinikk ved oppkjøp"
                value={avgRevenueNewClinic} min={10} max={50} step={0.5}
                onChange={setAvgRevenueNewClinic}
                formatValue={v => `${v} MNOK`}
                color={C.grayGreen}
              />
              <Slider
                label="Ramp-up år 1"
                sublabel="% av full omsetning første driftsår"
                value={clinicGrowthRamp} min={30} max={100} step={5}
                onChange={setClinicGrowthRamp}
                formatValue={v => `${v}%`}
                color={C.grayGreen}
              />
            </div>

            {/* Synergi */}
            <div style={{ background: C.white, borderRadius: 10, padding: "18px 16px" }}>
              <SectionHead label="Synergieffekt" color={C.warmBrown} />
              <Slider
                label="Nettverkssynergi"
                sublabel="Organisk løft fra nettverkseffekter ved oppkjøp"
                value={synergyRate} min={0} max={10} step={0.5}
                onChange={setSynergyRate}
                formatValue={v => `${v}%`}
                color={C.warmBrown}
                highlight
              />
              <div style={{ fontSize: 10, color: C.charcoal, lineHeight: 1.5, marginTop: 6 }}>
                Effekten skalerer med andel nye klinikker i nettverket. Et større nettverk gir sterkere merkevare, bedre forhandlingsposisjon og deling av beste praksis.
              </div>
            </div>
          </div>

          {/* ── RIGHT PANEL: Charts ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Stacked area chart – total revenue by driver */}
            <div style={{ background: C.white, borderRadius: 10, padding: "20px 20px 8px" }}>
              <SectionHead label="Total omsetning – fordelt på vekstdriver (MNOK)" color={C.sage} />
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 24, height: 2, background: C.warmBrown, borderRadius: 1, borderTop: "2px dashed " + C.warmBrown }} />
                  <span style={{ fontSize: 10, fontFamily: "Montserrat, sans-serif", color: C.warmBrown, fontWeight: 600 }}>CAGR {fmtPct(cagr)}/år</span>
                </div>
                <span style={{ fontSize: 10, color: C.charcoal }}>Sammensatt vekstrate 2025–2029</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.lightSage} />
                  <XAxis dataKey="år" tick={{ fontFamily: "Montserrat", fontSize: 10, fill: C.charcoal }} />
                  <YAxis tick={{ fontFamily: "Roboto", fontSize: 9, fill: C.charcoal }} tickFormatter={v => `${v}M`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontFamily: "Roboto", fontSize: 10, paddingTop: 8 }} />
                  <Area type="monotone" dataKey="Baseline" stackId="1" stroke={C.lightSage} fill={C.lightSage} />
                  <Area type="monotone" dataKey="Organisk (netto)" stackId="1" stroke={C.sage} fill={C.sage} fillOpacity={0.8} />
                  <Area type="monotone" dataKey="Synergieffekt" stackId="1" stroke={C.warmBrown} fill={C.warmBrown} fillOpacity={0.7} />
                  <Area type="monotone" dataKey="Marketing-drevet" stackId="1" stroke={C.dustyRose} fill={C.dustyRose} fillOpacity={0.7} />
                  <Area type="monotone" dataKey="Oppkjøp" stackId="1" stroke={C.grayGreen} fill={C.grayGreen} fillOpacity={0.8} />
                  <Line type="monotone" dataKey="CAGR-trend" stroke={C.warmBrown} strokeWidth={2} strokeDasharray="6 3" dot={{ fill: C.warmBrown, r: 4 }} name={`CAGR-trend (${fmtPct(cagr)}/år)`} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Bar chart: growth drivers per year */}
            <div style={{ background: C.white, borderRadius: 10, padding: "20px 20px 8px" }}>
              <SectionHead label="Inkrementell vekst per driver per år (MNOK)" color={C.warmBrown} />
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData.slice(1)} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.lightSage} />
                  <XAxis dataKey="år" tick={{ fontFamily: "Montserrat", fontSize: 10, fill: C.charcoal }} />
                  <YAxis tick={{ fontFamily: "Roboto", fontSize: 9, fill: C.charcoal }} tickFormatter={v => `${v}M`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontFamily: "Roboto", fontSize: 10, paddingTop: 8 }} />
                  <Bar dataKey="Organisk (netto)" stackId="a" fill={C.sage} />
                  <Bar dataKey="Synergieffekt" stackId="a" fill={C.warmBrown} />
                  <Bar dataKey="Marketing-drevet" stackId="a" fill={C.dustyRose} />
                  <Bar dataKey="Oppkjøp" stackId="a" fill={C.grayGreen} />
                  <Bar dataKey="Churn (tap)" stackId="a" fill={C.dustyRose} fillOpacity={0.4} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Detail table */}
            <div style={{ background: C.white, borderRadius: 10, padding: "18px 20px", overflowX: "auto" }}>
              <SectionHead label="Detaljert modell per år" color={C.charcoal} />
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5, fontFamily: "Roboto, sans-serif" }}>
                <thead>
                  <tr style={{ background: C.nearBlack }}>
                    {["År", "Klinikker", "Organisk (netto)", "Ekstra churn", "Synergi", "Marketing", "Mediebud. tot.", "Snitt/klinikk", "Oppkjøp", "Total", "YoY %", "CAGR"].map(h => (
                      <th key={h} style={{ padding: "8px 10px", color: C.white, fontFamily: "Montserrat, sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", textAlign: "right", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {model.map((r, i) => {
                    const rowCagr = i === 0 ? null : Math.pow(r.totalRevenue / model[0].totalRevenue, 1 / i) - 1;
                    return (
                      <tr key={r.year} style={{ background: i % 2 === 0 ? C.cream : C.white, borderBottom: `1px solid ${C.lightSage}` }}>
                        <td style={{ padding: "9px 10px", fontFamily: "Montserrat, sans-serif", fontWeight: 700, color: C.sage, textAlign: "right" }}>{r.year}</td>
                        <td style={{ padding: "9px 10px", textAlign: "right", color: C.nearBlack }}>{r.clinics}</td>
                        <td style={{ padding: "9px 10px", textAlign: "right", color: C.sage }}>{fmt(r.organicGrowthNOK)}</td>
                        <td style={{ padding: "9px 10px", textAlign: "right", color: r.churnLoss < 0 ? C.sage : C.dustyRose }}>
                          {i === 0 ? "—" : r.churnLoss === 0 ? "−" : r.churnLoss < 0 ? `+${fmt(Math.abs(r.churnLoss))}` : `−${fmt(r.churnLoss)}`}
                        </td>
                        <td style={{ padding: "9px 10px", textAlign: "right", color: C.warmBrown }}>{fmt(r.synergyNOK)}</td>
                        <td style={{ padding: "9px 10px", textAlign: "right", color: C.dustyRose }}>{fmt(r.mktGrowthNOK)}</td>
                        <td style={{ padding: "9px 10px", textAlign: "right", color: C.warmBrown, fontWeight: 600 }}>{i === 0 ? "—" : `${(r.effectiveMediaSpend / 1_000_000).toFixed(1)}M`}</td>
                        <td style={{ padding: "9px 10px", textAlign: "right", color: C.charcoal }}>{i === 0 ? "—" : `${(r.budgetPerClinic / 1_000_000).toFixed(2)}M`}</td>
                        <td style={{ padding: "9px 10px", textAlign: "right", color: C.grayGreen }}>{fmt(r.acqRevNOK)}</td>
                        <td style={{ padding: "9px 10px", textAlign: "right", fontWeight: 700, color: C.nearBlack }}>{fmt(r.totalRevenue)}</td>
                        <td style={{ padding: "9px 10px", textAlign: "right", color: r.yoyGrowth > 0 ? C.sage : C.dustyRose, fontWeight: 600 }}>
                          {i === 0 ? "—" : `${(r.yoyGrowth * 100).toFixed(1)}%`}
                        </td>
                        <td style={{ padding: "9px 10px", textAlign: "right", color: C.warmBrown, fontWeight: 700 }}>
                          {rowCagr === null ? "—" : `${(rowCagr * 100).toFixed(1)}%`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Share breakdown – 2029 */}
            <div style={{ background: C.white, borderRadius: 10, padding: "18px 20px" }}>
              <SectionHead label={`Vekstmiks 2026 vs 2029 — andel av total inkrementell vekst`} color={C.grayGreen} />
              <div style={{ display: "flex", gap: 16 }}>
                {[model[1], model[4]].map(r => {
                  const totalIncr = r.organicGrowthNOK + r.synergyNOK + r.mktGrowthNOK + r.acqRevNOK;
                  const bars = [
                    { label: "Organisk", value: totalIncr > 0 ? r.organicGrowthNOK / totalIncr : 0, color: C.sage },
                    { label: "Synergi", value: totalIncr > 0 ? r.synergyNOK / totalIncr : 0, color: C.warmBrown },
                    { label: "Marketing", value: totalIncr > 0 ? r.mktGrowthNOK / totalIncr : 0, color: C.dustyRose },
                    { label: "Oppkjøp", value: totalIncr > 0 ? r.acqRevNOK / totalIncr : 0, color: C.grayGreen },
                  ];
                  return (
                    <div key={r.year} style={{ flex: 1 }}>
                      <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: C.nearBlack, marginBottom: 10 }}>{r.year}</div>
                      <div style={{ display: "flex", height: 16, borderRadius: 4, overflow: "hidden", marginBottom: 10 }}>
                        {bars.map(b => (
                          <div key={b.label} style={{ width: `${b.value * 100}%`, background: b.color, transition: "width 0.3s" }} />
                        ))}
                      </div>
                      {bars.map(b => (
                        <div key={b.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 3 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <div style={{ width: 8, height: 8, borderRadius: 2, background: b.color, flexShrink: 0 }} />
                            <span style={{ color: C.charcoal }}>{b.label}</span>
                          </div>
                          <span style={{ fontWeight: 600, color: C.nearBlack }}>{fmtPct(b.value)}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 20, padding: "12px 0", borderTop: `1px solid ${C.lightSage}`, display: "flex", justifyContent: "space-between", fontSize: 9.5, color: C.charcoal, fontFamily: "Montserrat, sans-serif", letterSpacing: "0.5px" }}>
          <span>Amidays · Oris Dental Vekstmodell · {new Date().toLocaleDateString("nb-NO", { month: "long", year: "numeric" })}</span>
          <span>Baseline: 2025 · AOV {BASELINE.aov} NOK · Churn {churnRate}%</span>
        </div>
      </div>
    </div>
  );
}
