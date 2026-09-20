"use client";
import { useEffect, useState } from "react";
import { api } from "./api";

type User = { id: number; email: string; fullName: string; role: string; tenantId: number };

const pillClass = (level: string) => {
  if (["healthy", "production", "approved", "direct_lead"].includes(level)) return "pill pill-green";
  if (["degraded", "beta", "requires_review", "early_intent"].includes(level)) return "pill pill-yellow";
  if (["down", "disabled", "spam", "irrelevant", "expired"].includes(level)) return "pill pill-red";
  if (["b2b_opportunity"].includes(level)) return "pill pill-blue";
  return "pill pill-grey";
};

function LoginScreen({ onAuthed }: { onAuthed: (u: User) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ email: "", password: "", fullName: "", tenantName: "" });
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await api(`/auth/${mode}`, { method: "POST", body: JSON.stringify(form) });
      localStorage.setItem("reach_token", res.token);
      onAuthed(res.user);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
      <form onSubmit={submit} style={{ background: "#fff", padding: 32, borderRadius: 16, width: 340, display: "flex", flexDirection: "column", gap: 10 }}>
        <h1 style={{ margin: 0 }}>Elite Reach</h1>
        <p className="muted" style={{ margin: "0 0 10px" }}>Demand intelligence — sign {mode === "login" ? "in" : "up"}</p>
        <input placeholder="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {mode === "register" && <>
          <input placeholder="Full name" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <input placeholder="Organization name" required value={form.tenantName} onChange={(e) => setForm({ ...form, tenantName: e.target.value })} />
        </>}
        {error && <p style={{ color: "var(--danger)", fontSize: 13, margin: 0 }}>{error}</p>}
        <button className="btn" type="submit">{mode === "login" ? "Sign in" : "Create bootstrap account"}</button>
        <button type="button" className="btn-outline" onClick={() => setMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "First time? Bootstrap an account" : "Back to sign in"}
        </button>
      </form>
    </div>
  );
}

function ConnectorsTab() {
  const [connectors, setConnectors] = useState<any[]>([]);
  const load = async () => setConnectors(await api("/connectors/health"));
  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="top" style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <h1 style={{ margin: 0 }}>Connectors</h1>
        <button className="btn-outline" onClick={async () => { await api("/connectors/seed", { method: "POST" }); load(); }}>Seed default connectors</button>
      </div>
      {connectors.map((c) => (
        <div className="card" key={c.id}>
          <div className="top">
            <span className="title">{c.source}</span>
            <span className={pillClass(c.health || "unknown")}>{c.health || "unknown"}</span>
          </div>
          <div className="muted">{c.accessType} · {c.commercialUseStatus} · <span className={pillClass(c.productionLevel)}>{c.productionLevel}</span></div>
          {c.lastErrorMessage && <div className="muted" style={{ color: "var(--danger)", marginTop: 6 }}>{c.lastErrorMessage}</div>}
          <button className="btn-outline" style={{ marginTop: 8 }} onClick={async () => { await api(`/connectors/${c.id}/health-check`, { method: "POST" }); load(); }}>Run health check</button>
        </div>
      ))}
    </div>
  );
}

function CampaignsTab() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", objective: "" });
  const load = async () => setCampaigns(await api("/campaigns"));
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    await api("/campaigns", { method: "POST", body: JSON.stringify(form) });
    setForm({ name: "", objective: "" });
    load();
  };

  return (
    <div>
      <h1>Campaigns</h1>
      <form onSubmit={create} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input placeholder="Campaign name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ flex: 1 }} />
        <input placeholder="Objective" value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} style={{ flex: 1 }} />
        <button className="btn" type="submit">Create</button>
      </form>
      {campaigns.map((c) => (
        <div className="card" key={c.id}>
          <div className="top"><span className="title">{c.name}</span><span className={pillClass(c.status)}>{c.status}</span></div>
          <div className="muted">{c.objective || "No objective set"}</div>
        </div>
      ))}
    </div>
  );
}

function OpportunityDetail({ id, onClose, onChanged }: { id: number; onClose: () => void; onChanged: () => void }) {
  const [detail, setDetail] = useState<any>(null);
  useEffect(() => { api(`/opportunities/${id}`).then(setDetail); }, [id]);
  if (!detail) return <div className="card">Loading…</div>;

  const s = detail.score || {};
  const pushToCrm = async () => {
    try {
      const res = await api(`/opportunities/${id}/push-to-crm`, { method: "POST" });
      alert(`Pushed to Elite Escape OS — CRM lead #${res.crmLeadId}`);
      onChanged();
    } catch (err: any) { alert(err.message); }
  };
  const dismiss = async () => { await api(`/opportunities/${id}/dismiss`, { method: "PATCH" }); onChanged(); };

  return (
    <div className="card" style={{ cursor: "default" }}>
      <div className="top">
        <span className="title">Opportunity #{detail.id} — {s.totalScore ?? "?"}/100</span>
        <button className="btn-outline" onClick={onClose}>Close</button>
      </div>
      <p><span className={pillClass(detail.opportunityType)}>{detail.opportunityType}</span>{" "}
        {detail.commercialClass && <span className={pillClass("beta")}>{detail.commercialClass}</span>}{" "}
        {detail.crmLeadId && <span className="pill pill-green">CRM lead #{detail.crmLeadId}</span>}</p>
      <p className="muted">{detail.signal?.textOriginal}</p>
      {detail.signal?.sourceUrl && <p><a href={detail.signal.sourceUrl} target="_blank" rel="noreferrer">{detail.signal.sourceUrl}</a></p>}
      {detail.journey && (
        <p className="muted">Part of a journey — signal {detail.journey.sequenceNumber} of {detail.journey.signalCount} from this person (journey #{detail.journey.journeyId})</p>
      )}

      {detail.intent && (
        <div className="score-grid">
          <div className="score-item">Origin: {detail.intent.origin || "—"}</div>
          <div className="score-item">Destination: {detail.intent.destination || "—"}</div>
          <div className="score-item">Trip type: {detail.intent.tripType || "—"}</div>
          <div className="score-item">Stage: {detail.intent.purchaseStage}</div>
          <div className="score-item">Urgency: {detail.intent.urgency}</div>
          <div className="score-item">Travelers: {detail.intent.travelerCountHint ?? "—"}</div>
        </div>
      )}

      {s.reasons && (
        <div className="reasons">
          <b>Why prioritized</b>
          <ul>{s.reasons.map((r: string, i: number) => <li key={i}>✓ {r}</li>)}</ul>
        </div>
      )}

      {detail.status === "open" && (
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="btn" onClick={pushToCrm} disabled={detail.opportunityType === "spam" || detail.opportunityType === "irrelevant"}>Push to CRM</button>
          <button className="btn-outline" onClick={dismiss}>Dismiss</button>
        </div>
      )}
    </div>
  );
}

function OpportunitiesTab() {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const load = async () => setOpportunities(await api("/opportunities"));
  useEffect(() => { load(); }, []);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 20 }}>
      <div>
        <h1>Opportunities</h1>
        {opportunities.map((o) => (
          <div className="card" key={o.id} onClick={() => setSelected(o.id)}>
            <div className="top">
              <span className="title">{o.destination || o.tripType || "Signal"} · {o.totalScore ?? "?"}/100</span>
              <span className={pillClass(o.opportunityType)}>{o.opportunityType}</span>
            </div>
            <div className="muted">{o.signalText?.slice(0, 90)}…</div>
            <div className="muted">{o.source} · {o.purchaseStage}</div>
          </div>
        ))}
      </div>
      <div>
        {selected ? <OpportunityDetail id={selected} onClose={() => setSelected(null)} onChanged={() => { load(); }} /> : <p className="muted">Select an opportunity.</p>}
      </div>
    </div>
  );
}

function JourneyDetail({ id, onClose }: { id: number; onClose: () => void }) {
  const [detail, setDetail] = useState<any>(null);
  useEffect(() => { api(`/journeys/${id}`).then(setDetail); }, [id]);
  if (!detail) return <div className="card">Loading…</div>;

  return (
    <div className="card" style={{ cursor: "default" }}>
      <div className="top">
        <span className="title">Journey #{detail.id} — {detail.identity?.authorDisplayName || detail.identity?.authorExternalId}</span>
        <button className="btn-outline" onClick={onClose}>Close</button>
      </div>
      <p><span className={pillClass(detail.status)}>{detail.status}</span> · {detail.identity?.source} · {detail.signalCount} signal(s)</p>
      <div className="reasons">
        <b>Intent progression</b>
        <ul>
          {detail.timeline.map((t: any) => (
            <li key={t.signalId}>
              <b>#{t.sequenceNumber}</b> [{t.purchaseStage || "—"}{t.destination ? ` · ${t.destination}` : ""}] {t.text?.slice(0, 100)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function JourneysTab() {
  const [journeys, setJourneys] = useState<any[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  useEffect(() => { api("/journeys").then(setJourneys); }, []);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 20 }}>
      <div>
        <h1>Journeys</h1>
        <p className="muted" style={{ marginBottom: 12 }}>Repeat signals from the same author on the same platform, linked into one intent progression.</p>
        {journeys.map((j) => (
          <div className="card" key={j.id} onClick={() => setSelected(j.id)}>
            <div className="top">
              <span className="title">{j.authorDisplayName || j.authorExternalId}</span>
              <span className={pillClass(j.status)}>{j.status}</span>
            </div>
            <div className="muted">{j.source} · {j.signalCount} signal(s) · latest: {j.latestPurchaseStage || "—"}</div>
          </div>
        ))}
        {!journeys.length && <p className="muted">No journeys yet — signals need an author id to be linked.</p>}
      </div>
      <div>
        {selected ? <JourneyDetail id={selected} onClose={() => setSelected(null)} /> : <p className="muted">Select a journey.</p>}
      </div>
    </div>
  );
}

const TAXONOMY_CATEGORIES = [
  { value: "destination_alias", label: "Destination alias", needsCanonical: true, canonicalLabel: "Canonical destination" },
  { value: "origin_keyword", label: "Origin keyword", needsCanonical: false },
  { value: "trip_type_keyword", label: "Trip-type keyword", needsCanonical: true, canonicalLabel: "Trip type (e.g. holiday, visa, hotel)" },
  { value: "ready_to_buy_phrase", label: "Ready-to-buy phrase", needsCanonical: false },
  { value: "comparison_phrase", label: "Comparison phrase", needsCanonical: false },
  { value: "discovery_phrase", label: "Discovery phrase", needsCanonical: false },
];

function TaxonomyTab() {
  const [terms, setTerms] = useState<any[]>([]);
  const [form, setForm] = useState({ category: TAXONOMY_CATEGORIES[0].value, term: "", canonicalValue: "" });
  const load = async () => setTerms(await api("/taxonomy-terms"));
  useEffect(() => { load(); }, []);

  const selectedCategory = TAXONOMY_CATEGORIES.find((c) => c.value === form.category)!;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api("/taxonomy-terms", { method: "POST", body: JSON.stringify({
        category: form.category, term: form.term, canonicalValue: form.canonicalValue || undefined,
      }) });
      setForm({ ...form, term: "", canonicalValue: "" });
      load();
    } catch (err: any) { alert(err.message); }
  };

  const remove = async (id: number) => { await api(`/taxonomy-terms/${id}`, { method: "DELETE" }); load(); };

  return (
    <div>
      <h1>Taxonomy</h1>
      <p className="muted" style={{ marginBottom: 14 }}>
        The destinations, trip types, and intent phrases the scoring engine recognizes — editable here, no code deploy needed.
      </p>
      <form onSubmit={submit} style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {TAXONOMY_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <input placeholder="Term (e.g. vietnam)" required value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} />
        {selectedCategory.needsCanonical && (
          <input placeholder={selectedCategory.canonicalLabel} required value={form.canonicalValue} onChange={(e) => setForm({ ...form, canonicalValue: e.target.value })} />
        )}
        <button className="btn" type="submit">Add</button>
      </form>
      {TAXONOMY_CATEGORIES.map((cat) => {
        const rows = terms.filter((t) => t.category === cat.value);
        if (!rows.length) return null;
        return (
          <div key={cat.value} style={{ marginBottom: 20 }}>
            <h3>{cat.label} <span className="muted">({rows.length})</span></h3>
            {rows.map((t) => (
              <div className="card" key={t.id} style={{ cursor: "default", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{t.term}{t.canonicalValue ? ` → ${t.canonicalValue}` : ""}</span>
                <button className="btn-outline" onClick={() => remove(t.id)}>Remove</button>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function ImportTab() {
  const [connectorId, setConnectorId] = useState(1);
  const [text, setText] = useState("");
  const [result, setResult] = useState<any>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const items = text.split("\n---\n").map((t, i) => ({ sourceRecordId: `paste-${Date.now()}-${i}`, text: t.trim() })).filter((i) => i.text);
    const res = await api("/signals/import", { method: "POST", body: JSON.stringify({ connectorId, source: "manual", items }) });
    setResult(res);
    setText("");
  };

  return (
    <div>
      <h1>Import signals (manual connector)</h1>
      <p className="muted">Paste one or more public posts, separated by a line containing just <code>---</code>.</p>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="Family of 4 in Dubai looking for Georgia in December..." />
        <button className="btn" type="submit" style={{ width: 160 }}>Import batch</button>
      </form>
      {result && <p className="muted" style={{ marginTop: 10 }}>Imported {result.inserted}, {result.duplicates} duplicate(s) skipped.</p>}
    </div>
  );
}

function CommandCenter() {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [connectors, setConnectors] = useState<any[]>([]);
  useEffect(() => { api("/opportunities").then(setOpportunities); api("/connectors/health").then(setConnectors); }, []);

  const open = opportunities.filter((o) => o.status === "open");
  const directLeads = open.filter((o) => o.opportunityType === "direct_lead");
  const b2b = open.filter((o) => o.opportunityType === "b2b_opportunity");

  return (
    <div>
      <h1>Command Center</h1>
      <div className="metrics-grid">
        <div className="metric-card"><div className="value">{open.length}</div><div className="label">Open opportunities</div></div>
        <div className="metric-card"><div className="value">{directLeads.length}</div><div className="label">Direct leads</div></div>
        <div className="metric-card"><div className="value">{b2b.length}</div><div className="label">B2B opportunities</div></div>
        <div className="metric-card"><div className="value">{connectors.filter((c) => c.health === "healthy").length}/{connectors.length}</div><div className="label">Connectors healthy</div></div>
      </div>
      <h3>Top opportunities right now</h3>
      {open.slice(0, 5).map((o) => (
        <div className="card" key={o.id}>
          <div className="top">
            <span className="title">{o.destination || o.tripType || "Signal"} · {o.totalScore ?? "?"}/100</span>
            <span className={pillClass(o.opportunityType)}>{o.opportunityType}</span>
          </div>
          <div className="muted">{o.signalText?.slice(0, 100)}…</div>
        </div>
      ))}
      {!open.length && <p className="muted">No open opportunities yet — import some signals to get started.</p>}
    </div>
  );
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState("command");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("reach_token");
    if (!token) { setReady(true); return; }
    api("/opportunities").then(() => setReady(true)).catch(() => { localStorage.removeItem("reach_token"); setReady(true); });
  }, []);

  if (!ready) return null;

  if (!user && !localStorage.getItem("reach_token")) {
    return <LoginScreen onAuthed={setUser} />;
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Elite Reach</div>
        {["command", "opportunities", "journeys", "connectors", "campaigns", "taxonomy", "import"].map((t) => (
          <button key={t} className={`tab-btn ${tab === t ? "active" : ""}`} style={{ display: "block", width: "100%", textAlign: "left", marginBottom: 4, color: tab === t ? "#fff" : "#C9D2EE" }} onClick={() => setTab(t)}>
            {t === "command" ? "Command Center" : t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
        <button className="tab-btn" style={{ marginTop: 30, color: "#9BDCF5" }} onClick={() => { localStorage.removeItem("reach_token"); location.reload(); }}>Sign out</button>
      </aside>
      <main className="content">
        {tab === "command" && <CommandCenter />}
        {tab === "opportunities" && <OpportunitiesTab />}
        {tab === "journeys" && <JourneysTab />}
        {tab === "connectors" && <ConnectorsTab />}
        {tab === "campaigns" && <CampaignsTab />}
        {tab === "taxonomy" && <TaxonomyTab />}
        {tab === "import" && <ImportTab />}
      </main>
    </div>
  );
}
