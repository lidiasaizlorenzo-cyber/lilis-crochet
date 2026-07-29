import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus, Clock, Play, Pause, Check, Trash2, ArrowLeft, Camera,
  Package, Ruler, Scissors, X, Edit2, ChevronDown, ChevronUp, RotateCcw,
  CheckCircle2, StickyNote, Users, Pencil, Tag, BarChart3, CalendarPlus,
  Download, Search
} from "lucide-react";

const TAG_OPTIONS = ["Camiseta", "Pantalón", "Falda", "Vestido", "Bolso", "Peluche"];

// ---------- palette ----------
const C = {
  bg: "#F6F1E4",
  cream: "#FBF7EE",
  green: "#DCE8D0",
  greenDeep: "#7FA06B",
  brown: "#5C4030",
  brownSoft: "#93745B",
  brownFaint: "#C9B79E",
  card: "#FFFDF8",
  border: "#E8DCC0",
  blush: "#E3B9A0",
  danger: "#B4614C",
};

const headingFont = "'Fraunces', 'Iowan Old Style', Georgia, serif";
const bodyFont = "'Quicksand', -apple-system, 'Segoe UI', system-ui, sans-serif";
const scriptFont = "'Caveat', cursive";

// ---------- helpers ----------
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" }) + " · " +
    d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function leadingNumber(str) {
  if (!str) return Infinity;
  const m = String(str).match(/[\d.,]+/);
  if (!m) return Infinity;
  return parseFloat(m[0].replace(",", "."));
}

function compressImage(file, maxWidth = 600, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function emptyProject() {
  return {
    id: uid(),
    name: "",
    forWhom: "Yo",
    hookSize: "",
    status: "active",
    tags: [],
    patternSource: "",
    yarns: [],
    measurements: [],
    sections: [{ id: uid(), name: "Filas", count: 0, hookOverride: "", instructions: "", resetLog: [] }],
    sessions: [],
    activeSessionStart: null,
    photos: [],
    notes: "",
    createdAt: Date.now(),
    finishedAt: null,
  };
}

function emptyYarn() {
  return { id: uid(), marca: "", color: "", tipo: "", ovillos: "", metros: "", gramos: "", usedOvillos: null };
}

function emptyInventory() {
  return { hooks: [], yarns: [], others: [] };
}

function emptyIdea() {
  return { id: uid(), title: "", notes: "", patternSource: "", photo: null, createdAt: Date.now() };
}

function matchesSearch(project, q) {
  if (!q) return true;
  const s = q.toLowerCase();
  const hay = [
    project.name, project.forWhom, project.patternSource, project.notes,
    ...(project.tags || []),
    ...(project.yarns || []).flatMap((y) => [y.marca, y.color, y.tipo]),
  ].filter(Boolean).join(" ").toLowerCase();
  return hay.includes(s);
}

function sectionTotal(section) {
  return (section.resetLog || []).reduce((a, b) => a + b, 0) + section.count;
}

function projectTotalRows(project) {
  return project.sections.reduce((a, s) => a + sectionTotal(s), 0);
}

function projectTotalSeconds(project) {
  const base = project.sessions.reduce((a, s) => a + s.duration, 0);
  const running = project.activeSessionStart ? (Date.now() - project.activeSessionStart) / 1000 : 0;
  return base + running;
}

// ---------- global style ----------
function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Quicksand:wght@500;600;700&family=Caveat:wght@600;700&display=swap');
      input::placeholder, textarea::placeholder { color: ${C.brownFaint}; }
      input, textarea { font-family: ${bodyFont}; }
    `}</style>
  );
}

// ---------- small UI atoms ----------
function Button({ children, onClick, variant = "primary", style, ...rest }) {
  const base = {
    fontFamily: bodyFont,
    fontWeight: 700,
    border: "none",
    cursor: "pointer",
    borderRadius: 16,
    padding: "10px 16px",
    fontSize: 14,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    transition: "transform 0.05s ease",
  };
  const variants = {
    primary: { background: C.greenDeep, color: "#fff", boxShadow: "0 3px 0 #6a8a58" },
    secondary: { background: C.green, color: C.brown },
    ghost: { background: "transparent", color: C.brown, padding: "8px 10px", boxShadow: "none" },
    danger: { background: "transparent", color: C.danger, boxShadow: "none" },
    outline: { background: C.cream, color: C.brown, border: `1.5px solid ${C.border}` },
  };
  return (
    <button
      onClick={onClick}
      style={{ ...base, ...variants[variant], ...style }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      {...rest}
    >
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: C.brownSoft, marginBottom: 5, fontWeight: 700, letterSpacing: 0.3 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  fontFamily: bodyFont,
  fontSize: 14,
  padding: "9px 12px",
  borderRadius: 12,
  border: `1.5px solid ${C.border}`,
  background: C.cream,
  color: C.brown,
  outline: "none",
  boxSizing: "border-box",
};

function TopBar({ title, onBack, right }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "16px 18px", position: "sticky", top: 0, background: C.bg, zIndex: 5,
      borderBottom: `1.5px dashed ${C.border}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        {onBack && (
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: C.brown, padding: 4, flexShrink: 0 }}>
            <ArrowLeft size={20} />
          </button>
        )}
        <h1 style={{ fontFamily: headingFont, fontWeight: 700, fontSize: 20, color: C.brown, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</h1>
      </div>
      <div style={{ flexShrink: 0 }}>{right}</div>
    </div>
  );
}

function IconChip({ icon }) {
  return (
    <span style={{
      background: C.green, color: C.greenDeep, borderRadius: "50%", width: 24, height: 24,
      display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>{icon}</span>
  );
}

function SectionTitle({ icon, text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, color: C.brown, fontSize: 13, fontWeight: 700 }}>
      <IconChip icon={icon} /> {text}
    </div>
  );
}

function EmptyHint({ text }) {
  return <div style={{ color: C.brownFaint, fontSize: 13, fontStyle: "italic" }}>{text}</div>;
}

function ConfirmBar({ text, onConfirm, onCancel }) {
  return (
    <div style={{ background: "#F3D9CE", padding: "10px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <span style={{ fontSize: 13, color: C.danger }}>{text}</span>
      <div style={{ display: "flex", gap: 6 }}>
        <Button variant="ghost" onClick={onCancel} style={{ color: C.brown }}>Cancelar</Button>
        <Button variant="primary" onClick={onConfirm} style={{ background: C.danger, boxShadow: "none" }}>Eliminar</Button>
      </div>
    </div>
  );
}

// ---------- App ----------
export default function App() {
  const [projects, setProjects] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [customTags, setCustomTags] = useState([]);
  const [ideas, setIdeas] = useState(null);
  const [view, setView] = useState("home");
  const [activeId, setActiveId] = useState(null);
  const [homeTab, setHomeTab] = useState("active");
  const [loadError, setLoadError] = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        let p = [];
        let inv = emptyInventory();
        let tags = [];
        let idea = [];
        try {
          const r = await window.storage.get("projects", false);
          if (r && r.value) p = JSON.parse(r.value);
        } catch (e) {}
        try {
          const r2 = await window.storage.get("inventory", false);
          if (r2 && r2.value) inv = JSON.parse(r2.value);
        } catch (e) {}
        try {
          const r3 = await window.storage.get("customTags", false);
          if (r3 && r3.value) tags = JSON.parse(r3.value);
        } catch (e) {}
        try {
          const r4 = await window.storage.get("ideas", false);
          if (r4 && r4.value) idea = JSON.parse(r4.value);
        } catch (e) {}
        setProjects(p);
        setInventory(inv);
        setCustomTags(tags);
        setIdeas(idea);
      } catch (e) {
        setLoadError(true);
        setProjects([]);
        setInventory(emptyInventory());
        setCustomTags([]);
        setIdeas([]);
      }
    })();
  }, []);

  const persist = useCallback((nextProjects, nextInventory, nextTags, nextIdeas) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        if (nextProjects !== undefined) await window.storage.set("projects", JSON.stringify(nextProjects), false);
        if (nextInventory !== undefined) await window.storage.set("inventory", JSON.stringify(nextInventory), false);
        if (nextTags !== undefined) await window.storage.set("customTags", JSON.stringify(nextTags), false);
        if (nextIdeas !== undefined) await window.storage.set("ideas", JSON.stringify(nextIdeas), false);
      } catch (e) {
        console.error("Error guardando", e);
      }
    }, 500);
  }, []);

  const updateProjects = (updater) => {
    setProjects((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persist(next, undefined, undefined, undefined);
      return next;
    });
  };

  const updateInventory = (updater) => {
    setInventory((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persist(undefined, next, undefined, undefined);
      return next;
    });
  };

  const updateIdeas = (updater) => {
    setIdeas((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persist(undefined, undefined, undefined, next);
      return next;
    });
  };

  const addCustomTag = (t) => {
    const clean = t.trim();
    if (!clean) return;
    setCustomTags((prev) => {
      if (TAG_OPTIONS.includes(clean) || prev.includes(clean)) return prev;
      const next = [...prev, clean];
      persist(undefined, undefined, next, undefined);
      return next;
    });
  };

  const availableTags = [...TAG_OPTIONS, ...customTags];

  const exportData = () => {
    try {
      const payload = { projects, inventory, customTags, ideas, exportedAt: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lilis-crochet-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("No se pudo exportar", e);
    }
  };

  if (projects === null || inventory === null || ideas === null) {
    return (
      <div style={{ ...shellStyle, alignItems: "center", justifyContent: "center", display: "flex" }}>
        <GlobalStyle />
        <div style={{ color: C.brownSoft, fontFamily: bodyFont }}>Cargando tus proyectos…</div>
      </div>
    );
  }

  const activeProject = projects.find((p) => p.id === activeId) || null;
  const goHome = () => { setView("home"); setActiveId(null); };

  const saveProject = (proj) => {
    updateProjects((prev) => {
      const exists = prev.some((p) => p.id === proj.id);
      return exists ? prev.map((p) => (p.id === proj.id ? proj : p)) : [proj, ...prev];
    });
  };

  const deleteProject = (id) => {
    updateProjects((prev) => prev.filter((p) => p.id !== id));
    goHome();
  };

  return (
    <div style={shellStyle}>
      <GlobalStyle />
      {loadError && (
        <div style={{ background: "#F3D9CE", color: C.danger, padding: 10, fontSize: 13, textAlign: "center" }}>
          No se pudo cargar todo tu historial guardado. Puedes seguir usando la app.
        </div>
      )}

      {view === "home" && (
        <HomeScreen
          projects={projects}
          ideas={ideas}
          onUpdateIdeas={updateIdeas}
          homeTab={homeTab}
          setHomeTab={setHomeTab}
          onOpenProject={(id) => { setActiveId(id); setView("project"); }}
          onNewProject={() => setView("newProject")}
          onOpenInventory={() => setView("inventory")}
          onOpenStats={() => setView("stats")}
          onExport={exportData}
          onCreateFromIdea={(proj) => { saveProject(proj); setActiveId(proj.id); setView("project"); }}
        />
      )}

      {view === "newProject" && (
        <NewProjectScreen
          onCancel={goHome}
          onCreate={(proj) => { saveProject(proj); setActiveId(proj.id); setView("project"); }}
          availableTags={availableTags}
          onAddCustomTag={addCustomTag}
        />
      )}

      {view === "project" && activeProject && (
        <ProjectDetailScreen
          project={activeProject}
          onBack={goHome}
          onSave={saveProject}
          onDelete={() => deleteProject(activeProject.id)}
          availableTags={availableTags}
          onAddCustomTag={addCustomTag}
        />
      )}

      {view === "inventory" && (
        <InventoryScreen inventory={inventory} onBack={goHome} onSave={updateInventory} />
      )}

      {view === "stats" && (
        <StatsScreen projects={projects} onBack={goHome} />
      )}
    </div>
  );
}

const shellStyle = {
  background: `${C.bg} radial-gradient(circle at 1px 1px, ${C.brownFaint}2a 1px, transparent 0)`,
  backgroundSize: "18px 18px",
  minHeight: "100vh",
  fontFamily: bodyFont,
  color: C.brown,
  maxWidth: 480,
  margin: "0 auto",
  paddingBottom: 40,
};

// ---------- Home ----------
function HomeScreen({ projects, ideas, onUpdateIdeas, homeTab, setHomeTab, onOpenProject, onNewProject, onOpenInventory, onOpenStats, onExport, onCreateFromIdea }) {
  const [tagFilter, setTagFilter] = useState(null);
  const [query, setQuery] = useState("");
  const active = projects.filter((p) => p.status !== "done");
  const done = projects.filter((p) => p.status === "done");
  const baseList = homeTab === "active" ? active : homeTab === "done" ? done : [];
  const tagsInList = [...new Set(baseList.flatMap((p) => p.tags || []))];
  const list = baseList
    .filter((p) => (tagFilter ? (p.tags || []).includes(tagFilter) : true))
    .filter((p) => matchesSearch(p, query));

  const filteredIdeas = ideas.filter((i) => {
    if (!query) return true;
    const s = query.toLowerCase();
    return (i.title + " " + i.notes).toLowerCase().includes(s);
  });

  return (
    <div>
      <div style={{ padding: "26px 18px 8px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ margin: 0, display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: scriptFont, fontSize: 38, color: C.greenDeep, lineHeight: 1 }}>Lili's</span>
            <span style={{ fontFamily: headingFont, fontWeight: 700, fontSize: 24, color: C.brown }}>crochet</span>
          </h1>
          <p style={{ color: C.brownSoft, fontSize: 13, margin: "4px 0 0" }}>Tus proyectos, punto a punto</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button onClick={onExport} title="Exportar copia de seguridad" style={iconCircleStyle}>
            <Download size={16} />
          </button>
          <button onClick={onOpenStats} title="Estadísticas" style={iconCircleStyle}>
            <BarChart3 size={17} />
          </button>
        </div>
      </div>

      <div style={{ padding: "8px 18px 0" }}>
        <div style={{ position: "relative" }}>
          <Search size={15} color={C.brownFaint} style={{ position: "absolute", left: 12, top: 11 }} />
          <input
            style={{ ...inputStyle, paddingLeft: 34 }}
            placeholder="Buscar por nombre, yarn, categoría…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, padding: "12px 18px 0" }}>
        <TabButton active={homeTab === "active"} onClick={() => { setHomeTab("active"); setTagFilter(null); }} label={`En curso (${active.length})`} />
        <TabButton active={homeTab === "done"} onClick={() => { setHomeTab("done"); setTagFilter(null); }} label={`Terminados (${done.length})`} />
        <TabButton active={homeTab === "ideas"} onClick={() => { setHomeTab("ideas"); setTagFilter(null); }} label={`Ideas (${ideas.length})`} />
      </div>

      {homeTab !== "ideas" && tagsInList.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "10px 18px 0" }}>
          <button onClick={() => setTagFilter(null)} style={chipFilterStyle(tagFilter === null)}>Todas</button>
          {tagsInList.map((t) => (
            <button key={t} onClick={() => setTagFilter(t)} style={chipFilterStyle(tagFilter === t)}>{t}</button>
          ))}
        </div>
      )}

      {homeTab === "ideas" ? (
        <IdeasList ideas={filteredIdeas} onUpdateIdeas={onUpdateIdeas} onCreateFromIdea={onCreateFromIdea} />
      ) : (
        <div style={{ padding: "12px 18px 100px", display: "flex", flexDirection: "column", gap: 12 }}>
          {list.length === 0 && (
            <div style={{ textAlign: "center", color: C.brownFaint, padding: "50px 20px", fontSize: 14 }}>
              {query ? "No hay proyectos que coincidan con tu búsqueda." : homeTab === "active" ? "Aún no tienes proyectos en curso." : "Todavía no has terminado ningún proyecto."}
            </div>
          )}
          {list.map((p) => (
            <ProjectCard key={p.id} project={p} onClick={() => onOpenProject(p.id)} />
          ))}
        </div>
      )}

      <<div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 480, margin: "0 auto",
        display: "flex", gap: 10, padding: "16px 16px calc(16px + env(safe-area-inset-bottom))",
        background: "linear-gradient(to top, " + C.bg + " 75%, transparent)",
      }}>
        <Button variant="outline" onClick={onOpenInventory} style={{ flex: 1, justifyContent: "center" }}>
          <Package size={16} /> Mi inventario
        </Button>
        <Button onClick={onNewProject} style={{ flex: 1, justifyContent: "center" }}>
          <Plus size={16} /> Nuevo proyecto
        </Button>
      </div>
    </div>
  );
}

const iconCircleStyle = {
  background: C.card, border: `1.5px solid ${C.border}`, borderRadius: "50%", width: 38, height: 38,
  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.greenDeep, flexShrink: 0,
};

function chipFilterStyle(isOn) {
  return {
    border: isOn ? "none" : `1.5px solid ${C.border}`, cursor: "pointer", borderRadius: 20, padding: "5px 12px",
    fontSize: 12, fontFamily: bodyFont, fontWeight: 700,
    background: isOn ? C.brown : C.cream, color: isOn ? "#fff" : C.brownSoft,
  };
}

// ---------- Ideas ----------
function IdeasList({ ideas, onUpdateIdeas, onCreateFromIdea }) {
  const [showAdd, setShowAdd] = useState(false);
  const fileRef = useRef(null);
  const [draft, setDraft] = useState(emptyIdea());

  const addIdea = () => {
    if (!draft.title.trim()) return;
    onUpdateIdeas((prev) => [{ ...draft, id: uid() }, ...prev]);
    setDraft(emptyIdea());
    setShowAdd(false);
  };
  const removeIdea = (id) => onUpdateIdeas((prev) => prev.filter((i) => i.id !== id));

  const handlePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file, 500);
      setDraft((d) => ({ ...d, photo: dataUrl }));
    } catch (err) {}
    e.target.value = "";
  };

  const convert = (idea) => {
    const proj = emptyProject();
    proj.name = idea.title;
    proj.notes = idea.notes;
    proj.patternSource = idea.patternSource;
    if (idea.photo) proj.photos = [{ id: uid(), dataUrl: idea.photo }];
    onCreateFromIdea(proj);
  };

  return (
    <div style={{ padding: "12px 18px 100px" }}>
      {!showAdd ? (
        <Button variant="secondary" onClick={() => setShowAdd(true)} style={{ width: "100%", justifyContent: "center", marginBottom: 14 }}>
          <Plus size={14} /> Añadir idea
        </Button>
      ) : (
        <div style={{ background: C.cream, borderRadius: 14, padding: 12, border: `1.5px dashed ${C.border}`, marginBottom: 14 }}>
          <input style={{ ...inputStyle, marginBottom: 8 }} placeholder="¿Qué te gustaría hacer?" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <textarea style={{ ...inputStyle, marginBottom: 8, minHeight: 50 }} placeholder="Notas (opcional)" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          <input style={{ ...inputStyle, marginBottom: 8 }} placeholder="¿De dónde salió el patrón? (opcional)" value={draft.patternSource} onChange={(e) => setDraft({ ...draft, patternSource: e.target.value })} />
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            {draft.photo ? (
              <img src={draft.photo} style={{ width: 50, height: 50, objectFit: "cover", borderRadius: 10 }} />
            ) : (
              <button onClick={() => fileRef.current.click()} style={{ ...iconCircleStyle, width: 50, height: 50 }}>
                <Camera size={18} />
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhoto} />
            <span style={{ fontSize: 12, color: C.brownFaint }}>Foto de inspiración (opcional)</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="outline" onClick={() => { setShowAdd(false); setDraft(emptyIdea()); }} style={{ flex: 1, justifyContent: "center" }}>Cancelar</Button>
            <Button onClick={addIdea} style={{ flex: 1, justifyContent: "center" }}>Guardar idea</Button>
          </div>
        </div>
      )}

      {ideas.length === 0 && <EmptyHint text="Aún no tienes ideas apuntadas." />}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {ideas.map((idea) => (
          <div key={idea.id} style={{ background: C.card, borderRadius: 16, padding: 14, border: `1.5px solid ${C.border}`, display: "flex", gap: 12 }}>
            {idea.photo && <img src={idea.photo} style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 10, flexShrink: 0 }} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: headingFont, fontWeight: 700, fontSize: 15, color: C.brown }}>{idea.title}</div>
              {idea.notes && <div style={{ fontSize: 12.5, color: C.brownSoft, marginTop: 2 }}>{idea.notes}</div>}
              {idea.patternSource && <div style={{ fontSize: 11.5, color: C.brownFaint, marginTop: 2 }}>Patrón: {idea.patternSource}</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <Button variant="secondary" onClick={() => convert(idea)} style={{ padding: "6px 10px", fontSize: 12 }}>Convertir en proyecto</Button>
                <button onClick={() => removeIdea(idea.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.brownFaint }}><X size={16} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, border: "none", borderRadius: 14, padding: "9px 8px", fontSize: 13, fontWeight: 700,
        cursor: "pointer", fontFamily: bodyFont,
        background: active ? C.greenDeep : C.cream,
        color: active ? "#fff" : C.brownSoft,
      }}
    >
      {label}
    </button>
  );
}

function ProjectCard({ project, onClick }) {
  const isDone = project.status === "done";
  const isPaused = project.status === "paused";
  return (
    <div
      onClick={onClick}
      style={{
        background: C.card, borderRadius: 20, padding: 16, cursor: "pointer",
        border: `1.5px solid ${C.border}`, boxShadow: "0 2px 8px rgba(92,64,48,0.08)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: headingFont, fontWeight: 700, fontSize: 17, color: C.brown }}>{project.name || "Sin nombre"}</div>
          <div style={{ fontSize: 12, color: C.brownSoft, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
            <Users size={12} /> {project.forWhom}
          </div>
        </div>
        {isPaused && !isDone && (
          <span style={{ fontSize: 11, background: C.blush, color: "#fff", borderRadius: 10, padding: "3px 8px", fontWeight: 700 }}>Pausado</span>
        )}
        {isDone && <CheckCircle2 size={18} color={C.greenDeep} />}
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 12, color: C.brownSoft }}>
        <span>{projectTotalRows(project)} filas</span>
        <span>·</span>
        <span>{formatDuration(projectTotalSeconds(project))}</span>
        {isDone && <><span>·</span><span>{formatDate(project.finishedAt)}</span></>}
      </div>
      {project.tags && project.tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {project.tags.map((t) => (
            <span key={t} style={{ fontSize: 11, background: C.green, color: C.greenDeep, borderRadius: 8, padding: "2px 9px", fontWeight: 700 }}>{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Yarn form block (shared) ----------
function YarnForm({ yarns, onAdd, onRemove, onUpdate, showUsedField }) {
  const [draft, setDraft] = useState(emptyYarn());
  const add = () => {
    if (!draft.marca && !draft.color) return;
    onAdd(draft);
    setDraft(emptyYarn());
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {yarns.map((y) => (
        <YarnRow key={y.id} yarn={y} onRemove={onRemove ? () => onRemove(y.id) : null}
          rightUsed={showUsedField ? (
            <input
              style={{ ...inputStyle, width: 78, textAlign: "right", padding: "6px 8px", fontSize: 12 }}
              placeholder="ovillos usados"
              value={y.usedOvillos ?? ""}
              onChange={(e) => onUpdate(y.id, { usedOvillos: e.target.value })}
            />
          ) : null}
        />
      ))}
      {onAdd && (
        <div style={{ background: C.cream, borderRadius: 14, padding: 10, border: `1.5px dashed ${C.border}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <input style={inputStyle} placeholder="Marca" value={draft.marca} onChange={(e) => setDraft({ ...draft, marca: e.target.value })} />
            <input style={inputStyle} placeholder="Color" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} />
            <input style={inputStyle} placeholder="Tipo (algodón…)" value={draft.tipo} onChange={(e) => setDraft({ ...draft, tipo: e.target.value })} />
            <input style={inputStyle} placeholder="Ovillos comprados" value={draft.ovillos} onChange={(e) => setDraft({ ...draft, ovillos: e.target.value })} />
            <input style={inputStyle} placeholder="Metros / ovillo" value={draft.metros} onChange={(e) => setDraft({ ...draft, metros: e.target.value })} />
            <input style={inputStyle} placeholder="Gramos / ovillo" value={draft.gramos} onChange={(e) => setDraft({ ...draft, gramos: e.target.value })} />
          </div>
          <Button variant="secondary" onClick={add} style={{ width: "100%", justifyContent: "center" }}>
            <Plus size={14} /> Añadir yarn
          </Button>
        </div>
      )}
    </div>
  );
}

function YarnRow({ yarn, onRemove, rightUsed }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.card, borderRadius: 12, padding: "9px 12px", border: `1.5px solid ${C.border}`, gap: 8 }}>
      <div style={{ fontSize: 13, minWidth: 0 }}>
        <b>{yarn.marca || "Sin marca"}</b>{yarn.color ? ` · ${yarn.color}` : ""}{yarn.tipo ? ` · ${yarn.tipo}` : ""}
        <div style={{ color: C.brownSoft, fontSize: 11.5, marginTop: 2 }}>
          {yarn.ovillos ? `${yarn.ovillos} ovillos` : ""}{yarn.metros ? ` · ${yarn.metros}m c/u` : ""}{yarn.gramos ? ` · ${yarn.gramos}g c/u` : ""}
        </div>
      </div>
      {rightUsed ? rightUsed : (onRemove && (
        <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: C.brownFaint, flexShrink: 0 }}><X size={14} /></button>
      ))}
    </div>
  );
}

function MeasurementForm({ measurements, onAdd, onRemove }) {
  const [draft, setDraft] = useState({ label: "", value: "" });
  const add = () => {
    if (!draft.label) return;
    onAdd(draft);
    setDraft({ label: "", value: "" });
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {measurements.map((m) => (
        <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.card, borderRadius: 12, padding: "8px 12px", border: `1.5px solid ${C.border}` }}>
          <span style={{ fontSize: 13 }}><b>{m.label}:</b> {m.value}</span>
          {onRemove && <button onClick={() => onRemove(m.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.brownFaint }}><X size={14} /></button>}
        </div>
      ))}
      {onAdd && (
        <div style={{ display: "flex", gap: 8 }}>
          <input style={inputStyle} placeholder="Ej. Contorno pecho" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
          <input style={{ ...inputStyle, maxWidth: 110 }} placeholder="92cm" value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} />
          <Button variant="secondary" onClick={add}><Plus size={14} /></Button>
        </div>
      )}
    </div>
  );
}

function TagPicker({ selected, availableTags, onToggle, onAddCustom }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const t = draft.trim();
    if (!t) return;
    onAddCustom(t);
    setDraft("");
  };
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        {availableTags.map((t) => {
          const isOn = selected.includes(t);
          return (
            <button
              key={t}
              onClick={() => onToggle(t)}
              style={{
                border: "none", cursor: "pointer", borderRadius: 20, padding: "6px 13px", fontSize: 12.5,
                fontFamily: bodyFont, fontWeight: 700,
                background: isOn ? C.greenDeep : C.cream,
                color: isOn ? "#fff" : C.brownSoft,
                border: isOn ? "none" : `1.5px solid ${C.border}`,
              }}
            >
              {t}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          style={inputStyle}
          placeholder="Crear categoría nueva…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <Button variant="secondary" onClick={add}><Plus size={14} /></Button>
      </div>
    </div>
  );
}

// ---------- New Project ----------
function NewProjectScreen({ onCancel, onCreate, availableTags, onAddCustomTag }) {
  const [proj, setProj] = useState(emptyProject());

  const addYarn = (y) => setProj((p) => ({ ...p, yarns: [...p.yarns, { ...y, id: uid() }] }));
  const removeYarn = (id) => setProj((p) => ({ ...p, yarns: p.yarns.filter((y) => y.id !== id) }));
  const addMeasure = (m) => setProj((p) => ({ ...p, measurements: [...p.measurements, { ...m, id: uid() }] }));
  const removeMeasure = (id) => setProj((p) => ({ ...p, measurements: p.measurements.filter((m) => m.id !== id) }));
  const toggleTag = (t) => setProj((p) => ({ ...p, tags: p.tags.includes(t) ? p.tags.filter((x) => x !== t) : [...p.tags, t] }));
  const addCustomTag = (t) => { onAddCustomTag(t); toggleTag(t); };

  return (
    <div>
      <TopBar title="Nuevo proyecto" onBack={onCancel} />
      <div style={{ padding: 18 }}>
        <Field label="Nombre del proyecto">
          <input style={inputStyle} value={proj.name} onChange={(e) => setProj({ ...proj, name: e.target.value })} placeholder="Ej. Jersey de Ana" />
        </Field>

        <Field label="¿Para quién es?">
          <input style={inputStyle} value={proj.forWhom} onChange={(e) => setProj({ ...proj, forWhom: e.target.value })} placeholder="Yo, o el nombre de la persona" />
        </Field>

        <Field label="Hook principal">
          <input style={inputStyle} value={proj.hookSize} onChange={(e) => setProj({ ...proj, hookSize: e.target.value })} placeholder="Ej. 4mm" />
        </Field>

        <Field label="Categoría">
          <TagPicker selected={proj.tags} availableTags={availableTags} onToggle={toggleTag} onAddCustom={addCustomTag} />
        </Field>

        <Field label="¿De dónde sacaste el patrón? (opcional)">
          <input style={inputStyle} value={proj.patternSource} onChange={(e) => setProj({ ...proj, patternSource: e.target.value })} placeholder="Ej. Libro X, web Y, me lo pasó Z" />
        </Field>

        <Field label="Yarns comprados para este proyecto">
          <YarnForm yarns={proj.yarns} onAdd={addYarn} onRemove={removeYarn} />
        </Field>

        <Field label="Medidas de este proyecto">
          <MeasurementForm measurements={proj.measurements} onAdd={addMeasure} onRemove={removeMeasure} />
        </Field>

        <Field label="Notas (opcional)">
          <textarea style={{ ...inputStyle, minHeight: 70 }} value={proj.notes} onChange={(e) => setProj({ ...proj, notes: e.target.value })} />
        </Field>

        <Button
          onClick={() => proj.name.trim() && onCreate(proj)}
          style={{ width: "100%", justifyContent: "center", marginTop: 8, opacity: proj.name.trim() ? 1 : 0.5 }}
        >
          Crear proyecto
        </Button>
      </div>
    </div>
  );
}

// ---------- Edit Details Modal ----------
function EditDetailsModal({ project, onCancel, onSave, availableTags, onAddCustomTag }) {
  const [proj, setProj] = useState(project);
  const addYarn = (y) => setProj((p) => ({ ...p, yarns: [...p.yarns, { ...y, id: uid() }] }));
  const removeYarn = (id) => setProj((p) => ({ ...p, yarns: p.yarns.filter((y) => y.id !== id) }));
  const addMeasure = (m) => setProj((p) => ({ ...p, measurements: [...p.measurements, { ...m, id: uid() }] }));
  const removeMeasure = (id) => setProj((p) => ({ ...p, measurements: p.measurements.filter((m) => m.id !== id) }));
  const toggleTag = (t) => setProj((p) => ({ ...p, tags: (p.tags || []).includes(t) ? p.tags.filter((x) => x !== t) : [...(p.tags || []), t] }));
  const addCustomTag = (t) => { onAddCustomTag(t); toggleTag(t); };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(92,64,48,0.35)", display: "flex", alignItems: "flex-end", zIndex: 20 }}>
      <div style={{ background: C.bg, width: "100%", maxWidth: 480, margin: "0 auto", borderRadius: "24px 24px 0 0", padding: 22, maxHeight: "88vh", overflowY: "auto" }}>
        <h2 style={{ fontFamily: headingFont, fontWeight: 700, fontSize: 20, margin: "0 0 16px" }}>Editar detalles</h2>

        <Field label="Nombre del proyecto">
          <input style={inputStyle} value={proj.name} onChange={(e) => setProj({ ...proj, name: e.target.value })} />
        </Field>
        <Field label="¿Para quién es?">
          <input style={inputStyle} value={proj.forWhom} onChange={(e) => setProj({ ...proj, forWhom: e.target.value })} />
        </Field>
        <Field label="Hook principal">
          <input style={inputStyle} value={proj.hookSize} onChange={(e) => setProj({ ...proj, hookSize: e.target.value })} />
        </Field>
        <Field label="Categoría">
          <TagPicker selected={proj.tags || []} availableTags={availableTags} onToggle={toggleTag} onAddCustom={addCustomTag} />
        </Field>
        <Field label="¿De dónde sacaste el patrón?">
          <input style={inputStyle} value={proj.patternSource || ""} onChange={(e) => setProj({ ...proj, patternSource: e.target.value })} />
        </Field>
        <Field label="Yarns">
          <YarnForm yarns={proj.yarns} onAdd={addYarn} onRemove={removeYarn} />
        </Field>
        <Field label="Medidas">
          <MeasurementForm measurements={proj.measurements} onAdd={addMeasure} onRemove={removeMeasure} />
        </Field>

        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <Button variant="outline" onClick={onCancel} style={{ flex: 1, justifyContent: "center" }}>Cancelar</Button>
          <Button onClick={() => onSave(proj)} style={{ flex: 1, justifyContent: "center" }}><Check size={15} /> Guardar</Button>
        </div>
      </div>
    </div>
  );
}

// ---------- Project Detail ----------
function ProjectDetailScreen({ project, onBack, onSave, onDelete, availableTags, onAddCustomTag }) {
  const [proj, setProj] = useState(project);
  const [tick, setTick] = useState(0);
  const [showFinish, setShowFinish] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [showManualSession, setShowManualSession] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => setProj(project), [project.id]);

  useEffect(() => {
    if (!proj.activeSessionStart) return;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [proj.activeSessionStart]);

  const update = (next) => {
    setProj(next);
    onSave(next);
  };

  const toggleSession = () => {
    if (proj.activeSessionStart) {
      const duration = (Date.now() - proj.activeSessionStart) / 1000;
      update({
        ...proj,
        activeSessionStart: null,
        sessions: [...proj.sessions, { id: uid(), start: proj.activeSessionStart, end: Date.now(), duration }],
      });
    } else {
      update({ ...proj, activeSessionStart: Date.now() });
    }
  };

  const deleteSession = (sid) => update({ ...proj, sessions: proj.sessions.filter((s) => s.id !== sid) });

  const addManualSession = (dateStr, minutes) => {
    const mins = parseFloat(minutes);
    if (!dateStr || !mins || mins <= 0) return;
    const start = new Date(dateStr).getTime();
    update({
      ...proj,
      sessions: [...proj.sessions, { id: uid(), start, end: start + mins * 60000, duration: mins * 60, manual: true }],
    });
    setShowManualSession(false);
    setShowSessions(true);
  };

  const setStatus = (status) => update({ ...proj, status });

  const updateSection = (sid, patch) => {
    update({ ...proj, sections: proj.sections.map((s) => (s.id === sid ? { ...s, ...patch } : s)) });
  };
  const resetSection = (sid) => {
    update({
      ...proj,
      sections: proj.sections.map((s) => s.id === sid ? { ...s, resetLog: [...s.resetLog, s.count], count: 0 } : s),
    });
  };
  const addSection = () => {
    update({ ...proj, sections: [...proj.sections, { id: uid(), name: "Nueva sección", count: 0, hookOverride: "", instructions: "", resetLog: [] }] });
  };
  const removeSection = (sid) => {
    if (proj.sections.length <= 1) return;
    update({ ...proj, sections: proj.sections.filter((s) => s.id !== sid) });
  };

  const handlePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      update({ ...proj, photos: [...proj.photos, { id: uid(), dataUrl }] });
    } catch (err) {}
    e.target.value = "";
  };
  const removePhoto = (id) => update({ ...proj, photos: proj.photos.filter((p) => p.id !== id) });

  const setYarnField = (yid, patch) => {
    update({ ...proj, yarns: proj.yarns.map((y) => (y.id === yid ? { ...y, ...patch } : y)) });
  };

  const finishProject = () => {
    update({ ...proj, status: "done", finishedAt: Date.now(), activeSessionStart: null });
    setShowFinish(false);
  };

  if (proj.status === "done") {
    return <FinishedDetail project={proj} onBack={onBack} onDelete={() => setConfirmDelete(true)} confirmDelete={confirmDelete} onConfirmDelete={onDelete} onCancelDelete={() => setConfirmDelete(false)} />;
  }

  const running = !!proj.activeSessionStart;

  return (
    <div>
      <TopBar
        title={proj.name || "Proyecto"}
        onBack={onBack}
        right={
          <button onClick={() => setConfirmDelete(true)} style={{ background: "none", border: "none", cursor: "pointer", color: C.brownFaint }}>
            <Trash2 size={18} />
          </button>
        }
      />

      {confirmDelete && (
        <ConfirmBar text="¿Eliminar este proyecto? No se puede deshacer." onConfirm={onDelete} onCancel={() => setConfirmDelete(false)} />
      )}

      <div style={{ padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 12, color: C.brownSoft }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Users size={12} />{proj.forWhom}</span>
            {proj.hookSize && <><span>·</span><span style={{ display: "flex", alignItems: "center", gap: 4 }}><Scissors size={12} />{proj.hookSize}</span></>}
            {proj.status === "paused" && <><span>·</span><span>Pausado</span></>}
            {proj.patternSource && <><span>·</span><span>Patrón: {proj.patternSource}</span></>}
          </div>
          <button onClick={() => setShowEdit(true)} style={{ background: "none", border: "none", cursor: "pointer", color: C.brownSoft, display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700 }}>
            <Pencil size={13} /> Editar
          </button>
        </div>

        {/* Timer card */}
        <div style={{ background: C.green, borderRadius: 20, padding: 18, marginBottom: 16, textAlign: "center" }}>
          <div style={{ fontSize: 12, color: C.greenDeep, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Tiempo total tejido</div>
          <div style={{ fontFamily: headingFont, fontWeight: 700, fontSize: 34, color: C.brown, margin: "4px 0 10px" }}>
            {formatDuration(projectTotalSeconds(proj))}
          </div>
          <Button onClick={toggleSession} style={{ margin: "0 auto", justifyContent: "center", background: running ? C.danger : C.greenDeep, boxShadow: running ? "none" : "0 3px 0 #6a8a58" }}>
            {running ? <><Pause size={16} /> Parar sesión</> : <><Play size={16} /> Empezar a tejer</>}
          </Button>

          <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 12 }}>
            {proj.sessions.length > 0 && (
              <button onClick={() => setShowSessions((v) => !v)} style={linkBtnStyle}>
                {proj.sessions.length} sesiones registradas {showSessions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
            <button onClick={() => setShowManualSession((v) => !v)} style={linkBtnStyle}>
              <CalendarPlus size={13} /> Añadir sesión pasada
            </button>
          </div>

          {showManualSession && (
            <ManualSessionForm onAdd={addManualSession} onCancel={() => setShowManualSession(false)} />
          )}

          {showSessions && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6, textAlign: "left" }}>
              {[...proj.sessions].sort((a, b) => b.start - a.start).map((s) => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", background: C.cream, borderRadius: 10, padding: "6px 10px", fontSize: 12, color: C.brown }}>
                  <span>{formatDateTime(s.start)}{s.manual ? " · manual" : ""}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {formatDuration(s.duration)}
                    <button onClick={() => deleteSession(s.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.brownFaint }}><X size={12} /></button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sections / counters */}
        <SectionTitle icon={<Ruler size={15} />} text="Contador" />
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 8 }}>
          {proj.sections.map((s) => (
            <SectionCounter
              key={s.id}
              section={s}
              showName={proj.sections.length > 1}
              defaultHook={proj.hookSize}
              onChange={(patch) => updateSection(s.id, patch)}
              onReset={() => resetSection(s.id)}
              onRemove={proj.sections.length > 1 ? () => removeSection(s.id) : null}
            />
          ))}
        </div>
        <Button variant="ghost" onClick={addSection} style={{ marginBottom: 20 }}>
          <Plus size={14} /> Añadir sección
        </Button>

        {/* Yarns */}
        <SectionTitle icon={<Scissors size={15} />} text="Yarns de este proyecto" />
        <div style={{ marginBottom: 20 }}>
          {proj.yarns.length === 0 ? <EmptyHint text="No añadiste yarns a este proyecto." /> :
            <YarnForm yarns={proj.yarns} onUpdate={setYarnField} showUsedField />}
        </div>

        {/* Measurements */}
        <SectionTitle icon={<Ruler size={15} />} text="Medidas" />
        <div style={{ marginBottom: 20 }}>
          {proj.measurements.length === 0 ? <EmptyHint text="No hay medidas guardadas." /> :
            <MeasurementForm measurements={proj.measurements} />}
        </div>

        {/* Photos */}
        <SectionTitle icon={<Camera size={15} />} text="Fotos" />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {proj.photos.map((ph) => (
            <div key={ph.id} style={{ position: "relative" }}>
              <img src={ph.dataUrl} style={{ width: 74, height: 74, objectFit: "cover", borderRadius: 12, border: `1.5px solid ${C.border}` }} />
              <button onClick={() => removePhoto(ph.id)} style={{
                position: "absolute", top: -6, right: -6, background: C.danger, color: "#fff", borderRadius: "50%",
                width: 20, height: 20, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}><X size={12} /></button>
            </div>
          ))}
          <button onClick={() => fileRef.current.click()} style={{
            width: 74, height: 74, borderRadius: 12, border: `1.5px dashed ${C.border}`, background: C.cream,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.brownFaint,
          }}>
            <Plus size={20} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhoto} />
        </div>

        {/* Notes */}
        <SectionTitle icon={<StickyNote size={15} />} text="Notas" />
        <textarea
          style={{ ...inputStyle, minHeight: 70, marginBottom: 24 }}
          value={proj.notes}
          onChange={(e) => update({ ...proj, notes: e.target.value })}
        />

        <div style={{ display: "flex", gap: 10 }}>
          {proj.status === "active" ? (
            <Button variant="outline" onClick={() => setStatus("paused")} style={{ flex: 1, justifyContent: "center" }}>
              <Pause size={15} /> Pausar
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setStatus("active")} style={{ flex: 1, justifyContent: "center" }}>
              <Play size={15} /> Reactivar
            </Button>
          )}
          <Button onClick={() => setShowFinish(true)} style={{ flex: 1, justifyContent: "center" }}>
            <Check size={15} /> Terminar
          </Button>
        </div>
      </div>

      {showFinish && (
        <FinishModal project={proj} onCancel={() => setShowFinish(false)} onConfirm={finishProject} setYarnField={setYarnField} />
      )}
      {showEdit && (
        <EditDetailsModal
          project={proj}
          onCancel={() => setShowEdit(false)}
          onSave={(p) => { update(p); setShowEdit(false); }}
          availableTags={availableTags}
          onAddCustomTag={onAddCustomTag}
        />
      )}
    </div>
  );
}

function SectionCounter({ section, showName, defaultHook, onChange, onReset, onRemove }) {
  const [editingName, setEditingName] = useState(false);
  return (
    <div style={{ background: C.card, borderRadius: 18, padding: 14, border: `1.5px solid ${C.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        {editingName ? (
          <input
            style={{ ...inputStyle, fontWeight: 700 }}
            autoFocus
            value={section.name}
            onChange={(e) => onChange({ name: e.target.value })}
            onBlur={() => setEditingName(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
          />
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: showName ? "pointer" : "default" }} onClick={() => showName && setEditingName(true)}>
            {showName && <span style={{ fontWeight: 700, fontSize: 14 }}>{section.name}</span>}
            {showName && <Edit2 size={12} color={C.brownFaint} />}
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onReset} title="Reiniciar contador" style={{ background: "none", border: "none", cursor: "pointer", color: C.brownSoft }}>
            <RotateCcw size={16} />
          </button>
          {onRemove && (
            <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: C.brownFaint }}>
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20 }}>
        <button onClick={() => onChange({ count: Math.max(0, section.count - 1) })} style={circleBtnStyle}>−</button>
        <div style={{ fontFamily: headingFont, fontWeight: 700, fontSize: 40, minWidth: 70, textAlign: "center", color: C.brown }}>
          {section.count}
        </div>
        <button onClick={() => onChange({ count: section.count + 1 })} style={{ ...circleBtnStyle, background: C.greenDeep, color: "#fff" }}>+</button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 12, color: C.brownSoft }}>
        <span>Total con reinicios: {sectionTotal(section)}</span>
      </div>

      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          style={{ ...inputStyle, fontSize: 12, padding: "6px 10px" }}
          placeholder={`Hook para esta sección (si no, ${defaultHook || "el principal"})`}
          value={section.hookOverride}
          onChange={(e) => onChange({ hookOverride: e.target.value })}
        />
        <textarea
          style={{ ...inputStyle, fontSize: 12, padding: "6px 10px", minHeight: 44 }}
          placeholder="Instrucciones de esta parte (opcional)"
          value={section.instructions}
          onChange={(e) => onChange({ instructions: e.target.value })}
        />
      </div>
    </div>
  );
}

const linkBtnStyle = {
  background: "none", border: "none", cursor: "pointer", color: C.brownSoft,
  fontSize: 12, display: "flex", alignItems: "center", gap: 4, fontFamily: bodyFont, fontWeight: 700,
};

function ManualSessionForm({ onAdd, onCancel }) {
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [minutes, setMinutes] = useState("");
  return (
    <div style={{ marginTop: 12, background: C.cream, borderRadius: 14, padding: 12, textAlign: "left" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input type="datetime-local" style={{ ...inputStyle, fontSize: 12 }} value={date} onChange={(e) => setDate(e.target.value)} />
        <input style={{ ...inputStyle, fontSize: 12, maxWidth: 90 }} placeholder="minutos" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Button variant="outline" onClick={onCancel} style={{ flex: 1, justifyContent: "center", padding: "7px 10px", fontSize: 12 }}>Cancelar</Button>
        <Button onClick={() => onAdd(date, minutes)} style={{ flex: 1, justifyContent: "center", padding: "7px 10px", fontSize: 12 }}>Añadir</Button>
      </div>
    </div>
  );
}

const circleBtnStyle = {
  width: 44, height: 44, borderRadius: "50%", border: "none", cursor: "pointer",
  fontSize: 22, background: C.green, color: C.brown, display: "flex", alignItems: "center", justifyContent: "center",
};

function FinishModal({ project, onCancel, onConfirm, setYarnField }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(92,64,48,0.35)", display: "flex", alignItems: "flex-end", zIndex: 20 }}>
      <div style={{ background: C.bg, width: "100%", maxWidth: 480, margin: "0 auto", borderRadius: "24px 24px 0 0", padding: 22, maxHeight: "85vh", overflowY: "auto" }}>
        <h2 style={{ fontFamily: headingFont, fontWeight: 700, fontSize: 20, margin: "0 0 6px" }}>Terminar «{project.name}»</h2>
        <p style={{ fontSize: 13, color: C.brownSoft, margin: "0 0 16px" }}>
          Antes de cerrar, confirma cuántos ovillos usaste de cada yarn (déjalo vacío si no aplica).
        </p>

        {project.yarns.length === 0 ? <EmptyHint text="No hay yarns que confirmar." /> : (
          <div style={{ marginBottom: 20 }}>
            <YarnForm yarns={project.yarns} onUpdate={setYarnField} showUsedField />
          </div>
        )}

        <div style={{ background: C.green, borderRadius: 16, padding: 14, marginBottom: 18, fontSize: 13 }}>
          <div><b>Tiempo total:</b> {formatDuration(projectTotalSeconds(project))}</div>
          <div><b>Filas totales:</b> {projectTotalRows(project)}</div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="outline" onClick={onCancel} style={{ flex: 1, justifyContent: "center" }}>Cancelar</Button>
          <Button onClick={onConfirm} style={{ flex: 1, justifyContent: "center" }}><Check size={15} /> Confirmar y cerrar</Button>
        </div>
      </div>
    </div>
  );
}

function FinishedDetail({ project, onBack, onDelete, confirmDelete, onConfirmDelete, onCancelDelete }) {
  return (
    <div>
      <TopBar
        title={project.name}
        onBack={onBack}
        right={
          <button onClick={onDelete} style={{ background: "none", border: "none", cursor: "pointer", color: C.brownFaint }}>
            <Trash2 size={18} />
          </button>
        }
      />
      {confirmDelete && (
        <ConfirmBar text="¿Eliminar este proyecto terminado? No se puede deshacer." onConfirm={onConfirmDelete} onCancel={onCancelDelete} />
      )}
      <div style={{ padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.greenDeep, fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
          <CheckCircle2 size={16} /> Terminado el {formatDate(project.finishedAt)}
        </div>
        {project.tags && project.tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {project.tags.map((t) => (
              <span key={t} style={{ fontSize: 11, background: C.green, color: C.greenDeep, borderRadius: 8, padding: "2px 9px", fontWeight: 700 }}>{t}</span>
            ))}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          <StatBox label="Tiempo tejiendo" value={formatDuration(projectTotalSeconds(project))} />
          <StatBox label="Filas totales" value={projectTotalRows(project)} />
          <StatBox label="Para" value={project.forWhom} />
          <StatBox label="Duración calendario" value={`${formatDate(project.createdAt)} → ${formatDate(project.finishedAt)}`} small />
        </div>
        {project.patternSource && (
          <div style={{ fontSize: 13, background: C.card, borderRadius: 12, padding: "10px 12px", border: `1.5px solid ${C.border}`, marginBottom: 20 }}>
            <b>Patrón:</b> {project.patternSource}
          </div>
        )}

        <SectionTitle icon={<Ruler size={15} />} text="Filas por sección" />
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
          {project.sections.map((s) => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, background: C.card, borderRadius: 12, padding: "8px 12px", border: `1.5px solid ${C.border}` }}>
              <span>{s.name}{s.hookOverride ? ` (${s.hookOverride})` : ""}</span>
              <b>{sectionTotal(s)} filas</b>
            </div>
          ))}
        </div>

        <SectionTitle icon={<Scissors size={15} />} text="Yarn: comprado vs. usado" />
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
          {project.yarns.length === 0 && <EmptyHint text="No se registraron yarns." />}
          {project.yarns.map((y) => {
            const bought = parseFloat(y.ovillos) || 0;
            const used = parseFloat(y.usedOvillos) || 0;
            const left = bought && y.usedOvillos !== null && y.usedOvillos !== "" ? (bought - used) : null;
            return (
              <div key={y.id} style={{ fontSize: 13, background: C.card, borderRadius: 12, padding: "8px 12px", border: `1.5px solid ${C.border}` }}>
                <div><b>{y.marca || "Sin marca"}</b>{y.color ? ` · ${y.color}` : ""}</div>
                <div style={{ color: C.brownSoft, fontSize: 12 }}>
                  Comprados: {y.ovillos || "?"} ovillos ({y.metros || "?"}m / {y.gramos || "?"}g c/u) · Usados: {y.usedOvillos || "0"}
                  {left !== null ? ` · Sobran ${left} ovillos` : ""}
                </div>
              </div>
            );
          })}
        </div>

        {project.measurements.length > 0 && (
          <>
            <SectionTitle icon={<Ruler size={15} />} text="Medidas" />
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
              {project.measurements.map((m) => (
                <div key={m.id} style={{ fontSize: 13, background: C.card, borderRadius: 12, padding: "8px 12px", border: `1.5px solid ${C.border}` }}>
                  <b>{m.label}:</b> {m.value}
                </div>
              ))}
            </div>
          </>
        )}

        {project.photos.length > 0 && (
          <>
            <SectionTitle icon={<Camera size={15} />} text="Fotos" />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
              {project.photos.map((ph) => (
                <img key={ph.id} src={ph.dataUrl} style={{ width: 74, height: 74, objectFit: "cover", borderRadius: 12, border: `1.5px solid ${C.border}` }} />
              ))}
            </div>
          </>
        )}

        {project.notes && (
          <>
            <SectionTitle icon={<StickyNote size={15} />} text="Notas" />
            <div style={{ fontSize: 13, background: C.card, borderRadius: 12, padding: "10px 12px", border: `1.5px solid ${C.border}` }}>{project.notes}</div>
          </>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, small }) {
  return (
    <div style={{ background: C.green, borderRadius: 16, padding: "12px 14px" }}>
      <div style={{ fontSize: 11, color: C.greenDeep, fontWeight: 700, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: headingFont, fontWeight: 700, fontSize: small ? 13 : 20, color: C.brown, marginTop: 2 }}>{value}</div>
    </div>
  );
}

// ---------- Stats ----------
function StatsScreen({ projects, onBack }) {
  const finished = projects.filter((p) => p.status === "done");
  const activeOnes = projects.filter((p) => p.status !== "done");
  const totalSeconds = projects.reduce((a, p) => a + projectTotalSeconds(p), 0);
  const totalRows = projects.reduce((a, p) => a + projectTotalRows(p), 0);

  const brandCount = {};
  const tagCount = {};
  projects.forEach((p) => {
    (p.yarns || []).forEach((y) => {
      if (y.marca) brandCount[y.marca] = (brandCount[y.marca] || 0) + 1;
    });
    (p.tags || []).forEach((t) => {
      tagCount[t] = (tagCount[t] || 0) + 1;
    });
  });
  const topBrand = Object.entries(brandCount).sort((a, b) => b[1] - a[1])[0];
  const topTag = Object.entries(tagCount).sort((a, b) => b[1] - a[1])[0];
  const avgFinishedSeconds = finished.length ? finished.reduce((a, p) => a + projectTotalSeconds(p), 0) / finished.length : 0;

  return (
    <div>
      <TopBar title="Estadísticas" onBack={onBack} />
      <div style={{ padding: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          <StatBox label="Horas tejidas en total" value={formatDuration(totalSeconds)} />
          <StatBox label="Filas tejidas en total" value={totalRows} />
          <StatBox label="Proyectos terminados" value={finished.length} />
          <StatBox label="Proyectos en curso" value={activeOnes.length} />
        </div>

        {finished.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <SectionTitle icon={<Clock size={15} />} text="Media por proyecto terminado" />
            <div style={{ background: C.card, borderRadius: 14, padding: "12px 14px", border: `1.5px solid ${C.border}`, fontSize: 14 }}>
              {formatDuration(avgFinishedSeconds)} de media
            </div>
          </div>
        )}

        {topBrand && (
          <div style={{ marginBottom: 20 }}>
            <SectionTitle icon={<Scissors size={15} />} text="Marca de yarn más usada" />
            <div style={{ background: C.card, borderRadius: 14, padding: "12px 14px", border: `1.5px solid ${C.border}`, fontSize: 14 }}>
              <b>{topBrand[0]}</b> · usada en {topBrand[1]} {topBrand[1] === 1 ? "proyecto" : "proyectos"}
            </div>
          </div>
        )}

        {topTag && (
          <div style={{ marginBottom: 20 }}>
            <SectionTitle icon={<Tag size={15} />} text="Categoría favorita" />
            <div style={{ background: C.card, borderRadius: 14, padding: "12px 14px", border: `1.5px solid ${C.border}`, fontSize: 14 }}>
              <b>{topTag[0]}</b> · {topTag[1]} {topTag[1] === 1 ? "proyecto" : "proyectos"}
            </div>
          </div>
        )}

        {projects.length === 0 && <EmptyHint text="Aún no hay datos suficientes. ¡Empieza un proyecto!" />}
      </div>
    </div>
  );
}

// ---------- Inventory ----------
function InventoryScreen({ inventory, onBack, onSave }) {
  const [inv, setInv] = useState(inventory);
  const [hookDraft, setHookDraft] = useState({ size: "", brand: "", qty: "1" });
  const [yarnDraft, setYarnDraft] = useState({ marca: "", color: "", tipo: "", cantidad: "" });
  const [otherDraft, setOtherDraft] = useState({ name: "", qty: "" });

  const commit = (next) => { setInv(next); onSave(next); };

  const addHook = () => {
    if (!hookDraft.size) return;
    commit({ ...inv, hooks: [...inv.hooks, { id: uid(), ...hookDraft }] });
    setHookDraft({ size: "", brand: "", qty: "1" });
  };
  const addYarn = () => {
    if (!yarnDraft.marca && !yarnDraft.color) return;
    commit({ ...inv, yarns: [...inv.yarns, { id: uid(), ...yarnDraft }] });
    setYarnDraft({ marca: "", color: "", tipo: "", cantidad: "" });
  };
  const addOther = () => {
    if (!otherDraft.name) return;
    commit({ ...inv, others: [...inv.others, { id: uid(), ...otherDraft }] });
    setOtherDraft({ name: "", qty: "" });
  };

  const removeItem = (cat, id) => commit({ ...inv, [cat]: inv[cat].filter((x) => x.id !== id) });

  const sortedHooks = [...inv.hooks].sort((a, b) => leadingNumber(a.size) - leadingNumber(b.size));
  const sortedYarns = [...inv.yarns].sort((a, b) => (a.marca + a.color).localeCompare(b.marca + b.color, "es"));
  const sortedOthers = [...inv.others].sort((a, b) => a.name.localeCompare(b.name, "es"));

  return (
    <div>
      <TopBar title="Mi inventario" onBack={onBack} />
      <div style={{ padding: 18 }}>
        <SectionTitle icon={<Scissors size={15} />} text="Hooks" />
        <p style={{ fontSize: 11.5, color: C.brownFaint, margin: "-4px 0 10px" }}>Se ordenan solos de menor a mayor tamaño.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
          {sortedHooks.map((h) => (
            <div key={h.id} style={{ display: "flex", justifyContent: "space-between", background: C.card, borderRadius: 12, padding: "9px 12px", border: `1.5px solid ${C.border}` }}>
              <span style={{ fontSize: 13 }}><b>{h.size}</b>{h.brand ? ` · ${h.brand}` : ""} {h.qty && h.qty !== "1" ? `× ${h.qty}` : ""}</span>
              <button onClick={() => removeItem("hooks", h.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.brownFaint }}><X size={14} /></button>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 60px", gap: 8, marginBottom: 20 }}>
          <input style={inputStyle} placeholder="Tamaño (4mm)" value={hookDraft.size} onChange={(e) => setHookDraft({ ...hookDraft, size: e.target.value })} />
          <input style={inputStyle} placeholder="Marca" value={hookDraft.brand} onChange={(e) => setHookDraft({ ...hookDraft, brand: e.target.value })} />
          <input style={inputStyle} placeholder="Uds" value={hookDraft.qty} onChange={(e) => setHookDraft({ ...hookDraft, qty: e.target.value })} />
          <Button variant="secondary" onClick={addHook} style={{ gridColumn: "1 / -1", justifyContent: "center" }}><Plus size={14} /> Añadir hook</Button>
        </div>

        <SectionTitle icon={<Package size={15} />} text="Yarns en stash" />
        <p style={{ fontSize: 11.5, color: C.brownFaint, margin: "-4px 0 10px" }}>Ordenados alfabéticamente por marca.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
          {sortedYarns.map((y) => (
            <div key={y.id} style={{ display: "flex", justifyContent: "space-between", background: C.card, borderRadius: 12, padding: "9px 12px", border: `1.5px solid ${C.border}` }}>
              <span style={{ fontSize: 13 }}><b>{y.marca}</b>{y.color ? ` · ${y.color}` : ""}{y.tipo ? ` · ${y.tipo}` : ""}{y.cantidad ? ` · ${y.cantidad}` : ""}</span>
              <button onClick={() => removeItem("yarns", y.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.brownFaint }}><X size={14} /></button>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
          <input style={inputStyle} placeholder="Marca" value={yarnDraft.marca} onChange={(e) => setYarnDraft({ ...yarnDraft, marca: e.target.value })} />
          <input style={inputStyle} placeholder="Color" value={yarnDraft.color} onChange={(e) => setYarnDraft({ ...yarnDraft, color: e.target.value })} />
          <input style={inputStyle} placeholder="Tipo" value={yarnDraft.tipo} onChange={(e) => setYarnDraft({ ...yarnDraft, tipo: e.target.value })} />
          <input style={inputStyle} placeholder="Cantidad" value={yarnDraft.cantidad} onChange={(e) => setYarnDraft({ ...yarnDraft, cantidad: e.target.value })} />
          <Button variant="secondary" onClick={addYarn} style={{ gridColumn: "1 / -1", justifyContent: "center" }}><Plus size={14} /> Añadir yarn</Button>
        </div>

        <SectionTitle icon={<Package size={15} />} text="Otros materiales" />
        <p style={{ fontSize: 11.5, color: C.brownFaint, margin: "-4px 0 10px" }}>Ordenados alfabéticamente.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
          {sortedOthers.map((o) => (
            <div key={o.id} style={{ display: "flex", justifyContent: "space-between", background: C.card, borderRadius: 12, padding: "9px 12px", border: `1.5px solid ${C.border}` }}>
              <span style={{ fontSize: 13 }}><b>{o.name}</b>{o.qty ? ` · ${o.qty}` : ""}</span>
              <button onClick={() => removeItem("others", o.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.brownFaint }}><X size={14} /></button>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 8 }}>
          <input style={inputStyle} placeholder="Ej. Gomas elásticas" value={otherDraft.name} onChange={(e) => setOtherDraft({ ...otherDraft, name: e.target.value })} />
          <input style={inputStyle} placeholder="Cant." value={otherDraft.qty} onChange={(e) => setOtherDraft({ ...otherDraft, qty: e.target.value })} />
          <Button variant="secondary" onClick={addOther} style={{ gridColumn: "1 / -1", justifyContent: "center" }}><Plus size={14} /> Añadir</Button>
        </div>
      </div>
    </div>
  );
}
