// nailong-search.js
// 默认：name / aliases 模糊搜索
// 附加：勾选「语义搜索」后，浏览器加载模型，向量缓存在 localStorage

const MODEL_ID = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";
const SCORE_THRESHOLD = 0.28;
const FUZZY_THRESHOLD = 0.32;
const FUZZY_SOFT_THRESHOLD = 0.16;
const FUZZY_SOFT_LIMIT = 6;
const EMBED_CACHE_KEY = "nailong-semantic-embeddings-v1";

let stickers = [];
let embedderPromise = null;

function setStatus(text) {
  const status = document.getElementById("nailongStatus");
  if (status) status.textContent = text;
}

function normalize(text) {
  return (text || "").toLowerCase().trim();
}

function compact(text) {
  return normalize(text)
    .replace(/[\s~！!？?。.,，、·\-_/\\'"`]/g, "")
    .replace(/[\uFE0F\u200D]/g, "")
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, "");
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

function isSubsequence(needle, hay) {
  let i = 0;
  for (const ch of hay) {
    if (ch === needle[i]) i += 1;
    if (i >= needle.length) return true;
  }
  return needle.length === 0;
}

function charOverlap(a, b) {
  if (!a || !b) return 0;
  const counts = new Map();
  for (const ch of a) counts.set(ch, (counts.get(ch) || 0) + 1);
  let hit = 0;
  for (const ch of b) {
    const n = counts.get(ch) || 0;
    if (n > 0) {
      hit += 1;
      counts.set(ch, n - 1);
    }
  }
  return hit / Math.max(a.length, b.length);
}

function scoreField(query, field) {
  const q = compact(query);
  const f = compact(field);
  if (!q || !f) return 0;
  if (q === f) return 1;

  let score = 0;
  if (f.includes(q)) {
    score = Math.max(score, 0.88 + 0.1 * (q.length / f.length));
  }
  if (q.includes(f) && f.length >= 2) {
    score = Math.max(score, 0.78 + 0.1 * (f.length / q.length));
  }
  if (isSubsequence(q, f)) {
    score = Math.max(score, 0.55 + 0.25 * (q.length / f.length));
  }

  const edit = 1 - levenshtein(q, f) / Math.max(q.length, f.length);
  score = Math.max(score, edit * 0.92);
  score = Math.max(score, charOverlap(q, f) * 0.85);
  return Math.min(score, 1);
}

function fuzzyScore(query, item) {
  const fields = [item.name, ...(item.aliases || [])];
  const parts = normalize(query).split(/\s+/).filter(Boolean);
  if (!parts.length) return 0;

  let best = 0;
  for (const part of parts) {
    let partBest = 0;
    for (const field of fields) {
      partBest = Math.max(partBest, scoreField(part, field));
    }
    best = Math.max(best, partBest);
  }
  return best;
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

function l2Normalize(values) {
  let sum = 0;
  for (const v of values) sum += v * v;
  const norm = Math.sqrt(sum) || 1;
  return values.map((v) => v / norm);
}

function buildText(item) {
  return [item.name, ...(item.aliases || [])].filter(Boolean).join(" ");
}

function isSemanticEnabled() {
  const el = document.getElementById("nailongSemantic");
  return !!(el && el.checked);
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function render(list) {
  const grid = document.getElementById("nailongGrid");
  if (!grid) return;

  if (!list.length) {
    grid.innerHTML = "";
    return;
  }

  grid.innerHTML = list
    .map((item, index) => {
      const scoreText =
        typeof item.score === "number"
          ? `<div class="score">${(item.score * 100).toFixed(0)}%</div>`
          : "";
      const fileName = escapeHtml(item.file || `${item.name}.gif`);
      return `
      <figure class="nailong-item" title="${escapeHtml(item.name)}" style="animation-delay: ${Math.min(index, 12) * 40}ms">
        <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.name)}" loading="lazy">
        ${scoreText}
        <div class="nailong-actions">
          <button type="button" class="nailong-action-btn nailong-download-btn" data-src="${escapeHtml(item.src)}" data-name="${fileName}">下载 GIF</button>
          <button type="button" class="nailong-action-btn nailong-copy-btn" data-src="${escapeHtml(item.src)}">复制静图</button>
        </div>
      </figure>
    `;
    })
    .join("");
}

function flashButton(button, text, className = "done") {
  const original = button.textContent;
  button.textContent = text;
  button.classList.add(className);
  setTimeout(() => {
    button.textContent = original;
    button.classList.remove(className);
  }, 1200);
}

async function downloadSticker(src, fileName, button) {
  if (!src) return;
  try {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName || src.split("/").pop() || "sticker.gif";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    flashButton(button, "已下载");
  } catch (err) {
    console.error(err);
    flashButton(button, "下载失败");
  }
}

async function blobToPng(blob) {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = objectUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext("2d").drawImage(img, 0, 0);
    const pngBlob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
    });
    return pngBlob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function copyStillImage(src, button) {
  if (!src) return;
  try {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const type = blob.type || "";
    let pngBlob = blob;

    // Browsers only reliably put image/png on the OS clipboard (GIF animation is dropped).
    if (!type.includes("png")) {
      pngBlob = await blobToPng(blob);
    }

    if (!(navigator.clipboard && window.ClipboardItem)) {
      throw new Error("ClipboardItem unsupported");
    }
    await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
    flashButton(button, "已复制");
  } catch (err) {
    console.error(err);
    try {
      const absolute = new URL(src, window.location.href).href;
      await navigator.clipboard.writeText(absolute);
      flashButton(button, "已复制链接");
    } catch (e2) {
      console.error(e2);
      flashButton(button, "复制失败");
    }
  }
}

function showAll() {
  setStatus(`共 ${stickers.length} 个表情包`);
  render(stickers.map(({ score, ...rest }) => rest));
}

function showIdle() {
  setStatus(`共 ${stickers.length} 个表情包`);
  render([]);
}

function searchByFuzzy(query) {
  const q = normalize(query);
  if (!q) {
    showIdle();
    return;
  }

  const ranked = stickers
    .map((item) => ({ ...item, score: fuzzyScore(q, item) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const strong = ranked.filter((item) => item.score >= FUZZY_THRESHOLD);
  if (strong.length) {
    setStatus("");
    render(strong);
    return;
  }

  const soft = ranked
    .filter((item) => item.score >= FUZZY_SOFT_THRESHOLD)
    .slice(0, FUZZY_SOFT_LIMIT);
  if (soft.length) {
    setStatus("");
    render(soft);
    return;
  }

  setStatus("没有匹配的表情包");
  render([]);
}

async function getEmbedder() {
  if (!embedderPromise) {
    embedderPromise = (async () => {
      setStatus("正在加载语义模型（首次较慢，请稍候）…");
      const { pipeline, env } = await import(
        "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2"
      );
      if (window.NAILONG_HF_ENDPOINT) {
        env.remoteHost = String(window.NAILONG_HF_ENDPOINT).replace(/\/$/, "");
      }
      // Cache model weights in the browser (IndexedDB via transformers.js)
      env.allowLocalModels = false;
      return pipeline("feature-extraction", MODEL_ID);
    })().catch((err) => {
      embedderPromise = null;
      throw err;
    });
  }
  return embedderPromise;
}

async function embedText(text) {
  const extractor = await getEmbedder();
  const output = await extractor(text, { pooling: "mean", normalize: false });
  return l2Normalize(Array.from(output.data));
}

function stickerFingerprint() {
  return stickers.map((s) => `${s.file}\t${s.text}`).join("\n");
}

function readEmbedCache() {
  try {
    const raw = localStorage.getItem(EMBED_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.model !== MODEL_ID || !data.embeddings) return null;
    if (data.fingerprint !== stickerFingerprint()) return null;
    return data;
  } catch (err) {
    console.warn(err);
    return null;
  }
}

function writeEmbedCache(embeddings) {
  try {
    const payload = {
      model: MODEL_ID,
      fingerprint: stickerFingerprint(),
      embeddings,
    };
    localStorage.setItem(EMBED_CACHE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn("localStorage write failed", err);
  }
}

function applyLocalEmbeddings(embeddings) {
  for (const item of stickers) {
    const vec = embeddings[item.file];
    item.embedding = Array.isArray(vec) ? vec : null;
  }
}

async function ensureLocalEmbeddings() {
  const cached = readEmbedCache();
  if (cached) {
    applyLocalEmbeddings(cached.embeddings);
    if (stickers.every((s) => Array.isArray(s.embedding))) return;
  }

  setStatus("正在生成表情向量（首次较慢，请稍候）…");
  const embeddings = {};
  for (let i = 0; i < stickers.length; i++) {
    const item = stickers[i];
    setStatus(`正在生成表情向量 ${i + 1}/${stickers.length}…`);
    const vec = await embedText(item.text);
    embeddings[item.file] = vec.map((x) => Math.round(x * 1e6) / 1e6);
    item.embedding = embeddings[item.file];
  }
  writeEmbedCache(embeddings);
}

async function prepareSemantic() {
  await getEmbedder();
  await ensureLocalEmbeddings();
}

async function searchBySemantic(query) {
  const q = (query || "").trim();
  if (!q) {
    showIdle();
    return;
  }

  try {
    await prepareSemantic();
    setStatus("语义检索中…");
    const queryVec = await embedText(q);
    const ranked = stickers
      .map((item) => {
        const fuzzy = fuzzyScore(q, item);
        const semantic = cosineSimilarity(queryVec, item.embedding);
        // Short / literal queries: embedding alone is unreliable ("我" ≠ 语义相近).
        // Prefer the stronger of fuzzy and semantic so字面命中 always ranks higher.
        const score = Math.max(fuzzy, semantic);
        return { ...item, fuzzy, semantic, score };
      })
      .filter(
        (item) =>
          item.fuzzy >= FUZZY_SOFT_THRESHOLD || item.semantic >= SCORE_THRESHOLD
      )
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.fuzzy - a.fuzzy;
      });

    if (!ranked.length) {
      setStatus("没有匹配的表情包");
      render([]);
      return;
    }

    setStatus("");
    render(ranked);
  } catch (err) {
    console.error(err);
    setStatus("语义模型加载失败，已改用普通搜索");
    searchByFuzzy(query);
  }
}

async function search(query) {
  if (isSemanticEnabled()) {
    await searchBySemantic(query);
  } else {
    searchByFuzzy(query);
  }
}

async function loadIndex() {
  try {
    const res = await fetch("/data/nailong-stickers.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    stickers = (data.items || []).map((item) => {
      const text = item.text || buildText(item);
      const file = item.file || "";
      return {
        name: item.name,
        aliases: item.aliases || [],
        file,
        text,
        src: file.startsWith("/") ? file : `/stickers/${file}`,
        embedding: null,
      };
    });

    showIdle();
  } catch (err) {
    console.error(err);
    setStatus("索引加载失败，请稍后重试");
  }
}

function initAOS() {
  if (typeof AOS !== "undefined") {
    AOS.init({
      duration: 1000,
      easing: "ease",
      once: true,
      offset: 50,
    });
  }
}

function init() {
  const input = document.getElementById("nailongQuery");
  const btn = document.getElementById("nailongSearchBtn");
  const semantic = document.getElementById("nailongSemantic");
  const grid = document.getElementById("nailongGrid");
  const run = () => search(input ? input.value : "");

  if (btn) btn.addEventListener("click", run);
  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") run();
    });
  }
  if (semantic) {
    semantic.addEventListener("change", async () => {
      if (semantic.checked) {
        try {
          await prepareSemantic();
          setStatus(`共 ${stickers.length} 个表情包`);
        } catch (err) {
          console.error(err);
          semantic.checked = false;
          setStatus("语义模型加载失败，请检查网络后重试");
          return;
        }
      } else {
        setStatus(`共 ${stickers.length} 个表情包`);
      }
      if (input && input.value.trim()) run();
    });
  }
  if (grid) {
    grid.addEventListener("click", (e) => {
      const downloadBtn = e.target.closest(".nailong-download-btn");
      if (downloadBtn) {
        downloadSticker(
          downloadBtn.getAttribute("data-src"),
          downloadBtn.getAttribute("data-name"),
          downloadBtn
        );
        return;
      }
      const copyBtn = e.target.closest(".nailong-copy-btn");
      if (copyBtn) {
        copyStillImage(copyBtn.getAttribute("data-src"), copyBtn);
      }
    });
  }
  loadIndex();
}

window.addEventListener("DOMContentLoaded", function () {
  init();
  initAOS();
});
