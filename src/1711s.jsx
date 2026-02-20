import { useState, useEffect, useRef, createContext, useContext } from "react";
import { BookOpen, MessageSquare, Trophy, Users, Star, ChevronRight, ChevronDown, Send, Flame, Search, Plus, X, Check, Clock, TrendingUp, Award, Bookmark, ArrowLeft, Heart, Zap, Eye, Edit3, Hash, Menu } from "lucide-react";
import { supabase } from "./supabaseClient";
import { loadAllData, syncChanges } from "./supabaseData";

// Polyfill storage for browser (in-memory fallback if localStorage unavailable)
if (!window.storage) {
  const _memStore = {};
  window.storage = {
    async get(key) {
      try {
        const value = localStorage.getItem(key);
        return value ? { value } : null;
      } catch {
        return _memStore[key] ? { value: _memStore[key] } : null;
      }
    },
    async set(key, value) {
      try { localStorage.setItem(key, value); } catch { _memStore[key] = value; }
    },
    async delete(key) {
      try { localStorage.removeItem(key); } catch { delete _memStore[key]; }
    }
  };
}

// ════════════════════════════════════════
// CONTEXT & DATA LAYER
// ════════════════════════════════════════
const AppContext = createContext(null);

// Members are now loaded from Supabase profiles.
// These empty defaults are used before data loads; once loaded, use data.members.
const MEMBERS = [];
const ALL_USERS = [];

// Helper to look up a member from the data.members array
function findMember(data, id) {
  return (data?.members || []).find(m => m.id === id) || { id, name: "Unknown", avatar: "??", tag: "0000" };
}
function getMembers(data) {
  return data?.members || [];
}
function getAllUsers(data) {
  return data?.members || [];
}

const CATEGORIES = [
  "Systematic Theology", "Biblical Theology", "Church History",
  "Apologetics", "Devotional", "Confessional Studies", "Pastoral", "Biography"
];

const FORUM_CATEGORIES = [
  "Bibliology", "Theology Proper", "Soteriology", "Ecclesiology",
  "Eschatology", "Hermeneutics", "Confessional Studies", "Church History",
  "Pastoral & Practical", "General Discussion"
];

const SEED_BOOKS = [
  { id: "b1", title: "1689 Baptist Confession of Faith", author: "Various", category: "Confessional Studies", pages: 120, cover: "", coverUrl: "https://covers.openlibrary.org/b/id/8231856-M.jpg" },
  { id: "b2", title: "Pilgrim's Progress", author: "John Bunyan", category: "Devotional", pages: 336, cover: "", coverUrl: "https://covers.openlibrary.org/b/id/14348220-M.jpg" },
  { id: "b3", title: "Holiness", author: "J.C. Ryle", category: "Devotional", pages: 288, cover: "", coverUrl: "https://covers.openlibrary.org/b/id/8091498-M.jpg" },
  { id: "b4", title: "Knowing God", author: "J.I. Packer", category: "Systematic Theology", pages: 286, cover: "", coverUrl: "https://covers.openlibrary.org/b/id/240726-M.jpg" },
  { id: "b5", title: "Institutes of the Christian Religion", author: "John Calvin", category: "Systematic Theology", pages: 1521, cover: "", coverUrl: "https://covers.openlibrary.org/b/id/12818414-M.jpg" },
  { id: "b6", title: "The Existence and Attributes of God", author: "Stephen Charnock", category: "Theology Proper", pages: 1072, cover: "", coverUrl: "https://covers.openlibrary.org/b/id/940138-M.jpg" },
  { id: "b7", title: "Morning & Evening", author: "C.H. Spurgeon", category: "Devotional", pages: 732, cover: "", coverUrl: "https://covers.openlibrary.org/b/id/417681-M.jpg" },
  { id: "b8", title: "The Doctrine of Repentance", author: "Thomas Watson", category: "Systematic Theology", pages: 128, cover: "", coverUrl: "https://covers.openlibrary.org/b/id/6880674-M.jpg" },
  { id: "b9", title: "The Reformed Pastor", author: "Richard Baxter", category: "Pastoral", pages: 256, cover: "", coverUrl: "https://covers.openlibrary.org/b/id/7894651-M.jpg" },
  { id: "b10", title: "Desiring God", author: "John Piper", category: "Devotional", pages: 368, cover: "", coverUrl: "https://covers.openlibrary.org/b/id/569407-M.jpg" },
  { id: "b11", title: "Mere Christianity", author: "C.S. Lewis", category: "Apologetics", pages: 227, cover: "", coverUrl: "https://covers.openlibrary.org/b/id/14345889-M.jpg" },
  { id: "b12", title: "The Mortification of Sin", author: "John Owen", category: "Systematic Theology", pages: 144, cover: "", coverUrl: "https://covers.openlibrary.org/b/id/6880675-M.jpg" },
];

const SEAL_DEFINITIONS = [
  {
    id: "seal-berean", name: "Berean", subtitle: "Acts 17:11",
    description: "Examine the Scriptures daily with noble purpose.",
    icon: "✦", color: "#D4AF37",
    triumphs: [
      { id: "t1", name: "Voracious Reader", desc: "Read 5 books", type: "books_read", target: 5 },
      { id: "t2", name: "Thoughtful Critic", desc: "Write 3 reviews", type: "reviews_written", target: 3 },
      { id: "t3", name: "Conversation Starter", desc: "Start 2 discussion threads", type: "threads_started", target: 2 },
      { id: "t4", name: "Scripture Immersion", desc: "Complete a book of the Bible reading", type: "bible_read", target: 1 },
    ]
  },
  {
    id: "seal-reformer", name: "Reformer", subtitle: "Sola Scriptura",
    description: "Master the foundations of Reformed theology.",
    icon: "⚡", color: "#C0392B",
    triumphs: [
      { id: "t5", name: "Reformed Reader", desc: "Read 3 Reformed theology books", type: "reformed_books", target: 3 },
      { id: "t6", name: "Review Scholar", desc: "Post a review on each", type: "reformed_reviews", target: 3 },
      { id: "t7", name: "Soteriological Defender", desc: "Participate in 5 soteriology discussions", type: "soteriology_posts", target: 5 },
    ]
  },
  {
    id: "seal-apologist", name: "Apologist", subtitle: "1 Peter 3:15",
    description: "Always be prepared to give a defense for the hope that is in you.",
    icon: "◆", color: "#2980B9",
    triumphs: [
      { id: "t8", name: "Defender's Library", desc: "Read 2 apologetics books", type: "apologetics_books", target: 2 },
      { id: "t9", name: "Hard Questions", desc: "Start a discussion on a hard theological question", type: "hard_question", target: 1 },
      { id: "t10", name: "Deep Dive", desc: "Write a 500+ word review", type: "long_review", target: 1 },
    ]
  },
  {
    id: "seal-confessor", name: "Confessor", subtitle: "1689 LBCF",
    description: "Know and confess the faith once delivered to the saints.",
    icon: "※", color: "#8E44AD",
    triumphs: [
      { id: "t11", name: "Confession Complete", desc: "Read the entire 1689 LBCF", type: "lbcf_read", target: 1 },
      { id: "t12", name: "Confessional Scholar", desc: "Discuss 5 chapters in the forum", type: "lbcf_discussions", target: 5 },
      { id: "t13", name: "Catechized", desc: "Complete the confession quiz", type: "quiz_complete", target: 1 },
    ]
  },
  {
    id: "seal-theologian", name: "Theologian", subtitle: "2 Timothy 2:15",
    description: "A workman who need not be ashamed.",
    icon: "∞", color: "#F39C12",
    triumphs: [
      { id: "t14", name: "Triple Sealed", desc: "Complete 3 other seals", type: "seals_complete", target: 3 },
    ]
  },
  {
    id: "seal-shepherd", name: "Shepherd", subtitle: "1 Peter 5:2",
    description: "Feed the flock of God which is among you.",
    icon: "†", color: "#27AE60",
    triumphs: [
      { id: "t15", name: "Thread Weaver", desc: "Start 10 discussion threads", type: "threads_10", target: 10 },
      { id: "t16", name: "Faithful Responder", desc: "Reply to 20 threads", type: "replies_20", target: 20 },
      { id: "t17", name: "Book Evangelist", desc: "Recommend 5 books to the group", type: "recommendations", target: 5 },
    ]
  },
];

const DAILY_VERSES = [
  { ref: "Acts 17:11", text: "Now the Berean Jews were of more noble character than those in Thessalonica, for they received the message with great eagerness and examined the Scriptures every day to see if what Paul said was true." },
  { ref: "2 Timothy 3:16-17", text: "All Scripture is God-breathed and is useful for teaching, rebuking, correcting and training in righteousness, so that the servant of God may be thoroughly equipped for every good work." },
  { ref: "Psalm 119:105", text: "Your word is a lamp for my feet, a light on my path." },
  { ref: "Romans 8:28-29", text: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose. For those God foreknew he also predestined to be conformed to the image of his Son." },
  { ref: "Ephesians 2:8-9", text: "For it is by grace you have been saved, through faith—and this is not from yourselves, it is the gift of God—not by works, so that no one can boast." },
  { ref: "Hebrews 4:12", text: "For the word of God is alive and active. Sharper than any double-edged sword, it penetrates even to dividing soul and spirit, joints and marrow; it judges the thoughts and attitudes of the heart." },
  { ref: "1 Peter 3:15", text: "But in your hearts revere Christ as Lord. Always be prepared to give an answer to everyone who asks you to give the reason for the hope that you have. But do this with gentleness and respect." },
];

function getSeedData() {
  return {
    members: [],
    books: [],
    readingProgress: {},
    reviews: [],
    threads: [],
    recommendations: [],
    activities: [],
    equippedTitles: {},
    completedSeals: {},
    triumphProgress: {},
    groupChallenges: [],
    readInvites: [],
    bibleProgress: {},
    prestigeLevel: {},
    customSeals: [],
    pinnedThreads: [],
    displayNames: {},
    friendRequests: [],
    friends: {},
  };
}

// ════════════════════════════════════════
// UTILITY COMPONENTS
// ════════════════════════════════════════
function formatScripture(text) {
  if (!text) return text;
  const regex = /\b(\d?\s?[A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+(\d+:\d+(?:-\d+)?(?:,\s*\d+)?)/g;
  const parts = [];
  let last = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(`⟨${match[0]}⟩`);
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.join("");
}

function getBibleGatewayUrl(reference) {
  return `https://www.biblegateway.com/passage/?search=${encodeURIComponent(reference)}&version=LSB`;
}

function ScriptureRef({ reference }) {
  return (
    <a
      href={getBibleGatewayUrl(reference)}
      target="_blank"
      rel="noopener noreferrer"
      className="scripture-ref"
      onClick={e => e.stopPropagation()}
    >
      {reference}
    </a>
  );
}

function ScriptureText({ text }) {
  if (!text) return null;
  const regex = /⟨([^⟩]+)⟩/g;
  const formatted = formatScripture(text);
  const parts = formatted.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <ScriptureRef key={i} reference={part} />
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

function GlowTitle({ title, color }) {
  if (!title) return null;
  return (
    <span
      className="glow-title"
      style={{
        color: color || "#D4AF37",
        textShadow: `0 0 8px ${color || "#D4AF37"}66, 0 0 20px ${color || "#D4AF37"}33`,
      }}
    >
      {title}
    </span>
  );
}

function ProgressBar({ value, max, color = "#D4AF37", height = 6 }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="progress-bar-track" style={{ height }}>
      <div
        className="progress-bar-fill"
        style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})`, height }}
      />
    </div>
  );
}

function StarRating({ rating, onChange, size = 18 }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          size={size}
          onClick={onChange ? () => onChange(s) : undefined}
          style={{
            cursor: onChange ? "pointer" : "default",
            fill: s <= rating ? "#D4AF37" : "transparent",
            color: s <= rating ? "#D4AF37" : "#555",
            transition: "all 0.2s",
          }}
        />
      ))}
    </div>
  );
}

function getPrestigeColor(level) {
  if (level <= 0) return "#4A4235";
  // Yellow(1) → Gold(2) → Teal(3) → Cyan(4) → Blue(5) → Indigo(6) → Purple(7) → Crimson(8) → Deep Red(9) → Inferno(10)
  const colors = ["#E8D44D", "#D4AF37", "#2BBFA0", "#2B9EB3", "#3366CC", "#4338A0", "#7B2D8E", "#C0392B", "#8B1A1A", "#FF2D00"];
  return colors[Math.min(level - 1, colors.length - 1)];
}

function getPrestigeName(level) {
  const names = ["Initiate", "Acolyte", "Scholar", "Disciple", "Sentinel", "Luminary", "Prophet", "Apostle", "Patriarch", "ETERNAL"];
  return names[Math.min(level - 1, names.length - 1)] || "";
}

function PrestigeEmblem({ level, size = 24, showLabel = false }) {
  if (!level || level < 1) return null;
  const points = Math.min(level, 10);
  const s = size;
  const cx = s / 2, cy = s / 2;
  const color = getPrestigeColor(level);
  const isMax = level >= 10;
  const outerR = s * 0.42;
  const innerR = s * 0.18;

  // Generate star points
  const starPath = Array.from({ length: points }, (_, i) => {
    const angle = (i / points) * Math.PI * 2 - Math.PI / 2;
    const nextAngle = ((i + 0.5) / points) * Math.PI * 2 - Math.PI / 2;
    const ox = cx + outerR * Math.cos(angle);
    const oy = cy + outerR * Math.sin(angle);
    const ix = cx + innerR * Math.cos(nextAngle);
    const iy = cy + innerR * Math.sin(nextAngle);
    return `${ox},${oy} ${ix},${iy}`;
  }).join(" ");

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 2, verticalAlign: "middle" }}>
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className="prestige-emblem">
        <defs>
          {isMax && (
            <>
              <radialGradient id={`fire-${s}`} cx="50%" cy="80%" r="70%">
                <stop offset="0%" stopColor="#FF6B00" />
                <stop offset="40%" stopColor="#FF2D00" />
                <stop offset="100%" stopColor="#8B1A1A" />
              </radialGradient>
              <filter id={`fireGlow-${s}`}>
                <feGaussianBlur stdDeviation={s * 0.04} result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </>
          )}
        </defs>

        {/* Outer glow */}
        <circle cx={cx} cy={cy} r={outerR + s * 0.06} fill="none"
          stroke={`${color}${isMax ? "44" : "22"}`} strokeWidth={isMax ? 1.5 : 1} />

        {/* Fire flicker particles for max prestige */}
        {isMax && Array.from({ length: 8 }, (_, i) => {
          const fAngle = (i / 8) * Math.PI * 2 - Math.PI / 2;
          const fR = outerR + s * (0.08 + (i % 3) * 0.04);
          const fx = cx + fR * Math.cos(fAngle);
          const fy = cy + fR * Math.sin(fAngle);
          return (
            <circle key={`ember-${i}`} cx={fx} cy={fy} r={s * 0.02}
              fill={i % 2 === 0 ? "#FF6B00" : "#FF2D00"} opacity={0.5 + (i % 3) * 0.15}>
              <animate attributeName="opacity" values={`${0.3 + i * 0.05};${0.8};${0.3 + i * 0.05}`}
                dur={`${1.2 + i * 0.2}s`} repeatCount="indefinite" />
              <animate attributeName="r" values={`${s * 0.015};${s * 0.03};${s * 0.015}`}
                dur={`${1 + i * 0.15}s`} repeatCount="indefinite" />
            </circle>
          );
        })}

        {/* Star body */}
        {points >= 3 ? (
          <polygon points={starPath}
            fill={isMax ? `url(#fire-${s})` : `${color}22`}
            stroke={color} strokeWidth={s * 0.04} strokeLinejoin="round"
            style={{ filter: isMax ? `url(#fireGlow-${s})` : `drop-shadow(0 0 ${2 + points}px ${color}44)` }} />
        ) : points === 2 ? (
          <>
            {/* 2-point: diamond */}
            <polygon points={`${cx},${cy - outerR} ${cx + innerR},${cy} ${cx},${cy + outerR} ${cx - innerR},${cy}`}
              fill={`${color}22`} stroke={color} strokeWidth={s * 0.04} strokeLinejoin="round"
              style={{ filter: `drop-shadow(0 0 4px ${color}44)` }} />
          </>
        ) : (
          <>
            {/* 1-point: triangle */}
            <polygon points={`${cx},${cy - outerR} ${cx + outerR * 0.87},${cy + outerR * 0.5} ${cx - outerR * 0.87},${cy + outerR * 0.5}`}
              fill={`${color}22`} stroke={color} strokeWidth={s * 0.04} strokeLinejoin="round"
              style={{ filter: `drop-shadow(0 0 4px ${color}44)` }} />
          </>
        )}

        {/* Center number */}
        <text x={cx} y={cy + s * 0.02} textAnchor="middle" dominantBaseline="middle"
          fill={isMax ? "#FFD4AA" : color} fontSize={s * (isMax ? 0.22 : 0.28)} fontWeight="700" fontFamily="Rajdhani, sans-serif"
          style={isMax ? { filter: "drop-shadow(0 0 2px #FF6B0088)" } : {}}>
          {isMax ? "✦" : level}
        </text>
      </svg>
      {showLabel && (
        <span style={{
          fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: Math.max(8, s * 0.18),
          letterSpacing: 1.5, color: color, textTransform: "uppercase",
          textShadow: isMax ? "0 0 6px rgba(255,45,0,0.4)" : "none",
        }}>
          {isMax ? "MAX PRESTIGE" : getPrestigeName(level)}
        </span>
      )}
    </span>
  );
}

// ════════════════════════════════════════
// CATEGORY PIE CHART & READER SUBTITLES
// ════════════════════════════════════════
const CATEGORY_SUBTITLES = {
  "Systematic Theology": { title: "The Systematician", icon: "📐" },
  "Biblical Theology": { title: "The Exegete", icon: "📜" },
  "Church History": { title: "The Historian", icon: "🏛" },
  "Apologetics": { title: "The Defender", icon: "🛡" },
  "Devotional": { title: "The Devotee", icon: "🕯" },
  "Confessional Studies": { title: "The Confessor", icon: "⚖" },
  "Pastoral": { title: "The Shepherd", icon: "🪝" },
  "Biography": { title: "The Chronicler", icon: "📖" },
  "Theology Proper": { title: "The Theologian", icon: "✦" },
};

const CATEGORY_COMBO_SUBTITLES = {
  "Systematic Theology+Apologetics": "Architect of the Faith",
  "Systematic Theology+Devotional": "Scholar-Saint",
  "Systematic Theology+Confessional Studies": "Creedal Mastermind",
  "Systematic Theology+Pastoral": "Doctrine & Duty",
  "Systematic Theology+Church History": "Keeper of the Tradition",
  "Systematic Theology+Theology Proper": "Divine Cartographer",
  "Systematic Theology+Biblical Theology": "Canon Architect",
  "Apologetics+Devotional": "Heart & Shield",
  "Apologetics+Church History": "Guardian of Memory",
  "Apologetics+Confessional Studies": "Creedal Defender",
  "Apologetics+Biblical Theology": "Scripture's Champion",
  "Devotional+Pastoral": "Soul Tender",
  "Devotional+Confessional Studies": "Pious Confessor",
  "Devotional+Church History": "Pilgrim of Ages",
  "Devotional+Biography": "Lives of the Saints",
  "Devotional+Biblical Theology": "Meditative Exegete",
  "Devotional+Theology Proper": "God-Entranced Mystic",
  "Church History+Confessional Studies": "Keeper of the Creeds",
  "Church History+Biography": "Chronicler of Giants",
  "Church History+Pastoral": "Shepherd of Tradition",
  "Pastoral+Confessional Studies": "Confessional Shepherd",
  "Pastoral+Biography": "Leader Among Leaders",
  "Biography+Church History": "Story Keeper",
  "Theology Proper+Devotional": "God-Intoxicated",
  "Theology Proper+Apologetics": "Divine Advocate",
  "Theology Proper+Confessional Studies": "Creed & Character",
};

function getReaderSubtitle(categoryData) {
  if (!categoryData || categoryData.length === 0) return null;
  const sorted = [...categoryData].sort((a, b) => b.count - a.count);
  if (sorted.length === 1 || sorted[0].count > 0 && sorted.length === 1) {
    return CATEGORY_SUBTITLES[sorted[0].category]?.title || "The Reader";
  }
  const top1 = sorted[0]?.category;
  const top2 = sorted[1]?.category;
  if (!top1 || !top2 || sorted[0].count === 0) return null;
  // Try both orderings for combo lookup
  const combo1 = `${top1}+${top2}`;
  const combo2 = `${top2}+${top1}`;
  return CATEGORY_COMBO_SUBTITLES[combo1] || CATEGORY_COMBO_SUBTITLES[combo2] ||
    `${CATEGORY_SUBTITLES[top1]?.title || "Reader"} & ${CATEGORY_SUBTITLES[top2]?.title || "Scholar"}`;
}

const PIE_COLORS = [
  "#D4AF37", "#2B9EB3", "#C0392B", "#8E44AD", "#27AE60",
  "#E67E22", "#3498DB", "#E74C3C", "#1ABC9C", "#F39C12"
];

function CategoryPieChart({ categoryData, size = 160 }) {
  const total = categoryData.reduce((acc, c) => acc + c.count, 0);
  if (total === 0) {
    return (
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size/2} cy={size/2} r={size * 0.4} fill="none" stroke="#2A2520" strokeWidth={size * 0.18} />
          <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="middle"
            fill="#4A4235" fontSize={11} fontFamily="Rajdhani, sans-serif" fontWeight="600">
            NO DATA
          </text>
        </svg>
      </div>
    );
  }

  const cx = size / 2, cy = size / 2;
  const outerR = size * 0.4;
  const innerR = size * 0.22;
  let currentAngle = -Math.PI / 2;
  const slices = categoryData.filter(c => c.count > 0).map((c, i) => {
    const pct = c.count / total;
    const angle = pct * Math.PI * 2;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;
    const largeArc = angle > Math.PI ? 1 : 0;
    const x1o = cx + outerR * Math.cos(startAngle);
    const y1o = cy + outerR * Math.sin(startAngle);
    const x2o = cx + outerR * Math.cos(endAngle);
    const y2o = cy + outerR * Math.sin(endAngle);
    const x1i = cx + innerR * Math.cos(endAngle);
    const y1i = cy + innerR * Math.sin(endAngle);
    const x2i = cx + innerR * Math.cos(startAngle);
    const y2i = cy + innerR * Math.sin(startAngle);
    const path = `M ${x1o} ${y1o} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2o} ${y2o} L ${x1i} ${y1i} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x2i} ${y2i} Z`;
    return { ...c, pct, path, color: PIE_COLORS[i % PIE_COLORS.length], startAngle, endAngle };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            {slices.map((s, i) => (
              <filter key={`glow-${i}`} id={`pieGlow-${i}`}>
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            ))}
          </defs>
          {slices.map((s, i) => (
            <path
              key={i}
              d={s.path}
              fill={`${s.color}CC`}
              stroke="#0D0B0A"
              strokeWidth="1.5"
              style={{ filter: `drop-shadow(0 0 4px ${s.color}44)`, transition: "all 0.3s" }}
            >
              <title>{s.category}: {s.count} book{s.count !== 1 ? "s" : ""} ({Math.round(s.pct * 100)}%)</title>
            </path>
          ))}
          {/* Center text */}
          <circle cx={cx} cy={cy} r={innerR - 2} fill="#0D0B0A" />
          <text x={cx} y={cy - 6} textAnchor="middle" dominantBaseline="middle"
            fill="#D4AF37" fontSize={size * 0.14} fontWeight="700" fontFamily="Rajdhani, sans-serif">
            {total}
          </text>
          <text x={cx} y={cy + 10} textAnchor="middle" dominantBaseline="middle"
            fill="#6B6152" fontSize={size * 0.065} fontWeight="600" fontFamily="Rajdhani, sans-serif"
            letterSpacing="1.5">
            BOOKS
          </text>
        </svg>
      </div>
      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", justifyContent: "center", maxWidth: 320 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0, boxShadow: `0 0 6px ${s.color}44` }} />
            <span style={{ color: "#A09880", whiteSpace: "nowrap" }}>{s.category}</span>
            <span style={{ color: "#6B6152", fontFamily: "Rajdhani, sans-serif", fontWeight: 600 }}>{Math.round(s.pct * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Avatar({ member, size = 40, showTitle = true }) {
  const { data } = useContext(AppContext);
  const seal = SEAL_DEFINITIONS.find(s => s.name === data.equippedTitles?.[member.id]);
  const prestige = data.prestigeLevel?.[member.id] || 0;
  const name = data.displayNames?.[member.id] || member.name;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.35 }}>
        {member.avatar}
      </div>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 600, fontSize: size > 36 ? 15 : 13, color: "#E8E0D0" }}>{name}</span>
          {member.admin && <span className="admin-badge">ADMIN</span>}
          {prestige > 0 && <PrestigeEmblem level={prestige} size={size > 36 ? 22 : 18} />}
          {showTitle && data.equippedTitles?.[member.id] && (
            <GlowTitle title={data.equippedTitles[member.id]} color={seal?.color} />
          )}
        </div>
      </div>
    </div>
  );
}

async function fetchBookCover(title, author) {
  try {
    const q = encodeURIComponent(`${title} ${author}`);
    const res = await fetch(`https://openlibrary.org/search.json?q=${q}&limit=3&fields=key,title,author_name,cover_i`);
    const data = await res.json();
    if (data.docs && data.docs.length > 0) {
      const best = data.docs.find(d => d.cover_i) || data.docs[0];
      if (best.cover_i) {
        return `https://covers.openlibrary.org/b/id/${best.cover_i}-M.jpg`;
      }
    }
  } catch (e) {
    // silently fail
  }
  return null;
}

function BookCover({ book, size = 36 }) {
  const w = size * 0.85;
  const h = size * 1.25;
  const initials = (book.title || "").split(" ").filter(w => w.length > 2).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "B";
  if (book.coverUrl) {
    return (
      <span style={{ display: "inline-block", position: "relative", flexShrink: 0 }}>
        <img
          src={book.coverUrl}
          alt={book.title}
          className="book-cover-img"
          style={{ width: w, height: h, objectFit: "cover", borderRadius: 3, display: "block" }}
          onError={e => { e.target.style.display = "none"; if (e.target.nextSibling) e.target.nextSibling.style.display = "flex"; }}
        />
        <div className="book-cover-placeholder" style={{ width: w, height: h, fontSize: Math.max(9, size * 0.22), display: "none" }}>
          {initials}
        </div>
      </span>
    );
  }
  return (
    <div className="book-cover-placeholder" style={{ width: w, height: h, fontSize: Math.max(9, size * 0.22) }}>
      {initials}
    </div>
  );
}

function DiamondDivider() {
  return (
    <div className="diamond-divider">
      <div className="diamond-line" />
      <div className="diamond-shape">◆</div>
      <div className="diamond-line" />
    </div>
  );
}

function Panel({ children, className = "", style = {}, glow, onClick }) {
  return (
    <div
      className={`glass-panel ${className}`}
      style={{
        ...style,
        ...(glow ? { boxShadow: `0 0 20px ${glow}22, inset 0 0 30px ${glow}08, 0 1px 0 ${glow}44` } : {}),
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-content ${wide ? "modal-wide" : ""}`} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmDialog({ open, onClose, onConfirm, title = "Are you sure?", message, confirmLabel = "Delete", confirmColor = "#C0392B", icon }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "24px 20px", textAlign: "center" }}>
          {icon && <div style={{ marginBottom: 12 }}>{icon}</div>}
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: 1.5, color: "#E8E0D0", marginBottom: 8 }}>{title}</div>
          {message && <p style={{ color: "#A09880", fontSize: 13, margin: "0 0 20px", lineHeight: 1.5 }}>{message}</p>}
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button
              className="decline-btn"
              style={{ padding: "10px 20px", gap: 6, color: confirmColor, borderColor: confirmColor + "44" }}
              onClick={() => { onConfirm(); onClose(); }}
            >
              {confirmLabel}
            </button>
            <button className="gold-btn" onClick={onClose} style={{ opacity: 0.7 }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════
// PRESTIGE ANIMATION (Full-screen cinematic)
// ════════════════════════════════════════
function PrestigeAnimation({ oldLevel, newLevel, onComplete }) {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState(0);
  const [textOpacity, setTextOpacity] = useState(0);
  const [showText, setShowText] = useState(false);
  const [screenFlash, setScreenFlash] = useState(0);
  const animRef = useRef(null);
  const particlesRef = useRef([]);
  const startTimeRef = useRef(null);
  const cracksRef = useRef([]);
  const emberRef = useRef([]);

  const isFirstPrestige = oldLevel === 0;
  const oldColor = isFirstPrestige ? '#6B6152' : getPrestigeColor(oldLevel);
  const newColor = getPrestigeColor(newLevel);
  const newName = getPrestigeName(newLevel);
  const isMax = newLevel >= 10;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;
    const cx = W / 2, cy = H / 2;

    // Generate cracks from center (only for non-first prestige)
    if (!isFirstPrestige) {
      cracksRef.current = Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
        const segments = [];
        let x = 0, y = 0;
        const numSegs = 4 + Math.floor(Math.random() * 4);
        for (let s = 0; s < numSegs; s++) {
          const len = 15 + Math.random() * 25;
          const deviation = (Math.random() - 0.5) * 0.6;
          const nx = x + Math.cos(angle + deviation) * len;
          const ny = y + Math.sin(angle + deviation) * len;
          segments.push({ x: nx, y: ny });
          x = nx; y = ny;
        }
        return { angle, segments, progress: 0 };
      });
    }

    // Initialize explosion particles
    particlesRef.current = Array.from({ length: isFirstPrestige ? 80 : 120 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = isFirstPrestige ? (1 + Math.random() * 4) : (2 + Math.random() * 8);
      const size = 2 + Math.random() * 5;
      return {
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        life: 1,
        decay: 0.005 + Math.random() * 0.012,
        color: isFirstPrestige ? (Math.random() > 0.5 ? newColor : '#FFD700') : (Math.random() > 0.5 ? oldColor : '#FFD700'),
        type: Math.random() > 0.7 ? 'spark' : 'ember',
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.15,
        trail: [],
      };
    });

    // Embers that float up after
    emberRef.current = Array.from({ length: 60 }, () => ({
      x: cx + (Math.random() - 0.5) * W * 0.6,
      y: cy + (Math.random() - 0.5) * H * 0.4,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -0.5 - Math.random() * 2,
      size: 1 + Math.random() * 3,
      life: 1,
      decay: 0.003 + Math.random() * 0.005,
      color: newColor,
      flickerPhase: Math.random() * Math.PI * 2,
    }));

    startTimeRef.current = performance.now();
    let currentPhase = 0;

    // ── Shape drawing matching PrestigeEmblem exactly ──
    // level 1 = triangle, level 2 = diamond, level 3+ = star with N points
    function drawPrestigeShape(x, y, r, level, innerR, color, glow = 0, opacity = 1) {
      ctx.save();
      ctx.globalAlpha = opacity;
      if (glow > 0) {
        ctx.shadowColor = color;
        ctx.shadowBlur = glow;
      }
      const pts = Math.min(level, 10);
      ctx.beginPath();
      if (pts === 1) {
        // Triangle (matches PrestigeEmblem level 1)
        ctx.moveTo(x, y - r);
        ctx.lineTo(x + r * 0.87, y + r * 0.5);
        ctx.lineTo(x - r * 0.87, y + r * 0.5);
      } else if (pts === 2) {
        // Diamond (matches PrestigeEmblem level 2)
        ctx.moveTo(x, y - r);
        ctx.lineTo(x + innerR, y);
        ctx.lineTo(x, y + r);
        ctx.lineTo(x - innerR, y);
      } else {
        // Star with N points (matches PrestigeEmblem level 3+)
        for (let i = 0; i < pts; i++) {
          const outerAngle = (i / pts) * Math.PI * 2 - Math.PI / 2;
          const innerAngle = ((i + 0.5) / pts) * Math.PI * 2 - Math.PI / 2;
          const ox = x + r * Math.cos(outerAngle);
          const oy = y + r * Math.sin(outerAngle);
          const ix = x + innerR * Math.cos(innerAngle);
          const iy = y + innerR * Math.sin(innerAngle);
          if (i === 0) ctx.moveTo(ox, oy);
          else ctx.lineTo(ox, oy);
          ctx.lineTo(ix, iy);
        }
      }
      ctx.closePath();
      ctx.fillStyle = color + '44';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();
    }

    // Draw a glowing orb (for 0 → 1 transition: no star, just a sphere)
    function drawOrb(x, y, r, color, glow = 0, opacity = 1) {
      ctx.save();
      ctx.globalAlpha = opacity;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, color + 'AA');
      grad.addColorStop(0.5, color + '44');
      grad.addColorStop(1, color + '00');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      // Outer ring
      ctx.beginPath();
      ctx.arc(x, y, r * 0.65, 0, Math.PI * 2);
      ctx.strokeStyle = color + '88';
      ctx.lineWidth = 1.5;
      if (glow > 0) {
        ctx.shadowColor = color;
        ctx.shadowBlur = glow;
      }
      ctx.stroke();
      ctx.restore();
    }

    // Timings adjust for first prestige (shorter crack phase since no star to crack)
    const phase0End = isFirstPrestige ? 2.0 : 2.5;
    const phase1End = phase0End + 2.0;
    const phase2End = phase1End + 3.0;
    const phase3End = phase2End + 2.5;

    function animate(now) {
      const elapsed = (now - startTimeRef.current) / 1000;
      ctx.clearRect(0, 0, W, H);

      // Background darken
      ctx.fillStyle = `rgba(13, 11, 10, ${Math.min(0.95, elapsed * 2)})`;
      ctx.fillRect(0, 0, W, H);

      // ── Phase 0: Old shape appears (or orb for first prestige) ──
      if (elapsed < phase0End) {
        currentPhase = 0;
        const pulse = 1 + Math.sin(elapsed * 8) * 0.04 * Math.min(1, elapsed);
        const shakeStart = isFirstPrestige ? 1.0 : 1.5;
        const shake = elapsed > shakeStart ? (elapsed - shakeStart) * 6 : 0;
        const sx = cx + (Math.random() - 0.5) * shake;
        const sy = cy + (Math.random() - 0.5) * shake;

        if (isFirstPrestige) {
          // No star — draw a dim pulsing orb that's gathering energy
          const orbR = 50 * pulse;
          const intensity = 0.4 + elapsed * 0.3;
          drawOrb(sx, sy, orbR, '#6B6152', 10 + elapsed * 15, intensity);

          // Gathering light particles converging inward
          if (elapsed > 0.5) {
            const gatherT = (elapsed - 0.5) / (phase0End - 0.5);
            for (let i = 0; i < 16; i++) {
              const angle = (i / 16) * Math.PI * 2 + elapsed * 0.5;
              const dist = 200 * (1 - gatherT * 0.5) + Math.sin(elapsed * 4 + i) * 20;
              const px = cx + Math.cos(angle) * dist;
              const py = cy + Math.sin(angle) * dist;
              ctx.save();
              ctx.globalAlpha = gatherT * 0.5;
              ctx.beginPath();
              ctx.arc(px, py, 2, 0, Math.PI * 2);
              ctx.fillStyle = newColor;
              ctx.shadowColor = newColor;
              ctx.shadowBlur = 6;
              ctx.fill();
              ctx.restore();
            }
          }

          // Text
          if (elapsed > 1.0) {
            ctx.save();
            ctx.globalAlpha = Math.min(1, (elapsed - 1.0) * 3);
            ctx.fillStyle = newColor;
            ctx.font = '600 12px Rajdhani, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('A NEW SEAL AWAKENS', cx, cy + 90);
            ctx.restore();
          }
        } else {
          // Show old prestige shape with cracks
          const starSize = 60 * pulse;
          const innerSize = 26 * pulse;
          drawPrestigeShape(sx, sy, starSize, oldLevel, innerSize, oldColor, 20 + elapsed * 15);

          // Center number
          ctx.save();
          ctx.fillStyle = oldColor;
          ctx.font = 'bold 24px Rajdhani, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(oldLevel), sx, sy + 2);
          ctx.restore();

          // Cracks growing
          if (elapsed > 0.8) {
            const crackProgress = Math.min(1, (elapsed - 0.8) / 1.5);
            ctx.save();
            ctx.translate(sx, sy);
            cracksRef.current.forEach(crack => {
              const numVisible = Math.floor(crackProgress * crack.segments.length);
              if (numVisible < 1) return;
              ctx.beginPath();
              ctx.moveTo(0, 0);
              for (let i = 0; i < numVisible; i++) {
                ctx.lineTo(crack.segments[i].x, crack.segments[i].y);
              }
              if (numVisible < crack.segments.length) {
                const frac = (crackProgress * crack.segments.length) - numVisible;
                const prev = numVisible > 0 ? crack.segments[numVisible - 1] : { x: 0, y: 0 };
                const next = crack.segments[numVisible];
                ctx.lineTo(prev.x + (next.x - prev.x) * frac, prev.y + (next.y - prev.y) * frac);
              }
              ctx.strokeStyle = '#FFD70088';
              ctx.lineWidth = 1.5;
              ctx.shadowColor = '#FFD700';
              ctx.shadowBlur = 8;
              ctx.stroke();
              ctx.strokeStyle = '#FFFFFF44';
              ctx.lineWidth = 0.5;
              ctx.stroke();
            });
            ctx.restore();
          }

          // Text
          if (elapsed > 1.8) {
            ctx.save();
            ctx.globalAlpha = Math.min(1, (elapsed - 1.8) * 3);
            ctx.fillStyle = oldColor;
            ctx.font = '600 12px Rajdhani, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('THE SEAL BREAKS', cx, cy + 100);
            ctx.restore();
          }
        }
      }
      // ── Phase 1: Explosion / Burst ──
      else if (elapsed < phase1End) {
        if (currentPhase < 1) {
          currentPhase = 1;
          setPhase(1);
          setScreenFlash(1);
          setTimeout(() => setScreenFlash(0), 200);
        }
        const t = (elapsed - phase0End) / 2;

        // Shockwave ring
        const swRadius = t * Math.max(W, H) * 0.6;
        const swOpacity = Math.max(0, 1 - t * 1.2);
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, swRadius, 0, Math.PI * 2);
        ctx.strokeStyle = isFirstPrestige
          ? `rgba(232, 212, 77, ${swOpacity * 0.6})`
          : `rgba(255, 215, 0, ${swOpacity * 0.6})`;
        ctx.lineWidth = 3 + (1 - t) * 8;
        ctx.shadowColor = isFirstPrestige ? newColor : '#FFD700';
        ctx.shadowBlur = 30;
        ctx.stroke();
        ctx.restore();

        // Second shockwave
        if (t > 0.15) {
          const sw2t = t - 0.15;
          const sw2Radius = sw2t * Math.max(W, H) * 0.5;
          const sw2Opacity = Math.max(0, 1 - sw2t * 1.4);
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, sw2Radius, 0, Math.PI * 2);
          const hexOp = Math.round(sw2Opacity * 100).toString(16).padStart(2, '0');
          ctx.strokeStyle = (isFirstPrestige ? newColor : oldColor) + hexOp;
          ctx.lineWidth = 2 + (1 - sw2t) * 5;
          ctx.stroke();
          ctx.restore();
        }

        // Debris/particles
        particlesRef.current.forEach(p => {
          if (p.life <= 0) return;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.03;
          p.vx *= 0.995;
          p.life -= p.decay;
          p.rotation += p.rotSpeed;
          p.trail.push({ x: p.x, y: p.y, life: 0.5 });
          if (p.trail.length > 8) p.trail.shift();

          if (p.type === 'spark') {
            p.trail.forEach(tp => {
              tp.life -= 0.05;
              if (tp.life <= 0) return;
              ctx.save();
              ctx.globalAlpha = tp.life * p.life * 0.5;
              ctx.beginPath();
              ctx.arc(tp.x, tp.y, p.size * 0.4, 0, Math.PI * 2);
              ctx.fillStyle = p.color;
              ctx.fill();
              ctx.restore();
            });
          }

          ctx.save();
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          if (p.type === 'spark') {
            ctx.beginPath();
            ctx.moveTo(-p.size, 0);
            ctx.lineTo(0, -p.size * 0.3);
            ctx.lineTo(p.size, 0);
            ctx.lineTo(0, p.size * 0.3);
            ctx.closePath();
            ctx.fillStyle = '#FFF';
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 12;
            ctx.fill();
            ctx.fillStyle = p.color;
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.arc(0, 0, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
            ctx.fill();
          }
          ctx.restore();
        });

        // Center glow fading
        const centerGlow = Math.max(0, 1 - t * 2);
        if (centerGlow > 0) {
          const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120);
          grad.addColorStop(0, `rgba(255,255,255,${centerGlow * 0.8})`);
          grad.addColorStop(0.3, `rgba(255,215,0,${centerGlow * 0.4})`);
          grad.addColorStop(1, 'rgba(255,215,0,0)');
          ctx.fillStyle = grad;
          ctx.fillRect(cx - 120, cy - 120, 240, 240);
        }
      }
      // ── Phase 2: New shape reforms from light ──
      else if (elapsed < phase2End) {
        if (currentPhase < 2) {
          currentPhase = 2;
          setPhase(2);
        }
        const t = (elapsed - phase1End) / 3;

        // Floating embers
        emberRef.current.forEach(e => {
          if (e.life <= 0) return;
          e.x += e.vx + Math.sin(e.flickerPhase + elapsed * 2) * 0.3;
          e.y += e.vy;
          e.life -= e.decay;
          e.flickerPhase += 0.02;
          ctx.save();
          ctx.globalAlpha = e.life * (0.3 + Math.sin(e.flickerPhase) * 0.2);
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
          ctx.fillStyle = e.color;
          ctx.shadowColor = e.color;
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.restore();
        });

        // Converging light rays
        const numRays = 12;
        const rayProgress = Math.min(1, t * 1.5);
        for (let i = 0; i < numRays; i++) {
          const angle = (i / numRays) * Math.PI * 2;
          const dist = 300 * (1 - rayProgress);
          const sx = cx + Math.cos(angle) * dist;
          const sy = cy + Math.sin(angle) * dist;
          ctx.save();
          ctx.globalAlpha = rayProgress * 0.4;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(cx, cy);
          ctx.strokeStyle = newColor;
          ctx.lineWidth = 1;
          ctx.shadowColor = newColor;
          ctx.shadowBlur = 10;
          ctx.stroke();
          ctx.restore();
        }

        // New shape materializing
        if (t > 0.3) {
          const starT = (t - 0.3) / 0.7;
          const shapeSize = 65 * Math.min(1, starT * 1.2);
          const innerSize = 28 * Math.min(1, starT * 1.2);
          const starOp = Math.min(1, starT * 1.5);
          const glow = 20 + starT * 40;

          // Aura ring
          ctx.save();
          ctx.globalAlpha = starOp * 0.3;
          ctx.beginPath();
          ctx.arc(cx, cy, shapeSize + 20 + Math.sin(elapsed * 3) * 5, 0, Math.PI * 2);
          ctx.strokeStyle = newColor;
          ctx.lineWidth = 1;
          ctx.shadowColor = newColor;
          ctx.shadowBlur = 20;
          ctx.stroke();
          ctx.restore();

          drawPrestigeShape(cx, cy, shapeSize, newLevel, innerSize, newColor, glow, starOp);

          // Center number/symbol
          ctx.save();
          ctx.globalAlpha = Math.min(1, starOp);
          ctx.fillStyle = isMax ? '#FFD4AA' : newColor;
          ctx.font = 'bold 26px Rajdhani, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = newColor;
          ctx.shadowBlur = 10;
          ctx.fillText(isMax ? '✦' : String(newLevel), cx, cy + 2);
          ctx.restore();
        }
      }
      // ── Phase 3: Hold and reveal title ──
      else if (elapsed < phase3End) {
        if (currentPhase < 3) {
          currentPhase = 3;
          setPhase(3);
          setShowText(true);
          setTimeout(() => setTextOpacity(1), 100);
          if (isMax) {
            setScreenFlash(0.5);
            setTimeout(() => setScreenFlash(0), 300);
          }
        }

        // Remaining embers
        emberRef.current.forEach(e => {
          if (e.life <= 0) return;
          e.x += e.vx;
          e.y += e.vy;
          e.life -= e.decay * 0.5;
          ctx.save();
          ctx.globalAlpha = Math.max(0, e.life * 0.3);
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.size * 0.7, 0, Math.PI * 2);
          ctx.fillStyle = e.color;
          ctx.shadowColor = e.color;
          ctx.shadowBlur = 4;
          ctx.fill();
          ctx.restore();
        });

        // Final shape with full glow
        const pulse = 1 + Math.sin(elapsed * 2.5) * 0.02;
        const shapeSize = 65 * pulse;
        const innerSize = 28 * pulse;

        // Orbiting particles
        for (let i = 0; i < 8; i++) {
          const orbitAngle = (i / 8) * Math.PI * 2 + elapsed * 0.8;
          const orbitR = shapeSize + 30 + Math.sin(elapsed * 2 + i) * 8;
          const ox = cx + Math.cos(orbitAngle) * orbitR;
          const oy = cy + Math.sin(orbitAngle) * orbitR;
          ctx.save();
          ctx.globalAlpha = 0.5;
          ctx.beginPath();
          ctx.arc(ox, oy, 2, 0, Math.PI * 2);
          ctx.fillStyle = newColor;
          ctx.shadowColor = newColor;
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.restore();
        }

        drawPrestigeShape(cx, cy, shapeSize, newLevel, innerSize, newColor, 50);

        // Center
        ctx.save();
        ctx.fillStyle = isMax ? '#FFD4AA' : newColor;
        ctx.font = 'bold 26px Rajdhani, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = newColor;
        ctx.shadowBlur = 15;
        ctx.fillText(isMax ? '✦' : String(newLevel), cx, cy + 2);
        ctx.restore();
      }
      // ── Phase 4: Fade out ──
      else {
        if (currentPhase < 4) {
          currentPhase = 4;
          setPhase(4);
          setTimeout(() => onComplete(), 1500);
        }
        return;
      }

      animRef.current = requestAnimationFrame(animate);
    }

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <div className="prestige-anim-overlay" style={{ opacity: phase === 4 ? 0 : 1 }}>
      {screenFlash > 0 && (
        <div style={{
          position: 'absolute', inset: 0, background: '#FFF',
          opacity: screenFlash, zIndex: 3, pointerEvents: 'none',
          transition: 'opacity 0.2s',
        }} />
      )}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 1 }} />
      {showText && (
        <div className="prestige-anim-text" style={{ opacity: textOpacity }}>
          <div className="prestige-anim-label" style={{ color: newColor }}>
            {isMax ? '★ MAX PRESTIGE ★' : `PRESTIGE ${newLevel}`}
          </div>
          <div className="prestige-anim-name" style={{
            color: newColor,
            textShadow: `0 0 30px ${newColor}66, 0 0 60px ${newColor}33`,
          }}>
            {newName}
          </div>
          <div className="prestige-anim-sub">
            {isFirstPrestige ? 'Your journey through Scripture begins' : isMax ? 'The eternal flame burns within you' : 'Your seal has been reforged'}
          </div>
          <button className="prestige-anim-continue" style={{ borderColor: newColor, color: newColor }}
            onClick={onComplete}>
            Continue
          </button>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════
// PAGE: HOME / DASHBOARD
// ════════════════════════════════════════
function HomePage() {
  const { data, setData, currentUser, setPage, isAdmin, showToast } = useContext(AppContext);
  const todayVerse = DAILY_VERSES[new Date().getDay() % DAILY_VERSES.length];
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState(null);
  const [confirmDeleteChallenge, setConfirmDeleteChallenge] = useState(null);

  const memberBooks = Object.keys(data.readingProgress?.[currentUser.id] || {});
  const completedBooks = memberBooks.filter(bId => {
    const book = data.books.find(b => b.id === bId);
    return book && data.readingProgress[currentUser.id][bId] >= book.pages;
  });
  const myReviews = data.reviews.filter(r => r.memberId === currentUser.id);
  const totalPages = Object.values(data.readingProgress?.[currentUser.id] || {}).reduce((s, v) => s + v, 0);

  const groupCompleted = getMembers(data).reduce((acc, m) => {
    const prg = data.readingProgress?.[m.id] || {};
    Object.keys(prg).forEach(bId => {
      const book = data.books.find(b => b.id === bId);
      if (book && prg[bId] >= book.pages) acc++;
    });
    return acc;
  }, 0);

  const groupReviewsCount = data.reviews.length;
  const groupPagesCount = getMembers(data).reduce((acc, m) => {
    return acc + Object.values(data.readingProgress?.[m.id] || {}).reduce((s, v) => s + v, 0);
  }, 0);

  function getChallengeProgress(challenge) {
    if (challenge.type === "books") return groupCompleted;
    if (challenge.type === "reviews") return groupReviewsCount;
    if (challenge.type === "pages") return groupPagesCount;
    return 0;
  }

  const activeChallenges = (data.groupChallenges || []).filter(c => c.active);

  function openCreateChallenge() {
    setEditingChallenge({ id: null, name: "", description: "", target: 12, type: "books", year: 2026, active: true });
    setShowChallengeModal(true);
  }

  function openEditChallenge(challenge) {
    setEditingChallenge({ ...challenge });
    setShowChallengeModal(true);
  }

  function saveChallenge() {
    if (!editingChallenge || !editingChallenge.name.trim()) return;
    const isNew = !editingChallenge.id;
    setData(d => {
      const challenges = [...(d.groupChallenges || [])];
      if (editingChallenge.id) {
        const idx = challenges.findIndex(c => c.id === editingChallenge.id);
        if (idx >= 0) challenges[idx] = editingChallenge;
      } else {
        challenges.push({ ...editingChallenge, id: `gc${Date.now()}` });
      }
      return { ...d, groupChallenges: challenges };
    });
    setShowChallengeModal(false);
    setEditingChallenge(null);
    showToast(isNew ? "Challenge created" : "Challenge updated");
  }

  function deleteChallenge(challengeId) {
    setData(d => ({
      ...d,
      groupChallenges: (d.groupChallenges || []).filter(c => c.id !== challengeId),
    }));
    showToast("Challenge deleted", "info");
  }

  const pendingInvites = (data.readInvites || []).filter(inv =>
    inv.status === "active" &&
    inv.invitedIds.includes(currentUser.id) &&
    !inv.acceptedIds.includes(currentUser.id) &&
    !inv.declinedIds.includes(currentUser.id)
  );

  function acceptInvite(inviteId) {
    setData(d => ({
      ...d,
      readInvites: (d.readInvites || []).map(inv =>
        inv.id === inviteId
          ? { ...inv, acceptedIds: [...inv.acceptedIds, currentUser.id] }
          : inv
      ),
      activities: [...d.activities, {
        id: `a${Date.now()}`, type: "invite_accept", memberId: currentUser.id,
        text: `joined a group read of "${data.books.find(b => b.id === (d.readInvites || []).find(i => i.id === inviteId)?.bookId)?.title}"`,
        date: new Date().toISOString().split("T")[0], icon: "»",
      }],
    }));
    showToast("Joined group read!");
  }

  function declineInvite(inviteId) {
    setData(d => ({
      ...d,
      readInvites: (d.readInvites || []).map(inv =>
        inv.id === inviteId
          ? { ...inv, declinedIds: [...inv.declinedIds, currentUser.id] }
          : inv
      ),
    }));
    showToast("Invite declined", "info");
  }

  return (
    <div className="page-content">
      {/* Daily Bread */}
      <Panel className="daily-bread" glow="#D4AF37">
        <div className="daily-bread-label">
          <Flame size={14} style={{ color: "#D4AF37" }} />
          <span>DAILY BREAD</span>
        </div>
        <p className="daily-verse-text">"{todayVerse.text}"</p>
        <p className="daily-verse-ref">— {todayVerse.ref}</p>
      </Panel>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Send size={16} style={{ color: "#2B9EB3" }} />
            <span className="section-title">INCOMING INVITES</span>
            <span className="invite-count-badge">{pendingInvites.length}</span>
          </div>
          <div className="invite-cards-grid">
            {pendingInvites.map(inv => {
              const book = data.books.find(b => b.id === inv.bookId);
              const from = findMember(data, inv.fromId);
              const othersAccepted = inv.acceptedIds.length;
              return (
                <Panel key={inv.id} className="invite-card" glow="#2B9EB3">
                  <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                    {book && <BookCover book={book} size={32} />}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: "#E8E0D0", fontSize: 15 }}>{book?.title}</div>
                      <div style={{ color: "#6B6152", fontSize: 12 }}>{book?.author}</div>
                      <div style={{ color: "#2B9EB3", fontSize: 12, marginTop: 4 }}>
                        <span style={{ fontWeight: 600 }}>{from?.name}</span> wants to read this with you
                      </div>
                    </div>
                  </div>
                  {inv.note && (
                    <div style={{ color: "#A09880", fontSize: 13, fontStyle: "italic", marginBottom: 12, padding: "8px 12px", background: "rgba(43,158,179,0.06)", borderRadius: 4, borderLeft: "2px solid #2B9EB344" }}>
                      "{inv.note}"
                    </div>
                  )}
                  {othersAccepted > 0 && (
                    <div style={{ color: "#6B6152", fontSize: 12, marginBottom: 10 }}>
                      {othersAccepted} other{othersAccepted > 1 ? "s" : ""} already joined
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="gold-btn" style={{ flex: 1, justifyContent: "center" }} onClick={() => acceptInvite(inv.id)}>
                      <Check size={14} /> Join Group Read
                    </button>
                    <button className="decline-btn" onClick={() => declineInvite(inv.id)}>
                      <X size={14} />
                    </button>
                  </div>
                </Panel>
              );
            })}
          </div>
        </div>
      )}

      <div className="home-grid">
        {/* Stats Cards */}
        <Panel className="stat-card" onClick={() => setPage("library")}>
          <div className="stat-icon"><BookOpen size={24} /></div>
          <div className="stat-value">{completedBooks.length}</div>
          <div className="stat-label">Books Completed</div>
        </Panel>
        <Panel className="stat-card" onClick={() => setPage("reviews")}>
          <div className="stat-icon"><Star size={24} /></div>
          <div className="stat-value">{myReviews.length}</div>
          <div className="stat-label">Reviews Written</div>
        </Panel>
        <Panel className="stat-card">
          <div className="stat-icon"><TrendingUp size={24} /></div>
          <div className="stat-value">{totalPages.toLocaleString()}</div>
          <div className="stat-label">Pages Read</div>
        </Panel>
        <Panel className="stat-card" onClick={() => setPage("triumphs")}>
          <div className="stat-icon"><Trophy size={24} /></div>
          <div className="stat-value">{(data.completedSeals?.[currentUser.id] || []).length}</div>
          <div className="stat-label">Seals Earned</div>
        </Panel>

        {/* Group Challenges */}
        {activeChallenges.length > 0 ? activeChallenges.map(challenge => {
          const progress = getChallengeProgress(challenge);
          const pct = Math.min(1, progress / challenge.target);
          const remaining = Math.max(0, challenge.target - progress);
          const typeLabel = challenge.type === "books" ? "books" : challenge.type === "reviews" ? "reviews" : "pages";
          return (
            <Panel key={challenge.id} className="challenge-card" glow={pct >= 1 ? "#27AE60" : "#D4AF37"}>
              <div className="challenge-header">
                <Award size={20} style={{ color: pct >= 1 ? "#27AE60" : "#D4AF37" }} />
                <span className="section-title">{challenge.year} GROUP CHALLENGE</span>
                {isAdmin && (
                  <button className="icon-btn" onClick={() => openEditChallenge(challenge)} style={{ marginLeft: "auto", color: "#6B6152" }}>
                    <Edit3 size={13} />
                  </button>
                )}
              </div>
              <p style={{ color: "#A09880", fontSize: 13, margin: "6px 0 12px" }}>{challenge.description || challenge.name}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div className="challenge-ring">
                  <svg viewBox="0 0 80 80" width={80} height={80}>
                    <circle cx="40" cy="40" r="34" fill="none" stroke="#2A2520" strokeWidth="6" />
                    <circle
                      cx="40" cy="40" r="34" fill="none" stroke={pct >= 1 ? "#27AE60" : "#D4AF37"}
                      strokeWidth="6" strokeLinecap="round"
                      strokeDasharray={`${pct * 213.6} 213.6`}
                      transform="rotate(-90 40 40)"
                      style={{ filter: `drop-shadow(0 0 4px ${pct >= 1 ? "#27AE6066" : "#D4AF3766"})` }}
                    />
                    <text x="40" y="38" textAnchor="middle" fill={pct >= 1 ? "#27AE60" : "#D4AF37"} fontSize="18" fontWeight="700">{progress}</text>
                    <text x="40" y="50" textAnchor="middle" fill="#8A7E6B" fontSize="10">/{challenge.target}</text>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#C8BFA8", fontSize: 13, marginBottom: 4 }}>
                    {pct >= 1 ? "Challenge Complete!" : "Fireteam Progress"}
                  </div>
                  <ProgressBar value={progress} max={challenge.target} color={pct >= 1 ? "#27AE60" : "#D4AF37"} />
                  <div style={{ color: "#6B6152", fontSize: 11, marginTop: 4 }}>
                    {pct >= 1 ? `Goal reached — ${progress} ${typeLabel}!` : `${remaining} ${typeLabel} remaining`}
                  </div>
                </div>
              </div>
            </Panel>
          );
        }) : (
          <Panel className="challenge-card">
            <div style={{ textAlign: "center", padding: "20px 16px" }}>
              <Award size={28} style={{ color: "#2A2520", marginBottom: 8 }} />
              <div style={{ color: "#4A4235", fontSize: 13 }}>No active group challenges</div>
              {isAdmin && (
                <button className="gold-btn" style={{ marginTop: 12 }} onClick={openCreateChallenge}>
                  <Plus size={14} /> Create Challenge
                </button>
              )}
            </div>
          </Panel>
        )}

        {/* Admin: Add another challenge */}
        {isAdmin && activeChallenges.length > 0 && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button className="gold-btn" style={{ fontSize: 11, padding: "6px 14px", opacity: 0.7 }} onClick={openCreateChallenge}>
              <Plus size={12} /> Add Challenge
            </button>
          </div>
        )}

        {/* Activity Feed */}
        <Panel className="activity-card">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Zap size={16} style={{ color: "#D4AF37" }} />
            <span className="section-title">FIRETEAM ACTIVITY</span>
          </div>
          <div className="activity-list">
            {data.activities.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <Clock size={28} style={{ color: "#2A2520", marginBottom: 8 }} />
                <div style={{ color: "#4A4235", fontSize: 13 }}>No activity yet</div>
                <div style={{ color: "#33302A", fontSize: 12, marginTop: 4 }}>Start reading, writing reviews, or posting in the forum</div>
              </div>
            ) : [...data.activities].reverse().slice(0, 8).map(a => {
              const member = findMember(data, a.memberId);
              const mName = member ? (data.displayNames?.[member.id] || member.name) : "Unknown";
              return (
                <div key={a.id} className="activity-item">
                  <span className="activity-icon">{a.icon}</span>
                  <div className="activity-text">
                    <span style={{ color: "#D4AF37", fontWeight: 600 }}>{mName}</span>{" "}
                    <span style={{ color: "#A09880" }}>{a.text}</span>
                  </div>
                  <span className="activity-date">{a.date}</span>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "24px 0 12px" }}>
            <Heart size={16} style={{ color: "#C0392B" }} />
            <span className="section-title">BOOK RECOMMENDATIONS</span>
          </div>
          <div className="rec-grid">
            {data.recommendations.map(rec => {
              const book = data.books.find(b => b.id === rec.bookId);
              const member = findMember(data, rec.memberId);
              return (
                <Panel key={rec.id} className="rec-card">
                  <div className="rec-book-cover">{book ? <BookCover book={book} size={36} /> : "?"}</div>
                  <div>
                    <div style={{ fontWeight: 600, color: "#E8E0D0", fontSize: 14 }}>{book?.title}</div>
                    <div style={{ color: "#8A7E6B", fontSize: 12 }}>{book?.author}</div>
                    <p style={{ color: "#A09880", fontSize: 13, margin: "8px 0 4px", fontStyle: "italic" }}>"{rec.note}"</p>
                    <div style={{ color: "#6B6152", fontSize: 11 }}>— {member?.name}</div>
                  </div>
                </Panel>
              );
            })}
          </div>
        </>
      )}

      {/* Challenge Create/Edit Modal */}
      <Modal open={showChallengeModal} onClose={() => { setShowChallengeModal(false); setEditingChallenge(null); }} title={editingChallenge?.id ? "Edit Challenge" : "Create Challenge"}>
        {editingChallenge && (
          <div style={{ padding: 16 }}>
            <label className="input-label">Challenge Name</label>
            <input className="text-input" value={editingChallenge.name} onChange={e => setEditingChallenge(c => ({ ...c, name: e.target.value }))} placeholder="e.g. Read 12 Theology Books" />

            <label className="input-label">Description</label>
            <input className="text-input" value={editingChallenge.description} onChange={e => setEditingChallenge(c => ({ ...c, description: e.target.value }))} placeholder="Short description shown on the card" />

            <div style={{ display: "flex", gap: 12, marginTop: 0 }}>
              <div style={{ flex: 1 }}>
                <label className="input-label">Type</label>
                <select className="text-input" value={editingChallenge.type} onChange={e => setEditingChallenge(c => ({ ...c, type: e.target.value }))}>
                  <option value="books">Books Completed</option>
                  <option value="reviews">Reviews Written</option>
                  <option value="pages">Pages Read</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="input-label">Target</label>
                <input className="text-input" type="number" min="1" value={editingChallenge.target} onChange={e => setEditingChallenge(c => ({ ...c, target: parseInt(e.target.value) || 1 }))} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="input-label">Year</label>
                <input className="text-input" type="number" value={editingChallenge.year} onChange={e => setEditingChallenge(c => ({ ...c, year: parseInt(e.target.value) || 2026 }))} />
              </div>
              <div style={{ flex: 1, display: "flex", alignItems: "flex-end", paddingBottom: 2 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "#A09880", fontSize: 13 }}>
                  <input type="checkbox" checked={editingChallenge.active} onChange={e => setEditingChallenge(c => ({ ...c, active: e.target.checked }))} style={{ accentColor: "#D4AF37" }} />
                  Active
                </label>
              </div>
            </div>

            {/* Preview */}
            <div style={{ marginTop: 16, padding: 12, background: "var(--bg-deep)", borderRadius: 6, border: "1px solid var(--border-subtle)" }}>
              <div style={{ color: "#4A4235", fontSize: 10, letterSpacing: 1.5, fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, marginBottom: 6 }}>PREVIEW</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Award size={16} style={{ color: "#D4AF37" }} />
                <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: 1.5, color: "#D4AF37" }}>
                  {editingChallenge.year} GROUP CHALLENGE
                </span>
              </div>
              <div style={{ color: "#A09880", fontSize: 12, marginTop: 4 }}>
                {editingChallenge.description || editingChallenge.name || "..."} — Target: {editingChallenge.target} {editingChallenge.type}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="gold-btn" style={{ flex: 1 }} onClick={saveChallenge}>
                <Check size={14} /> {editingChallenge.id ? "Save Changes" : "Create Challenge"}
              </button>
              {editingChallenge.id && (
                <button className="decline-btn" style={{ padding: "10px 16px", gap: 6, color: "#C0392B", borderColor: "#C0392B44" }}
                  onClick={() => { setShowChallengeModal(false); setConfirmDeleteChallenge(editingChallenge.id); }}>
                  <X size={14} /> Delete
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmDeleteChallenge}
        onClose={() => setConfirmDeleteChallenge(null)}
        onConfirm={() => deleteChallenge(confirmDeleteChallenge)}
        title="Delete Challenge?"
        message="This group challenge will be permanently removed for everyone."
        confirmLabel="Delete Challenge"
      />
    </div>
  );
}

// ════════════════════════════════════════
// PAGE: TRIUMPHS / SEALS
// ════════════════════════════════════════
function TriumphsPage() {
  const { data, setData, currentUser, isAdmin, showToast } = useContext(AppContext);
  const [selectedSeal, setSelectedSeal] = useState(null);
  const myCompletedSeals = data.completedSeals?.[currentUser.id] || [];

  // Admin state
  const [showCreateSeal, setShowCreateSeal] = useState(false);
  const [newSeal, setNewSeal] = useState({ name: "", subtitle: "", description: "", icon: "✦", color: "#D4AF37" });
  const [editingSeal, setEditingSeal] = useState(null);
  const [showAddTriumph, setShowAddTriumph] = useState(null);
  const [newTriumph, setNewTriumph] = useState({ name: "", desc: "", target: 1, type: "custom" });
  const [editingTriumph, setEditingTriumph] = useState(null);
  const [confirmDeleteSeal, setConfirmDeleteSeal] = useState(null);
  const [confirmDeleteTriumph, setConfirmDeleteTriumph] = useState(null);

  const allSeals = [...SEAL_DEFINITIONS, ...(data.customSeals || [])];

  // ── Auto-compute triumph progress from actual app data ──
  function computeProgress(triumph) {
    const uid = currentUser.id;
    const prg = data.readingProgress?.[uid] || {};
    const completedBooks = data.books.filter(b => prg[b.id] && prg[b.id] >= b.pages);
    const myReviews = data.reviews.filter(r => r.memberId === uid);
    const myThreads = data.threads.filter(t => t.authorId === uid);
    const myReplies = data.threads.reduce((acc, t) => acc + t.posts.filter(p => p.authorId === uid && p.id !== t.posts[0]?.id).length, 0);
    const myRecs = (data.recommendations || []).filter(r => r.memberId === uid);
    const biblePrg = data.bibleProgress?.[uid] || {};
    const bibleCompleted = Object.values(biblePrg).filter(v => v === true || v >= 1).length;

    switch (triumph.type) {
      // ── BEREAN SEAL ──
      case "books_read": return completedBooks.length;
      case "reviews_written": return myReviews.length;
      case "threads_started": return myThreads.length;
      case "bible_read": return bibleCompleted;

      // ── REFORMER SEAL ──
      case "reformed_books": return completedBooks.filter(b => b.category === "Systematic Theology").length;
      case "reformed_reviews": return myReviews.filter(r => {
        const book = data.books.find(b => b.id === r.bookId);
        return book?.category === "Systematic Theology";
      }).length;
      case "soteriology_posts": return data.threads
        .filter(t => t.category === "Soteriology")
        .reduce((acc, t) => acc + t.posts.filter(p => p.authorId === uid).length, 0);

      // ── APOLOGIST SEAL ──
      case "apologetics_books": return completedBooks.filter(b => b.category === "Apologetics").length;
      case "hard_question": return myThreads.filter(t =>
        ["Theology Proper", "Soteriology", "Eschatology", "Hermeneutics"].includes(t.category)
      ).length;
      case "long_review": return myReviews.filter(r => r.text.length >= 500).length;

      // ── CONFESSOR SEAL ──
      case "lbcf_read": return completedBooks.some(b => b.title.includes("1689")) ? 1 : 0;
      case "lbcf_discussions": return data.threads
        .filter(t => t.category === "Confessional Studies")
        .reduce((acc, t) => acc + t.posts.filter(p => p.authorId === uid).length, 0);
      case "quiz_complete": return data.triumphProgress?.[uid]?.["t13"] || 0;

      // ── THEOLOGIAN SEAL ──
      case "seals_complete": return myCompletedSeals.length;

      // ── SHEPHERD SEAL ──
      case "threads_10": return myThreads.length;
      case "replies_20": return myReplies;
      case "recommendations": return myRecs.length;

      // ── CUSTOM (manual tracking) ──
      case "custom":
      default:
        return data.triumphProgress?.[uid]?.[triumph.id] || 0;
    }
  }

  function getSealProgress(seal) {
    let completed = 0;
    seal.triumphs.forEach(t => {
      if (computeProgress(t) >= t.target) completed++;
    });
    return { completed, total: seal.triumphs.length, isComplete: completed === seal.triumphs.length && seal.triumphs.length > 0 };
  }

  // Auto-award completed seals
  useEffect(() => {
    const currentCompleted = data.completedSeals?.[currentUser.id] || [];
    const newlyCompleted = [];
    allSeals.forEach(seal => {
      if (currentCompleted.includes(seal.id)) return;
      if (seal.triumphs.length === 0) return;
      const allDone = seal.triumphs.every(t => computeProgress(t) >= t.target);
      if (allDone) newlyCompleted.push(seal.id);
    });
    if (newlyCompleted.length > 0) {
      setData(d => ({
        ...d,
        completedSeals: {
          ...(d.completedSeals || {}),
          [currentUser.id]: [...(d.completedSeals?.[currentUser.id] || []), ...newlyCompleted],
        },
      }));
    }
  }, [data.readingProgress, data.reviews, data.threads, data.recommendations, data.bibleProgress]);

  // Admin: Create new seal
  function createSeal() {
    if (!newSeal.name) return;
    const seal = {
      id: `seal-${Date.now()}`, ...newSeal, triumphs: [],
    };
    setData(d => ({ ...d, customSeals: [...(d.customSeals || []), seal] }));
    setNewSeal({ name: "", subtitle: "", description: "", icon: "✦", color: "#D4AF37" });
    setShowCreateSeal(false);
    showToast(`Seal "${seal.name}" created`);
  }

  function saveSealEdit() {
    if (!editingSeal) return;
    setData(d => ({
      ...d,
      customSeals: (d.customSeals || []).map(s => s.id === editingSeal.id ? editingSeal : s),
    }));
    setEditingSeal(null);
    showToast("Seal updated");
  }

  function deleteSeal(sealId) {
    setData(d => ({ ...d, customSeals: (d.customSeals || []).filter(s => s.id !== sealId) }));
    setSelectedSeal(null);
    showToast("Seal deleted", "info");
  }

  function addTriumph(sealId) {
    if (!newTriumph.name) return;
    const triumph = { id: `t${Date.now()}`, name: newTriumph.name, desc: newTriumph.desc, type: newTriumph.type || "custom", target: parseInt(newTriumph.target) || 1 };
    setData(d => ({
      ...d,
      customSeals: (d.customSeals || []).map(s =>
        s.id === sealId ? { ...s, triumphs: [...s.triumphs, triumph] } : s
      ),
    }));
    setNewTriumph({ name: "", desc: "", target: 1, type: "custom" });
    setShowAddTriumph(null);
    showToast("Triumph added");
  }

  function deleteTriumph(sealId, triumphId) {
    setData(d => ({
      ...d,
      customSeals: (d.customSeals || []).map(s =>
        s.id === sealId ? { ...s, triumphs: s.triumphs.filter(t => t.id !== triumphId) } : s
      ),
    }));
    showToast("Triumph deleted", "info");
  }

  function saveTriumphEdit(sealId) {
    if (!editingTriumph) return;
    setData(d => ({
      ...d,
      customSeals: (d.customSeals || []).map(s =>
        s.id === sealId ? { ...s, triumphs: s.triumphs.map(t => t.id === editingTriumph.id ? editingTriumph : t) } : s
      ),
    }));
    setEditingTriumph(null);
    showToast("Triumph updated");
  }

  // Admin: manually adjust triumph progress for any user
  function adjustProgress(triumphId, memberId, delta) {
    setData(d => {
      const tp = { ...(d.triumphProgress || {}) };
      const mp = { ...(tp[memberId] || {}) };
      mp[triumphId] = Math.max(0, (mp[triumphId] || 0) + delta);
      tp[memberId] = mp;
      return { ...d, triumphProgress: tp };
    });
  }

  const isCustomSeal = (sealId) => (data.customSeals || []).some(s => s.id === sealId);

  const SEAL_ICONS = ["✦", "⚡", "◆", "※", "∞", "†", "★", "◈", "⬥", "▲", "●", "⊕"];
  const SEAL_COLORS = ["#D4AF37", "#C0392B", "#2980B9", "#8E44AD", "#F39C12", "#27AE60", "#E74C3C", "#1ABC9C", "#9B59B6", "#E67E22"];

  return (
    <div className="page-content">
      <div className="page-header">
        <Trophy size={24} style={{ color: "#D4AF37" }} />
        <h2>TRIUMPHS</h2>
        {isAdmin && (
          <button className="gold-btn" onClick={() => setShowCreateSeal(true)}><Plus size={14} /> New Seal</button>
        )}
      </div>
      <p style={{ color: "#8A7E6B", margin: "-8px 0 20px", fontSize: 14 }}>
        Triumphs auto-track from your reading, reviews, forum posts, and Bible progress
        {isAdmin && <span style={{ color: "#C0392B", fontSize: 11, marginLeft: 8 }}>ADMIN</span>}
      </p>

      {/* Earned Titles */}
      {myCompletedSeals.length > 0 && (
        <Panel className="earned-titles-panel" glow="#D4AF37">
          <div className="section-title" style={{ marginBottom: 12 }}>EARNED TITLES</div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {myCompletedSeals.map(sId => {
              const seal = allSeals.find(s => s.id === sId);
              return (
                <div key={sId} className="earned-title-badge" style={{ borderColor: seal?.color }}>
                  <span style={{ fontSize: 24 }}>{seal?.icon}</span>
                  <GlowTitle title={seal?.name} color={seal?.color} />
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      <div className="seals-grid">
        {allSeals.map(seal => {
          const { completed, total, isComplete } = getSealProgress(seal);
          const isExpanded = selectedSeal === seal.id;
          const isCustom = isCustomSeal(seal.id);
          return (
            <Panel
              key={seal.id}
              className={`seal-card ${isComplete ? "seal-complete" : ""}`}
              glow={isComplete ? seal.color : undefined}
              onClick={() => setSelectedSeal(isExpanded ? null : seal.id)}
            >
              <div className="seal-header">
                <div className="seal-icon-wrap" style={{ background: `${seal.color}18`, borderColor: `${seal.color}44` }}>
                  <span style={{ fontSize: 28 }}>{seal.icon}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h3 className="seal-name" style={{ color: isComplete ? seal.color : "#E8E0D0" }}>{seal.name}</h3>
                    {isComplete && <Check size={16} style={{ color: seal.color }} />}
                    {isCustom && <span style={{ fontSize: 9, color: "#6B6152", border: "1px solid #3A3428", padding: "1px 5px", borderRadius: 3, fontFamily: "'Rajdhani', sans-serif", letterSpacing: 1 }}>CUSTOM</span>}
                  </div>
                  <div style={{ color: "#6B6152", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{seal.subtitle}</div>
                  <p style={{ color: "#8A7E6B", fontSize: 13, margin: "4px 0 8px" }}>{seal.description}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <ProgressBar value={completed} max={total || 1} color={seal.color} />
                    <span style={{ color: seal.color, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>{completed}/{total}</span>
                  </div>
                </div>
                <ChevronDown size={16} style={{ color: "#6B6152", transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.3s" }} />
              </div>

              {isExpanded && (
                <div className="seal-triumphs" onClick={e => e.stopPropagation()}>
                  <DiamondDivider />
                  {seal.triumphs.map(t => {
                    const progress = computeProgress(t);
                    const done = progress >= t.target;
                    const isAutoTracked = t.type !== "custom";
                    return (
                      <div key={t.id} className={`triumph-row ${done ? "triumph-done" : ""}`}>
                        <div className={`triumph-check ${done ? "checked" : ""}`} style={done ? { borderColor: seal.color, background: seal.color } : {}}>
                          {done && <Check size={12} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ color: done ? seal.color : "#C8BFA8", fontWeight: 600, fontSize: 14 }}>{t.name}</span>
                            {isAutoTracked && (
                              <span style={{ fontSize: 8, color: "#27AE60", border: "1px solid #27AE6033", padding: "1px 5px", borderRadius: 3, fontFamily: "'Rajdhani', sans-serif", letterSpacing: 0.8, fontWeight: 600 }}>AUTO</span>
                            )}
                          </div>
                          <div style={{ color: "#6B6152", fontSize: 12 }}>{t.desc}</div>
                        </div>
                        <span style={{ color: done ? seal.color : "#6B6152", fontSize: 13, fontWeight: 600 }}>
                          {Math.min(progress, t.target)}/{t.target}
                        </span>
                        {isAdmin && !isAutoTracked && (
                          <div style={{ display: "flex", gap: 2, marginLeft: 8 }}>
                            <button className="admin-sm-btn" onClick={() => adjustProgress(t.id, currentUser.id, 1)}>+</button>
                            <button className="admin-sm-btn" onClick={() => adjustProgress(t.id, currentUser.id, -1)}>-</button>
                            {isCustom && (
                              <>
                                <button className="admin-sm-btn" onClick={() => setEditingTriumph({ ...t, sealId: seal.id })} style={{ color: "#2B9EB3" }}>
                                  <Edit3 size={10} />
                                </button>
                                <button className="admin-sm-btn" onClick={() => setConfirmDeleteTriumph({ sealId: seal.id, triumphId: t.id })} style={{ color: "#C0392B" }}>
                                  <X size={10} />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                        {isAdmin && isAutoTracked && isCustom && (
                          <div style={{ display: "flex", gap: 2, marginLeft: 8 }}>
                            <button className="admin-sm-btn" onClick={() => setEditingTriumph({ ...t, sealId: seal.id })} style={{ color: "#2B9EB3" }}>
                              <Edit3 size={10} />
                            </button>
                            <button className="admin-sm-btn" onClick={() => setConfirmDeleteTriumph({ sealId: seal.id, triumphId: t.id })} style={{ color: "#C0392B" }}>
                              <X size={10} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {isAdmin && isCustom && (
                    <button className="admin-add-btn" onClick={(e) => { e.stopPropagation(); setShowAddTriumph(seal.id); }}>
                      <Plus size={12} /> Add Triumph
                    </button>
                  )}
                  {isAdmin && isCustom && (
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button className="admin-add-btn" style={{ color: "#2B9EB3", borderColor: "#2B9EB322" }} onClick={(e) => { e.stopPropagation(); setEditingSeal({ ...seal }); }}>
                        <Edit3 size={12} /> Edit Seal
                      </button>
                      <button className="admin-add-btn" style={{ color: "#C0392B", borderColor: "#C0392B22" }} onClick={(e) => { e.stopPropagation(); setConfirmDeleteSeal(seal.id); }}>
                        <X size={12} /> Delete Seal
                      </button>
                    </div>
                  )}
                  {isAdmin && !isCustom && (
                    <div style={{ marginTop: 10, padding: "6px 10px", background: "rgba(39,174,96,0.06)", borderRadius: 4, fontSize: 11, color: "#27AE60", border: "1px solid #27AE6022" }}>
                      Built-in triumphs are auto-tracked from your reading, reviews, forum activity, and Bible progress.
                    </div>
                  )}
                </div>
              )}
            </Panel>
          );
        })}
      </div>

      {/* Fireteam Titles */}
      <div style={{ marginTop: 32 }}>
        <div className="section-title" style={{ marginBottom: 12 }}>FIRETEAM TITLES</div>
        <div className="members-grid">
          {(() => {
            const myFriends = data.friends?.[currentUser.id] || [];
            const fireteam = getAllUsers(data).filter(m => myFriends.includes(m.id));
            if (fireteam.length === 0) return (
              <Panel>
                <div style={{ textAlign: "center", padding: "32px 20px" }}>
                  <Users size={28} style={{ color: "#2A2520", marginBottom: 8 }} />
                  <div style={{ color: "#4A4235", fontSize: 13 }}>Add friends to your fireteam to see their titles here</div>
                </div>
              </Panel>
            );
            return fireteam.map(m => {
              const mSeals = (data.completedSeals?.[m.id] || []).map(sId => allSeals.find(s => s.id === sId)).filter(Boolean);
              const mSeal = SEAL_DEFINITIONS.find(s => s.name === data.equippedTitles?.[m.id]);
              const mPrg = data.readingProgress?.[m.id] || {};
              const catMap = {};
              Object.keys(mPrg).forEach(bId => {
                const book = data.books.find(b => b.id === bId);
                if (book && mPrg[bId] >= book.pages) catMap[book.category] = (catMap[book.category] || 0) + 1;
              });
              const catData = Object.entries(catMap).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
              const subtitle = getReaderSubtitle(catData);
              return (
                <Panel key={m.id} className="member-card">
                  <div className="member-avatar-lg">{m.avatar}</div>
                  <div style={{ fontWeight: 700, color: "#E8E0D0", fontSize: 15, marginTop: 8 }}>{data.displayNames?.[m.id] || m.name}</div>
                  <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, color: "#4A4235", letterSpacing: 0.5 }}>
                    #{m.tag}
                  </div>
                  {(data.prestigeLevel?.[m.id] || 0) > 0 && (
                    <div style={{ marginTop: 4 }}>
                      <PrestigeEmblem level={data.prestigeLevel[m.id]} size={32} showLabel />
                    </div>
                  )}
                  {data.equippedTitles?.[m.id] && (
                    <GlowTitle title={data.equippedTitles[m.id]} color={mSeal?.color} />
                  )}
                  {subtitle && (
                    <div style={{
                      marginTop: 4, fontFamily: "'Rajdhani', sans-serif", fontWeight: 600,
                      fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase",
                      background: "linear-gradient(90deg, #D4AF37, #E8D44D, #D4AF37)",
                      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}>
                      {subtitle}
                    </div>
                  )}
                  <DiamondDivider />
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                    {mSeals.length > 0 ? mSeals.map(s => (
                      <span key={s.id} className="mini-seal" style={{ borderColor: s.color, color: s.color }}>{s.icon} {s.name}</span>
                    )) : (
                      <span style={{ color: "#4A4235", fontSize: 12, fontStyle: "italic" }}>No titles yet</span>
                    )}
                  </div>
                </Panel>
              );
            });
          })()}
        </div>
      </div>

      {/* Admin: Create Seal Modal */}
      <Modal open={showCreateSeal} onClose={() => setShowCreateSeal(false)} title="Create New Seal">
        <div style={{ padding: 16 }}>
          <label className="input-label">Seal Name</label>
          <input className="text-input" value={newSeal.name} onChange={e => setNewSeal(s => ({ ...s, name: e.target.value }))} placeholder="e.g. Evangelist" />
          <label className="input-label">Subtitle</label>
          <input className="text-input" value={newSeal.subtitle} onChange={e => setNewSeal(s => ({ ...s, subtitle: e.target.value }))} placeholder="e.g. Matthew 28:19" />
          <label className="input-label">Description</label>
          <textarea className="text-input" rows={2} value={newSeal.description} onChange={e => setNewSeal(s => ({ ...s, description: e.target.value }))} placeholder="What this seal represents..." />
          <label className="input-label">Icon</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {SEAL_ICONS.map(ic => (
              <button key={ic} className={`admin-icon-btn ${newSeal.icon === ic ? "selected" : ""}`}
                style={newSeal.icon === ic ? { borderColor: newSeal.color, background: `${newSeal.color}22` } : {}}
                onClick={() => setNewSeal(s => ({ ...s, icon: ic }))}>{ic}</button>
            ))}
          </div>
          <label className="input-label">Color</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {SEAL_COLORS.map(c => (
              <button key={c} className={`admin-color-btn ${newSeal.color === c ? "selected" : ""}`}
                style={{ background: c, boxShadow: newSeal.color === c ? `0 0 0 2px #0D0B0A, 0 0 0 4px ${c}` : "none" }}
                onClick={() => setNewSeal(s => ({ ...s, color: c }))} />
            ))}
          </div>
          <button className="gold-btn" style={{ width: "100%", marginTop: 8 }} onClick={createSeal}>Create Seal</button>
        </div>
      </Modal>

      {/* Admin: Edit Seal Modal */}
      <Modal open={!!editingSeal} onClose={() => setEditingSeal(null)} title="Edit Seal">
        {editingSeal && (
          <div style={{ padding: 16 }}>
            <label className="input-label">Name</label>
            <input className="text-input" value={editingSeal.name} onChange={e => setEditingSeal(s => ({ ...s, name: e.target.value }))} />
            <label className="input-label">Subtitle</label>
            <input className="text-input" value={editingSeal.subtitle} onChange={e => setEditingSeal(s => ({ ...s, subtitle: e.target.value }))} />
            <label className="input-label">Description</label>
            <textarea className="text-input" rows={2} value={editingSeal.description} onChange={e => setEditingSeal(s => ({ ...s, description: e.target.value }))} />
            <label className="input-label">Icon</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {SEAL_ICONS.map(ic => (
                <button key={ic} className={`admin-icon-btn ${editingSeal.icon === ic ? "selected" : ""}`}
                  style={editingSeal.icon === ic ? { borderColor: editingSeal.color, background: `${editingSeal.color}22` } : {}}
                  onClick={() => setEditingSeal(s => ({ ...s, icon: ic }))}>{ic}</button>
              ))}
            </div>
            <label className="input-label">Color</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {SEAL_COLORS.map(c => (
                <button key={c} className={`admin-color-btn ${editingSeal.color === c ? "selected" : ""}`}
                  style={{ background: c, boxShadow: editingSeal.color === c ? `0 0 0 2px #0D0B0A, 0 0 0 4px ${c}` : "none" }}
                  onClick={() => setEditingSeal(s => ({ ...s, color: c }))} />
              ))}
            </div>
            <button className="gold-btn" style={{ width: "100%" }} onClick={saveSealEdit}>Save Changes</button>
          </div>
        )}
      </Modal>

      {/* Admin: Add Triumph Modal */}
      <Modal open={!!showAddTriumph} onClose={() => setShowAddTriumph(null)} title="Add Triumph">
        <div style={{ padding: 16 }}>
          <label className="input-label">Triumph Name</label>
          <input className="text-input" value={newTriumph.name} onChange={e => setNewTriumph(t => ({ ...t, name: e.target.value }))} placeholder="e.g. Read 3 books" />
          <label className="input-label">Description</label>
          <input className="text-input" value={newTriumph.desc} onChange={e => setNewTriumph(t => ({ ...t, desc: e.target.value }))} placeholder="What the user must do..." />
          <label className="input-label">Tracking Type</label>
          <select className="text-input" value={newTriumph.type} onChange={e => setNewTriumph(t => ({ ...t, type: e.target.value }))}>
            <optgroup label="Auto-Tracked">
              <option value="books_read">Books Completed</option>
              <option value="reviews_written">Reviews Written</option>
              <option value="threads_started">Threads Started</option>
              <option value="bible_read">Bible Books Read</option>
              <option value="reformed_books">Systematic Theology Books</option>
              <option value="apologetics_books">Apologetics Books</option>
              <option value="long_review">Long Reviews (500+ chars)</option>
              <option value="soteriology_posts">Soteriology Forum Posts</option>
              <option value="lbcf_discussions">Confessional Forum Posts</option>
              <option value="replies_20">Forum Replies</option>
              <option value="recommendations">Books Recommended</option>
              <option value="seals_complete">Seals Completed</option>
            </optgroup>
            <optgroup label="Manual">
              <option value="custom">Manual Tracking (admin +/-)</option>
            </optgroup>
          </select>
          <label className="input-label">Target (completions needed)</label>
          <input className="text-input" type="number" value={newTriumph.target} onChange={e => setNewTriumph(t => ({ ...t, target: e.target.value }))} />
          {newTriumph.type !== "custom" && (
            <div style={{ marginTop: 8, padding: "6px 10px", background: "rgba(39,174,96,0.06)", borderRadius: 4, fontSize: 11, color: "#27AE60", border: "1px solid #27AE6022" }}>
              This triumph will auto-track progress from app activity.
            </div>
          )}
          <button className="gold-btn" style={{ width: "100%", marginTop: 12 }} onClick={() => addTriumph(showAddTriumph)}>Add Triumph</button>
        </div>
      </Modal>

      {/* Admin: Edit Triumph Modal */}
      <Modal open={!!editingTriumph} onClose={() => setEditingTriumph(null)} title="Edit Triumph">
        {editingTriumph && (
          <div style={{ padding: 16 }}>
            <label className="input-label">Name</label>
            <input className="text-input" value={editingTriumph.name} onChange={e => setEditingTriumph(t => ({ ...t, name: e.target.value }))} />
            <label className="input-label">Description</label>
            <input className="text-input" value={editingTriumph.desc} onChange={e => setEditingTriumph(t => ({ ...t, desc: e.target.value }))} />
            <label className="input-label">Target</label>
            <input className="text-input" type="number" value={editingTriumph.target} onChange={e => setEditingTriumph(t => ({ ...t, target: parseInt(e.target.value) || 1 }))} />
            <button className="gold-btn" style={{ width: "100%" }} onClick={() => saveTriumphEdit(editingTriumph.sealId)}>Save Changes</button>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmDeleteSeal}
        onClose={() => setConfirmDeleteSeal(null)}
        onConfirm={() => deleteSeal(confirmDeleteSeal)}
        title="Delete Seal?"
        message="This seal and all its triumphs will be permanently deleted for everyone. This cannot be undone."
        confirmLabel="Delete Seal"
      />

      <ConfirmDialog
        open={!!confirmDeleteTriumph}
        onClose={() => setConfirmDeleteTriumph(null)}
        onConfirm={() => { if (confirmDeleteTriumph) deleteTriumph(confirmDeleteTriumph.sealId, confirmDeleteTriumph.triumphId); }}
        title="Delete Triumph?"
        message="This triumph will be permanently removed from the seal."
        confirmLabel="Delete Triumph"
      />
    </div>
  );
}

// ════════════════════════════════════════
// PAGE: LIBRARY / READING TRACKER
// ════════════════════════════════════════
// ════════════════════════════════════════
// SLOT MACHINE COUNTER ANIMATION
// ════════════════════════════════════════
function SlotDigit({ digit, animate, delay = 0 }) {
  const [displayed, setDisplayed] = useState(digit);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    if (!animate) { setDisplayed(digit); return; }
    setSpinning(true);
    const spinDuration = 900 + delay;
    const interval = 50;
    let elapsed = 0;
    const timer = setInterval(() => {
      elapsed += interval;
      if (elapsed < spinDuration) {
        setDisplayed(Math.floor(Math.random() * 10));
      } else {
        setDisplayed(digit);
        setSpinning(false);
        clearInterval(timer);
      }
    }, interval);
    return () => clearInterval(timer);
  }, [digit, animate, delay]);

  return (
    <span className={`slot-digit ${spinning ? "slot-spinning" : "slot-landed"}`}>
      {displayed}
    </span>
  );
}

function SlotCounter({ value, animate }) {
  const digits = String(value).split("").map(Number);
  return (
    <div className="slot-counter">
      {digits.map((d, i) => (
        <SlotDigit key={`${digits.length}-${i}`} digit={d} animate={animate} delay={i * 120} />
      ))}
    </div>
  );
}

// ── Golden Flame Ascension Animation (Book Completion) ──
function FlameAscensionAnimation({ bookTitle, onComplete }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const startRef = useRef(null);
  const [phase, setPhase] = useState(0); // 0=flames rise, 1=burst, 2=reveal, 3=fade
  const [showText, setShowText] = useState(false);
  const [textOpacity, setTextOpacity] = useState(0);
  const [screenFlash, setScreenFlash] = useState(0);
  const flamesRef = useRef([]);
  const embersRef = useRef([]);
  const burstRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;
    const cx = W / 2, cy = H / 2;

    // ── Initialize flame particles ──
    // These rise from the bottom in waves, creating a wall of fire
    flamesRef.current = Array.from({ length: 120 }, (_, i) => {
      const x = (i / 120) * W + (Math.random() - 0.5) * (W / 10);
      return {
        x, baseX: x,
        y: H + Math.random() * 100,
        vy: -(2.5 + Math.random() * 4),
        vx: (Math.random() - 0.5) * 1.5,
        size: 8 + Math.random() * 18,
        life: 1,
        decay: 0.003 + Math.random() * 0.004,
        phase: Math.random() * Math.PI * 2,
        freq: 2 + Math.random() * 3,
        hue: Math.random(), // 0=gold, 0.5=orange, 1=red
        delay: (i % 20) * 0.04 + Math.random() * 0.3, // staggered start
      };
    });

    // ── Embers that float up after the burst ──
    embersRef.current = Array.from({ length: 80 }, () => ({
      x: cx + (Math.random() - 0.5) * W * 0.8,
      y: H + Math.random() * 200,
      vx: (Math.random() - 0.5) * 1,
      vy: -(1 + Math.random() * 3),
      size: 1 + Math.random() * 3,
      life: 1,
      decay: 0.002 + Math.random() * 0.004,
      flickerPhase: Math.random() * Math.PI * 2,
    }));

    // ── Burst particles (golden explosion at climax) ──
    burstRef.current = Array.from({ length: 100 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 10;
      return {
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 6,
        life: 1,
        decay: 0.008 + Math.random() * 0.015,
        color: ["#D4AF37", "#FFD700", "#E8E0D0", "#FF8C00", "#FFA500"][Math.floor(Math.random() * 5)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        trail: [],
      };
    });

    startRef.current = performance.now();
    let currentPhase = 0;

    // ── Phase timings ──
    const phase0End = 3.0;   // Flames rise and consume screen
    const phase1End = 4.5;   // Golden burst / explosion
    const phase2End = 7.5;   // Reveal text + embers
    const phase3End = 9.0;   // Fade out → onComplete

    function getFlameColor(hue, alpha) {
      // hue: 0=bright gold, 0.5=orange, 1=deep red
      if (hue < 0.33) {
        const r = 255, g = Math.round(200 + (1 - hue * 3) * 55), b = Math.round(50 * (1 - hue * 3));
        return `rgba(${r},${g},${b},${alpha})`;
      } else if (hue < 0.66) {
        const t = (hue - 0.33) * 3;
        const r = 255, g = Math.round(200 - t * 80), b = 0;
        return `rgba(${r},${g},${b},${alpha})`;
      } else {
        const t = (hue - 0.66) * 3;
        const r = Math.round(255 - t * 60), g = Math.round(120 - t * 80), b = 0;
        return `rgba(${r},${g},${b},${alpha})`;
      }
    }

    function animate(now) {
      const elapsed = (now - startRef.current) / 1000;
      ctx.clearRect(0, 0, W, H);

      // Background — deepens as flames consume
      const bgDark = Math.min(0.97, elapsed * 0.4);
      ctx.fillStyle = `rgba(13, 11, 10, ${bgDark})`;
      ctx.fillRect(0, 0, W, H);

      // ── Phase 0: Flames rise from bottom ──
      if (elapsed < phase0End) {
        currentPhase = 0;
        const progress = elapsed / phase0End; // 0→1

        // Heat distortion glow at bottom
        const heatH = H * progress * 0.8;
        const heatGrad = ctx.createLinearGradient(0, H, 0, H - heatH);
        heatGrad.addColorStop(0, `rgba(212, 175, 55, ${0.15 * progress})`);
        heatGrad.addColorStop(0.4, `rgba(255, 140, 0, ${0.08 * progress})`);
        heatGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = heatGrad;
        ctx.fillRect(0, 0, W, H);

        // Draw flame particles
        flamesRef.current.forEach(f => {
          if (elapsed < f.delay) return;
          const age = elapsed - f.delay;
          
          // Move upward with sinusoidal sway
          f.y += f.vy * (0.8 + progress * 0.6);
          f.x = f.baseX + Math.sin(f.phase + age * f.freq) * (15 + progress * 20);

          // Flames grow larger as they fill the screen
          const sizeMultiplier = 1 + progress * 1.5;
          const s = f.size * sizeMultiplier;
          const alpha = Math.max(0, f.life * (0.4 + progress * 0.5));

          if (alpha <= 0) return;

          // Core flame shape — soft radial gradient
          const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, s);
          grad.addColorStop(0, getFlameColor(f.hue * 0.5, alpha * 0.9));
          grad.addColorStop(0.3, getFlameColor(f.hue * 0.7, alpha * 0.6));
          grad.addColorStop(0.7, getFlameColor(f.hue, alpha * 0.2));
          grad.addColorStop(1, "rgba(0,0,0,0)");

          ctx.save();
          ctx.shadowColor = getFlameColor(f.hue * 0.3, 0.8);
          ctx.shadowBlur = s * 0.8;
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(f.x, f.y, s, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Respawn at bottom when they go too high or die
          if (f.y < -s * 2) {
            f.y = H + Math.random() * 40;
            f.baseX = Math.random() * W;
            f.x = f.baseX;
            f.hue = Math.random();
          }
        });

        // Bright central pillar of fire forming in late phase
        if (progress > 0.5) {
          const pillarT = (progress - 0.5) * 2;
          const pillarW = 60 + pillarT * 100;
          const pillarH = H * pillarT;
          const pillarGrad = ctx.createLinearGradient(cx, H, cx, H - pillarH);
          pillarGrad.addColorStop(0, `rgba(255, 200, 50, ${pillarT * 0.3})`);
          pillarGrad.addColorStop(0.5, `rgba(212, 175, 55, ${pillarT * 0.15})`);
          pillarGrad.addColorStop(1, "rgba(212, 175, 55, 0)");
          ctx.fillStyle = pillarGrad;
          ctx.fillRect(cx - pillarW / 2, H - pillarH, pillarW, pillarH);
        }

        // Screen shake as intensity builds
        if (progress > 0.7) {
          const shake = (progress - 0.7) * 15;
          canvas.style.transform = `translate(${(Math.random() - 0.5) * shake}px, ${(Math.random() - 0.5) * shake}px)`;
        }
      }
      // ── Phase 1: Golden burst / explosion ──
      else if (elapsed < phase1End) {
        if (currentPhase < 1) {
          currentPhase = 1;
          setPhase(1);
          setScreenFlash(1);
          canvas.style.transform = "none";
          setTimeout(() => setScreenFlash(0), 250);
        }
        const t = (elapsed - phase0End) / (phase1End - phase0End);

        // White-gold flash fading
        const flashAlpha = Math.max(0, 1 - t * 2.5);
        if (flashAlpha > 0) {
          ctx.fillStyle = `rgba(255, 235, 180, ${flashAlpha * 0.7})`;
          ctx.fillRect(0, 0, W, H);
        }

        // Shockwave ring
        const swRadius = t * Math.max(W, H) * 0.7;
        const swOpacity = Math.max(0, 1 - t * 1.3);
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, swRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(212, 175, 55, ${swOpacity * 0.7})`;
        ctx.lineWidth = 4 + (1 - t) * 10;
        ctx.shadowColor = "#D4AF37";
        ctx.shadowBlur = 40;
        ctx.stroke();
        ctx.restore();

        // Second shockwave
        if (t > 0.1) {
          const sw2t = (t - 0.1) / 0.9;
          const sw2R = sw2t * Math.max(W, H) * 0.5;
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, sw2R, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 140, 0, ${Math.max(0, 1 - sw2t * 1.5) * 0.5})`;
          ctx.lineWidth = 2 + (1 - sw2t) * 6;
          ctx.stroke();
          ctx.restore();
        }

        // Burst particles
        burstRef.current.forEach(p => {
          if (p.life <= 0) return;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.04;
          p.vx *= 0.994;
          p.life -= p.decay;
          p.rotation += p.rotSpeed;
          p.trail.push({ x: p.x, y: p.y, life: 0.4 });
          if (p.trail.length > 6) p.trail.shift();

          // Trails
          p.trail.forEach(tp => {
            tp.life -= 0.04;
            if (tp.life <= 0) return;
            ctx.save();
            ctx.globalAlpha = tp.life * p.life * 0.4;
            ctx.beginPath();
            ctx.arc(tp.x, tp.y, p.size * 0.3, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
            ctx.restore();
          });

          ctx.save();
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          // Diamond spark shape
          const s = p.size * (0.5 + p.life * 0.5);
          ctx.beginPath();
          ctx.moveTo(0, -s);
          ctx.lineTo(s * 0.5, 0);
          ctx.lineTo(0, s);
          ctx.lineTo(-s * 0.5, 0);
          ctx.closePath();
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 12;
          ctx.fill();
          ctx.restore();
        });

        // Center glow fading
        const glowAlpha = Math.max(0, 1 - t * 2);
        if (glowAlpha > 0) {
          const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 150);
          grad.addColorStop(0, `rgba(255, 255, 240, ${glowAlpha * 0.8})`);
          grad.addColorStop(0.3, `rgba(212, 175, 55, ${glowAlpha * 0.4})`);
          grad.addColorStop(1, "rgba(212, 175, 55, 0)");
          ctx.fillStyle = grad;
          ctx.fillRect(cx - 150, cy - 150, 300, 300);
        }
      }
      // ── Phase 2: Reveal — embers float, text appears ──
      else if (elapsed < phase2End) {
        if (currentPhase < 2) {
          currentPhase = 2;
          setPhase(2);
          setShowText(true);
          setTimeout(() => setTextOpacity(1), 150);
        }
        const t = (elapsed - phase1End) / (phase2End - phase1End);

        // Gentle ambient warmth
        const ambientGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.6);
        ambientGrad.addColorStop(0, "rgba(212, 175, 55, 0.06)");
        ambientGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = ambientGrad;
        ctx.fillRect(0, 0, W, H);

        // Floating embers
        embersRef.current.forEach(e => {
          if (e.life <= 0) return;
          e.x += e.vx + Math.sin(e.flickerPhase + elapsed * 1.5) * 0.4;
          e.y += e.vy;
          e.life -= e.decay;
          e.flickerPhase += 0.03;
          const flicker = 0.3 + Math.sin(e.flickerPhase) * 0.25;
          ctx.save();
          ctx.globalAlpha = e.life * flicker;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
          ctx.fillStyle = "#D4AF37";
          ctx.shadowColor = "#D4AF37";
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.restore();
        });

        // Remaining burst particles settling
        burstRef.current.forEach(p => {
          if (p.life <= 0) return;
          p.x += p.vx * 0.3;
          p.y += p.vy * 0.3;
          p.vy += 0.01;
          p.life -= p.decay * 0.5;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.life * 0.5);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 4;
          ctx.fill();
          ctx.restore();
        });

        // Faint orbiting golden motes around center
        for (let i = 0; i < 6; i++) {
          const orbitAngle = (i / 6) * Math.PI * 2 + elapsed * 0.6;
          const orbitR = 80 + Math.sin(elapsed * 1.5 + i) * 15;
          const ox = cx + Math.cos(orbitAngle) * orbitR;
          const oy = cy + Math.sin(orbitAngle) * orbitR;
          ctx.save();
          ctx.globalAlpha = 0.4;
          ctx.beginPath();
          ctx.arc(ox, oy, 2, 0, Math.PI * 2);
          ctx.fillStyle = "#D4AF37";
          ctx.shadowColor = "#D4AF37";
          ctx.shadowBlur = 10;
          ctx.fill();
          ctx.restore();
        }
      }
      // ── Phase 3: Fade out → complete ──
      else {
        if (currentPhase < 3) {
          currentPhase = 3;
          setPhase(3);
          setTimeout(() => onComplete(), 1200);
        }
        return;
      }

      animRef.current = requestAnimationFrame(animate);
    }

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      canvas.style.transform = "none";
    };
  }, []);

  return (
    <div className="flame-anim-overlay" style={{ opacity: phase === 3 ? 0 : 1 }}>
      {screenFlash > 0 && (
        <div style={{
          position: "absolute", inset: 0, background: "rgba(255,235,180,0.9)",
          opacity: screenFlash, zIndex: 3, pointerEvents: "none",
          transition: "opacity 0.25s",
        }} />
      )}
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, zIndex: 1 }} />
      {showText && (
        <div className="flame-anim-text" style={{ opacity: textOpacity }}>
          <div className="flame-anim-icon">✦</div>
          <div className="flame-anim-label">BOOK COMPLETED</div>
          <div className="flame-anim-title">{bookTitle}</div>
          <button className="flame-anim-continue" onClick={onComplete}>Continue</button>
        </div>
      )}
    </div>
  );
}

// ── Slot Overlay (progress update + completion) ──
function SlotOverlay({ oldValue, newValue, pagesAdded, bookTitle, pagesRemaining, isCompleted, onDone }) {
  const [showFlameAnim, setShowFlameAnim] = useState(isCompleted);
  const [phase, setPhase] = useState("enter"); // enter -> counting -> done
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (showFlameAnim) return; // Wait for flame anim to finish first
    const t1 = setTimeout(() => setPhase("counting"), 300);
    const t2 = setTimeout(() => { setPhase("done"); setShowConfetti(true); }, 1800);
    const t3 = setTimeout(() => onDone(), 3800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [showFlameAnim]);

  if (showFlameAnim) {
    return <FlameAscensionAnimation bookTitle={bookTitle} onComplete={() => setShowFlameAnim(false)} />;
  }

  return (
    <div className={`slot-overlay ${phase}`} onClick={onDone}>
      {showConfetti && (
        <div className="slot-confetti">
          {Array.from({ length: isCompleted ? 40 : 20 }).map((_, i) => (
            <span key={i} className="confetti-particle" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 0.5}s`,
              animationDuration: `${1 + Math.random() * 1.5}s`,
              background: ["#D4AF37", "#E8E0D0", "#2B9EB3", "#27AE60", "#C0392B"][i % 5],
            }} />
          ))}
        </div>
      )}
      <div className="slot-overlay-content">
        {isCompleted ? (
          <div className="slot-completed-badge">
            <div className="slot-completed-icon">✦</div>
            <div className="slot-completed-text">BOOK COMPLETED</div>
          </div>
        ) : (
          <div className="slot-remaining">
            <span className="slot-remaining-num">{pagesRemaining.toLocaleString()}</span>
            <span className="slot-remaining-text"> pages remaining</span>
          </div>
        )}
        <div className="slot-added-label">+{pagesAdded} pages</div>
        <div className="slot-book-title">{bookTitle}</div>
        <div className="slot-divider" />
        <div className="slot-total-label">TOTAL PAGES READ</div>
        <SlotCounter value={phase === "enter" ? oldValue : newValue} animate={phase === "counting"} />
      </div>
    </div>
  );
}

function LibraryPage() {
  const { data, setData, currentUser, isAdmin, showToast } = useContext(AppContext);
  const [filter, setFilter] = useState("All");
  const [bookSearch, setBookSearch] = useState("");
  const [showAddBook, setShowAddBook] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [newBook, setNewBook] = useState({ title: "", author: "", category: CATEGORIES[0], pages: "", coverUrl: "" });
  const [coverLoading, setCoverLoading] = useState(false);
  const [updatePage, setUpdatePage] = useState("");
  const [view, setView] = useState("grid");
  const [showFireteam, setShowFireteam] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteMembers, setInviteMembers] = useState([]);
  const [inviteNote, setInviteNote] = useState("");
  const [selectedGroupRead, setSelectedGroupRead] = useState(null);
  const [chatMessage, setChatMessage] = useState("");
  const chatEndRef = useRef(null);
  const [editingBook, setEditingBook] = useState(null);
  const [confirmDeleteBook, setConfirmDeleteBook] = useState(null);
  const [slotAnim, setSlotAnim] = useState(null); // { oldValue, newValue, pagesAdded, bookTitle }

  function startEditBook(book) {
    setEditingBook({ ...book });
  }

  function saveBookEdit() {
    if (!editingBook || !editingBook.title || !editingBook.author) return;
    setData(d => ({
      ...d,
      books: d.books.map(b => b.id === editingBook.id ? { ...b, title: editingBook.title, author: editingBook.author, category: editingBook.category, pages: parseInt(editingBook.pages) || b.pages, coverUrl: editingBook.coverUrl || b.coverUrl } : b),
    }));
    // Also sync edit to Supabase directly
    supabase.from("books").update({
      title: editingBook.title, author: editingBook.author, category: editingBook.category,
      pages: parseInt(editingBook.pages) || 0, cover_url: editingBook.coverUrl || null,
    }).eq("id", editingBook.id).then(({ error }) => { if (error) console.error("Book update error:", error); });
    setEditingBook(null);
    setSelectedBook(null);
    showToast("Book updated");
  }

  function deleteBook(bookId) {
    const book = data.books.find(b => b.id === bookId);
    setData(d => ({
      ...d,
      books: d.books.filter(b => b.id !== bookId),
      reviews: d.reviews.filter(r => r.bookId !== bookId),
    }));
    // Sync delete to Supabase directly
    supabase.from("books").delete().eq("id", bookId).then(({ error }) => { if (error) console.error("Book delete error:", error); });
    setConfirmDeleteBook(null);
    setSelectedBook(null);
    showToast(`"${book?.title}" deleted from library`, "info");
  }

  const filtered = data.books.filter(b => {
    if (filter !== "All" && b.category !== filter) return false;
    if (bookSearch.trim()) {
      const q = bookSearch.toLowerCase().trim();
      return b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q);
    }
    return true;
  });

  const activeGroupReads = (data.readInvites || []).filter(inv =>
    inv.status === "active" && (inv.fromId === currentUser.id || inv.acceptedIds.includes(currentUser.id))
  );

  function addBook() {
    if (!newBook.title || !newBook.author || !newBook.pages) return;
    const book = { ...newBook, id: `b${Date.now()}`, pages: parseInt(newBook.pages), cover: "", coverUrl: newBook.coverUrl || "" };
    setData(d => ({ ...d, books: [...d.books, book] }));
    setNewBook({ title: "", author: "", category: CATEGORIES[0], pages: "", coverUrl: "" });
    setCoverLoading(false);
    setShowAddBook(false);
    showToast(`"${book.title}" added to library`);
  }

  async function searchCover() {
    if (!newBook.title) return;
    setCoverLoading(true);
    const url = await fetchBookCover(newBook.title, newBook.author);
    setNewBook(n => ({ ...n, coverUrl: url || "" }));
    setCoverLoading(false);
  }

  function updateProgress(bookId) {
    const pg = parseInt(updatePage);
    if (isNaN(pg)) return;
    const book = data.books.find(b => b.id === bookId);
    // Calculate old total pages for slot animation
    const oldTotal = Object.values(data.readingProgress?.[currentUser.id] || {}).reduce((s, v) => s + v, 0);
    const oldBookPg = data.readingProgress?.[currentUser.id]?.[bookId] || 0;
    const newTotal = oldTotal - oldBookPg + pg;
    const pagesAdded = pg - oldBookPg;
    const isCompleted = book && pg >= book.pages;
    const pagesRemaining = book ? Math.max(0, book.pages - pg) : 0;
    setData(d => ({
      ...d,
      readingProgress: {
        ...d.readingProgress,
        [currentUser.id]: { ...d.readingProgress[currentUser.id], [bookId]: pg },
      },
    }));
    setUpdatePage("");
    setSelectedBook(null);
    // Trigger slot animation if pages actually increased
    if (pagesAdded > 0) {
      setSlotAnim({
        oldValue: oldTotal, newValue: newTotal, pagesAdded,
        bookTitle: book?.title || "Unknown", isCompleted, pagesRemaining,
      });
    }
    if (isCompleted) showToast(`"${book.title}" completed!`);
    else showToast("Progress updated");
  }

  function getProgress(bookId) {
    return data.readingProgress?.[currentUser.id]?.[bookId] || 0;
  }

  function toggleInviteMember(memberId) {
    setInviteMembers(prev =>
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  }

  function sendInvite() {
    if (!selectedBook || inviteMembers.length === 0) return;
    const invite = {
      id: `inv${Date.now()}`,
      bookId: selectedBook.id,
      fromId: currentUser.id,
      invitedIds: inviteMembers,
      acceptedIds: [],
      declinedIds: [],
      note: inviteNote,
      messages: [],
      date: new Date().toISOString().split("T")[0],
      status: "active",
    };
    setData(d => ({
      ...d,
      readInvites: [...(d.readInvites || []), invite],
      activities: [...d.activities, {
        id: `a${Date.now()}`, type: "invite", memberId: currentUser.id,
        text: `invited ${inviteMembers.map(id => findMember(data, id)?.name).join(", ")} to read "${selectedBook.title}"`,
        date: invite.date, icon: "↗",
      }],
    }));
    setShowInvite(false);
    setInviteMembers([]);
    setInviteNote("");
    setSelectedBook(null);
    showToast("Group read invite sent");
  }

  function sendChatMessage() {
    if (!chatMessage.trim() || !selectedGroupRead) return;
    const msg = {
      id: `msg${Date.now()}`,
      authorId: currentUser.id,
      text: chatMessage.trim(),
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setData(d => ({
      ...d,
      readInvites: (d.readInvites || []).map(inv =>
        inv.id === selectedGroupRead
          ? { ...inv, messages: [...(inv.messages || []), msg] }
          : inv
      ),
    }));
    setChatMessage("");
  }

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedGroupRead, data.readInvites]);

  // Group read detail view
  const activeInvite = selectedGroupRead
    ? (data.readInvites || []).find(inv => inv.id === selectedGroupRead)
    : null;
  const grBook = activeInvite ? data.books.find(b => b.id === activeInvite.bookId) : null;

  if (selectedGroupRead && activeInvite && grBook) {
    const allParticipants = [activeInvite.fromId, ...activeInvite.acceptedIds];
    const from = findMember(data, activeInvite.fromId);
    const messages = activeInvite.messages || [];

    return (
      <div className="page-content">
        <button className="back-btn" onClick={() => setSelectedGroupRead(null)}>
          <ArrowLeft size={16} /> Back to Library
        </button>

        {/* Book Header */}
        <Panel className="gr-detail-header" glow="#2B9EB3" style={{ marginTop: 12 }}>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            <span style={{ fontSize: 40 }}><BookCover book={grBook} size={40} /></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: 2, color: "#2B9EB3", textTransform: "uppercase", marginBottom: 4 }}>
                GROUP READ
              </div>
              <h3 style={{ margin: "0 0 2px", color: "#E8E0D0", fontSize: 22 }}>{grBook.title}</h3>
              <div style={{ color: "#6B6152", fontSize: 13 }}>{grBook.author} · {grBook.pages} pages</div>
              <div style={{ color: "#4A4235", fontSize: 12, marginTop: 4 }}>
                Started by {from?.name} · {activeInvite.date}
              </div>
            </div>
          </div>
          {activeInvite.note && (
            <div style={{ color: "#A09880", fontSize: 13, fontStyle: "italic", marginTop: 14, padding: "10px 14px", background: "rgba(43,158,179,0.06)", borderRadius: 4, borderLeft: "2px solid #2B9EB344" }}>
              "{activeInvite.note}"
            </div>
          )}
        </Panel>

        {/* Participants Progress */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "20px 0 10px" }}>
          <Users size={14} style={{ color: "#2B9EB3" }} />
          <span className="section-title">FIRETEAM PROGRESS</span>
        </div>
        <div className="gr-participants-row">
          {allParticipants.map(pId => {
            const member = findMember(data, pId);
            if (!member) return null;
            const pg = data.readingProgress?.[pId]?.[grBook.id] || 0;
            const pct = Math.round((pg / grBook.pages) * 100);
            const done = pg >= grBook.pages;
            return (
              <Panel key={pId} className="gr-participant-card">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div className="avatar" style={{ width: 28, height: 28, fontSize: 9 }}>{member.avatar}</div>
                  <span style={{ color: "#E8E0D0", fontSize: 13, fontWeight: 600 }}>{member.name}</span>
                  <span style={{ color: done ? "#27AE60" : "#2B9EB3", fontSize: 12, fontWeight: 700, marginLeft: "auto", fontFamily: "'Rajdhani', sans-serif", letterSpacing: 1 }}>
                    {done ? "✔ COMPLETE" : `${pct}%`}
                  </span>
                </div>
                <ProgressBar value={pg} max={grBook.pages} color={done ? "#27AE60" : "#2B9EB3"} height={4} />
                <div style={{ color: "#4A4235", fontSize: 11, marginTop: 4 }}>{pg} / {grBook.pages} pages</div>
              </Panel>
            );
          })}
        </div>

        {/* Chat Section */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "24px 0 10px" }}>
          <MessageSquare size={14} style={{ color: "#2B9EB3" }} />
          <span className="section-title">DISCUSSION</span>
          <span style={{ color: "#4A4235", fontSize: 11 }}>({messages.length} messages)</span>
        </div>
        <Panel className="gr-chat-panel">
          <div className="gr-chat-messages">
            {messages.length === 0 && (
              <div className="gr-chat-empty">
                <MessageSquare size={32} style={{ color: "#2A2520", marginBottom: 8 }} />
                <div style={{ color: "#4A4235", fontSize: 14 }}>No messages yet</div>
                <div style={{ color: "#33302A", fontSize: 12 }}>Start the conversation about {grBook.title}</div>
              </div>
            )}
            {messages.map((msg, i) => {
              const author = findMember(data, msg.authorId);
              const isOwn = msg.authorId === currentUser.id;
              const prevSameAuthor = i > 0 && messages[i - 1].authorId === msg.authorId;
              return (
                <div key={msg.id} className={`gr-chat-msg ${isOwn ? "own" : "other"}`}>
                  {!prevSameAuthor && (
                    <div className={`gr-chat-msg-header ${isOwn ? "own" : ""}`}>
                      <div className="avatar" style={{ width: 24, height: 24, fontSize: 8 }}>{author?.avatar}</div>
                      <span className={`gr-chat-author ${isOwn ? "own" : ""}`}>
                        {author?.name || "Unknown"}
                      </span>
                      <span style={{ color: "#4A4235", fontSize: 10 }}>{msg.time} · {msg.date}</span>
                    </div>
                  )}
                  <div className={`gr-chat-bubble ${isOwn ? "own" : "other"}`}>
                    <ScriptureText text={msg.text} />
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>
          <div className="gr-chat-input-row">
            <input
              className="text-input gr-chat-input"
              value={chatMessage}
              onChange={e => setChatMessage(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
              placeholder={`Message the group about ${grBook.title}...`}
            />
            <button
              className="gold-btn gr-chat-send"
              onClick={sendChatMessage}
              style={{ opacity: chatMessage.trim() ? 1 : 0.4 }}
            >
              <Send size={14} />
            </button>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <BookOpen size={24} style={{ color: "#D4AF37" }} />
        <h2>LIBRARY</h2>
        <button className="gold-btn" onClick={() => setShowAddBook(true)}><Plus size={14} /> Add Book</button>
      </div>

      {/* Active Group Reads */}
      {activeGroupReads.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Users size={16} style={{ color: "#2B9EB3" }} />
            <span className="section-title">ACTIVE GROUP READS</span>
          </div>
          <div className="group-reads-grid">
            {activeGroupReads.map(inv => {
              const book = data.books.find(b => b.id === inv.bookId);
              if (!book) return null;
              const allParticipants = [inv.fromId, ...inv.acceptedIds];
              const from = findMember(data, inv.fromId);
              return (
                <Panel key={inv.id} className="group-read-card" glow="#2B9EB3">
                  <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                    <span style={{ fontSize: 32 }}><BookCover book={book} size={32} /></span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: "#E8E0D0", fontSize: 15 }}>{book.title}</div>
                      <div style={{ color: "#6B6152", fontSize: 12 }}>{book.author} · {book.pages} pages</div>
                      <div style={{ color: "#2B9EB3", fontSize: 11, marginTop: 4, fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, letterSpacing: 1 }}>
                        STARTED BY {from?.name?.toUpperCase()} · {inv.date}
                      </div>
                    </div>
                  </div>
                  {inv.note && (
                    <div style={{ color: "#A09880", fontSize: 13, fontStyle: "italic", marginBottom: 12, padding: "8px 12px", background: "rgba(43,158,179,0.06)", borderRadius: 4, borderLeft: "2px solid #2B9EB344" }}>
                      "{inv.note}"
                    </div>
                  )}
                  <div className="group-read-participants">
                    {allParticipants.map(pId => {
                      const member = findMember(data, pId);
                      if (!member) return null;
                      const pg = data.readingProgress?.[pId]?.[book.id] || 0;
                      const pct = Math.round((pg / book.pages) * 100);
                      const done = pg >= book.pages;
                      return (
                        <div key={pId} className="group-read-member">
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div className="avatar" style={{ width: 22, height: 22, fontSize: 8 }}>{member.avatar}</div>
                              <span style={{ color: "#C8BFA8", fontSize: 12 }}>{member.name}</span>
                            </div>
                            <span style={{ color: done ? "#27AE60" : "#2B9EB3", fontSize: 11, fontWeight: 600 }}>
                              {done ? "✔ DONE" : `${pct}%`}
                            </span>
                          </div>
                          <ProgressBar value={pg} max={book.pages} color={done ? "#27AE60" : "#2B9EB3"} height={3} />
                        </div>
                      );
                    })}
                    {inv.invitedIds.filter(id => !inv.acceptedIds.includes(id) && !inv.declinedIds.includes(id)).length > 0 && (
                      <div style={{ color: "#4A4235", fontSize: 11, fontStyle: "italic", marginTop: 6 }}>
                        ⏳ Waiting on {inv.invitedIds.filter(id => !inv.acceptedIds.includes(id) && !inv.declinedIds.includes(id)).map(id => findMember(data, id)?.name).join(", ")}
                      </div>
                    )}
                  </div>
                  <button
                    className="gr-open-chat-btn"
                    onClick={() => setSelectedGroupRead(inv.id)}
                  >
                    <MessageSquare size={14} />
                    <span>Open Discussion</span>
                    {(inv.messages || []).length > 0 && (
                      <span className="gr-msg-count">{(inv.messages || []).length}</span>
                    )}
                    <ChevronRight size={14} style={{ marginLeft: "auto", color: "#6B6152" }} />
                  </button>
                </Panel>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ position: "relative", marginBottom: 12 }}>
        <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#6B6152" }} />
        <input
          className="text-input"
          type="text"
          placeholder="Search books by title or author..."
          value={bookSearch}
          onChange={e => setBookSearch(e.target.value)}
          style={{ paddingLeft: 34, margin: 0 }}
        />
        {bookSearch && (
          <button onClick={() => setBookSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#6B6152", cursor: "pointer" }}>
            <X size={14} />
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <button
          className={`filter-btn ${showFireteam ? "active" : ""}`}
          onClick={() => setShowFireteam(!showFireteam)}
        >
          <Users size={14} /> Fireteam View
        </button>
        <div className="filter-divider" />
        {["All", ...CATEGORIES].map(c => (
          <button key={c} className={`filter-btn ${filter === c ? "active" : ""}`} onClick={() => setFilter(c)}>{c}</button>
        ))}
      </div>

      {showFireteam ? (
        <div className="fireteam-reading">
          <div className="section-title" style={{ marginBottom: 16 }}>FIRETEAM READING PROGRESS</div>
          {data.books.filter(b => {
            // Only show books where at least one member is actively reading (started but not finished)
            return getMembers(data).some(m => {
              const pg = data.readingProgress?.[m.id]?.[b.id] || 0;
              return pg > 0 && pg < b.pages;
            });
          }).map(book => (
            <Panel key={book.id} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <span style={{ fontSize: 28 }}><BookCover book={book} size={28} /></span>
                <div>
                  <div style={{ fontWeight: 700, color: "#E8E0D0", fontSize: 15 }}>{book.title}</div>
                  <div style={{ color: "#6B6152", fontSize: 12 }}>{book.author} · {book.pages} pages</div>
                </div>
              </div>
              <div className="fireteam-members-grid">
                {getMembers(data).filter(m => (data.readingProgress?.[m.id]?.[book.id] || 0) > 0).map(m => {
                  const pg = data.readingProgress?.[m.id]?.[book.id] || 0;
                  const pct = Math.round((pg / book.pages) * 100);
                  return (
                    <div key={m.id} className="fireteam-member-progress">
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ color: "#C8BFA8", fontSize: 12 }}>{m.name}</span>
                        <span style={{ color: pg >= book.pages ? "#27AE60" : "#D4AF37", fontSize: 12, fontWeight: 600 }}>
                          {pg >= book.pages ? "✔ COMPLETE" : `${pct}%`}
                        </span>
                      </div>
                      <ProgressBar value={pg} max={book.pages} color={pg >= book.pages ? "#27AE60" : "#D4AF37"} height={4} />
                    </div>
                  );
                })}
              </div>
            </Panel>
          ))}
        </div>
      ) : (
        <div className="book-grid">
          {[...filtered].sort((a, b) => {
            const progA = data.readingProgress?.[currentUser.id]?.[a.id] || 0;
            const progB = data.readingProgress?.[currentUser.id]?.[b.id] || 0;
            const inProgressA = progA > 0 && progA < a.pages;
            const inProgressB = progB > 0 && progB < b.pages;
            if (inProgressA && !inProgressB) return -1;
            if (!inProgressA && inProgressB) return 1;
            return 0;
          }).map(book => {
            const progress = getProgress(book.id);
            const pct = Math.round((progress / book.pages) * 100);
            const done = progress >= book.pages;
            const hasGroupRead = (data.readInvites || []).some(inv =>
              inv.bookId === book.id && inv.status === "active" &&
              (inv.fromId === currentUser.id || inv.acceptedIds.includes(currentUser.id))
            );
            return (
              <Panel
                key={book.id}
                className={`book-card ${done ? "book-complete" : ""}`}
                onClick={() => { setSelectedBook(book); setUpdatePage(String(progress)); }}
                glow={done ? "#27AE60" : hasGroupRead ? "#2B9EB3" : undefined}
              >
                {hasGroupRead && <div className="group-read-badge">GROUP READ</div>}
                <div className="book-cover-emoji"><BookCover book={book} size={36} /></div>
                <div className="book-info">
                  <div className="book-title">{book.title}</div>
                  <div className="book-author">{book.author}</div>
                  <div className="book-category-tag">{book.category}</div>
                  {progress > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ color: "#6B6152", fontSize: 11 }}>{progress}/{book.pages} pages</span>
                        <span style={{ color: done ? "#27AE60" : "#D4AF37", fontSize: 11, fontWeight: 600 }}>
                          {done ? "COMPLETE" : `${pct}%`}
                        </span>
                      </div>
                      <ProgressBar value={progress} max={book.pages} color={done ? "#27AE60" : "#D4AF37"} height={4} />
                    </div>
                  )}
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      {/* Update Progress Modal */}
      <Modal open={!!selectedBook && !showInvite} onClose={() => { setSelectedBook(null); setEditingBook(null); }} title={editingBook ? "Edit Book" : "Update Reading Progress"}>
        {selectedBook && editingBook ? (
          <div style={{ padding: 16 }}>
            <label className="input-label">Title</label>
            <input className="text-input" value={editingBook.title} onChange={e => setEditingBook({ ...editingBook, title: e.target.value })} />
            <label className="input-label">Author</label>
            <input className="text-input" value={editingBook.author} onChange={e => setEditingBook({ ...editingBook, author: e.target.value })} />
            <label className="input-label">Category</label>
            <select className="text-input" value={editingBook.category} onChange={e => setEditingBook({ ...editingBook, category: e.target.value })}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <label className="input-label">Pages</label>
            <input className="text-input" type="number" value={editingBook.pages} onChange={e => setEditingBook({ ...editingBook, pages: e.target.value })} />
            <label className="input-label">Cover URL</label>
            <input className="text-input" value={editingBook.coverUrl || ""} onChange={e => setEditingBook({ ...editingBook, coverUrl: e.target.value })} placeholder="https://..." />
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button className="gold-btn" onClick={saveBookEdit} style={{ flex: 1, justifyContent: "center" }}>Save Changes</button>
              <button className="gold-btn" onClick={() => setEditingBook(null)} style={{ flex: 1, justifyContent: "center", background: "rgba(255,255,255,0.04)" }}>Cancel</button>
            </div>
          </div>
        ) : selectedBook && (
          <div style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <span style={{ fontSize: 36 }}><BookCover book={selectedBook} size={36} /></span>
              <div>
                <div style={{ fontWeight: 700, color: "#E8E0D0", fontSize: 16 }}>{selectedBook.title}</div>
                <div style={{ color: "#6B6152", fontSize: 13 }}>{selectedBook.author} · {selectedBook.pages} pages</div>
              </div>
            </div>
            <label className="input-label">Current Page</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="number"
                className="text-input"
                value={updatePage}
                onChange={e => setUpdatePage(e.target.value)}
                max={selectedBook.pages}
                min={0}
                placeholder="0"
              />
              <button className="gold-btn" onClick={() => updateProgress(selectedBook.id)}>Update</button>
              <button className="gold-btn" onClick={() => { setUpdatePage(String(selectedBook.pages)); }}>Mark Complete</button>
            </div>
            <div style={{ marginTop: 12 }}>
              <ProgressBar value={parseInt(updatePage) || 0} max={selectedBook.pages} />
            </div>
            <DiamondDivider />
            <button
              className="invite-read-btn"
              onClick={() => { setShowInvite(true); setInviteMembers([]); setInviteNote(""); }}
            >
              <Users size={16} />
              <div>
                <div style={{ fontWeight: 700, color: "#E8E0D0", fontSize: 14 }}>Invite to Read Together</div>
                <div style={{ color: "#6B6152", fontSize: 12 }}>Start a group read with your fireteam</div>
              </div>
              <ChevronRight size={16} style={{ marginLeft: "auto", color: "#6B6152" }} />
            </button>
            {isAdmin && (
              <>
                <DiamondDivider />
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="gold-btn" onClick={() => startEditBook(selectedBook)} style={{ flex: 1, justifyContent: "center" }}>
                    <Edit3 size={14} /> Edit Book
                  </button>
                  <button className="gold-btn" onClick={() => setConfirmDeleteBook(selectedBook.id)} style={{ flex: 1, justifyContent: "center", color: "#C0392B", borderColor: "rgba(192,57,43,0.3)" }}>
                    <X size={14} /> Delete Book
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmDeleteBook}
        onClose={() => setConfirmDeleteBook(null)}
        onConfirm={() => deleteBook(confirmDeleteBook)}
        title="Delete Book?"
        message={`This will permanently remove "${data.books.find(b => b.id === confirmDeleteBook)?.title}" and all associated reading progress.`}
        confirmLabel="Delete"
      />

      {/* Slot Machine Animation Overlay */}
      {slotAnim && (
        <SlotOverlay
          oldValue={slotAnim.oldValue}
          newValue={slotAnim.newValue}
          pagesAdded={slotAnim.pagesAdded}
          bookTitle={slotAnim.bookTitle}
          isCompleted={slotAnim.isCompleted}
          pagesRemaining={slotAnim.pagesRemaining}
          onDone={() => setSlotAnim(null)}
        />
      )}

      {/* Invite to Read Modal */}
      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Invite to Read">
        {selectedBook && (
          <div style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, padding: 12, background: "var(--bg-deep)", borderRadius: 6 }}>
              <span style={{ fontSize: 28 }}><BookCover book={selectedBook} size={28} /></span>
              <div>
                <div style={{ fontWeight: 700, color: "#E8E0D0", fontSize: 15 }}>{selectedBook.title}</div>
                <div style={{ color: "#6B6152", fontSize: 12 }}>{selectedBook.author}</div>
              </div>
            </div>

            <label className="input-label">Select Fireteam Members</label>
            <div className="invite-members-list">
              {getMembers(data).filter(m => m.id !== currentUser.id).map(m => {
                const selected = inviteMembers.includes(m.id);
                return (
                  <div
                    key={m.id}
                    className={`invite-member-row ${selected ? "selected" : ""}`}
                    onClick={() => toggleInviteMember(m.id)}
                  >
                    <div className="avatar" style={{ width: 32, height: 32, fontSize: 11 }}>{m.avatar}</div>
                    <span style={{ color: "#E8E0D0", fontSize: 14, flex: 1 }}>{m.name}</span>
                    <div className={`invite-check ${selected ? "checked" : ""}`}>
                      {selected && <Check size={12} />}
                    </div>
                  </div>
                );
              })}
            </div>

            <label className="input-label">Add a Note (optional)</label>
            <textarea
              className="text-input"
              rows={3}
              value={inviteNote}
              onChange={e => setInviteNote(e.target.value)}
              placeholder="e.g. Let's read a chapter a week and discuss..."
            />

            <button
              className="gold-btn"
              style={{ marginTop: 16, width: "100%", justifyContent: "center", opacity: inviteMembers.length === 0 ? 0.4 : 1 }}
              onClick={sendInvite}
              disabled={inviteMembers.length === 0}
            >
              <Send size={14} />
              {inviteMembers.length === 0
                ? "Select at least one member"
                : `Send Invite to ${inviteMembers.length} ${inviteMembers.length === 1 ? "Member" : "Members"}`}
            </button>
          </div>
        )}
      </Modal>

      {/* Add Book Modal */}
      <Modal open={showAddBook} onClose={() => setShowAddBook(false)} title="Add New Book">
        <div style={{ padding: 16 }}>
          <label className="input-label">Title</label>
          <input className="text-input" value={newBook.title} onChange={e => setNewBook(n => ({ ...n, title: e.target.value }))} placeholder="e.g. Knowing God" />
          <label className="input-label">Author</label>
          <input className="text-input" value={newBook.author} onChange={e => setNewBook(n => ({ ...n, author: e.target.value }))} placeholder="e.g. J.I. Packer" />

          {/* Cover Search */}
          <label className="input-label">Book Cover</label>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
            <div className="cover-preview">
              {newBook.coverUrl ? (
                <img src={newBook.coverUrl} alt="Cover" style={{ width: 60, height: 90, objectFit: "cover", borderRadius: 4 }} />
              ) : (
                <div className="book-cover-placeholder" style={{ width: 60, height: 90, fontSize: 14 }}>
                  {(newBook.title || "").split(" ").filter(w => w.length > 2).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?"}
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <button
                className="filter-btn"
                style={{ width: "100%", justifyContent: "center", marginBottom: 6 }}
                onClick={searchCover}
                disabled={coverLoading || !newBook.title}
              >
                {coverLoading ? (
                  <span style={{ animation: "pulse 1s infinite" }}>Searching...</span>
                ) : (
                  <><Search size={12} /> Find Cover</>
                )}
              </button>
              <div style={{ color: "#4A4235", fontSize: 11 }}>
                {newBook.coverUrl ? "✔ Cover found!" : "Enter title & author, then search"}
              </div>
              {newBook.coverUrl && (
                <button
                  style={{ background: "none", border: "none", color: "#6B6152", fontSize: 11, cursor: "pointer", marginTop: 2, textDecoration: "underline" }}
                  onClick={() => setNewBook(n => ({ ...n, coverUrl: "" }))}
                >
                  Remove cover
                </button>
              )}
            </div>
          </div>

          <label className="input-label">Category</label>
          <select className="text-input" value={newBook.category} onChange={e => setNewBook(n => ({ ...n, category: e.target.value }))}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <label className="input-label">Total Pages</label>
          <input className="text-input" type="number" value={newBook.pages} onChange={e => setNewBook(n => ({ ...n, pages: e.target.value }))} />
          <button className="gold-btn" style={{ marginTop: 16, width: "100%" }} onClick={addBook}>Add to Library</button>
        </div>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════
// PAGE: REVIEWS
// ════════════════════════════════════════
function ReviewsPage() {
  const { data, setData, currentUser, isAdmin, showToast } = useContext(AppContext);
  const [showWrite, setShowWrite] = useState(false);
  const [filterCat, setFilterCat] = useState("All");
  const [filterRating, setFilterRating] = useState(0);
  const [sortBy, setSortBy] = useState("recent"); // "recent" | "most_liked"
  const [bookSearch, setBookSearch] = useState("");
  const [newReview, setNewReview] = useState({ bookId: "", rating: 5, text: "" });
  const [confirmDelete, setConfirmDelete] = useState(null);

  function getLikes(review) {
    return review.likes || [];
  }

  function toggleLike(reviewId) {
    const review = data.reviews.find(r => r.id === reviewId);
    if (!review) return;
    const likes = review.likes || [];
    const already = likes.includes(currentUser.id);
    const newLikes = already ? likes.filter(id => id !== currentUser.id) : [...likes, currentUser.id];
    setData(d => ({
      ...d,
      reviews: d.reviews.map(r => r.id === reviewId ? { ...r, likes: newLikes } : r),
    }));
    // Sync to Supabase directly
    supabase.from("reviews").update({ likes: newLikes }).eq("id", reviewId)
      .then(({ error }) => { if (error) console.error("Like sync error:", error); });
  }

  const reviews = data.reviews
    .filter(r => {
      const book = data.books.find(b => b.id === r.bookId);
      if (filterCat !== "All" && book?.category !== filterCat) return false;
      if (filterRating > 0 && r.rating !== filterRating) return false;
      if (bookSearch.trim()) {
        const q = bookSearch.toLowerCase().trim();
        const matchTitle = book?.title?.toLowerCase().includes(q);
        const matchAuthor = book?.author?.toLowerCase().includes(q);
        if (!matchTitle && !matchAuthor) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "most_liked") {
        const aLikes = (a.likes || []).length;
        const bLikes = (b.likes || []).length;
        if (bLikes !== aLikes) return bLikes - aLikes;
      }
      return b.date.localeCompare(a.date);
    });

  function submitReview() {
    if (!newReview.bookId || !newReview.text) return;
    const review = { ...newReview, id: `r${Date.now()}`, memberId: currentUser.id, date: new Date().toISOString().split("T")[0], likes: [] };
    setData(d => ({ ...d, reviews: [...d.reviews, review] }));
    setNewReview({ bookId: "", rating: 5, text: "" });
    setShowWrite(false);
    showToast("Review posted");
  }

  function deleteReview(reviewId) {
    setData(d => ({ ...d, reviews: d.reviews.filter(r => r.id !== reviewId) }));
    showToast("Review deleted", "info");
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <Star size={24} style={{ color: "#D4AF37" }} />
        <h2>REVIEWS</h2>
        <button className="gold-btn" onClick={() => setShowWrite(true)}><Edit3 size={14} /> Write Review</button>
      </div>

      {/* Search bar */}
      <div style={{ position: "relative", marginBottom: 12 }}>
        <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#6B6152" }} />
        <input
          className="text-input"
          style={{ paddingLeft: 34 }}
          placeholder="Search by book title or author..."
          value={bookSearch}
          onChange={e => setBookSearch(e.target.value)}
        />
        {bookSearch && (
          <button
            onClick={() => setBookSearch("")}
            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#6B6152", cursor: "pointer", padding: 2 }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Sort toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button className={`filter-btn ${sortBy === "recent" ? "active" : ""}`} onClick={() => setSortBy("recent")}>
          <Clock size={12} /> Recent
        </button>
        <button className={`filter-btn ${sortBy === "most_liked" ? "active" : ""}`} onClick={() => setSortBy("most_liked")}>
          <Heart size={12} /> Most Liked
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["All", ...CATEGORIES].map(c => (
          <button key={c} className={`filter-btn ${filterCat === c ? "active" : ""}`} onClick={() => setFilterCat(c)}>{c}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <button className={`filter-btn ${filterRating === 0 ? "active" : ""}`} onClick={() => setFilterRating(0)}>All Ratings</button>
        {[5, 4, 3, 2, 1].map(r => (
          <button key={r} className={`filter-btn ${filterRating === r ? "active" : ""}`} onClick={() => setFilterRating(r)}>
            {r}★
          </button>
        ))}
      </div>

      <div className="reviews-list">
        {reviews.length === 0 ? (
          <Panel>
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <Star size={36} style={{ color: "#2A2520", marginBottom: 12 }} />
              <div style={{ color: "#6B6152", fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
                {bookSearch.trim() ? "No reviews found" : "No reviews yet"}
              </div>
              <div style={{ color: "#4A4235", fontSize: 13, maxWidth: 320, margin: "0 auto" }}>
                {bookSearch.trim()
                  ? `No reviews match "${bookSearch}". Try a different search.`
                  : "Be the first to share your thoughts on a book. Your review helps the fireteam decide what to read next."}
              </div>
              {!bookSearch.trim() && (
                <button className="gold-btn" style={{ marginTop: 16 }} onClick={() => setShowWrite(true)}>
                  <Edit3 size={14} /> Write the First Review
                </button>
              )}
            </div>
          </Panel>
        ) : reviews.map(review => {
          const book = data.books.find(b => b.id === review.bookId);
          const member = findMember(data, review.memberId);
          const likes = getLikes(review);
          const liked = likes.includes(currentUser.id);
          return (
            <Panel key={review.id} className="review-card">
              <div className="review-header">
                <Avatar member={member} size={32} />
                <span className="review-date">{review.date}</span>
              </div>
              <div className="review-book-info">
                <span style={{ fontSize: 20, marginRight: 8 }}>{book ? <BookCover book={book} size={20} /> : "?"}</span>
                <div>
                  <div style={{ fontWeight: 600, color: "#E8E0D0" }}>{book?.title}</div>
                  <div style={{ color: "#6B6152", fontSize: 12 }}>{book?.author}</div>
                </div>
                <div style={{ marginLeft: "auto" }}><StarRating rating={review.rating} size={14} /></div>
              </div>
              <p className="review-text"><ScriptureText text={review.text} /></p>
              <div className="review-footer">
                <button
                  className={`review-like-btn ${liked ? "liked" : ""}`}
                  onClick={() => toggleLike(review.id)}
                >
                  <Heart size={14} fill={liked ? "currentColor" : "none"} />
                  <span>{likes.length > 0 ? likes.length : ""}</span>
                </button>
                {(isAdmin || review.memberId === currentUser.id) && (
                  <button className="admin-delete-btn" onClick={() => setConfirmDelete(review.id)}>
                    <X size={12} /> Delete
                  </button>
                )}
              </div>
            </Panel>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => deleteReview(confirmDelete)}
        title="Delete Review?"
        message="This review will be permanently removed. This cannot be undone."
        confirmLabel="Delete Review"
      />

      <Modal open={showWrite} onClose={() => setShowWrite(false)} title="Write a Review">
        <div style={{ padding: 16 }}>
          <label className="input-label">Book</label>
          <select className="text-input" value={newReview.bookId} onChange={e => setNewReview(r => ({ ...r, bookId: e.target.value }))}>
            <option value="">Select a book...</option>
            {data.books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
          </select>
          <label className="input-label">Rating</label>
          <StarRating rating={newReview.rating} onChange={r => setNewReview(rv => ({ ...rv, rating: r }))} size={24} />
          <label className="input-label" style={{ marginTop: 12 }}>Review</label>
          <textarea
            className="text-input"
            rows={6}
            value={newReview.text}
            onChange={e => setNewReview(r => ({ ...r, text: e.target.value }))}
            placeholder="Share your thoughts on this book..."
          />
          <button className="gold-btn" style={{ marginTop: 16, width: "100%" }} onClick={submitReview}>Post Review</button>
        </div>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════
// PAGE: FORUM
// ════════════════════════════════════════
function ForumPage() {
  const { data, setData, currentUser, isAdmin, showToast } = useContext(AppContext);
  const [selectedThread, setSelectedThread] = useState(null);
  const [filterCat, setFilterCat] = useState("All");
  const [showNewThread, setShowNewThread] = useState(false);
  const [newThread, setNewThread] = useState({ title: "", category: FORUM_CATEGORIES[0], text: "", bookId: "" });
  const [replyText, setReplyText] = useState("");
  const [confirmDeleteThread, setConfirmDeleteThread] = useState(null);
  const [confirmDeletePost, setConfirmDeletePost] = useState(null);

  // ── Realtime: subscribe to new posts ──
  useEffect(() => {
    const channel = supabase
      .channel("posts-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, (payload) => {
        const newPost = payload.new;
        // Only add if it's not from the current user (we already added it optimistically)
        if (newPost.author_id !== currentUser.id) {
          setData(d => ({
            ...d,
            threads: d.threads.map(t =>
              t.id === newPost.thread_id
                ? {
                    ...t,
                    posts: t.posts.some(p => p.id === newPost.id) ? t.posts : [...t.posts, {
                      id: newPost.id,
                      authorId: newPost.author_id,
                      text: newPost.body,
                      date: newPost.created_at?.split("T")[0] || "",
                    }],
                  }
                : t
            ),
          }));
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "threads" }, (payload) => {
        const nt = payload.new;
        if (nt.author_id !== currentUser.id) {
          setData(d => ({
            ...d,
            threads: d.threads.some(t => t.id === nt.id) ? d.threads : [
              { id: nt.id, title: nt.title, category: nt.category, authorId: nt.author_id, bookId: nt.book_id, date: nt.created_at?.split("T")[0] || "", posts: [] },
              ...d.threads,
            ],
          }));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser.id]);

  const pinnedIds = data.pinnedThreads || [];
  const threads = (filterCat === "All" ? data.threads : data.threads.filter(t => t.category === filterCat))
    .sort((a, b) => {
      const aPinned = pinnedIds.includes(a.id);
      const bPinned = pinnedIds.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return b.date.localeCompare(a.date);
    });
  const thread = data.threads.find(t => t.id === selectedThread);

  function createThread() {
    if (!newThread.title || !newThread.text) return;
    const t = {
      id: `th${Date.now()}`,
      title: newThread.title,
      category: newThread.category,
      authorId: currentUser.id,
      date: new Date().toISOString().split("T")[0],
      bookId: newThread.bookId || null,
      posts: [{ id: `p${Date.now()}`, authorId: currentUser.id, text: newThread.text, date: new Date().toISOString().split("T")[0] }],
    };
    setData(d => ({ ...d, threads: [...d.threads, t] }));
    setNewThread({ title: "", category: FORUM_CATEGORIES[0], text: "", bookId: "" });
    setShowNewThread(false);
    setSelectedThread(t.id);
    showToast("Thread created");
  }

  function postReply() {
    if (!replyText.trim()) return;
    const post = { id: `p${Date.now()}`, authorId: currentUser.id, text: replyText, date: new Date().toISOString().split("T")[0] };
    setData(d => ({
      ...d,
      threads: d.threads.map(t => t.id === selectedThread ? { ...t, posts: [...t.posts, post] } : t),
    }));
    setReplyText("");
    showToast("Reply posted");
  }

  function deleteThread(threadId) {
    setData(d => ({
      ...d,
      threads: d.threads.filter(t => t.id !== threadId),
      pinnedThreads: (d.pinnedThreads || []).filter(id => id !== threadId),
    }));
    setSelectedThread(null);
    showToast("Thread deleted", "info");
  }

  function deletePost(threadId, postId) {
    setData(d => ({
      ...d,
      threads: d.threads.map(t => t.id === threadId ? { ...t, posts: t.posts.filter(p => p.id !== postId) } : t),
    }));
    showToast("Reply deleted", "info");
  }

  function togglePin(threadId) {
    setData(d => {
      const pins = d.pinnedThreads || [];
      const isPinned = pins.includes(threadId);
      showToast(isPinned ? "Thread unpinned" : "Thread pinned", "info");
      return { ...d, pinnedThreads: isPinned ? pins.filter(id => id !== threadId) : [...pins, threadId] };
    });
  }

  if (selectedThread && thread) {
    const linkedBook = thread.bookId ? data.books.find(b => b.id === thread.bookId) : null;
    return (
      <div className="page-content">
        <button className="back-btn" onClick={() => setSelectedThread(null)}>
          <ArrowLeft size={16} /> Back to Forum
        </button>
        <Panel style={{ marginTop: 12 }}>
          <div className="thread-header-detail">
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span className="forum-cat-badge">{thread.category}</span>
              {pinnedIds.includes(thread.id) && <span className="forum-cat-badge" style={{ background: "rgba(212,175,55,0.1)", color: "#D4AF37" }}>PINNED</span>}
            </div>
            <h3 style={{ margin: "8px 0 4px", color: "#E8E0D0", fontSize: 20 }}>{thread.title}</h3>
            {linkedBook && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#8A7E6B", fontSize: 13, margin: "4px 0" }}>
                <Bookmark size={12} /> Linked: {linkedBook.title}
              </div>
            )}
            <div style={{ color: "#6B6152", fontSize: 12 }}>
              Started by {findMember(data, thread.authorId)?.name} · {thread.date}
            </div>
            {isAdmin && (
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button className="admin-delete-btn" style={{ color: "#D4AF37", borderColor: "#D4AF3733" }} onClick={() => togglePin(thread.id)}>
                  {pinnedIds.includes(thread.id) ? "Unpin" : "Pin Thread"}
                </button>
                <button className="admin-delete-btn" onClick={() => setConfirmDeleteThread(thread.id)}>
                  <X size={12} /> Delete Thread
                </button>
              </div>
            )}
          </div>
        </Panel>

        <div className="thread-posts">
          {thread.posts.map((post, i) => {
            const author = findMember(data, post.authorId);
            return (
              <Panel key={post.id} className="post-card" style={{ marginTop: 12 }}>
                <div className="post-header">
                  <Avatar member={author} size={32} />
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="post-date">{post.date}</span>
                    {(isAdmin || post.authorId === currentUser.id) && i > 0 && (
                      <button className="admin-delete-btn" onClick={() => setConfirmDeletePost({ threadId: thread.id, postId: post.id })}>
                        <X size={10} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="post-body">
                  <ScriptureText text={post.text} />
                </div>
              </Panel>
            );
          })}
        </div>

        <Panel style={{ marginTop: 16 }}>
          <div style={{ padding: 4 }}>
            <textarea
              className="text-input"
              rows={3}
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Write your reply..."
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button className="gold-btn" onClick={postReply}><Send size={14} /> Reply</button>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <MessageSquare size={24} style={{ color: "#D4AF37" }} />
        <h2>FORUM</h2>
        <button className="gold-btn" onClick={() => setShowNewThread(true)}><Plus size={14} /> New Thread</button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {["All", ...FORUM_CATEGORIES].map(c => (
          <button key={c} className={`filter-btn ${filterCat === c ? "active" : ""}`} onClick={() => setFilterCat(c)}>{c}</button>
        ))}
      </div>

      <div className="thread-list">
        {threads.length === 0 ? (
          <Panel>
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <MessageSquare size={36} style={{ color: "#2A2520", marginBottom: 12 }} />
              <div style={{ color: "#6B6152", fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No discussions yet</div>
              <div style={{ color: "#4A4235", fontSize: 13, maxWidth: 320, margin: "0 auto" }}>
                Start a conversation about theology, Scripture, or a book you're reading. Iron sharpens iron.
              </div>
              <button className="gold-btn" style={{ marginTop: 16 }} onClick={() => setShowNewThread(true)}>
                <Plus size={14} /> Start the First Discussion
              </button>
            </div>
          </Panel>
        ) : threads.sort((a, b) => b.date.localeCompare(a.date)).map(thread => {
          const author = findMember(data, thread.authorId);
          const lastPost = thread.posts[thread.posts.length - 1];
          const lastAuthor = findMember(data, lastPost?.authorId);
          return (
            <Panel key={thread.id} className="thread-card" onClick={() => setSelectedThread(thread.id)}>
              <div className="thread-card-top">
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {pinnedIds.includes(thread.id) && <span style={{ color: "#D4AF37", fontSize: 11, fontWeight: 700, fontFamily: "'Rajdhani', sans-serif", letterSpacing: 1 }}>PINNED</span>}
                  <span className="forum-cat-badge">{thread.category}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "#6B6152", fontSize: 12 }}>{thread.posts.length} {thread.posts.length === 1 ? "post" : "posts"}</span>
                  {isAdmin && (
                    <button className="admin-delete-btn" onClick={(e) => { e.stopPropagation(); setConfirmDeleteThread(thread.id); }} style={{ padding: "2px 6px" }}>
                      <X size={10} />
                    </button>
                  )}
                </div>
              </div>
              <h4 className="thread-title">{thread.title}</h4>
              <div className="thread-meta">
                <span style={{ color: "#8A7E6B", fontSize: 12 }}>
                  Started by <span style={{ color: "#D4AF37" }}>{author?.name}</span> · {thread.date}
                </span>
                <span style={{ color: "#6B6152", fontSize: 11 }}>
                  Last reply by {lastAuthor?.name}
                </span>
              </div>
            </Panel>
          );
        })}
      </div>

      <Modal open={showNewThread} onClose={() => setShowNewThread(false)} title="Start New Discussion">
        <div style={{ padding: 16 }}>
          <label className="input-label">Title</label>
          <input className="text-input" value={newThread.title} onChange={e => setNewThread(t => ({ ...t, title: e.target.value }))} placeholder="Discussion topic..." />
          <label className="input-label">Category</label>
          <select className="text-input" value={newThread.category} onChange={e => setNewThread(t => ({ ...t, category: e.target.value }))}>
            {FORUM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <label className="input-label">Link to Book (optional)</label>
          <select className="text-input" value={newThread.bookId} onChange={e => setNewThread(t => ({ ...t, bookId: e.target.value }))}>
            <option value="">None</option>
            {data.books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
          </select>
          <label className="input-label">Opening Post</label>
          <textarea className="text-input" rows={5} value={newThread.text} onChange={e => setNewThread(t => ({ ...t, text: e.target.value }))} placeholder="Share your thoughts..." />
          <button className="gold-btn" style={{ marginTop: 16, width: "100%" }} onClick={createThread}>Create Thread</button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDeleteThread}
        onClose={() => setConfirmDeleteThread(null)}
        onConfirm={() => deleteThread(confirmDeleteThread)}
        title="Delete Thread?"
        message="This thread and all its replies will be permanently deleted. This cannot be undone."
        confirmLabel="Delete Thread"
      />

      <ConfirmDialog
        open={!!confirmDeletePost}
        onClose={() => setConfirmDeletePost(null)}
        onConfirm={() => { if (confirmDeletePost) deletePost(confirmDeletePost.threadId, confirmDeletePost.postId); }}
        title="Delete Reply?"
        message="This reply will be permanently removed."
        confirmLabel="Delete Reply"
      />
    </div>
  );
}

// ════════════════════════════════════════
// PAGE: MEMBERS
// ════════════════════════════════════════
function MembersPage() {
  const { data, setData, setPage, setProfileTarget, currentUser, showToast } = useContext(AppContext);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(null);

  const myFriends = data.friends?.[currentUser.id] || [];
  const friendRequests = data.friendRequests || [];
  const incomingRequests = friendRequests.filter(r => r.toId === currentUser.id && r.status === "pending");
  const outgoingRequests = friendRequests.filter(r => r.fromId === currentUser.id && r.status === "pending");

  function getMemberStats(memberId) {
    const prg = data.readingProgress?.[memberId] || {};
    let booksCompleted = 0, pagesRead = 0;
    Object.keys(prg).forEach(bId => {
      const book = data.books.find(b => b.id === bId);
      pagesRead += prg[bId];
      if (book && prg[bId] >= book.pages) booksCompleted++;
    });
    const reviewsWritten = data.reviews.filter(r => r.memberId === memberId).length;
    const threadsStarted = data.threads.filter(t => t.authorId === memberId).length;
    const replies = data.threads.reduce((acc, t) => acc + t.posts.filter(p => p.authorId === memberId).length, 0);
    const sealsEarned = (data.completedSeals?.[memberId] || []).length;
    return { booksCompleted, pagesRead, reviewsWritten, threadsStarted, replies, sealsEarned };
  }

  const friendMembers = getAllUsers(data).filter(m => myFriends.includes(m.id));
  const ranked = friendMembers.map(m => ({ ...m, stats: getMemberStats(m.id) })).sort((a, b) => b.stats.booksCompleted - a.stats.booksCompleted);

  // Search: exclude self, current friends, and users with pending outgoing requests
  const outgoingIds = outgoingRequests.map(r => r.toId);
  const searchResults = searchQuery.trim().length > 0
    ? getAllUsers(data).filter(u => {
        if (u.id === currentUser.id) return false;
        if (myFriends.includes(u.id)) return false;
        const q = searchQuery.toLowerCase().trim();
        const gamertag = `${u.name}#${u.tag}`.toLowerCase();
        return u.name.toLowerCase().includes(q) || u.tag.includes(q) || gamertag.includes(q);
      })
    : [];

  function sendFriendRequest(userId) {
    const userName = findMember(data, userId)?.name;
    setData(d => ({
      ...d,
      friendRequests: [...(d.friendRequests || []), {
        id: `fr${Date.now()}`,
        fromId: currentUser.id,
        toId: userId,
        date: new Date().toISOString().split("T")[0],
        status: "pending",
      }],
    }));
    showToast(`Friend request sent to ${userName}`);
  }

  function acceptFriendRequest(requestId) {
    const req = friendRequests.find(r => r.id === requestId);
    if (!req) return;
    const fromName = findMember(data, req.fromId)?.name;
    setData(d => {
      const friends = { ...(d.friends || {}) };
      const myList = [...(friends[currentUser.id] || [])];
      if (!myList.includes(req.fromId)) myList.push(req.fromId);
      friends[currentUser.id] = myList;
      const theirList = [...(friends[req.fromId] || [])];
      if (!theirList.includes(currentUser.id)) theirList.push(currentUser.id);
      friends[req.fromId] = theirList;
      return {
        ...d,
        friends,
        friendRequests: (d.friendRequests || []).map(r =>
          r.id === requestId ? { ...r, status: "accepted" } : r
        ),
        activities: [...d.activities, {
          id: `a${Date.now()}`, type: "friend_add", memberId: currentUser.id,
          text: `and ${findMember(data, req.fromId)?.name} are now fireteam members`,
          date: new Date().toISOString().split("T")[0], icon: "★",
        }],
      };
    });
    showToast(`You and ${fromName} are now fireteam members`);
  }

  function declineFriendRequest(requestId) {
    setData(d => ({
      ...d,
      friendRequests: (d.friendRequests || []).map(r =>
        r.id === requestId ? { ...r, status: "declined" } : r
      ),
    }));
    showToast("Friend request declined", "info");
  }

  function cancelFriendRequest(requestId) {
    setData(d => ({
      ...d,
      friendRequests: (d.friendRequests || []).filter(r => r.id !== requestId),
    }));
    showToast("Friend request cancelled", "info");
  }

  function removeFriend(userId) {
    const friendName = findMember(data, userId)?.name;
    setData(d => {
      const friends = { ...(d.friends || {}) };
      friends[currentUser.id] = (friends[currentUser.id] || []).filter(id => id !== userId);
      friends[userId] = (friends[userId] || []).filter(id => id !== currentUser.id);
      return { ...d, friends };
    });
    setShowRemoveConfirm(null);
    showToast(`${friendName} removed from fireteam`, "info");
  }

  function getSearchUserStatus(userId) {
    if (myFriends.includes(userId)) return "friend";
    const outgoing = outgoingRequests.find(r => r.toId === userId);
    if (outgoing) return { type: "outgoing", id: outgoing.id };
    const incoming = incomingRequests.find(r => r.fromId === userId);
    if (incoming) return { type: "incoming", id: incoming.id };
    return "none";
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <Users size={24} style={{ color: "#D4AF37" }} />
        <h2>FIRETEAM</h2>
        <button className="gold-btn" onClick={() => setShowAddFriend(true)}>
          <Plus size={14} /> Add Friend
        </button>
      </div>

      {/* Your gamertag */}
      <Panel style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}>
        <div className="avatar" style={{ width: 36, height: 36, fontSize: 12 }}>{currentUser.avatar}</div>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#6B6152", fontSize: 10, letterSpacing: 1.5, fontFamily: "'Rajdhani', sans-serif", fontWeight: 600 }}>YOUR GAMERTAG</div>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 18, color: "#E8E0D0", letterSpacing: 1 }}>
            {data.displayNames?.[currentUser.id] || currentUser.name}<span style={{ color: "#4A4235" }}>#</span><span style={{ color: "#D4AF37" }}>{currentUser.tag}</span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#6B6152", fontSize: 10, letterSpacing: 1.5, fontFamily: "'Rajdhani', sans-serif", fontWeight: 600 }}>FIRETEAM</div>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 18, color: "#D4AF37" }}>{myFriends.length}</div>
        </div>
      </Panel>

      {/* Incoming Friend Requests */}
      {incomingRequests.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Send size={16} style={{ color: "#2B9EB3" }} />
            <span className="section-title">FRIEND REQUESTS</span>
            <span className="invite-count-badge">{incomingRequests.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {incomingRequests.map(req => {
              const fromUser = findMember(data, req.fromId);
              if (!fromUser) return null;
              return (
                <Panel key={req.id} className="friend-search-result" glow="#2B9EB3">
                  <div className="avatar" style={{ width: 40, height: 40, fontSize: 13 }}>{fromUser.avatar}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: "#E8E0D0", fontSize: 14 }}>{data.displayNames?.[fromUser.id] || fromUser.name}</div>
                    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: "#6B6152", letterSpacing: 0.5 }}>
                      {fromUser.name}<span style={{ color: "#4A4235" }}>#</span><span style={{ color: "#D4AF37" }}>{fromUser.tag}</span>
                    </div>
                    <div style={{ color: "#2B9EB3", fontSize: 11, marginTop: 2 }}>Wants to join your fireteam · {req.date}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="gold-btn" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => acceptFriendRequest(req.id)}>
                      <Check size={12} /> Accept
                    </button>
                    <button className="decline-btn" style={{ padding: "6px 8px" }} onClick={() => declineFriendRequest(req.id)}>
                      <X size={12} />
                    </button>
                  </div>
                </Panel>
              );
            })}
          </div>
        </div>
      )}

      {/* Friends grid */}
      {ranked.length === 0 ? (
        <Panel>
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <Users size={36} style={{ color: "#2A2520", marginBottom: 12 }} />
            <div style={{ color: "#6B6152", fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Your fireteam is empty</div>
            <div style={{ color: "#4A4235", fontSize: 13, maxWidth: 320, margin: "0 auto" }}>
              Search for friends by their gamertag to build your fireteam. Share your tag so others can find you.
            </div>
            <div style={{
              margin: "16px auto 0", padding: "10px 20px", background: "rgba(212,175,55,0.06)",
              border: "1px dashed #D4AF3744", borderRadius: 6, display: "inline-block",
              fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: 1,
              color: "#E8E0D0",
            }}>
              {data.displayNames?.[currentUser.id] || currentUser.name}<span style={{ color: "#4A4235" }}>#</span><span style={{ color: "#D4AF37" }}>{currentUser.tag}</span>
            </div>
            <div style={{ color: "#4A4235", fontSize: 11, marginTop: 8 }}>Share this tag with friends</div>
            <button className="gold-btn" style={{ marginTop: 16 }} onClick={() => setShowAddFriend(true)}>
              <Search size={14} /> Find Friends
            </button>
          </div>
        </Panel>
      ) : (
        <div className="members-grid">
          {ranked.map((m, i) => {
            const seal = SEAL_DEFINITIONS.find(s => s.name === data.equippedTitles?.[m.id]);
            const mPrg = data.readingProgress?.[m.id] || {};
            const catMap = {};
            Object.keys(mPrg).forEach(bId => {
              const book = data.books.find(b => b.id === bId);
              if (book && mPrg[bId] >= book.pages) {
                catMap[book.category] = (catMap[book.category] || 0) + 1;
              }
            });
            const catData = Object.entries(catMap).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
            const subtitle = getReaderSubtitle(catData);
            return (
              <Panel
                key={m.id}
                className="member-card"
                glow={i === 0 ? "#D4AF37" : undefined}
                onClick={() => { setProfileTarget(m.id); setPage("profile"); }}
              >
                <div className="member-rank">#{i + 1}</div>
                <div className="member-avatar-lg" style={i === 0 ? { borderColor: "#D4AF37", boxShadow: "0 0 20px #D4AF3733" } : {}}>
                  {m.avatar}
                </div>
                <div style={{ fontWeight: 700, color: "#E8E0D0", fontSize: 15, marginTop: 8 }}>{data.displayNames?.[m.id] || m.name}</div>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, color: "#4A4235", letterSpacing: 0.5 }}>
                  #{m.tag}
                </div>
                {(data.prestigeLevel?.[m.id] || 0) > 0 && (
                  <div style={{ marginTop: 4 }}>
                    <PrestigeEmblem level={data.prestigeLevel[m.id]} size={32} showLabel />
                  </div>
                )}
                {data.equippedTitles?.[m.id] && (
                  <GlowTitle title={data.equippedTitles[m.id]} color={seal?.color} />
                )}
                {subtitle && (
                  <div style={{
                    marginTop: 4, fontFamily: "'Rajdhani', sans-serif", fontWeight: 600,
                    fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase",
                    background: "linear-gradient(90deg, #D4AF37, #E8D44D, #D4AF37)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}>
                    {subtitle}
                  </div>
                )}
                <DiamondDivider />
                <div className="member-stats-grid">
                  <div className="member-stat"><span className="stat-num">{m.stats.booksCompleted}</span><span className="stat-lbl">Books</span></div>
                  <div className="member-stat"><span className="stat-num">{m.stats.pagesRead.toLocaleString()}</span><span className="stat-lbl">Pages</span></div>
                  <div className="member-stat"><span className="stat-num">{m.stats.reviewsWritten}</span><span className="stat-lbl">Reviews</span></div>
                  <div className="member-stat"><span className="stat-num">{m.stats.sealsEarned}</span><span className="stat-lbl">Seals</span></div>
                </div>
                <button
                  className="remove-friend-btn"
                  onClick={(e) => { e.stopPropagation(); setShowRemoveConfirm(m.id); }}
                >
                  <X size={10} /> Remove
                </button>
              </Panel>
            );
          })}
        </div>
      )}

      {/* Add Friend Modal */}
      <Modal open={showAddFriend} onClose={() => { setShowAddFriend(false); setSearchQuery(""); }} title="Add Friend">
        <div style={{ padding: 16 }}>
          <div style={{ position: "relative", marginBottom: 16 }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#4A4235" }} />
            <input
              className="text-input"
              style={{ paddingLeft: 36 }}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name or gamertag (e.g. Silas#4490)"
              autoFocus
            />
          </div>

          {searchQuery.trim().length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <Hash size={28} style={{ color: "#2A2520", marginBottom: 8 }} />
              <div style={{ color: "#4A4235", fontSize: 13 }}>Enter a name or gamertag to search</div>
              <div style={{ color: "#33302A", fontSize: 12, marginTop: 4 }}>
                Gamertags look like <span style={{ color: "#6B6152", fontFamily: "'Rajdhani', sans-serif", fontWeight: 600 }}>Name#1234</span>
              </div>
            </div>
          ) : searchResults.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <Search size={28} style={{ color: "#2A2520", marginBottom: 8 }} />
              <div style={{ color: "#4A4235", fontSize: 13 }}>No users found</div>
              <div style={{ color: "#33302A", fontSize: 12, marginTop: 4 }}>Try a different name or check the tag number</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {searchResults.map(user => {
                const status = getSearchUserStatus(user.id);
                const displayN = data.displayNames?.[user.id] || user.name;
                return (
                  <div key={user.id} className="friend-search-result">
                    <div className="avatar" style={{ width: 36, height: 36, fontSize: 12 }}>{user.avatar}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: "#E8E0D0", fontSize: 14 }}>{displayN}</div>
                      <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: "#6B6152", letterSpacing: 0.5 }}>
                        {user.name}<span style={{ color: "#4A4235" }}>#</span><span style={{ color: "#D4AF37" }}>{user.tag}</span>
                      </div>
                    </div>
                    {status === "friend" ? (
                      <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, color: "#27AE60", fontWeight: 600, letterSpacing: 1 }}>
                        <Check size={12} /> FRIENDS
                      </span>
                    ) : status?.type === "outgoing" ? (
                      <button className="decline-btn" style={{ padding: "6px 12px", fontSize: 11, gap: 4, color: "#A09880", borderColor: "#6B615233" }} onClick={() => cancelFriendRequest(status.id)}>
                        <Clock size={11} /> Pending
                      </button>
                    ) : status?.type === "incoming" ? (
                      <button className="gold-btn" style={{ padding: "6px 14px", fontSize: 12 }} onClick={() => acceptFriendRequest(status.id)}>
                        <Check size={12} /> Accept
                      </button>
                    ) : (
                      <button className="gold-btn" style={{ padding: "6px 14px", fontSize: 12 }} onClick={() => sendFriendRequest(user.id)}>
                        <Send size={12} /> Request
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* Remove Friend Confirmation */}
      <Modal open={!!showRemoveConfirm} onClose={() => setShowRemoveConfirm(null)} title="Remove Friend">
        <div style={{ padding: 20, textAlign: "center" }}>
          {(() => {
            const friend = findMember(data, showRemoveConfirm);
            if (!friend) return null;
            return (
              <>
                <div className="avatar" style={{ width: 48, height: 48, fontSize: 16, margin: "0 auto 12px" }}>{friend.avatar}</div>
                <div style={{ fontWeight: 700, color: "#E8E0D0", fontSize: 16, marginBottom: 4 }}>{friend.name}</div>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 13, color: "#6B6152", marginBottom: 16 }}>
                  {friend.name}<span style={{ color: "#4A4235" }}>#</span><span style={{ color: "#D4AF37" }}>{friend.tag}</span>
                </div>
                <p style={{ color: "#A09880", fontSize: 13, marginBottom: 20 }}>
                  Remove from your fireteam? You can always add them back later.
                </p>
                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                  <button className="decline-btn" style={{ padding: "10px 20px", gap: 6, color: "#C0392B", borderColor: "#C0392B44" }} onClick={() => removeFriend(showRemoveConfirm)}>
                    <X size={14} /> Remove
                  </button>
                  <button className="gold-btn" onClick={() => setShowRemoveConfirm(null)} style={{ opacity: 0.7 }}>
                    Cancel
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════
// BIBLE DATA
// ════════════════════════════════════════
const BIBLE_BOOKS = {
  OT: [
    { cat: "Pentateuch", color: "#D4AF37", books: [
      { name: "Genesis", ch: 50 }, { name: "Exodus", ch: 40 }, { name: "Leviticus", ch: 27 },
      { name: "Numbers", ch: 36 }, { name: "Deuteronomy", ch: 34 },
    ]},
    { cat: "Historical", color: "#C0392B", books: [
      { name: "Joshua", ch: 24 }, { name: "Judges", ch: 21 }, { name: "Ruth", ch: 4 },
      { name: "1 Samuel", ch: 31 }, { name: "2 Samuel", ch: 24 }, { name: "1 Kings", ch: 22 },
      { name: "2 Kings", ch: 25 }, { name: "1 Chronicles", ch: 29 }, { name: "2 Chronicles", ch: 36 },
      { name: "Ezra", ch: 10 }, { name: "Nehemiah", ch: 13 }, { name: "Esther", ch: 10 },
    ]},
    { cat: "Wisdom", color: "#F39C12", books: [
      { name: "Job", ch: 42 }, { name: "Psalms", ch: 150 }, { name: "Proverbs", ch: 31 },
      { name: "Ecclesiastes", ch: 12 }, { name: "Song of Solomon", ch: 8 },
    ]},
    { cat: "Major Prophets", color: "#8E44AD", books: [
      { name: "Isaiah", ch: 66 }, { name: "Jeremiah", ch: 52 }, { name: "Lamentations", ch: 5 },
      { name: "Ezekiel", ch: 48 }, { name: "Daniel", ch: 12 },
    ]},
    { cat: "Minor Prophets", color: "#2B9EB3", books: [
      { name: "Hosea", ch: 14 }, { name: "Joel", ch: 3 }, { name: "Amos", ch: 9 },
      { name: "Obadiah", ch: 1 }, { name: "Jonah", ch: 4 }, { name: "Micah", ch: 7 },
      { name: "Nahum", ch: 3 }, { name: "Habakkuk", ch: 3 }, { name: "Zephaniah", ch: 3 },
      { name: "Haggai", ch: 2 }, { name: "Zechariah", ch: 14 }, { name: "Malachi", ch: 4 },
    ]},
  ],
  NT: [
    { cat: "Gospels", color: "#D4AF37", books: [
      { name: "Matthew", ch: 28 }, { name: "Mark", ch: 16 }, { name: "Luke", ch: 24 }, { name: "John", ch: 21 },
    ]},
    { cat: "History", color: "#27AE60", books: [
      { name: "Acts", ch: 28 },
    ]},
    { cat: "Pauline Epistles", color: "#C0392B", books: [
      { name: "Romans", ch: 16 }, { name: "1 Corinthians", ch: 16 }, { name: "2 Corinthians", ch: 13 },
      { name: "Galatians", ch: 6 }, { name: "Ephesians", ch: 6 }, { name: "Philippians", ch: 4 },
      { name: "Colossians", ch: 4 }, { name: "1 Thessalonians", ch: 5 }, { name: "2 Thessalonians", ch: 3 },
      { name: "1 Timothy", ch: 6 }, { name: "2 Timothy", ch: 4 }, { name: "Titus", ch: 3 },
      { name: "Philemon", ch: 1 },
    ]},
    { cat: "General Epistles", color: "#8E44AD", books: [
      { name: "Hebrews", ch: 13 }, { name: "James", ch: 5 }, { name: "1 Peter", ch: 5 },
      { name: "2 Peter", ch: 3 }, { name: "1 John", ch: 5 }, { name: "2 John", ch: 1 },
      { name: "3 John", ch: 1 }, { name: "Jude", ch: 1 },
    ]},
    { cat: "Prophecy", color: "#2B9EB3", books: [
      { name: "Revelation", ch: 22 },
    ]},
  ],
};

// ════════════════════════════════════════
// PAGE: THE DIRECTOR (Bible Reading Tracker)
// ════════════════════════════════════════
function SolarSystem({ categories, bp, getBookProgress, selectedBook, setSelectedBook, hoveredBook, setHoveredBook, overallPct, label }) {
  const CX = 400, CY = 400;
  const ringRadii = categories.length <= 3 ? [120, 210, 300] :
    categories.length <= 4 ? [100, 175, 250, 325] :
    [90, 150, 210, 270, 340];

  return (
    <svg viewBox="0 0 800 800" className="solar-svg">
      {categories.map((cat, ci) => (
        <circle key={cat.cat} cx={CX} cy={CY} r={ringRadii[ci]}
          fill="none" stroke={`${cat.color}15`} strokeWidth={1} strokeDasharray="4 6" />
      ))}
      <circle cx={CX} cy={CY} r={44} fill="#0D0B0A" stroke="#D4AF3744" strokeWidth={2} />
      <circle cx={CX} cy={CY} r={38} fill="none" stroke="#D4AF3722" strokeWidth={1} />
      <text x={CX} y={CY - 10} textAnchor="middle" fill="#D4AF37" fontSize="22" fontWeight="700" fontFamily="Rajdhani, sans-serif">{overallPct}%</text>
      <text x={CX} y={CY + 8} textAnchor="middle" fill="#6B6152" fontSize="8" fontWeight="600" fontFamily="Rajdhani, sans-serif" letterSpacing="2">{label.split(" ")[0].toUpperCase()}</text>
      <text x={CX} y={CY + 18} textAnchor="middle" fill="#6B6152" fontSize="8" fontWeight="600" fontFamily="Rajdhani, sans-serif" letterSpacing="2">{label.split(" ").slice(1).join(" ").toUpperCase() || ""}</text>
      {categories.map((cat, ci) => {
        const r = ringRadii[ci];
        return (
          <text key={`label-${cat.cat}`} x={CX} y={CY - r - 8} textAnchor="middle" fill={`${cat.color}88`}
            fontSize="9" fontWeight="700" fontFamily="Rajdhani, sans-serif" letterSpacing="2">{cat.cat.toUpperCase()}</text>
        );
      })}
      {categories.map((cat, ci) => {
        const r = ringRadii[ci];
        const n = cat.books.length;
        return cat.books.map((book, bi) => {
          const angle = (bi / n) * Math.PI * 2 - Math.PI / 2 + (ci * 0.3);
          const bx = CX + r * Math.cos(angle);
          const by = CY + r * Math.sin(angle);
          const prg = getBookProgress(book.name, book.ch);
          const isComplete = prg.pct === 100;
          const isHovered = hoveredBook === book.name;
          const isSelected = selectedBook?.name === book.name;
          const planetR = Math.max(10, Math.min(22, 8 + book.ch * 0.15));
          return (
            <g key={book.name}
              onClick={() => setSelectedBook(isSelected ? null : { ...book, catColor: cat.color, cat: cat.cat })}
              onMouseEnter={() => setHoveredBook(book.name)}
              onMouseLeave={() => setHoveredBook(null)}
              style={{ cursor: "pointer" }}>
              <circle cx={bx} cy={by} r={planetR + 3} fill="none"
                stroke={isComplete ? cat.color : `${cat.color}22`} strokeWidth={2}
                strokeDasharray={`${(prg.pct / 100) * (2 * Math.PI * (planetR + 3))} ${2 * Math.PI * (planetR + 3)}`}
                transform={`rotate(-90 ${bx} ${by})`}
                style={{ transition: "all 0.4s", filter: isComplete ? `drop-shadow(0 0 6px ${cat.color}66)` : "none" }} />
              <circle cx={bx} cy={by} r={planetR}
                fill={isSelected ? `${cat.color}33` : isHovered ? `${cat.color}22` : `${cat.color}0D`}
                stroke={isSelected ? cat.color : isHovered ? `${cat.color}88` : `${cat.color}33`}
                strokeWidth={isSelected ? 2 : 1} style={{ transition: "all 0.25s" }} />
              <text x={bx} y={by + 1} textAnchor="middle" dominantBaseline="middle"
                fill={isComplete ? cat.color : prg.pct > 0 ? "#C8BFA8" : "#4A4235"}
                fontSize={planetR > 14 ? 9 : 7} fontWeight="700" fontFamily="Rajdhani, sans-serif">
                {prg.pct > 0 ? `${prg.pct}%` : ""}
              </text>
              <text x={bx} y={by + planetR + 12} textAnchor="middle"
                fill={isSelected ? "#E8E0D0" : isHovered ? "#C8BFA8" : "#6B6152"}
                fontSize="8" fontWeight={isSelected ? "700" : "500"} fontFamily="Jost, sans-serif"
                style={{ transition: "fill 0.2s" }}>
                {book.name.length > 12 ? book.name.replace(/(\d)\s/, "$1 ").split(" ")[0] : book.name}
              </text>
            </g>
          );
        });
      })}
    </svg>
  );
}

function DirectorPage() {
  const { data, setData, currentUser } = useContext(AppContext);
  const [tab, setTab] = useState("illumination");
  const [selectedBook, setSelectedBook] = useState(null);
  const [hoveredBook, setHoveredBook] = useState(null);
  const [showPrestigeConfirm, setShowPrestigeConfirm] = useState(false);
  const [prestigeAnim, setPrestigeAnim] = useState(null); // { oldLevel, newLevel }

  const bp = data.bibleProgress?.[currentUser.id] || {};
  const prestigeLevel = data.prestigeLevel?.[currentUser.id] || 0;

  function prestige() {
    const oldLvl = data.prestigeLevel?.[currentUser.id] || 0;
    const newLvl = oldLvl + 1;
    setShowPrestigeConfirm(false);
    setPrestigeAnim({ oldLevel: oldLvl, newLevel: newLvl });
    const delay = oldLvl === 0 ? 2100 : 2600;
    setTimeout(() => {
      setData(d => ({
        ...d,
        bibleProgress: { ...d.bibleProgress, [currentUser.id]: {} },
        prestigeLevel: { ...d.prestigeLevel, [currentUser.id]: newLvl },
        activities: [...d.activities, {
          id: `a${Date.now()}`, type: "prestige", memberId: currentUser.id,
          text: `achieved Prestige ${newLvl} — read through the entire Bible!`,
          date: new Date().toISOString().split("T")[0], icon: "★",
        }],
      }));
      // Write prestige directly to Supabase
      supabase.from("bible_progress").delete().eq("user_id", currentUser.id)
        .then(({ error }) => { if (error) console.error("Prestige clear error:", error); });
      supabase.from("profiles").update({ prestige_level: newLvl }).eq("id", currentUser.id)
        .then(({ error }) => { if (error) console.error("Prestige update error:", error); });
    }, delay);
  }

  function getBookProgress(bookName, totalCh) {
    const read = bp[bookName] || [];
    return { read: read.length, total: totalCh, pct: totalCh > 0 ? Math.round((read.length / totalCh) * 100) : 0 };
  }

  function toggleChapter(bookName, chNum) {
    const current = data.bibleProgress?.[currentUser.id]?.[bookName] || [];
    const removing = current.includes(chNum);

    // Update local state
    setData(d => {
      const userBp = { ...(d.bibleProgress?.[currentUser.id] || {}) };
      if (removing) {
        userBp[bookName] = current.filter(c => c !== chNum);
      } else {
        userBp[bookName] = [...current, chNum].sort((a, b) => a - b);
      }
      return { ...d, bibleProgress: { ...d.bibleProgress, [currentUser.id]: userBp } };
    });

    // Write directly to Supabase
    if (removing) {
      supabase.from("bible_progress").delete()
        .eq("user_id", currentUser.id).eq("book_name", bookName).eq("chapter", chNum)
        .then(({ error }) => { if (error) console.error("Bible toggle error:", error); });
    } else {
      supabase.from("bible_progress").upsert({
        user_id: currentUser.id, book_name: bookName, chapter: chNum,
      }).then(({ error }) => { if (error) console.error("Bible toggle error:", error); });
    }
  }

  function markAllChapters(bookName, totalCh) {
    const current = data.bibleProgress?.[currentUser.id]?.[bookName] || [];
    const clearing = current.length === totalCh;

    // Update local state
    setData(d => {
      const userBp = { ...(d.bibleProgress?.[currentUser.id] || {}) };
      if (clearing) {
        userBp[bookName] = [];
      } else {
        userBp[bookName] = Array.from({ length: totalCh }, (_, i) => i + 1);
      }
      return { ...d, bibleProgress: { ...d.bibleProgress, [currentUser.id]: userBp } };
    });

    // Write directly to Supabase
    if (clearing) {
      supabase.from("bible_progress").delete()
        .eq("user_id", currentUser.id).eq("book_name", bookName)
        .then(({ error }) => { if (error) console.error("Bible markAll error:", error); });
    } else {
      const rows = Array.from({ length: totalCh }, (_, i) => ({
        user_id: currentUser.id, book_name: bookName, chapter: i + 1,
      }));
      // Delete existing then insert all
      supabase.from("bible_progress").delete()
        .eq("user_id", currentUser.id).eq("book_name", bookName)
        .then(() => {
          supabase.from("bible_progress").upsert(rows)
            .then(({ error }) => { if (error) console.error("Bible markAll error:", error); });
        });
    }
  }

  // Stats helpers
  function getTestamentStats(key) {
    const cats = BIBLE_BOOKS[key];
    const books = cats.flatMap(c => c.books);
    const totalCh = books.reduce((s, b) => s + b.ch, 0);
    const readCh = books.reduce((s, b) => s + (bp[b.name] || []).length, 0);
    const completedBooks = books.filter(b => (bp[b.name] || []).length >= b.ch).length;
    return { totalCh, readCh, completedBooks, totalBooks: books.length, pct: totalCh > 0 ? Math.round((readCh / totalCh) * 100) : 0 };
  }

  const otStats = getTestamentStats("OT");
  const ntStats = getTestamentStats("NT");
  const totalCh = otStats.totalCh + ntStats.totalCh;
  const readCh = otStats.readCh + ntStats.readCh;
  const totalPct = totalCh > 0 ? Math.round((readCh / totalCh) * 100) : 0;
  const totalCompleted = otStats.completedBooks + ntStats.completedBooks;
  const totalBooks = otStats.totalBooks + ntStats.totalBooks;

  // Moon brightness factor (0 to 1)
  const moonBright = totalPct / 100;

  // ═══ ILLUMINATION (Overview) TAB ═══
  if (tab === "illumination") {
    return (
      <div className="page-content director-page">
        <div className="page-header">
          <Eye size={24} style={{ color: "#D4AF37" }} />
          <h2>THE DIRECTOR</h2>
        </div>
        <p style={{ color: "#6B6152", fontSize: 13, margin: "-8px 0 20px", letterSpacing: 0.5 }}>
          Chart your course through Scripture — every chapter, every book
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          <button className={`director-toggle active`} onClick={() => {}}>Illumination</button>
          <button className="director-toggle" onClick={() => { setTab("OT"); setSelectedBook(null); }}>Old Testament</button>
          <button className="director-toggle" onClick={() => { setTab("NT"); setSelectedBook(null); }}>New Testament</button>
        </div>

        {/* Moon / Sun Scene */}
        <div className="illumination-scene">
          <svg viewBox="0 0 800 520" className="illumination-svg">
            <defs>
              {/* Sun glow */}
              <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={`rgba(212,175,55,${0.12 + moonBright * 0.35})`} />
                <stop offset="40%" stopColor={`rgba(212,175,55,${0.04 + moonBright * 0.12})`} />
                <stop offset="100%" stopColor="rgba(212,175,55,0)" />
              </radialGradient>
              {/* Moon surface gradient */}
              <radialGradient id="moonSurface" cx="40%" cy="35%" r="60%">
                <stop offset="0%" stopColor={`rgba(232,224,208,${0.08 + moonBright * 0.92})`} />
                <stop offset="50%" stopColor={`rgba(200,191,168,${0.05 + moonBright * 0.7})`} />
                <stop offset="100%" stopColor={`rgba(160,152,128,${0.03 + moonBright * 0.45})`} />
              </radialGradient>
              {/* Moon glow aura */}
              <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={`rgba(232,224,208,${moonBright * 0.3})`} />
                <stop offset="60%" stopColor={`rgba(212,175,55,${moonBright * 0.08})`} />
                <stop offset="100%" stopColor="rgba(212,175,55,0)" />
              </radialGradient>
              {/* Moon shadow (dark side) */}
              <linearGradient id="moonShadow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(13,11,10,0)" />
                <stop offset={`${35 + (1 - moonBright) * 55}%`} stopColor="rgba(13,11,10,0)" />
                <stop offset={`${55 + (1 - moonBright) * 40}%`} stopColor={`rgba(13,11,10,${0.4 + (1 - moonBright) * 0.55})`} />
                <stop offset="100%" stopColor={`rgba(13,11,10,${0.6 + (1 - moonBright) * 0.38})`} />
              </linearGradient>
              <filter id="softGlow">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Stars - dim as moon brightens */}
            {Array.from({ length: 60 }, (_, i) => {
              const sx = ((i * 137.5) % 780) + 10;
              const sy = ((i * 91.3 + 40) % 500) + 10;
              const sr = 0.5 + (i % 3) * 0.5;
              return <circle key={`star-${i}`} cx={sx} cy={sy} r={sr} fill={`rgba(200,191,168,${0.15 + (1 - moonBright) * 0.35})`} />;
            })}

            {/* Sun (top-left, golden) */}
            <circle cx="120" cy="80" r="160" fill="url(#sunGlow)" />
            <circle cx="120" cy="80" r={28 + moonBright * 8} fill={`rgba(212,175,55,${0.25 + moonBright * 0.65})`}
              style={{ filter: `drop-shadow(0 0 ${12 + moonBright * 30}px rgba(212,175,55,${0.3 + moonBright * 0.5}))` }} />
            <circle cx="120" cy="80" r={18 + moonBright * 5} fill={`rgba(245,230,180,${0.3 + moonBright * 0.6})`} />

            {/* Moon glow aura */}
            <circle cx="400" cy="260" r={160 + moonBright * 40} fill="url(#moonGlow)" />

            {/* Moon body */}
            <circle cx="400" cy="260" r="120" fill="url(#moonSurface)"
              style={{ filter: `drop-shadow(0 0 ${moonBright * 40}px rgba(232,224,208,${moonBright * 0.25}))` }} />

            {/* Subtle crater details */}
            <circle cx="360" cy="230" r="18" fill={`rgba(160,152,128,${0.03 + moonBright * 0.12})`} />
            <circle cx="430" cy="290" r="12" fill={`rgba(140,132,110,${0.03 + moonBright * 0.1})`} />
            <circle cx="380" cy="300" r="8" fill={`rgba(150,142,120,${0.02 + moonBright * 0.08})`} />
            <circle cx="415" cy="235" r="22" fill={`rgba(170,162,138,${0.02 + moonBright * 0.09})`} />
            <circle cx="355" cy="270" r="6" fill={`rgba(140,132,110,${0.02 + moonBright * 0.07})`} />

            {/* Moon shadow overlay (phase) */}
            <circle cx="400" cy="260" r="120" fill="url(#moonShadow)" />

            {/* Moon border ring */}
            <circle cx="400" cy="260" r="120" fill="none"
              stroke={`rgba(212,175,55,${0.08 + moonBright * 0.25})`} strokeWidth="1.5" />

            {/* Prestige stars around the moon */}
            {prestigeLevel > 0 && Array.from({ length: Math.min(prestigeLevel, 12) }, (_, i) => {
              const pAngle = (i / Math.min(prestigeLevel, 12)) * Math.PI * 2 - Math.PI / 2;
              const pR = 148;
              const px = 400 + pR * Math.cos(pAngle);
              const py = 260 + pR * Math.sin(pAngle);
              const starSize = 6;
              const points = Array.from({ length: 4 }, (_, j) => {
                const a1 = (j / 4) * Math.PI * 2 - Math.PI / 2;
                const a2 = ((j + 0.5) / 4) * Math.PI * 2 - Math.PI / 2;
                return `${px + starSize * Math.cos(a1)},${py + starSize * Math.sin(a1)} ${px + starSize * 0.4 * Math.cos(a2)},${py + starSize * 0.4 * Math.sin(a2)}`;
              }).join(" ");
              return (
                <polygon key={`pstar-${i}`} points={points}
                  fill="#D4AF37" opacity={0.6 + moonBright * 0.4}
                  style={{ filter: "drop-shadow(0 0 4px rgba(212,175,55,0.5))" }} />
              );
            })}

            {/* Center percentage */}
            <text x="400" y="250" textAnchor="middle" fill={`rgba(232,224,208,${0.2 + moonBright * 0.8})`}
              fontSize="48" fontWeight="700" fontFamily="Rajdhani, sans-serif"
              style={{ filter: `drop-shadow(0 0 ${moonBright * 12}px rgba(212,175,55,${moonBright * 0.5}))` }}>
              {totalPct}%
            </text>
            <text x="400" y="278" textAnchor="middle" fill={`rgba(160,152,128,${0.15 + moonBright * 0.55})`}
              fontSize="11" fontWeight="600" fontFamily="Rajdhani, sans-serif" letterSpacing="4">
              ILLUMINATION
            </text>

            {/* Horizon line */}
            <line x1="0" y1="470" x2="800" y2="470" stroke={`rgba(212,175,55,${0.06 + moonBright * 0.1})`} strokeWidth="1" />
            <rect x="0" y="470" width="800" height="50" fill={`rgba(212,175,55,${0.01 + moonBright * 0.03})`} />

            {/* Label below */}
            <text x="400" y="498" textAnchor="middle" fill={`rgba(107,97,82,${0.5 + moonBright * 0.5})`}
              fontSize="9" fontWeight="600" fontFamily="Rajdhani, sans-serif" letterSpacing="3">
              {readCh} OF {totalCh} CHAPTERS · {totalCompleted} OF {totalBooks} BOOKS
            </text>
          </svg>
        </div>

        {/* Stats Cards */}
        <div className="illumination-stats">
          <Panel className="illumination-card" glow={otStats.pct > 0 ? "#D4AF37" : undefined}
            onClick={() => { setTab("OT"); setSelectedBook(null); }}>
            <div className="illumination-card-header">
              <span className="illumination-card-icon" style={{ color: "#D4AF37", fontFamily: "'Rajdhani', sans-serif", fontWeight: 800 }}>OT</span>
              <div>
                <div className="illumination-card-title">Old Testament</div>
                <div className="illumination-card-sub">{otStats.totalBooks} books · {otStats.totalCh} chapters</div>
              </div>
              <div className="illumination-ring">
                <svg viewBox="0 0 50 50" width={50} height={50}>
                  <circle cx="25" cy="25" r="20" fill="none" stroke="#2A2520" strokeWidth="3.5" />
                  <circle cx="25" cy="25" r="20" fill="none" stroke="#D4AF37" strokeWidth="3.5" strokeLinecap="round"
                    strokeDasharray={`${(otStats.pct / 100) * 125.6} 125.6`} transform="rotate(-90 25 25)"
                    style={{ transition: "stroke-dasharray 0.5s", filter: "drop-shadow(0 0 3px #D4AF3744)" }} />
                  <text x="25" y="26" textAnchor="middle" dominantBaseline="middle"
                    fill="#D4AF37" fontSize="11" fontWeight="700" fontFamily="Rajdhani, sans-serif">{otStats.pct}%</text>
                </svg>
              </div>
            </div>
            <ProgressBar value={otStats.readCh} max={otStats.totalCh} color="#D4AF37" height={4} />
            <div className="illumination-card-footer">
              <span>{otStats.readCh} chapters read</span>
              <span>{otStats.completedBooks} books complete</span>
            </div>
          </Panel>

          <Panel className="illumination-card" glow={ntStats.pct > 0 ? "#2B9EB3" : undefined}
            onClick={() => { setTab("NT"); setSelectedBook(null); }}>
            <div className="illumination-card-header">
              <span className="illumination-card-icon" style={{ color: "#2B9EB3", fontFamily: "'Rajdhani', sans-serif", fontWeight: 800 }}>NT</span>
              <div>
                <div className="illumination-card-title">New Testament</div>
                <div className="illumination-card-sub">{ntStats.totalBooks} books · {ntStats.totalCh} chapters</div>
              </div>
              <div className="illumination-ring">
                <svg viewBox="0 0 50 50" width={50} height={50}>
                  <circle cx="25" cy="25" r="20" fill="none" stroke="#2A2520" strokeWidth="3.5" />
                  <circle cx="25" cy="25" r="20" fill="none" stroke="#2B9EB3" strokeWidth="3.5" strokeLinecap="round"
                    strokeDasharray={`${(ntStats.pct / 100) * 125.6} 125.6`} transform="rotate(-90 25 25)"
                    style={{ transition: "stroke-dasharray 0.5s", filter: "drop-shadow(0 0 3px #2B9EB344)" }} />
                  <text x="25" y="26" textAnchor="middle" dominantBaseline="middle"
                    fill="#2B9EB3" fontSize="11" fontWeight="700" fontFamily="Rajdhani, sans-serif">{ntStats.pct}%</text>
                </svg>
              </div>
            </div>
            <ProgressBar value={ntStats.readCh} max={ntStats.totalCh} color="#2B9EB3" height={4} />
            <div className="illumination-card-footer">
              <span>{ntStats.readCh} chapters read</span>
              <span>{ntStats.completedBooks} books complete</span>
            </div>
          </Panel>
        </div>

        {/* Overall Bar */}
        <Panel style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span className="section-title">TOTAL SCRIPTURE PROGRESS</span>
            <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 18, color: "#D4AF37" }}>{totalPct}%</span>
          </div>
          <ProgressBar value={readCh} max={totalCh} color="#D4AF37" height={8} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, color: "#4A4235", fontSize: 11 }}>
            <span>{readCh} / {totalCh} chapters</span>
            <span>{totalCompleted} / {totalBooks} books</span>
          </div>
        </Panel>

        {/* Prestige Section */}
        <Panel className="prestige-section" style={{ marginTop: 16 }}>
          <div className="prestige-header">
            <div className="prestige-emblem-display">
              <PrestigeEmblem level={prestigeLevel} size={56} showLabel />
            </div>
            <div style={{ flex: 1 }}>
              <div className="prestige-title">
                {prestigeLevel === 0 ? "NO PRESTIGE" : prestigeLevel >= 10 ? "★ MAX PRESTIGE ★" : `PRESTIGE ${prestigeLevel}`}
              </div>
              <div className="prestige-sub">
                {prestigeLevel === 0
                  ? "Complete the entire Bible to unlock Prestige"
                  : prestigeLevel >= 10
                    ? "You have achieved the highest honor — the eternal flame"
                    : `You have read through the entire Bible ${prestigeLevel} time${prestigeLevel > 1 ? "s" : ""}`}
              </div>
            </div>
            {totalPct === 100 && prestigeLevel < 10 && (
              <button className="prestige-btn" onClick={() => setShowPrestigeConfirm(true)}>
                <Zap size={16} />
                <span>PRESTIGE UP</span>
              </button>
            )}
            {totalPct < 100 && (
              <button style={{ marginLeft: "auto", padding: "4px 10px", fontSize: 9, background: "#2A2520", border: "1px solid #3A3428", color: "#6B6152", borderRadius: 3, cursor: "pointer", fontFamily: "'Rajdhani', sans-serif", letterSpacing: 1 }}
                onClick={() => {
                  setData(d => {
                    const allBp = {};
                    [...BIBLE_BOOKS.OT, ...BIBLE_BOOKS.NT].forEach(cat => {
                      cat.books.forEach(b => { allBp[b.name] = Array.from({ length: b.ch }, (_, i) => i + 1); });
                    });
                    return { ...d, bibleProgress: { ...d.bibleProgress, [currentUser.id]: allBp } };
                  });
                }}>
                DEBUG: COMPLETE ALL
              </button>
            )}
          </div>
          {prestigeLevel > 0 && (
            <div className="prestige-wings-preview">
              <div className="prestige-wings-label">STAR POINTS EARNED</div>
              <div className="prestige-wings-row">
                {Array.from({ length: 10 }, (_, i) => {
                  const earned = i < prestigeLevel;
                  const ptColor = earned ? getPrestigeColor(i + 1) : "#2A2520";
                  return (
                    <div key={i} className={`prestige-point-slot ${earned ? "earned" : ""}`} style={earned ? { borderColor: ptColor } : {}}>
                      <svg width="20" height="20" viewBox="0 0 20 20">
                        <polygon points="10,2 12.5,8 19,8 14,12 16,18.5 10,14.5 4,18.5 6,12 1,8 7.5,8"
                          fill={earned ? `${ptColor}33` : "#1A1714"} stroke={earned ? ptColor : "#33302A"} strokeWidth="1"
                          strokeLinejoin="round" />
                      </svg>
                      {earned && <span style={{ fontSize: 7, color: ptColor, fontFamily: "'Rajdhani', sans-serif", fontWeight: 700 }}>{i + 1}</span>}
                    </div>
                  );
                })}
              </div>
              <div style={{ color: "#4A4235", fontSize: 11, marginTop: 4 }}>
                {Math.min(prestigeLevel, 10)} / 10 star points{prestigeLevel >= 10 ? " — MAX PRESTIGE" : ""}
              </div>
            </div>
          )}
        </Panel>

        {/* Prestige Confirmation Modal */}
        <Modal open={showPrestigeConfirm} onClose={() => setShowPrestigeConfirm(false)} title="Prestige Up">
          <div style={{ padding: 20, textAlign: "center" }}>
            <div style={{ marginBottom: 20 }}>
              <PrestigeEmblem level={prestigeLevel + 1} size={80} showLabel />
            </div>
            <h3 style={{ color: getPrestigeColor(prestigeLevel + 1), fontFamily: "'Rajdhani', sans-serif", fontSize: 24, letterSpacing: 2, margin: "0 0 8px" }}>
              PRESTIGE {prestigeLevel + 1} — {getPrestigeName(prestigeLevel + 1).toUpperCase()}
            </h3>
            <p style={{ color: "#A09880", fontSize: 14, margin: "0 0 4px" }}>
              You've read through the entire Bible. Incredible.
            </p>
            <p style={{ color: "#6B6152", fontSize: 13, margin: "0 0 6px" }}>
              Your star gains its {prestigeLevel + 1}{prestigeLevel === 0 ? "st" : prestigeLevel === 1 ? "nd" : prestigeLevel === 2 ? "rd" : "th"} point.
            </p>
            <p style={{ color: "#6B6152", fontSize: 13, margin: "0 0 20px" }}>
              Prestiging will <strong style={{ color: "#C0392B" }}>reset all chapter progress to zero</strong> and
              evolve your prestige star. This emblem is displayed next to your name throughout the app.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button className="prestige-confirm-btn" style={{ background: `linear-gradient(135deg, ${getPrestigeColor(prestigeLevel + 1)}, ${getPrestigeColor(prestigeLevel + 1)}CC)` }} onClick={prestige}>
                <Zap size={16} /> Prestige Up
              </button>
              <button className="gold-btn" onClick={() => setShowPrestigeConfirm(false)} style={{ opacity: 0.7 }}>
                Cancel
              </button>
            </div>
          </div>
        </Modal>

        {/* Full-screen Prestige Animation */}
        {prestigeAnim && (
          <PrestigeAnimation
            oldLevel={prestigeAnim.oldLevel}
            newLevel={prestigeAnim.newLevel}
            onComplete={() => setPrestigeAnim(null)}
          />
        )}
      </div>
    );
  }

  // ═══ TESTAMENT TAB (OT / NT) ═══
  const testament = tab;
  const categories = BIBLE_BOOKS[testament];
  const allBooks = categories.flatMap(c => c.books.map(b => ({ ...b, catColor: c.color, cat: c.cat })));
  const tStats = getTestamentStats(testament);

  return (
    <div className="page-content director-page">
      <div className="page-header">
        <Eye size={24} style={{ color: "#D4AF37" }} />
        <h2>THE DIRECTOR</h2>
      </div>
      <p style={{ color: "#6B6152", fontSize: 13, margin: "-8px 0 20px", letterSpacing: 0.5 }}>
        Chart your course through Scripture — every chapter, every book
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <button className="director-toggle" onClick={() => { setTab("illumination"); setSelectedBook(null); }}>Illumination</button>
        <button className={`director-toggle ${testament === "OT" ? "active" : ""}`} onClick={() => { setTab("OT"); setSelectedBook(null); }}>Old Testament</button>
        <button className={`director-toggle ${testament === "NT" ? "active" : ""}`} onClick={() => { setTab("NT"); setSelectedBook(null); }}>New Testament</button>
      </div>

      <Panel className="director-stats-bar" glow={testament === "OT" ? "#D4AF37" : "#2B9EB3"}>
        <div className="director-stat-item">
          <span className="director-stat-num">{tStats.readCh}</span>
          <span className="director-stat-lbl">/ {tStats.totalCh} chapters</span>
        </div>
        <div className="director-stat-divider" />
        <div className="director-stat-item">
          <span className="director-stat-num">{tStats.completedBooks}</span>
          <span className="director-stat-lbl">/ {tStats.totalBooks} books complete</span>
        </div>
        <div className="director-stat-divider" />
        <div className="director-stat-item">
          <span className="director-stat-num" style={{ color: testament === "OT" ? "#D4AF37" : "#2B9EB3" }}>{tStats.pct}%</span>
          <span className="director-stat-lbl">{testament === "OT" ? "Old" : "New"} Testament</span>
        </div>
        <div style={{ flex: 1, maxWidth: 200 }}>
          <ProgressBar value={tStats.readCh} max={tStats.totalCh} color={testament === "OT" ? "#D4AF37" : "#2B9EB3"} height={6} />
        </div>
      </Panel>

      <div className="director-layout">
        <div className="solar-system-container">
          <SolarSystem
            categories={categories} bp={bp} getBookProgress={getBookProgress}
            selectedBook={selectedBook} setSelectedBook={setSelectedBook}
            hoveredBook={hoveredBook} setHoveredBook={setHoveredBook}
            overallPct={tStats.pct} label={testament === "OT" ? "Old Testament" : "New Testament"}
          />
          <div className="solar-legend">
            {categories.map(cat => {
              const catRead = cat.books.reduce((s, b) => s + (bp[b.name] || []).length, 0);
              const catTotal = cat.books.reduce((s, b) => s + b.ch, 0);
              const catPct = catTotal > 0 ? Math.round((catRead / catTotal) * 100) : 0;
              return (
                <div key={cat.cat} className="solar-legend-item">
                  <div className="solar-legend-dot" style={{ background: cat.color }} />
                  <span className="solar-legend-name">{cat.cat}</span>
                  <span className="solar-legend-pct" style={{ color: cat.color }}>{catPct}%</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="director-detail-panel">
          {selectedBook ? (
            <Panel glow={selectedBook.catColor}>
              <div className="director-book-header">
                <div>
                  <div className="director-book-cat" style={{ color: selectedBook.catColor }}>{selectedBook.cat.toUpperCase()}</div>
                  <h3 className="director-book-name">{selectedBook.name}</h3>
                  <div style={{ color: "#6B6152", fontSize: 12 }}>{selectedBook.ch} chapters</div>
                </div>
                <div className="director-book-ring">
                  <svg viewBox="0 0 60 60" width={60} height={60}>
                    <circle cx="30" cy="30" r="25" fill="none" stroke="#2A2520" strokeWidth="4" />
                    <circle cx="30" cy="30" r="25" fill="none" stroke={selectedBook.catColor} strokeWidth="4" strokeLinecap="round"
                      strokeDasharray={`${(getBookProgress(selectedBook.name, selectedBook.ch).pct / 100) * 157} 157`}
                      transform="rotate(-90 30 30)"
                      style={{ transition: "stroke-dasharray 0.4s", filter: `drop-shadow(0 0 4px ${selectedBook.catColor}44)` }} />
                    <text x="30" y="30" textAnchor="middle" dominantBaseline="middle"
                      fill={selectedBook.catColor} fontSize="14" fontWeight="700" fontFamily="Rajdhani, sans-serif">
                      {getBookProgress(selectedBook.name, selectedBook.ch).pct}%
                    </text>
                  </svg>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "14px 0 10px" }}>
                <span className="input-label" style={{ margin: 0 }}>Chapters</span>
                <button className="filter-btn" style={{ fontSize: 11 }}
                  onClick={() => markAllChapters(selectedBook.name, selectedBook.ch)}>
                  {(bp[selectedBook.name] || []).length === selectedBook.ch ? "Unmark All" : "Mark All Read"}
                </button>
              </div>
              <div className="chapter-grid">
                {Array.from({ length: selectedBook.ch }, (_, i) => i + 1).map(chNum => {
                  const isRead = (bp[selectedBook.name] || []).includes(chNum);
                  return (
                    <button key={chNum}
                      className={`chapter-btn ${isRead ? "read" : ""}`}
                      style={isRead ? { borderColor: selectedBook.catColor, background: `${selectedBook.catColor}22`, color: selectedBook.catColor } : {}}
                      onClick={() => toggleChapter(selectedBook.name, chNum)}>
                      {chNum}
                    </button>
                  );
                })}
              </div>
            </Panel>
          ) : (
            <Panel className="director-empty-detail">
              <Eye size={40} style={{ color: "#2A2520", marginBottom: 12 }} />
              <div style={{ color: "#4A4235", fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Select a Book</div>
              <div style={{ color: "#33302A", fontSize: 13 }}>Click any book on the map to track chapters</div>
            </Panel>
          )}

          <div className="director-booklist">
            {categories.map(cat => (
              <div key={cat.cat}>
                <div className="director-list-cat" style={{ color: cat.color }}>{cat.cat}</div>
                {cat.books.map(book => {
                  const prg = getBookProgress(book.name, book.ch);
                  const isActive = selectedBook?.name === book.name;
                  return (
                    <div key={book.name}
                      className={`director-list-book ${isActive ? "active" : ""} ${prg.pct === 100 ? "complete" : ""}`}
                      onClick={() => setSelectedBook(isActive ? null : { ...book, catColor: cat.color, cat: cat.cat })}
                      style={isActive ? { borderColor: cat.color } : {}}>
                      <span className="director-list-name">{book.name}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <ProgressBar value={prg.read} max={prg.total} color={prg.pct === 100 ? "#27AE60" : cat.color} height={3} />
                        <span className="director-list-pct" style={{ color: prg.pct === 100 ? "#27AE60" : prg.pct > 0 ? cat.color : "#4A4235" }}>
                          {prg.read}/{prg.total}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════
// PAGE: PROFILE
// ════════════════════════════════════════
function ProfilePage() {
  const { data, setData, currentUser, profileTarget, setPage, showToast, logout } = useContext(AppContext);
  const memberId = profileTarget || currentUser.id;
  const member = findMember(data, memberId);
  const isOwn = memberId === currentUser.id;
  const [showSettings, setShowSettings] = useState(false);
  const [editName, setEditName] = useState("");
  const [nameError, setNameError] = useState("");

  // Resolve display name: check overrides first, then base member name
  const displayName = data.displayNames?.[memberId] || member?.name || "Unknown";
  const displayTag = member?.tag || "0000";

  function openSettings() {
    setEditName(displayName);
    setNameError("");
    setShowSettings(true);
  }

  function saveName() {
    const trimmed = editName.trim();
    if (trimmed.length < 2) { setNameError("Name must be at least 2 characters"); return; }
    if (trimmed.length > 16) { setNameError("Name must be 16 characters or less"); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) { setNameError("Letters, numbers, and underscores only"); return; }
    setData(d => ({
      ...d,
      displayNames: { ...(d.displayNames || {}), [memberId]: trimmed },
    }));
    setShowSettings(false);
    showToast("Display name updated");
  }

  const prg = data.readingProgress?.[memberId] || {};
  let booksCompleted = 0, pagesRead = 0;
  const bookshelf = [];
  Object.keys(prg).forEach(bId => {
    const book = data.books.find(b => b.id === bId);
    if (!book) return;
    pagesRead += prg[bId];
    if (prg[bId] >= book.pages) booksCompleted++;
    bookshelf.push({ ...book, progress: prg[bId] });
  });
  const reviewsWritten = data.reviews.filter(r => r.memberId === memberId).length;
  const threadsStarted = data.threads.filter(t => t.authorId === memberId).length;
  const replies = data.threads.reduce((acc, t) => acc + t.posts.filter(p => p.authorId === memberId).length, 0);
  const sealsEarned = (data.completedSeals?.[memberId] || []).length;

  const seal = SEAL_DEFINITIONS.find(s => s.name === data.equippedTitles?.[memberId]);
  const allSealDefs = [...SEAL_DEFINITIONS, ...(data.customSeals || [])];
  const completedSealDefs = (data.completedSeals?.[memberId] || []).map(sId => allSealDefs.find(s => s.id === sId)).filter(Boolean);

  // Build category breakdown from completed books
  const categoryMap = {};
  Object.keys(prg).forEach(bId => {
    const book = data.books.find(b => b.id === bId);
    if (!book) return;
    if (prg[bId] >= book.pages) {
      categoryMap[book.category] = (categoryMap[book.category] || 0) + 1;
    }
  });
  const categoryData = Object.entries(categoryMap).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
  const readerSubtitle = getReaderSubtitle(categoryData);

  function equipTitle(sealName) {
    setData(d => ({ ...d, equippedTitles: { ...d.equippedTitles, [memberId]: sealName } }));
    showToast(`Title "${sealName}" equipped`);
  }

  return (
    <div className="page-content">
      {profileTarget && profileTarget !== currentUser.id && (
        <button className="back-btn" onClick={() => setPage("members")}>
          <ArrowLeft size={16} /> Back to Fireteam
        </button>
      )}

      <Panel className="profile-header-card" glow={seal?.color || "#D4AF37"}>
        <div className="profile-top">
          <div className="profile-avatar-xl">{member.avatar}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 style={{ margin: 0, color: "#E8E0D0", fontSize: 24 }}>{displayName}</h2>
              {isOwn && (
                <button className="icon-btn" onClick={openSettings} title="Settings" style={{ color: "#6B6152" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                </button>
              )}
            </div>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 13, color: "#6B6152", letterSpacing: 0.5, marginTop: 2 }}>
              {displayName}<span style={{ color: "#4A4235" }}>#</span><span style={{ color: "#D4AF37" }}>{displayTag}</span>
            </div>
            {data.equippedTitles?.[memberId] && (
              <GlowTitle title={data.equippedTitles[memberId]} color={seal?.color} />
            )}
            {readerSubtitle && (
              <div style={{
                marginTop: 4, fontFamily: "'Rajdhani', sans-serif", fontWeight: 600,
                fontSize: 13, letterSpacing: 1.5, color: "#A09880",
                textTransform: "uppercase",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <span style={{ opacity: 0.5 }}>◆</span>
                <span style={{ 
                  background: "linear-gradient(90deg, #D4AF37, #E8D44D, #D4AF37)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}>
                  {readerSubtitle}
                </span>
                <span style={{ opacity: 0.5 }}>◆</span>
              </div>
            )}
          </div>
        </div>

        <div className="profile-stats-row">
          <div className="profile-stat"><span className="p-stat-num">{booksCompleted}</span><span className="p-stat-lbl">Books</span></div>
          <div className="profile-stat"><span className="p-stat-num">{pagesRead.toLocaleString()}</span><span className="p-stat-lbl">Pages</span></div>
          <div className="profile-stat"><span className="p-stat-num">{reviewsWritten}</span><span className="p-stat-lbl">Reviews</span></div>
          <div className="profile-stat"><span className="p-stat-num">{threadsStarted}</span><span className="p-stat-lbl">Threads</span></div>
          <div className="profile-stat"><span className="p-stat-num">{replies}</span><span className="p-stat-lbl">Replies</span></div>
          <div className="profile-stat"><span className="p-stat-num">{sealsEarned}</span><span className="p-stat-lbl">Seals</span></div>
        </div>
      </Panel>

      {/* Category Breakdown Pie Chart */}
      <div className="section-title" style={{ margin: "24px 0 12px" }}>READING PROFILE</div>
      <Panel>
        {categoryData.length > 0 ? (
          <div style={{ padding: "8px 0" }}>
            {readerSubtitle && (
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{
                  fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 20,
                  letterSpacing: 2, textTransform: "uppercase",
                  background: "linear-gradient(90deg, #D4AF37, #E8D44D, #D4AF37)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}>
                  "{readerSubtitle}"
                </div>
                <div style={{ color: "#6B6152", fontSize: 11, marginTop: 4, letterSpacing: 1 }}>
                  BASED ON TOP {Math.min(2, categoryData.length)} CATEGOR{categoryData.length === 1 ? "Y" : "IES"}
                </div>
              </div>
            )}
            <CategoryPieChart categoryData={categoryData} size={160} />
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "24px 0", color: "#4A4235", fontSize: 13 }}>
            <BookOpen size={24} style={{ opacity: 0.3, marginBottom: 8, display: "block", margin: "0 auto 8px" }} />
            Complete books to see your reading profile
          </div>
        )}
      </Panel>

      {/* Prestige Showcase */}
      {(() => {
        const memberPrestige = data.prestigeLevel?.[memberId] || 0;
        if (memberPrestige === 0) return null;
        const pColor = getPrestigeColor(memberPrestige);
        const pName = getPrestigeName(memberPrestige);
        const isMax = memberPrestige >= 10;
        return (
          <>
            <div className="section-title" style={{ margin: "24px 0 12px" }}>PRESTIGE</div>
            <Panel className="profile-prestige-showcase" glow={pColor}>
              <div className="profile-prestige-top">
                <PrestigeEmblem level={memberPrestige} size={72} showLabel />
                <div className="profile-prestige-info">
                  <div className="profile-prestige-level" style={{ color: pColor }}>
                    {isMax ? "★ MAX PRESTIGE ★" : `PRESTIGE ${memberPrestige}`}
                  </div>
                  <div className="profile-prestige-name" style={{ color: pColor }}>
                    {pName}
                  </div>
                  <div className="profile-prestige-desc">
                    {isMax
                      ? `${member.name} has read through the entire Bible 10 times and achieved the eternal flame.`
                      : `${member.name} has read through the entire Bible ${memberPrestige} time${memberPrestige > 1 ? "s" : ""}.`}
                  </div>
                </div>
              </div>
              <div className="profile-prestige-stars">
                {Array.from({ length: 10 }, (_, i) => {
                  const earned = i < memberPrestige;
                  const ptColor = earned ? getPrestigeColor(i + 1) : "#2A2520";
                  return (
                    <div key={i} className={`prestige-point-slot ${earned ? "earned" : ""}`} style={earned ? { borderColor: ptColor } : {}}>
                      <svg width="22" height="22" viewBox="0 0 20 20">
                        <polygon points="10,2 12.5,8 19,8 14,12 16,18.5 10,14.5 4,18.5 6,12 1,8 7.5,8"
                          fill={earned ? `${ptColor}33` : "#1A1714"} stroke={earned ? ptColor : "#33302A"} strokeWidth="1"
                          strokeLinejoin="round" />
                      </svg>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </>
        );
      })()}

      {/* Titles & Seals */}
      <div className="section-title" style={{ margin: "24px 0 12px" }}>TITLES & SEALS</div>
      {completedSealDefs.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {completedSealDefs.map(s => {
            const isEquipped = data.equippedTitles?.[memberId] === s.name;
            return (
              <Panel key={s.id} className="profile-seal-card" glow={isEquipped ? s.color : undefined}
                onClick={isOwn ? () => equipTitle(s.name) : undefined}
                style={{ cursor: isOwn ? "pointer" : "default" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                    background: `${s.color}12`, border: `1px solid ${s.color}33`, fontSize: 28, flexShrink: 0,
                  }}>
                    {s.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <GlowTitle title={s.name} color={s.color} />
                      {isEquipped && <span className="equipped-badge">EQUIPPED</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "#6B6152", marginTop: 2 }}>{s.subtitle}</div>
                    <div style={{ fontSize: 12, color: "#8A7E6B", marginTop: 4, lineHeight: 1.4 }}>{s.description}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border-subtle)" }}>
                  {s.triumphs.map(t => (
                    <span key={t.id} style={{
                      fontSize: 10, fontFamily: "'Rajdhani', sans-serif", fontWeight: 600,
                      letterSpacing: 0.8, padding: "2px 8px", borderRadius: 3,
                      background: `${s.color}12`, color: s.color, border: `1px solid ${s.color}22`,
                    }}>
                      <Check size={9} style={{ marginRight: 3 }} />{t.name}
                    </span>
                  ))}
                </div>
                {isOwn && !isEquipped && (
                  <div style={{ color: "#4A4235", fontSize: 11, marginTop: 8, fontStyle: "italic" }}>
                    Tap to equip this title
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
      ) : (
        <Panel>
          <div style={{ textAlign: "center", padding: "32px 20px" }}>
            <Trophy size={32} style={{ color: "#2A2520", marginBottom: 10 }} />
            <div style={{ color: "#6B6152", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No titles earned yet</div>
            <div style={{ color: "#4A4235", fontSize: 12 }}>
              {isOwn ? "Complete all triumphs within a seal on the Triumphs page to earn titles" : `${displayName} hasn't earned any titles yet`}
            </div>
          </div>
        </Panel>
      )}

      {/* Bookshelf */}
      <div className="section-title" style={{ margin: "24px 0 12px" }}>BOOKSHELF</div>
      {bookshelf.length === 0 ? (
        <Panel>
          <div style={{ textAlign: "center", padding: "32px 20px" }}>
            <BookOpen size={32} style={{ color: "#2A2520", marginBottom: 10 }} />
            <div style={{ color: "#6B6152", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No books started</div>
            <div style={{ color: "#4A4235", fontSize: 12 }}>
              {isOwn ? "Head to the Library to start tracking your first book" : `${member.name} hasn't started reading yet`}
            </div>
          </div>
        </Panel>
      ) : (
      <div className="bookshelf-grid">
        {bookshelf.sort((a, b) => (b.progress / b.pages) - (a.progress / a.pages)).map(book => {
          const done = book.progress >= book.pages;
          return (
            <Panel key={book.id} className="bookshelf-item">
              <span style={{ fontSize: 24 }}><BookCover book={book} size={24} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: "#E8E0D0", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{book.title}</div>
                <ProgressBar value={book.progress} max={book.pages} color={done ? "#27AE60" : "#D4AF37"} height={3} />
                <div style={{ color: done ? "#27AE60" : "#6B6152", fontSize: 11, marginTop: 2 }}>
                  {done ? "Complete" : `${Math.round((book.progress / book.pages) * 100)}%`}
                </div>
              </div>
            </Panel>
          );
        })}
      </div>
      )}

      {/* Recent Reviews */}
      {data.reviews.filter(r => r.memberId === memberId).length > 0 && (
        <>
          <div className="section-title" style={{ margin: "24px 0 12px" }}>RECENT REVIEWS</div>
          {data.reviews.filter(r => r.memberId === memberId).slice(-3).reverse().map(r => {
            const book = data.books.find(b => b.id === r.bookId);
            return (
              <Panel key={r.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span>{book ? <BookCover book={book} size={20} /> : "?"}</span>
                  <span style={{ fontWeight: 600, color: "#E8E0D0" }}>{book?.title}</span>
                  <div style={{ marginLeft: "auto" }}><StarRating rating={r.rating} size={12} /></div>
                </div>
                <p style={{ color: "#A09880", fontSize: 13, margin: 0, lineHeight: 1.6 }}><ScriptureText text={r.text} /></p>
              </Panel>
            );
          })}
        </>
      )}

      {/* Settings Modal */}
      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Profile Settings">
        <div style={{ padding: 20 }}>
          <label className="input-label">Display Name</label>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <input
                className="text-input"
                value={editName}
                onChange={e => { setEditName(e.target.value); setNameError(""); }}
                placeholder="Enter display name..."
                maxLength={16}
                style={nameError ? { borderColor: "#C0392B" } : {}}
              />
              {nameError && (
                <div style={{ color: "#C0392B", fontSize: 11, marginTop: 4 }}>{nameError}</div>
              )}
              <div style={{ color: "#4A4235", fontSize: 11, marginTop: 4 }}>
                {editName.length}/16 — Letters, numbers, and underscores only
              </div>
            </div>
          </div>

          {/* Preview */}
          <div style={{ marginTop: 16, padding: 12, background: "var(--bg-deep)", borderRadius: 6, border: "1px solid var(--border-subtle)" }}>
            <div style={{ color: "#4A4235", fontSize: 10, letterSpacing: 1.5, fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, marginBottom: 6 }}>PREVIEW</div>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 20, color: "#E8E0D0", letterSpacing: 1 }}>
              {editName.trim() || displayName}<span style={{ color: "#4A4235" }}>#</span><span style={{ color: "#D4AF37" }}>{displayTag}</span>
            </div>
          </div>

          <button className="gold-btn" style={{ marginTop: 16, width: "100%" }} onClick={saveName}>
            <Check size={14} /> Save Changes
          </button>

          <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border-subtle)" }}>
            <button
              className="decline-btn"
              style={{ width: "100%", padding: "10px 16px", gap: 8, color: "#C0392B", borderColor: "#C0392B33", justifyContent: "center" }}
              onClick={() => { setShowSettings(false); logout(); }}
            >
              <ArrowLeft size={14} /> Sign Out
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Jost:wght@300;400;500;600;700&display=swap');

:root {
  --bg-deep: #0D0B0A;
  --bg-base: #141210;
  --bg-surface: #1C1916;
  --bg-elevated: #242019;
  --border-subtle: #2A2520;
  --border-medium: #3A3428;
  --text-primary: #E8E0D0;
  --text-secondary: #A09880;
  --text-muted: #6B6152;
  --text-faint: #4A4235;
  --gold: #D4AF37;
  --gold-dim: #B8962E;
  --gold-glow: #D4AF3744;
  --teal: #2B9EB3;
  --red: #C0392B;
  --green: #27AE60;
  --purple: #8E44AD;
  --panel-bg: rgba(28, 25, 22, 0.75);
  --panel-border: rgba(42, 37, 32, 0.8);
}

* { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }

body, #root {
  font-family: 'Jost', sans-serif;
  background: var(--bg-deep);
  color: var(--text-primary);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}

/* Subtle background pattern */
#root::before {
  content: '';
  position: fixed;
  inset: 0;
  background:
    radial-gradient(ellipse at 20% 50%, #D4AF3708 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, #2B9EB306 0%, transparent 50%),
    repeating-linear-gradient(0deg, transparent, transparent 100px, #ffffff01 100px, #ffffff01 101px),
    repeating-linear-gradient(90deg, transparent, transparent 100px, #ffffff01 100px, #ffffff01 101px);
  pointer-events: none;
  z-index: 0;
}

.app-shell { position: relative; z-index: 1; display: flex; flex-direction: column; min-height: 100vh; }

/* Toast Notifications */
.toast {
  position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
  z-index: 10000; display: flex; align-items: center; gap: 8px;
  padding: 10px 20px; border-radius: 6px; font-size: 13px; font-weight: 500;
  font-family: 'Jost', sans-serif; box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  animation: toastIn 0.3s ease, toastOut 0.3s ease 2.7s both;
  pointer-events: none; max-width: 90vw;
}
.toast-success { background: #1a2e1a; border: 1px solid #27AE6044; color: #27AE60; }
.toast-error { background: #2e1a1a; border: 1px solid #C0392B44; color: #C0392B; }
.toast-info { background: #1a1e2e; border: 1px solid #2B9EB344; color: #2B9EB3; }
@keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(-12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
@keyframes toastOut { from { opacity: 1; } to { opacity: 0; transform: translateX(-50%) translateY(-8px); } }

/* ═══ LOGIN ═══ */
.login-screen {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 100vh; padding: 24px; text-align: center;
}
.login-logo { font-family: 'Rajdhani', sans-serif; font-size: 72px; font-weight: 700; color: var(--gold);
  text-shadow: 0 0 40px var(--gold-glow), 0 0 80px #D4AF3722; letter-spacing: 6px; margin-bottom: 4px; }
.login-tagline { color: var(--text-muted); font-size: 13px; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 48px; }
.login-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; width: 100%; max-width: 680px; }
.login-btn {
  background: var(--panel-bg); border: 1px solid var(--border-subtle); border-radius: 4px;
  padding: 14px 20px; color: var(--text-primary); font-family: 'Jost', sans-serif;
  font-size: 14px; cursor: pointer; transition: all 0.25s; display: flex; align-items: center; gap: 10px;
}
.login-btn:hover { background: var(--bg-elevated); border-color: var(--gold); box-shadow: 0 0 20px var(--gold-glow); }
.login-btn .avatar { flex-shrink: 0; }
.login-subtitle { color: var(--text-muted); font-size: 12px; margin-bottom: 20px; letter-spacing: 1px; }
.login-diamond { color: var(--gold); font-size: 20px; margin: 20px 0 24px; opacity: 0.5; }

/* ═══ HEADER ═══ */
.header {
  background: linear-gradient(180deg, #1A1614 0%, #141210 100%);
  border-bottom: 1px solid var(--border-subtle);
  padding: 0 24px;
  position: sticky; top: 0; z-index: 100;
}
.header-inner { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; height: 60px; }
.logo {
  font-family: 'Rajdhani', sans-serif; font-weight: 700; font-size: 28px; color: var(--gold);
  letter-spacing: 3px; text-shadow: 0 0 20px var(--gold-glow);
  margin-right: 32px; cursor: pointer; flex-shrink: 0;
}
.nav { display: flex; gap: 2px; overflow-x: auto; flex: 1; -webkit-overflow-scrolling: touch; scrollbar-width: none; -ms-overflow-style: none; }
.nav::-webkit-scrollbar { display: none; }
.nav-btn {
  background: none; border: none; color: var(--text-muted); font-family: 'Rajdhani', sans-serif;
  font-size: 13px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase;
  padding: 20px 16px; cursor: pointer; transition: all 0.2s;
  border-bottom: 2px solid transparent; white-space: nowrap;
  display: flex; align-items: center; gap: 6px;
}
.nav-btn:hover { color: var(--text-secondary); }
.nav-btn.active { color: var(--gold); border-bottom-color: var(--gold); }
.header-user {
  display: flex; align-items: center; gap: 10px; margin-left: auto; flex-shrink: 0;
  padding-left: 16px; cursor: pointer;
}
.header-user-name { color: var(--text-secondary); font-size: 13px; font-weight: 500; }

/* ═══ GLASS PANELS ═══ */
.glass-panel {
  background: var(--panel-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--panel-border);
  border-radius: 6px;
  padding: 20px;
  transition: all 0.25s;
}
.glass-panel:hover { border-color: var(--border-medium); }

/* ═══ COMMON ELEMENTS ═══ */
.page-content { max-width: 1200px; margin: 0 auto; padding: 24px; }
.page-header {
  display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
}
.page-header h2 {
  font-family: 'Rajdhani', sans-serif; font-weight: 700; font-size: 24px;
  letter-spacing: 3px; color: var(--text-primary); margin: 0;
}
.page-header .gold-btn { margin-left: auto; }

.section-title {
  font-family: 'Rajdhani', sans-serif; font-weight: 700; font-size: 13px;
  letter-spacing: 2px; color: var(--text-muted); text-transform: uppercase;
}

.diamond-divider { display: flex; align-items: center; gap: 12px; margin: 12px 0; }
.diamond-line { flex: 1; height: 1px; background: var(--border-subtle); }
.diamond-shape { color: var(--text-faint); font-size: 8px; }

.avatar {
  width: 40px; height: 40px; border-radius: 4px; background: var(--bg-elevated);
  border: 1px solid var(--border-medium); display: flex; align-items: center; justify-content: center;
  font-family: 'Rajdhani', sans-serif; font-weight: 700; color: var(--gold); font-size: 14px;
}

.glow-title {
  font-family: 'Rajdhani', sans-serif; font-weight: 700; font-size: 13px;
  letter-spacing: 2px; text-transform: uppercase;
}

.progress-bar-track { width: 100%; background: var(--bg-deep); border-radius: 3px; overflow: hidden; }
.progress-bar-fill { border-radius: 3px; transition: width 0.6s ease-out; position: relative; }
.progress-bar-fill::after {
  content: ''; position: absolute; right: 0; top: 0; bottom: 0; width: 20px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15));
}

.scripture-ref {
  color: var(--teal); font-weight: 600; background: rgba(43,158,179,0.1);
  padding: 1px 5px; border-radius: 3px; font-size: 0.95em;
  text-decoration: none; cursor: pointer; transition: all 0.2s;
  border-bottom: 1px dotted rgba(43,158,179,0.4);
}
.scripture-ref:hover {
  background: rgba(43,158,179,0.22); border-bottom-color: rgba(43,158,179,0.9);
  color: #3DD4EE;
}

/* Buttons */
.gold-btn {
  background: linear-gradient(135deg, var(--gold-dim), var(--gold));
  color: var(--bg-deep); border: none; padding: 8px 16px; border-radius: 4px;
  font-family: 'Rajdhani', sans-serif; font-weight: 700; font-size: 13px;
  letter-spacing: 1px; text-transform: uppercase; cursor: pointer;
  display: flex; align-items: center; gap: 6px; transition: all 0.2s;
}
.gold-btn:hover { box-shadow: 0 0 16px var(--gold-glow); transform: translateY(-1px); }

.filter-btn {
  background: var(--bg-surface); border: 1px solid var(--border-subtle); color: var(--text-muted);
  padding: 6px 12px; border-radius: 4px; font-size: 12px; cursor: pointer;
  font-family: 'Jost', sans-serif; transition: all 0.2s; white-space: nowrap;
}
.filter-btn:hover { border-color: var(--border-medium); color: var(--text-secondary); }
.filter-btn.active { border-color: var(--gold); color: var(--gold); background: rgba(212,175,55,0.08); }
.filter-divider { width: 1px; height: 24px; background: var(--border-subtle); align-self: center; }

.back-btn {
  background: none; border: none; color: var(--text-muted); cursor: pointer;
  display: flex; align-items: center; gap: 6px; font-size: 13px;
  font-family: 'Jost', sans-serif; transition: color 0.2s;
}
.back-btn:hover { color: var(--gold); }

.icon-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; }
.icon-btn:hover { color: var(--text-primary); }

/* Forms */
.input-label {
  display: block; color: var(--text-muted); font-size: 12px; font-weight: 600;
  letter-spacing: 1px; text-transform: uppercase; margin: 12px 0 6px;
  font-family: 'Rajdhani', sans-serif;
}
.text-input {
  width: 100%; background: var(--bg-deep); border: 1px solid var(--border-subtle);
  color: var(--text-primary); padding: 10px 12px; border-radius: 4px;
  font-family: 'Jost', sans-serif; font-size: 14px; outline: none;
  transition: border-color 0.2s;
}
.text-input:focus { border-color: var(--gold); }
.text-input::placeholder { color: var(--text-faint); }
textarea.text-input { resize: vertical; }
select.text-input { cursor: pointer; }

/* Modal */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 24px;
}
.modal-content {
  background: var(--bg-surface); border: 1px solid var(--border-medium);
  border-radius: 8px; width: 100%; max-width: 520px; max-height: 85vh; overflow-y: auto;
}
.modal-wide { max-width: 720px; }
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid var(--border-subtle);
  font-family: 'Rajdhani', sans-serif; font-weight: 700; letter-spacing: 2px;
  text-transform: uppercase; color: var(--text-primary);
}

/* ═══ HOME ═══ */
.daily-bread {
  text-align: center; padding: 28px 32px; margin-bottom: 24px;
  background: linear-gradient(135deg, rgba(212,175,55,0.05), rgba(28,25,22,0.75));
}
.daily-bread-label {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  font-family: 'Rajdhani', sans-serif; font-weight: 700; font-size: 12px;
  letter-spacing: 3px; color: var(--gold); text-transform: uppercase; margin-bottom: 16px;
}
.daily-verse-text { color: var(--text-secondary); font-size: 16px; line-height: 1.7; font-style: italic; max-width: 700px; margin: 0 auto; }
.daily-verse-ref { color: var(--gold); font-family: 'Rajdhani', sans-serif; font-weight: 600; font-size: 14px; margin-top: 12px; letter-spacing: 1px; }

.home-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }

.stat-card {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  padding: 24px 16px; cursor: pointer;
}
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
.stat-icon { color: var(--gold); margin-bottom: 8px; }
.stat-value { font-family: 'Rajdhani', sans-serif; font-weight: 700; font-size: 36px; color: var(--text-primary); line-height: 1; }
.stat-label { color: var(--text-muted); font-size: 12px; letter-spacing: 1px; text-transform: uppercase; margin-top: 4px; }

.challenge-card { grid-column: span 2; }
.challenge-ring { flex-shrink: 0; }

.activity-card { grid-column: span 2; }
.activity-list { display: flex; flex-direction: column; gap: 0; }
.activity-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 0;
  border-bottom: 1px solid var(--border-subtle);
}
.activity-item:last-child { border-bottom: none; }
.activity-icon { font-size: 16px; flex-shrink: 0; }
.activity-text { flex: 1; font-size: 13px; line-height: 1.4; }
.activity-date { color: var(--text-faint); font-size: 11px; white-space: nowrap; }

.rec-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
.rec-card { display: flex; gap: 14px; }
.rec-book-cover { font-size: 36px; flex-shrink: 0; }

/* ═══ TRIUMPHS ═══ */
.seals-grid { display: grid; gap: 16px; }
.earned-titles-panel { margin-bottom: 24px; }
.earned-title-badge {
  display: flex; align-items: center; gap: 10px; padding: 12px 20px;
  background: var(--bg-elevated); border: 1px solid; border-radius: 4px;
}

.seal-card { cursor: pointer; }
.seal-card:hover { border-color: var(--border-medium); }
.seal-complete { background: linear-gradient(135deg, rgba(212,175,55,0.04), var(--panel-bg)); }
.seal-header { display: flex; gap: 16px; align-items: flex-start; }
.seal-icon-wrap {
  width: 56px; height: 56px; border-radius: 8px; border: 1px solid;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.seal-name { font-family: 'Rajdhani', sans-serif; font-weight: 700; font-size: 20px; margin: 0; letter-spacing: 1px; }

.seal-triumphs { margin-top: 8px; }
.triumph-row {
  display: flex; align-items: center; gap: 12px; padding: 10px 0;
  border-bottom: 1px solid var(--border-subtle);
}
.triumph-row:last-child { border-bottom: none; }
.triumph-check {
  width: 22px; height: 22px; border: 2px solid var(--border-medium); border-radius: 4px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--bg-deep);
}
.mini-seal {
  font-family: 'Rajdhani', sans-serif; font-size: 11px; font-weight: 700;
  letter-spacing: 1px; text-transform: uppercase; padding: 3px 8px;
  border: 1px solid; border-radius: 3px;
}

/* ═══ LIBRARY ═══ */
.book-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
.book-card { cursor: pointer; display: flex; gap: 14px; }
.book-card:hover { transform: translateY(-2px); }
.book-complete { background: linear-gradient(135deg, rgba(39,174,96,0.06), var(--panel-bg)); }
.book-cover-emoji { font-size: 36px; flex-shrink: 0; }
.book-cover-img { display: block; flex-shrink: 0; }
.book-cover-placeholder {
  flex-shrink: 0; border-radius: 3px; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(145deg, #1E1B18, #2A2520); border: 1px solid var(--border-subtle);
  color: #6B6152; font-family: 'Rajdhani', sans-serif; font-weight: 700; letter-spacing: 1px;
}
.book-info { flex: 1; min-width: 0; }
.book-title { font-weight: 700; color: var(--text-primary); font-size: 14px; line-height: 1.3; }
.book-author { color: var(--text-muted); font-size: 12px; margin-top: 2px; }
.book-category-tag {
  display: inline-block; padding: 2px 8px; border-radius: 3px;
  background: var(--bg-deep); color: var(--text-faint); font-size: 11px; margin-top: 6px;
}

.fireteam-members-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.fireteam-member-progress { padding: 8px; background: var(--bg-deep); border-radius: 4px; }

/* ═══ INVITE TO READ ═══ */
.invite-read-btn {
  display: flex; align-items: center; gap: 12px; width: 100%;
  padding: 14px 16px; background: rgba(43,158,179,0.06); border: 1px solid #2B9EB322;
  border-radius: 6px; cursor: pointer; transition: all 0.25s; color: #2B9EB3;
}
.invite-read-btn:hover { background: rgba(43,158,179,0.12); border-color: #2B9EB344; }

.invite-members-list { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
.invite-member-row {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  background: var(--bg-deep); border: 1px solid var(--border-subtle); border-radius: 6px;
  cursor: pointer; transition: all 0.2s;
}
.invite-member-row:hover { border-color: var(--border-medium); }
.invite-member-row.selected { border-color: #2B9EB3; background: rgba(43,158,179,0.06); }
.invite-check {
  width: 20px; height: 20px; border: 2px solid var(--border-medium); border-radius: 4px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  transition: all 0.2s; color: var(--bg-deep);
}
.invite-check.checked { border-color: #2B9EB3; background: #2B9EB3; }

.invite-count-badge {
  background: #2B9EB3; color: var(--bg-deep); font-size: 11px; font-weight: 700;
  font-family: 'Rajdhani', sans-serif; padding: 1px 8px; border-radius: 10px; letter-spacing: 0.5px;
}
.invite-cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
.invite-card { background: linear-gradient(135deg, rgba(43,158,179,0.04), var(--panel-bg)); }
.decline-btn {
  background: var(--bg-deep); border: 1px solid var(--border-subtle); color: var(--text-muted);
  padding: 8px 12px; border-radius: 4px; cursor: pointer; transition: all 0.2s;
  display: flex; align-items: center;
}
.decline-btn:hover { border-color: var(--red); color: var(--red); }

.group-reads-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 14px; }
.group-read-card { background: linear-gradient(135deg, rgba(43,158,179,0.04), var(--panel-bg)); }
.group-read-participants { display: flex; flex-direction: column; gap: 8px; }
.group-read-member { padding: 6px 10px; background: var(--bg-deep); border-radius: 4px; }
.group-read-badge {
  font-family: 'Rajdhani', sans-serif; font-size: 10px; font-weight: 700;
  letter-spacing: 1.5px; color: #2B9EB3; background: rgba(43,158,179,0.12);
  border: 1px solid #2B9EB333; padding: 2px 8px; border-radius: 3px;
  position: absolute; top: 8px; right: 8px;
}
.book-card { position: relative; }

.gr-open-chat-btn {
  display: flex; align-items: center; gap: 8px; width: 100%;
  margin-top: 14px; padding: 10px 14px; background: rgba(43,158,179,0.06);
  border: 1px solid #2B9EB322; border-radius: 6px; cursor: pointer;
  transition: all 0.25s; color: #2B9EB3; font-family: 'Rajdhani', sans-serif;
  font-size: 13px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;
}
.gr-open-chat-btn:hover { background: rgba(43,158,179,0.12); border-color: #2B9EB344; }
.gr-msg-count {
  background: #2B9EB3; color: var(--bg-deep); font-size: 10px; font-weight: 700;
  padding: 1px 7px; border-radius: 10px; min-width: 18px; text-align: center;
}

/* ═══ GROUP READ DETAIL ═══ */
.gr-detail-header { background: linear-gradient(135deg, rgba(43,158,179,0.05), var(--panel-bg)); }
.gr-participants-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
.gr-participant-card { padding: 14px; }

/* ═══ GROUP READ CHAT ═══ */
.gr-chat-panel { padding: 0; display: flex; flex-direction: column; overflow: hidden; }
.gr-chat-messages {
  flex: 1; padding: 16px; max-height: 480px; min-height: 200px;
  overflow-y: auto; display: flex; flex-direction: column; gap: 4px;
}
.gr-chat-messages::-webkit-scrollbar { width: 4px; }
.gr-chat-messages::-webkit-scrollbar-track { background: transparent; }
.gr-chat-messages::-webkit-scrollbar-thumb { background: #2A2520; border-radius: 2px; }
.gr-chat-messages::-webkit-scrollbar-thumb:hover { background: #3A3428; }

.gr-chat-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 48px 16px; text-align: center;
}

.gr-chat-msg { display: flex; flex-direction: column; max-width: 80%; align-self: flex-start; }
.gr-chat-msg.own { align-self: flex-end; align-items: flex-end; }
.gr-chat-msg.other { align-self: flex-start; align-items: flex-start; }

.gr-chat-msg-header {
  display: flex; align-items: center; gap: 6px; margin-top: 12px; margin-bottom: 3px;
}
.gr-chat-msg-header.own { flex-direction: row-reverse; }

.gr-chat-author { font-size: 12px; font-weight: 600; color: #D4AF37; }
.gr-chat-author.own { color: #2B9EB3; }

.gr-chat-bubble {
  padding: 8px 14px; border-radius: 4px 12px 12px 12px;
  background: var(--bg-elevated); color: var(--text-secondary);
  font-size: 14px; line-height: 1.5; border: 1px solid var(--border-subtle);
  word-break: break-word;
}
.gr-chat-bubble.other {
  background: var(--bg-elevated); border-color: var(--border-subtle);
  border-left: 2px solid #D4AF37;
}
.gr-chat-bubble.own {
  background: rgba(43,158,179,0.1); border-color: #2B9EB322;
  border-radius: 12px 4px 12px 12px; color: #C8D8DC;
  border-right: 2px solid #2B9EB3; border-left: none;
}

.gr-chat-input-row {
  display: flex; gap: 8px; padding: 12px 16px;
  border-top: 1px solid var(--border-subtle); background: var(--bg-surface);
}
.gr-chat-input { flex: 1; margin: 0; border-radius: 20px; padding: 10px 16px; font-size: 14px; }
.gr-chat-send { border-radius: 20px; padding: 10px 16px; }

/* ═══ REVIEWS ═══ */
.reviews-list { display: flex; flex-direction: column; gap: 16px; }
.review-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.review-date { color: var(--text-faint); font-size: 12px; }
.review-book-info { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; padding: 10px; background: var(--bg-deep); border-radius: 4px; }
.review-text { color: var(--text-secondary); font-size: 14px; line-height: 1.7; margin: 0; }
.review-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--border-subtle); }
.review-like-btn {
  display: flex; align-items: center; gap: 5px;
  background: none; border: 1px solid transparent; border-radius: 20px;
  padding: 4px 12px; cursor: pointer;
  font-family: 'Jost', sans-serif; font-size: 13px; font-weight: 500;
  color: var(--text-muted); transition: all 0.2s;
}
.review-like-btn:hover { color: #C0392B; border-color: rgba(192, 57, 43, 0.25); background: rgba(192, 57, 43, 0.06); }
.review-like-btn.liked { color: #C0392B; border-color: rgba(192, 57, 43, 0.3); background: rgba(192, 57, 43, 0.08); }

/* ═══ FORUM ═══ */
.thread-list { display: flex; flex-direction: column; gap: 12px; }
.thread-card { cursor: pointer; }
.thread-card:hover { border-color: var(--gold); }
.thread-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.forum-cat-badge {
  font-family: 'Rajdhani', sans-serif; font-size: 11px; font-weight: 700;
  letter-spacing: 1px; text-transform: uppercase; color: var(--teal);
  background: rgba(43,158,179,0.1); padding: 3px 8px; border-radius: 3px;
}
.thread-title { color: var(--text-primary); font-size: 16px; margin: 0 0 6px; font-weight: 600; }
.thread-meta { display: flex; justify-content: space-between; align-items: center; }

.thread-header-detail { padding: 4px 0; }
.post-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.post-date { color: var(--text-faint); font-size: 12px; }
.post-body { color: var(--text-secondary); font-size: 14px; line-height: 1.7; }

/* ═══ MEMBERS ═══ */
.members-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
.member-card {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  cursor: pointer; padding: 24px 16px;
}
.member-card:hover { transform: translateY(-3px); box-shadow: 0 8px 30px rgba(0,0,0,0.3); }
.member-rank {
  font-family: 'Rajdhani', sans-serif; font-weight: 700; font-size: 12px;
  color: var(--text-faint); letter-spacing: 1px; margin-bottom: 8px;
}
.member-avatar-lg {
  width: 64px; height: 64px; border-radius: 8px; background: var(--bg-elevated);
  border: 2px solid var(--border-medium); display: flex; align-items: center; justify-content: center;
  font-family: 'Rajdhani', sans-serif; font-weight: 700; color: var(--gold); font-size: 22px;
}
.member-stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; width: 100%; }
.member-stat { text-align: center; }
.stat-num { display: block; font-family: 'Rajdhani', sans-serif; font-weight: 700; font-size: 20px; color: var(--text-primary); }
.stat-lbl { font-size: 10px; color: var(--text-faint); text-transform: uppercase; letter-spacing: 1px; }

/* ═══ FRIEND SYSTEM ═══ */
.friend-search-result {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px; background: var(--bg-deep); border: 1px solid var(--border-subtle);
  border-radius: 6px; transition: all 0.2s;
}
.friend-search-result:hover { border-color: var(--border-medium); background: var(--bg-elevated); }
.remove-friend-btn {
  display: flex; align-items: center; gap: 4px;
  margin-top: 8px; padding: 4px 10px;
  background: transparent; border: 1px solid transparent;
  border-radius: 3px; color: var(--text-faint);
  font-family: 'Rajdhani', sans-serif; font-size: 10px; font-weight: 600;
  letter-spacing: 1px; text-transform: uppercase; cursor: pointer; transition: all 0.2s;
}
.remove-friend-btn:hover { color: var(--red); border-color: rgba(192,57,43,0.3); background: rgba(192,57,43,0.06); }

/* ═══ PROFILE ═══ */
.profile-header-card {
  background: linear-gradient(135deg, rgba(212,175,55,0.04), var(--panel-bg));
  margin-bottom: 20px;
}
.profile-top { display: flex; align-items: center; gap: 20px; margin-bottom: 20px; }
.profile-avatar-xl {
  width: 80px; height: 80px; border-radius: 12px; background: var(--bg-elevated);
  border: 2px solid var(--gold); display: flex; align-items: center; justify-content: center;
  font-family: 'Rajdhani', sans-serif; font-weight: 700; color: var(--gold); font-size: 28px;
  box-shadow: 0 0 30px var(--gold-glow);
}
.profile-stats-row { display: flex; gap: 20px; flex-wrap: wrap; }
.profile-stat { text-align: center; }
.p-stat-num { display: block; font-family: 'Rajdhani', sans-serif; font-weight: 700; font-size: 24px; color: var(--text-primary); }
.p-stat-lbl { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }

.equipped-badge {
  font-family: 'Rajdhani', sans-serif; font-size: 10px; font-weight: 700;
  color: var(--gold); letter-spacing: 2px; margin-left: auto;
  border: 1px solid var(--gold); padding: 2px 8px; border-radius: 3px;
}

.bookshelf-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
.bookshelf-item { display: flex; align-items: center; gap: 10px; padding: 12px; }

/* ═══ THE DIRECTOR ═══ */
.director-page { max-width: 1400px; }
.director-toggle {
  background: var(--bg-surface); border: 1px solid var(--border-subtle); color: var(--text-muted);
  padding: 10px 24px; border-radius: 4px; font-family: 'Rajdhani', sans-serif; font-size: 14px;
  font-weight: 700; letter-spacing: 2px; text-transform: uppercase; cursor: pointer; transition: all 0.25s;
}
.director-toggle.active { border-color: var(--gold); color: var(--gold); background: rgba(212,175,55,0.08); }
.director-toggle:hover { border-color: var(--border-medium); }

.director-stats-bar {
  display: flex; align-items: center; gap: 20px; padding: 14px 24px; margin-bottom: 24px; flex-wrap: wrap;
}
.director-stat-item { display: flex; align-items: baseline; gap: 6px; }
.director-stat-num { font-family: 'Rajdhani', sans-serif; font-weight: 700; font-size: 22px; color: var(--text-primary); }
.director-stat-lbl { font-size: 12px; color: var(--text-muted); }
.director-stat-divider { width: 1px; height: 28px; background: var(--border-subtle); }

.director-layout { display: grid; grid-template-columns: 1fr 380px; gap: 24px; align-items: start; }

.solar-system-container { position: relative; }
.solar-svg { width: 100%; height: auto; display: block; }
.solar-legend {
  display: flex; flex-wrap: wrap; gap: 12px 20px; justify-content: center;
  padding: 12px 0;
}
.solar-legend-item { display: flex; align-items: center; gap: 6px; }
.solar-legend-dot { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }
.solar-legend-name { font-size: 11px; color: var(--text-muted); }
.solar-legend-pct { font-family: 'Rajdhani', sans-serif; font-weight: 700; font-size: 12px; }

.director-detail-panel { display: flex; flex-direction: column; gap: 16px; }
.director-empty-detail {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 60px 20px; text-align: center;
}
.director-book-header { display: flex; justify-content: space-between; align-items: flex-start; }
.director-book-cat {
  font-family: 'Rajdhani', sans-serif; font-weight: 700; font-size: 10px;
  letter-spacing: 2px; text-transform: uppercase; margin-bottom: 2px;
}
.director-book-name {
  font-family: 'Rajdhani', sans-serif; font-weight: 700; font-size: 22px;
  color: var(--text-primary); margin: 0; letter-spacing: 1px;
}

.chapter-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(38px, 1fr)); gap: 4px;
}
.chapter-btn {
  aspect-ratio: 1; border: 1px solid var(--border-subtle); background: var(--bg-deep);
  color: var(--text-faint); font-family: 'Rajdhani', sans-serif; font-size: 12px; font-weight: 700;
  border-radius: 4px; cursor: pointer; transition: all 0.15s; display: flex; align-items: center;
  justify-content: center;
}
.chapter-btn:hover { border-color: var(--border-medium); color: var(--text-secondary); }
.chapter-btn.read { font-weight: 700; }

.director-booklist { max-height: 400px; overflow-y: auto; padding-right: 4px; }
.director-booklist::-webkit-scrollbar { width: 3px; }
.director-booklist::-webkit-scrollbar-track { background: transparent; }
.director-booklist::-webkit-scrollbar-thumb { background: #2A2520; border-radius: 2px; }
.director-list-cat {
  font-family: 'Rajdhani', sans-serif; font-weight: 700; font-size: 10px;
  letter-spacing: 2px; text-transform: uppercase; padding: 10px 0 4px;
}
.director-list-book {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 6px 10px; border-radius: 4px; cursor: pointer; transition: all 0.15s;
  border: 1px solid transparent;
}
.director-list-book:hover { background: var(--bg-elevated); }
.director-list-book.active { background: var(--bg-elevated); }
.director-list-book.complete .director-list-name { color: #27AE60; }
.director-list-name { font-size: 13px; color: var(--text-secondary); white-space: nowrap; }
.director-list-pct { font-family: 'Rajdhani', sans-serif; font-weight: 700; font-size: 11px; white-space: nowrap; min-width: 36px; text-align: right; }
.director-list-book .progress-bar-track { width: 50px; }

/* ═══ ILLUMINATION ═══ */
.illumination-scene { display: flex; justify-content: center; margin-bottom: 24px; }
.illumination-svg { width: 100%; max-width: 800px; height: auto; display: block; }
.illumination-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.illumination-card { cursor: pointer; transition: all 0.25s; }
.illumination-card:hover { transform: translateY(-2px); }
.illumination-card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.illumination-card-icon { font-size: 28px; }
.illumination-card-title { font-family: 'Rajdhani', sans-serif; font-weight: 700; font-size: 18px; color: var(--text-primary); letter-spacing: 1px; }
.illumination-card-sub { color: var(--text-muted); font-size: 12px; }
.illumination-ring { margin-left: auto; flex-shrink: 0; }
.illumination-card-footer { display: flex; justify-content: space-between; margin-top: 8px; color: var(--text-faint); font-size: 11px; }

/* ═══ PRESTIGE ═══ */
.prestige-emblem { vertical-align: middle; flex-shrink: 0; }
.prestige-section { background: linear-gradient(135deg, rgba(212,175,55,0.03), var(--panel-bg)); }
.prestige-header { display: flex; align-items: center; gap: 16px; }
.prestige-emblem-display { flex-shrink: 0; }
.prestige-title {
  font-family: 'Rajdhani', sans-serif; font-weight: 700; font-size: 18px;
  color: var(--text-primary); letter-spacing: 2px;
}
.prestige-sub { color: var(--text-muted); font-size: 13px; margin-top: 2px; }
.prestige-btn {
  margin-left: auto; display: flex; align-items: center; gap: 8px;
  padding: 12px 24px; background: linear-gradient(135deg, #D4AF37, #F0C845);
  border: none; border-radius: 4px; color: #0D0B0A; font-family: 'Rajdhani', sans-serif;
  font-size: 14px; font-weight: 800; letter-spacing: 2px; cursor: pointer;
  transition: all 0.3s; flex-shrink: 0;
  box-shadow: 0 0 20px rgba(212,175,55,0.2);
  animation: prestigePulse 2s ease-in-out infinite;
}
.prestige-btn:hover { transform: scale(1.05); box-shadow: 0 0 30px rgba(212,175,55,0.4); }
@keyframes prestigePulse {
  0%, 100% { box-shadow: 0 0 20px rgba(212,175,55,0.2); }
  50% { box-shadow: 0 0 35px rgba(212,175,55,0.45); }
}

.prestige-confirm-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 28px; background: linear-gradient(135deg, #D4AF37, #F0C845);
  border: none; border-radius: 4px; color: #0D0B0A; font-family: 'Rajdhani', sans-serif;
  font-size: 15px; font-weight: 800; letter-spacing: 2px; cursor: pointer;
  transition: all 0.2s;
}
.prestige-confirm-btn:hover { transform: scale(1.05); }

/* ═══ PRESTIGE ANIMATION ═══ */
.prestige-anim-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(13, 11, 10, 0.98);
  display: flex; align-items: center; justify-content: center;
  transition: opacity 1.5s ease;
}
.prestige-anim-text {
  position: absolute; z-index: 5;
  text-align: center;
  transition: opacity 1.2s ease;
  top: 50%; left: 50%; transform: translate(-50%, -50%);
  margin-top: 100px;
}
.prestige-anim-label {
  font-family: 'Rajdhani', sans-serif; font-weight: 800;
  font-size: 16px; letter-spacing: 6px; text-transform: uppercase;
  margin-bottom: 8px;
  animation: animLabelIn 1s ease both;
}
.prestige-anim-name {
  font-family: 'Rajdhani', sans-serif; font-weight: 700;
  font-size: 48px; letter-spacing: 4px; text-transform: uppercase;
  line-height: 1.1;
  animation: animNameIn 1.2s ease 0.3s both;
}
.prestige-anim-sub {
  font-family: 'Jost', sans-serif; font-weight: 400;
  font-size: 14px; color: #6B6152; letter-spacing: 1px;
  margin-top: 12px;
  animation: animSubIn 1s ease 0.8s both;
}
.prestige-anim-continue {
  margin-top: 32px;
  padding: 10px 32px;
  background: transparent;
  border: 1px solid #D4AF37;
  border-radius: 4px;
  font-family: 'Rajdhani', sans-serif;
  font-size: 13px; font-weight: 700;
  letter-spacing: 3px; text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s;
  animation: animBtnIn 0.8s ease 1.2s both;
}
.prestige-anim-continue:hover {
  background: rgba(212, 175, 55, 0.1);
  box-shadow: 0 0 20px rgba(212, 175, 55, 0.2);
}
@keyframes animLabelIn {
  from { opacity: 0; transform: translateY(20px); letter-spacing: 12px; }
  to { opacity: 1; transform: translateY(0); letter-spacing: 6px; }
}
@keyframes animNameIn {
  from { opacity: 0; transform: scale(0.7); filter: blur(8px); }
  to { opacity: 1; transform: scale(1); filter: blur(0); }
}
@keyframes animSubIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 0.7; transform: translateY(0); }
}
@keyframes animBtnIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 600px) {
  .prestige-anim-name { font-size: 32px; letter-spacing: 2px; }
  .prestige-anim-label { font-size: 13px; letter-spacing: 4px; }
  .prestige-anim-text { margin-top: 80px; padding: 0 20px; }
}

.prestige-wings-preview { margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border-subtle); }
.prestige-wings-label {
  font-family: 'Rajdhani', sans-serif; font-weight: 700; font-size: 10px;
  letter-spacing: 2px; color: var(--text-faint); margin-bottom: 8px;
}
.prestige-wings-row { display: flex; gap: 6px; flex-wrap: wrap; }
.prestige-point-slot {
  width: 28px; height: 28px; border-radius: 4px;
  background: var(--bg-deep); border: 1px solid var(--border-subtle);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0;
}
.prestige-point-slot.earned {
  background: rgba(212,175,55,0.04);
}

/* ═══ PROFILE PRESTIGE ═══ */
.profile-prestige-showcase { background: linear-gradient(135deg, rgba(212,175,55,0.03), var(--panel-bg)); }
.profile-prestige-top { display: flex; align-items: center; gap: 20px; margin-bottom: 16px; }
.profile-prestige-info { flex: 1; }
.profile-prestige-level {
  font-family: 'Rajdhani', sans-serif; font-weight: 800; font-size: 20px; letter-spacing: 3px;
}
.profile-prestige-name {
  font-family: 'Rajdhani', sans-serif; font-weight: 600; font-size: 13px; letter-spacing: 2px;
  text-transform: uppercase; opacity: 0.7;
}
.profile-prestige-desc { color: var(--text-muted); font-size: 13px; margin-top: 6px; }
.profile-prestige-stars { display: flex; gap: 6px; flex-wrap: wrap; }

/* ═══ HAMBURGER & MOBILE MENU ═══ */
.hamburger-btn {
  display: none; background: none; border: none; color: var(--text-secondary);
  cursor: pointer; padding: 8px; margin-left: 8px; flex-shrink: 0;
}
.mobile-menu-backdrop {
  display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6);
  z-index: 199;
}
.mobile-menu {
  display: none; position: fixed; top: 0; right: 0; bottom: 0; width: 280px;
  background: #141210; border-left: 1px solid var(--border-subtle);
  z-index: 200; transform: translateX(100%); transition: transform 0.3s ease;
  flex-direction: column; padding: 20px 0; overflow-y: auto;
}
.mobile-menu.open { transform: translateX(0); }
.mobile-menu-user {
  display: flex; align-items: center; gap: 12px; padding: 12px 20px;
  cursor: pointer; margin-bottom: 4px;
}
.mobile-menu-user:hover { background: var(--bg-elevated); }
.mobile-menu-divider { height: 1px; background: var(--border-subtle); margin: 8px 16px; }
.mobile-menu-item {
  display: flex; align-items: center; gap: 14px; padding: 14px 24px;
  background: none; border: none; color: var(--text-muted); font-family: 'Rajdhani', sans-serif;
  font-size: 15px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase;
  cursor: pointer; transition: all 0.15s; width: 100%; text-align: left;
}
.mobile-menu-item:hover { background: var(--bg-elevated); color: var(--text-secondary); }
.mobile-menu-item.active { color: var(--gold); background: rgba(212,175,55,0.06); border-right: 3px solid var(--gold); }
.mobile-menu-item svg { flex-shrink: 0; }
.mobile-menu-signout { color: #6B6152; font-size: 13px; }
.mobile-menu-signout:hover { color: var(--red); }

/* ═══ ADMIN ═══ */
.admin-sm-btn {
  width: 22px; height: 22px; border-radius: 3px; border: 1px solid var(--border-subtle);
  background: var(--bg-deep); color: var(--text-muted); font-size: 12px; font-weight: 700;
  cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s;
  font-family: 'Rajdhani', sans-serif;
}
.admin-sm-btn:hover { border-color: var(--gold); color: var(--gold); }
.admin-add-btn {
  display: flex; align-items: center; gap: 6px; margin-top: 10px; padding: 8px 14px;
  background: none; border: 1px dashed var(--border-subtle); border-radius: 4px;
  color: var(--text-muted); font-family: 'Rajdhani', sans-serif; font-size: 12px;
  font-weight: 600; letter-spacing: 1px; cursor: pointer; transition: all 0.15s;
}
.admin-add-btn:hover { border-color: var(--gold); color: var(--gold); }
.admin-delete-btn {
  display: flex; align-items: center; gap: 4px; padding: 4px 10px; background: none;
  border: 1px solid #C0392B33; border-radius: 3px; color: #C0392B; font-size: 11px;
  font-family: 'Rajdhani', sans-serif; font-weight: 600; letter-spacing: 0.5px;
  cursor: pointer; transition: all 0.15s;
}
.admin-delete-btn:hover { background: rgba(192,57,43,0.08); border-color: #C0392B66; }
.admin-icon-btn {
  width: 36px; height: 36px; border-radius: 4px; border: 1px solid var(--border-subtle);
  background: var(--bg-deep); color: var(--text-secondary); font-size: 18px;
  cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s;
}
.admin-icon-btn:hover { border-color: var(--gold); }
.admin-icon-btn.selected { border-width: 2px; }
.admin-color-btn {
  width: 28px; height: 28px; border-radius: 50%; border: 2px solid transparent;
  cursor: pointer; transition: all 0.15s;
}
.admin-color-btn:hover { transform: scale(1.15); }
.admin-badge {
  font-family: 'Rajdhani', sans-serif; font-size: 9px; font-weight: 700;
  letter-spacing: 1.5px; color: #C0392B; background: rgba(192,57,43,0.1);
  border: 1px solid #C0392B33; padding: 1px 6px; border-radius: 3px;
}

/* ═══ RESPONSIVE ═══ */
@media (max-width: 768px) {
  /* ═══ HAMBURGER MENU ═══ */
  .nav-desktop { display: none; }
  .hamburger-btn { display: block; }
  .mobile-menu-backdrop { display: block; }
  .mobile-menu { display: flex; }
  .header-user-name { display: none; }

  /* ═══ HEADER ═══ */
  .header { padding: 0 12px; }
  .header-inner { height: 52px; }
  .logo { font-size: 24px; margin-right: auto; letter-spacing: 2px; }

  /* ═══ PAGE CONTENT ═══ */
  .page-content { padding: 16px 12px; }
  .page-header h2 { font-size: 20px; }
  .section-title { font-size: 10px; }

  /* ═══ LOGIN ═══ */
  .login-logo { font-size: 48px; letter-spacing: 4px; }
  .login-tagline { font-size: 11px; margin-bottom: 32px; }
  .login-grid { grid-template-columns: 1fr; gap: 8px; max-width: 320px; }
  .login-btn { padding: 12px 16px; }

  /* ═══ HOME PAGE ═══ */
  .home-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
  .challenge-card, .activity-card { grid-column: span 2; }
  .stat-card { padding: 16px 10px; }
  .stat-value { font-size: 28px; }
  .stat-label { font-size: 10px; }
  .daily-verse-text { font-size: 15px; }
  .rec-grid { grid-template-columns: 1fr; }
  .activity-item { gap: 8px; }
  .activity-text { font-size: 12px; }

  /* ═══ LIBRARY ═══ */
  .book-grid { grid-template-columns: 1fr; gap: 10px; }
  .book-card { gap: 10px; }
  .book-cover-emoji { font-size: 28px; }
  .book-title { font-size: 13px; }

  /* ═══ GROUP READS ═══ */
  .group-reads-grid { grid-template-columns: 1fr; gap: 10px; }
  .invite-cards-grid { grid-template-columns: 1fr; gap: 10px; }
  .gr-participants-row { grid-template-columns: 1fr; gap: 8px; }
  .fireteam-members-grid { grid-template-columns: 1fr; gap: 8px; }
  .gr-chat-messages { max-height: 360px; min-height: 180px; padding: 12px; }
  .gr-chat-msg { max-width: 88%; }
  .gr-chat-bubble { font-size: 13px; padding: 7px 12px; }
  .gr-chat-input-row { padding: 10px 12px; }
  .gr-chat-input { font-size: 13px; padding: 8px 14px; }

  /* ═══ REVIEWS ═══ */
  .review-header { flex-direction: column; align-items: flex-start; gap: 6px; }
  .review-text { font-size: 13px; }
  .review-book-info { padding: 8px; gap: 6px; }

  /* ═══ FORUM ═══ */
  .thread-title { font-size: 14px; }
  .thread-card-top { flex-direction: column; align-items: flex-start; gap: 4px; }
  .thread-meta { flex-direction: column; align-items: flex-start; gap: 4px; }
  .post-body { font-size: 13px; }
  .post-header { flex-direction: column; align-items: flex-start; gap: 4px; }

  /* ═══ MEMBERS / FIRETEAM ═══ */
  .members-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
  .member-card { padding: 16px 10px; }
  .member-avatar-lg { width: 52px; height: 52px; font-size: 18px; }
  .member-stats-grid { gap: 6px; }

  /* ═══ PROFILE ═══ */
  .profile-top { flex-direction: column; align-items: center; text-align: center; }
  .profile-avatar-xl { width: 64px; height: 64px; font-size: 22px; }
  .profile-stats-row { gap: 8px; flex-wrap: wrap; justify-content: center; }
  .profile-stat { min-width: 60px; }
  .p-stat-num { font-size: 20px; }
  .bookshelf-grid { grid-template-columns: 1fr; }
  .profile-prestige-top { flex-direction: column; align-items: center; text-align: center; gap: 12px; }
  .profile-prestige-stars { justify-content: center; }

  /* ═══ TRIUMPHS ═══ */
  .seal-header { gap: 10px; }
  .seal-icon-wrap { width: 44px; height: 44px; }
  .seal-name { font-size: 16px; }
  .triumph-row { gap: 8px; }

  /* ═══ DIRECTOR ═══ */
  .director-page { overflow-x: hidden; }
  .director-layout { grid-template-columns: 1fr; }
  .director-stats-bar { gap: 10px; padding: 12px 14px; flex-wrap: wrap; }
  .director-stats-bar .director-stat-divider { display: none; }
  .director-stat-num { font-size: 18px; }
  .solar-system-container { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .solar-svg { min-width: 500px; }
  .solar-legend { gap: 8px 14px; }
  .director-detail-panel { order: -1; }
  .chapter-grid { grid-template-columns: repeat(auto-fill, minmax(34px, 1fr)); gap: 3px; }
  .director-booklist { max-height: 300px; }
  .director-toggle { padding: 8px 14px; font-size: 12px; letter-spacing: 1px; }
  .illumination-stats { grid-template-columns: 1fr; }
  .illumination-card-header { gap: 10px; }
  .illumination-card-title { font-size: 16px; }

  /* ═══ PRESTIGE ═══ */
  .prestige-header { flex-direction: column; align-items: center; text-align: center; gap: 10px; }
  .prestige-btn { margin-left: 0; margin-top: 4px; }
  .prestige-title { font-size: 15px; }
  .prestige-wings-row { justify-content: center; }

  /* ═══ MODALS ═══ */
  .modal-overlay { padding: 12px; align-items: flex-end; }
  .modal-content { max-height: 90vh; border-radius: 12px 12px 0 0; }
  .modal-header { padding: 14px 16px; }
  .modal-header h3 { font-size: 16px; }

  /* ═══ FORMS & CONTROLS ═══ */
  .text-input, .text-area { font-size: 16px; }
  .gold-btn { padding: 10px 16px; font-size: 12px; }
  .filter-btn { padding: 6px 10px; font-size: 11px; }

  /* ═══ MISC ═══ */
  .diamond-divider { margin: 8px 0; }
  .glass-panel { padding: 14px; }
  .equipped-badge { font-size: 8px; padding: 2px 5px; }
}

@media (max-width: 480px) {
  .logo { font-size: 20px; margin-right: 8px; letter-spacing: 1px; }
  .nav-btn { padding: 14px 6px; font-size: 9px; letter-spacing: 0.3px; }
  .page-content { padding: 12px 8px; }
  .home-grid { grid-template-columns: 1fr; gap: 8px; }
  .stat-value { font-size: 24px; }
  .members-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
  .book-grid { grid-template-columns: 1fr; }
  .solar-svg { min-width: 420px; }
  .director-toggle { padding: 6px 10px; font-size: 11px; }
  .prestige-point-slot { width: 24px; height: 24px; }
  .modal-content { max-width: 100%; }
  .profile-stats-row { gap: 4px; }
  .p-stat-num { font-size: 18px; }
  .profile-stat { min-width: 50px; }
}

@media (max-width: 360px) {
  .nav-btn { padding: 12px 4px; font-size: 8px; }
  .logo { font-size: 18px; }
  .header-inner { height: 46px; }
  .page-header h2 { font-size: 18px; }
  .stat-value { font-size: 22px; }
  .director-toggle { padding: 5px 8px; font-size: 10px; }
}

/* ═══ ANIMATIONS ═══ */
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
.page-content { animation: fadeIn 0.35s ease-out; }
.glass-panel { animation: fadeIn 0.4s ease-out backwards; }
.seal-card:nth-child(1) { animation-delay: 0.05s; }
.seal-card:nth-child(2) { animation-delay: 0.1s; }
.seal-card:nth-child(3) { animation-delay: 0.15s; }
.seal-card:nth-child(4) { animation-delay: 0.2s; }
.seal-card:nth-child(5) { animation-delay: 0.25s; }
.seal-card:nth-child(6) { animation-delay: 0.3s; }

/* ═══ Slot Machine Counter Animation ═══ */
.slot-overlay {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0, 0, 0, 0);
  transition: background 0.4s ease;
  cursor: pointer;
}
.slot-overlay.enter { background: rgba(0, 0, 0, 0.7); }
.slot-overlay.counting { background: rgba(0, 0, 0, 0.85); }
.slot-overlay.done { background: rgba(0, 0, 0, 0.85); }

.slot-overlay-content {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  animation: slotContentIn 0.4s ease-out;
}

@keyframes slotContentIn {
  from { opacity: 0; transform: scale(0.85) translateY(20px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.slot-added-label {
  font-family: 'Rajdhani', sans-serif;
  font-size: 28px; font-weight: 700; color: #27AE60;
  letter-spacing: 2px;
  text-shadow: 0 0 20px rgba(39, 174, 96, 0.5);
  animation: slotPulse 0.6s ease-in-out infinite alternate;
  animation-delay: 0.3s;
}

@keyframes slotPulse {
  from { opacity: 0.8; }
  to { opacity: 1; }
}

.slot-book-title {
  font-family: 'Jost', sans-serif;
  font-size: 14px; color: #A09880;
  max-width: 280px; text-align: center;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.slot-remaining {
  font-family: 'Rajdhani', sans-serif;
  font-size: 15px; color: #6B6152;
  letter-spacing: 1px; margin-bottom: 2px;
  animation: slotFadeDown 0.5s ease-out;
}
.slot-remaining-num {
  color: #D4AF37; font-weight: 700; font-size: 20px;
}
.slot-remaining-text {
  font-weight: 500;
}

.slot-completed-badge {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  margin-bottom: 6px;
  animation: slotBadgeIn 0.6s ease-out;
}
.slot-completed-icon {
  font-size: 32px; color: #D4AF37;
  text-shadow: 0 0 24px rgba(212, 175, 55, 0.7), 0 0 48px rgba(212, 175, 55, 0.3);
  animation: slotStarPulse 1.2s ease-in-out infinite alternate;
}
.slot-completed-text {
  font-family: 'Rajdhani', sans-serif;
  font-size: 14px; font-weight: 700;
  color: #27AE60; letter-spacing: 3px;
  text-shadow: 0 0 12px rgba(39, 174, 96, 0.4);
}

@keyframes slotFadeDown {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes slotBadgeIn {
  0% { opacity: 0; transform: scale(0.5); }
  60% { opacity: 1; transform: scale(1.1); }
  100% { transform: scale(1); }
}
@keyframes slotStarPulse {
  from { transform: scale(1); text-shadow: 0 0 24px rgba(212, 175, 55, 0.7), 0 0 48px rgba(212, 175, 55, 0.3); }
  to { transform: scale(1.15); text-shadow: 0 0 32px rgba(212, 175, 55, 0.9), 0 0 64px rgba(212, 175, 55, 0.5); }
}

/* ═══ Flame Ascension Animation ═══ */
.flame-anim-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(13, 11, 10, 0.98);
  transition: opacity 1.0s ease-out;
}
.flame-anim-text {
  position: absolute; inset: 0; z-index: 5;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  transition: opacity 0.8s ease-out;
  pointer-events: auto;
}
.flame-anim-icon {
  font-size: 48px; color: #D4AF37;
  text-shadow: 0 0 30px rgba(212, 175, 55, 0.8), 0 0 60px rgba(212, 175, 55, 0.4);
  animation: flameIconPulse 2s ease-in-out infinite alternate;
  margin-bottom: 12px;
}
@keyframes flameIconPulse {
  from { transform: scale(1); filter: brightness(1); }
  to { transform: scale(1.1); filter: brightness(1.2); }
}
.flame-anim-label {
  font-family: 'Rajdhani', sans-serif;
  font-size: 14px; font-weight: 700; color: #27AE60;
  letter-spacing: 4px;
  text-shadow: 0 0 16px rgba(39, 174, 96, 0.5);
  margin-bottom: 8px;
}
.flame-anim-title {
  font-family: 'Jost', sans-serif;
  font-size: 24px; font-weight: 600; color: #E8E0D0;
  text-align: center; max-width: 320px;
  text-shadow: 0 0 20px rgba(212, 175, 55, 0.3);
  margin-bottom: 8px;
}
.flame-anim-sub {
  font-family: 'Jost', sans-serif;
  font-size: 13px; color: #6B6152; font-style: italic;
  margin-bottom: 28px;
}
.flame-anim-continue {
  font-family: 'Rajdhani', sans-serif;
  font-size: 13px; font-weight: 600; letter-spacing: 2px;
  color: #D4AF37; background: transparent;
  border: 1px solid #D4AF3744; border-radius: 4px;
  padding: 8px 28px; cursor: pointer;
  transition: all 0.2s;
}
.flame-anim-continue:hover {
  background: rgba(212, 175, 55, 0.1);
  border-color: #D4AF37;
}

.slot-divider {
  width: 60px; height: 1px;
  background: linear-gradient(90deg, transparent, #D4AF37, transparent);
  margin: 8px 0;
}

.slot-total-label {
  font-family: 'Rajdhani', sans-serif;
  font-size: 11px; color: #6B6152;
  letter-spacing: 3px; font-weight: 600;
}

.slot-counter {
  display: flex; align-items: center; gap: 3px;
}

.slot-digit {
  display: inline-flex; align-items: center; justify-content: center;
  width: 40px; height: 56px;
  font-family: 'Rajdhani', sans-serif;
  font-size: 36px; font-weight: 700;
  color: #E8E0D0;
  background: linear-gradient(180deg, #1C1916 0%, #242019 50%, #1C1916 100%);
  border: 1px solid #3A3428;
  border-radius: 6px;
  text-shadow: 0 0 12px rgba(212, 175, 55, 0.3);
  transition: color 0.15s, text-shadow 0.15s;
}

.slot-digit.slot-spinning {
  color: #D4AF37;
  text-shadow: 0 0 16px rgba(212, 175, 55, 0.6);
  animation: slotGlow 0.1s ease-in-out infinite alternate;
}

.slot-digit.slot-landed {
  animation: slotLand 0.3s ease-out;
}

@keyframes slotGlow {
  from { border-color: #3A3428; }
  to { border-color: #D4AF3766; }
}

@keyframes slotLand {
  0% { transform: scaleY(1); }
  40% { transform: scaleY(1.08); color: #D4AF37; text-shadow: 0 0 20px rgba(212, 175, 55, 0.7); }
  100% { transform: scaleY(1); }
}

/* Confetti */
.slot-confetti {
  position: absolute; inset: 0; overflow: hidden; pointer-events: none;
}
.confetti-particle {
  position: absolute; top: -10px;
  width: 6px; height: 6px; border-radius: 1px;
  animation: confettiFall linear forwards;
  opacity: 0.9;
}
@keyframes confettiFall {
  0% { transform: translateY(0) rotate(0deg); opacity: 0.9; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}
`;

function AuthScreen() {
  const [mode, setMode] = useState("login"); // "login" or "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError(null);
    if (!displayName.trim()) { setError("Display name is required"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName.trim() },
      },
    });
    if (error) {
      setError(error.message);
    } else {
      setConfirmSent(true);
    }
    setLoading(false);
  }

  if (confirmSent) {
    return (
      <>
        <style>{STYLES}</style>
        <div className="login-screen">
          <div className="login-logo">17:11s</div>
          <div className="login-tagline">Examining the Scriptures Daily</div>
          <div className="login-diamond">◆</div>
          <div style={{
            background: "var(--panel-bg)", border: "1px solid var(--border-subtle)",
            borderRadius: 6, padding: "32px 24px", maxWidth: 400, width: "100%", textAlign: "center",
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✉</div>
            <div style={{ color: "#E8E0D0", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              Check your email
            </div>
            <div style={{ color: "#8A7E6B", fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
              We sent a confirmation link to <span style={{ color: "#D4AF37" }}>{email}</span>.
              Click the link to activate your account, then come back here to sign in.
            </div>
            <button
              className="gold-btn"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => { setConfirmSent(false); setMode("login"); }}
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="login-screen">
        <div className="login-logo">17:11s</div>
        <div className="login-tagline">Examining the Scriptures Daily</div>
        <div className="login-diamond">◆</div>

        <div style={{
          background: "var(--panel-bg)", border: "1px solid var(--border-subtle)",
          borderRadius: 6, padding: "28px 24px", maxWidth: 400, width: "100%",
        }}>
          {/* Tab switcher */}
          <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: "1px solid #2A2520" }}>
            <button
              onClick={() => { setMode("login"); setError(null); }}
              style={{
                flex: 1, background: "none", border: "none", padding: "10px 0",
                color: mode === "login" ? "#D4AF37" : "#6B6152",
                fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 13,
                letterSpacing: 2, cursor: "pointer",
                borderBottom: mode === "login" ? "2px solid #D4AF37" : "2px solid transparent",
                transition: "all 0.25s",
              }}
            >
              SIGN IN
            </button>
            <button
              onClick={() => { setMode("signup"); setError(null); }}
              style={{
                flex: 1, background: "none", border: "none", padding: "10px 0",
                color: mode === "signup" ? "#D4AF37" : "#6B6152",
                fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 13,
                letterSpacing: 2, cursor: "pointer",
                borderBottom: mode === "signup" ? "2px solid #D4AF37" : "2px solid transparent",
                transition: "all 0.25s",
              }}
            >
              CREATE ACCOUNT
            </button>
          </div>

          <form onSubmit={mode === "login" ? handleLogin : handleSignup}>
            {mode === "signup" && (
              <>
                <label className="input-label">Guardian Name</label>
                <input
                  className="text-input"
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                  autoComplete="name"
                />
              </>
            )}

            <label className="input-label">Email</label>
            <input
              className="text-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />

            <label className="input-label">Password</label>
            <input
              className="text-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
            />

            {error && (
              <div style={{
                color: "#C0392B", fontSize: 13, marginTop: 12, padding: "8px 12px",
                background: "rgba(192,57,43,0.08)", borderRadius: 4,
                border: "1px solid rgba(192,57,43,0.2)",
              }}>
                {error}
              </div>
            )}

            <button
              className="gold-btn"
              type="submit"
              disabled={loading}
              style={{
                width: "100%", justifyContent: "center", marginTop: 20,
                opacity: loading ? 0.6 : 1, pointerEvents: loading ? "none" : "auto",
              }}
            >
              {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>
        </div>

        <div style={{ color: "#4A4235", fontSize: 12, marginTop: 24, letterSpacing: 1 }}>
          ACTS 17:11 · EXAMINING THE SCRIPTURES DAILY
        </div>
      </div>
    </>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [page, setPage] = useState("home");
  const [data, setData] = useState(null);
  const [profileTarget, setProfileTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimeout = useRef(null);

  function showToast(message, type = "success") {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast({ message, type, id: Date.now() });
    toastTimeout.current = setTimeout(() => setToast(null), 3000);
  }

  // ── Fetch profile from Supabase ──
  async function fetchProfile(userId) {
    const { data: prof, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
    return prof;
  }

  // ── Auth + Data loading ──
  const dataRef = useRef(null);
  const initRef = useRef(false);

  async function initApp(userId) {
    try {
      console.log("Fetching profile...");
      const prof = await fetchProfile(userId);
      if (prof) {
        console.log("Profile loaded:", prof.display_name);
        setCurrentUser({
          id: prof.id,
          name: prof.display_name,
          avatar: prof.avatar,
          tag: prof.tag,
          admin: prof.is_admin,
        });
        setProfile(prof);

        console.log("Loading data from Supabase...");
        const allData = await loadAllData();
        console.log("Data loaded:", allData.books.length, "books,", allData.members.length, "members");
        setData(allData);
        dataRef.current = allData;
      }
    } catch (err) {
      console.error("Error during init:", err);
      const fallback = getSeedData();
      setData(fallback);
      dataRef.current = fallback;
    }
    setLoading(false);
  }

  useEffect(() => {
    // Get session on mount — this is synchronous with the auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("getSession result:", !!session);
      if (session?.user && !initRef.current) {
        initRef.current = true;
        initApp(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for future auth changes (login/logout only)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth event:", event);
        if (event === "SIGNED_IN" && session?.user && !initRef.current) {
          initRef.current = true;
          initApp(session.user.id);
        } else if (event === "SIGNED_OUT") {
          setCurrentUser(null);
          setProfile(null);
          setData(null);
          dataRef.current = null;
          initRef.current = false;
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Wrap setData to auto-sync changes to Supabase
  function setDataSynced(updater) {
    setData(prev => {
      const newVal = typeof updater === "function" ? updater(prev) : updater;
      const oldSnapshot = dataRef.current;
      dataRef.current = newVal;
      // Async sync — don't block the UI
      if (oldSnapshot) syncChanges(oldSnapshot, newVal);
      return newVal;
    });
  }

  // ── Logout ──
  async function logout() {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setProfile(null);
  }

  // ── Loading state ──
  if (loading) {
    return (
      <>
        <style>{STYLES}</style>
        <div className="login-screen">
          <div className="login-logo" style={{ animation: "pulse 2s infinite" }}>17:11s</div>
          <div style={{ color: "#6B6152", marginTop: 16 }}>Loading...</div>
        </div>
      </>
    );
  }

  // ── Not logged in → show auth screen ──
  if (!currentUser) {
    return <AuthScreen />;
  }

  // ── Wait for data to load ──
  if (!data) {
    return (
      <>
        <style>{STYLES}</style>
        <div className="login-screen">
          <div className="login-logo" style={{ animation: "pulse 2s infinite" }}>17:11s</div>
          <div style={{ color: "#6B6152", marginTop: 16 }}>Loading data...</div>
        </div>
      </>
    );
  }

  // ═══ Everything below here is the same as your current code ═══
  // (NAV array, isAdmin, ctx, navTo, and the full return with header/pages/footer)

  const NAV = [
    { id: "home", label: "Orbit", icon: <Flame size={14} /> },
    { id: "director", label: "Director", icon: <Eye size={14} /> },
    { id: "triumphs", label: "Triumphs", icon: <Trophy size={14} /> },
    { id: "library", label: "Library", icon: <BookOpen size={14} /> },
    { id: "reviews", label: "Reviews", icon: <Star size={14} /> },
    { id: "forum", label: "Forum", icon: <MessageSquare size={14} /> },
    { id: "members", label: "Fireteam", icon: <Users size={14} /> },
  ];

  const isAdmin = currentUser?.admin === true;
  const ctx = { data, setData: setDataSynced, currentUser, page, setPage, profileTarget, setProfileTarget, isAdmin, showToast, logout };

  function navTo(id) {
    setPage(id);
    setProfileTarget(null);
    setMobileMenuOpen(false);
    // Re-fetch data from Supabase on every page change
    loadAllData().then(allData => {
      setData(allData);
      dataRef.current = allData;
    }).catch(err => console.error("Refresh error:", err));
  }

  return (
    <AppContext.Provider value={ctx}>
      <style>{STYLES}</style>
      {toast && (
        <div className={`toast toast-${toast.type}`} key={toast.id}>
          {toast.type === "success" && <Check size={14} />}
          {toast.type === "error" && <X size={14} />}
          {toast.type === "info" && <Zap size={14} />}
          <span>{toast.message}</span>
        </div>
      )}
      <div className="app-shell">
        <header className="header">
          <div className="header-inner">
            <div className="logo" onClick={() => navTo("home")}>17:11s</div>
            <nav className="nav nav-desktop">
              {NAV.map(n => (
                <button
                  key={n.id}
                  className={`nav-btn ${page === n.id ? "active" : ""}`}
                  onClick={() => navTo(n.id)}
                >
                  {n.icon} {n.label}
                </button>
              ))}
            </nav>
            <div className="header-user" onClick={() => { setProfileTarget(currentUser.id); setPage("profile"); setMobileMenuOpen(false); }}>
              <span className="header-user-name">{data.displayNames?.[currentUser.id] || currentUser.name}</span>
              {(data.prestigeLevel?.[currentUser.id] || 0) > 0 && (
                <PrestigeEmblem level={data.prestigeLevel[currentUser.id]} size={22} />
              )}
              <div className="avatar" style={{ width: 32, height: 32, fontSize: 11 }}>{currentUser.avatar}</div>
            </div>
            <button className="hamburger-btn" onClick={() => setMobileMenuOpen(o => !o)}>
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </header>

        {/* Mobile slide-out menu */}
        {mobileMenuOpen && <div className="mobile-menu-backdrop" onClick={() => setMobileMenuOpen(false)} />}
        <div className={`mobile-menu ${mobileMenuOpen ? "open" : ""}`}>
          <div className="mobile-menu-user" onClick={() => { setProfileTarget(currentUser.id); setPage("profile"); setMobileMenuOpen(false); }}>
            <div className="avatar" style={{ width: 40, height: 40, fontSize: 14 }}>{currentUser.avatar}</div>
            <div>
              <div style={{ fontWeight: 700, color: "#E8E0D0", fontSize: 15 }}>{data.displayNames?.[currentUser.id] || currentUser.name}</div>
              {(data.prestigeLevel?.[currentUser.id] || 0) > 0 && (
                <div style={{ marginTop: 4 }}><PrestigeEmblem level={data.prestigeLevel[currentUser.id]} size={20} showLabel /></div>
              )}
            </div>
          </div>
          <div className="mobile-menu-divider" />
          {NAV.map(n => (
            <button
              key={n.id}
              className={`mobile-menu-item ${page === n.id ? "active" : ""}`}
              onClick={() => navTo(n.id)}
            >
              {n.icon} <span>{n.label}</span>
            </button>
          ))}
          <div className="mobile-menu-divider" />
          <button className="mobile-menu-item mobile-menu-signout" onClick={() => { logout(); setMobileMenuOpen(false); }}>
            <ArrowLeft size={14} /> <span>Sign Out</span>
          </button>
        </div>

        <main style={{ flex: 1 }}>
          {page === "home" && <HomePage />}
          {page === "director" && <DirectorPage />}
          {page === "triumphs" && <TriumphsPage />}
          {page === "library" && <LibraryPage />}
          {page === "reviews" && <ReviewsPage />}
          {page === "forum" && <ForumPage />}
          {page === "members" && <MembersPage />}
          {page === "profile" && <ProfilePage />}
        </main>

        <footer style={{ textAlign: "center", padding: "24px 16px", borderTop: "1px solid #2A2520" }}>
          <div style={{ color: "#4A4235", fontSize: 11, letterSpacing: 2, fontFamily: "'Rajdhani', sans-serif" }}>
            17:11s · EXAMINING THE SCRIPTURES DAILY · ACTS 17:11
          </div>
          <div style={{ color: "#33302A", fontSize: 10, marginTop: 4, cursor: "pointer" }} onClick={logout}>
            Sign out
          </div>
        </footer>
      </div>
    </AppContext.Provider>
  );
}
