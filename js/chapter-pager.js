/**
 * 长文按 h1 分章：初始只挂载一章到 DOM，切换时再挂载对应章。
 * 须在文章正文末尾同步加载，以便赶在主题 mermaid / 代码块初始化之前裁剪 DOM。
 */
(function () {
  const entry = document.currentScript && document.currentScript.closest(".article-entry");
  if (!entry || entry.getAttribute("data-chapter-pager") !== "true") return;
  if (entry.dataset.chapterPagerReady === "1") return;

  const scriptEl = document.currentScript;

  function serialize(node) {
    if (node.nodeType === 1) return node.outerHTML;
    if (node.nodeType === 3) return node.textContent || "";
    return "";
  }

  function collectIds(nodes) {
    const ids = [];
    nodes.forEach((node) => {
      if (node.nodeType !== 1) return;
      if (node.id) ids.push(node.id);
      node.querySelectorAll("[id]").forEach((el) => ids.push(el.id));
    });
    return ids;
  }

  function plainTitle(h1) {
    const clone = h1.cloneNode(true);
    clone.querySelectorAll("a.header-anchor").forEach((a) => a.remove());
    return (clone.textContent || "").replace(/\s+/g, " ").trim();
  }

  const children = Array.from(entry.childNodes).filter((n) => n !== scriptEl);
  const preambleNodes = [];
  const chapters = [];
  let current = null;

  children.forEach((node) => {
    if (node.nodeType === 1 && node.tagName === "H1") {
      if (current) {
        current.html = current.nodes.map(serialize).join("");
        current.ids = collectIds(current.nodes);
        chapters.push(current);
      }
      current = { title: plainTitle(node), nodes: [node], html: "", ids: [] };
      return;
    }
    if (current) current.nodes.push(node);
    else preambleNodes.push(node);
  });

  if (current) {
    current.html = current.nodes.map(serialize).join("");
    current.ids = collectIds(current.nodes);
    chapters.push(current);
  }

  if (chapters.length < 2) return;

  const preambleHtml = preambleNodes.map(serialize).join("");
  const idToChapter = Object.create(null);
  chapters.forEach((ch, idx) => {
    ch.ids.forEach((id) => {
      idToChapter[id] = idx;
    });
  });

  let startIdx = 0;
  if (location.hash) {
    const raw = location.hash.slice(1);
    let id = raw;
    try {
      id = decodeURIComponent(raw);
    } catch (_) {}
    if (idToChapter[id] !== undefined) startIdx = idToChapter[id];
  }

  const state = {
    chapters: chapters.map((ch) => ({
      title: ch.title,
      html: ch.html,
      ids: ch.ids,
    })),
    index: startIdx,
    entry,
    preambleHtml,
    idToChapter,
  };

  function buildNav(index) {
    const nav = document.createElement("nav");
    nav.className = "chapter-pager";
    nav.setAttribute("aria-label", "章节分页");

    const prev = document.createElement("button");
    prev.type = "button";
    prev.className = "chapter-pager-btn";
    prev.dataset.action = "prev";
    prev.textContent = "上一章";
    prev.disabled = index <= 0;

    const next = document.createElement("button");
    next.type = "button";
    next.className = "chapter-pager-btn";
    next.dataset.action = "next";
    next.textContent = "下一章";
    next.disabled = index >= state.chapters.length - 1;

    const select = document.createElement("select");
    select.className = "chapter-pager-select";
    select.setAttribute("aria-label", "选择章节");
    state.chapters.forEach((ch, i) => {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = `${i + 1}. ${ch.title}`;
      if (i === index) opt.selected = true;
      select.appendChild(opt);
    });

    const meta = document.createElement("span");
    meta.className = "chapter-pager-meta";
    meta.textContent = `${index + 1} / ${state.chapters.length}`;

    nav.appendChild(prev);
    nav.appendChild(select);
    nav.appendChild(next);
    nav.appendChild(meta);

    nav.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn || btn.disabled) return;
      if (btn.dataset.action === "prev") showChapter(state.index - 1);
      if (btn.dataset.action === "next") showChapter(state.index + 1);
    });
    select.addEventListener("change", () => {
      showChapter(Number(select.value));
    });

    return nav;
  }

  function enhanceCodeBlocks(root) {
    const expandThreshold = window.siteConfig && window.siteConfig.code_block
      ? window.siteConfig.code_block.expand
      : true;
    const figcaption = `
  <div class="code-figcaption">
    <div class="code-left-wrap">
      <div class="code-decoration"></div>
      <div class="code-lang"></div>
    </div>
    <div class="code-right-wrap">
      <div class="code-copy icon-copy"></div>
      <div class="icon-chevron-down code-expand"></div>
    </div>
  </div>
  <div class="code-figcaption-bottom">
    <span class="code-name"></span>
    <a class="code-link"></a>
  </div>`;

    root.querySelectorAll("div.highlight").forEach((element) => {
      if (!element.querySelector(".code-figcaption")) {
        element.insertAdjacentHTML("afterbegin", figcaption);
      }
      if (expandThreshold !== undefined) {
        const lineCount = element.querySelectorAll("code[data-lang] .line").length;
        if (
          expandThreshold === false ||
          (typeof expandThreshold === "number" && lineCount > expandThreshold)
        ) {
          element.classList.add("code-closed");
        }
      }
      const code =
        element.querySelector("tr td:last-of-type code") ||
        element.querySelector("code");
      const langName = ((code && code.dataset.lang) || "")
        .replace("line-numbers", "")
        .trim()
        .replace("language-", "")
        .trim()
        .toUpperCase();
      const lang = element.querySelector(".code-lang");
      if (lang && langName) lang.textContent = langName;
    });

    root.querySelectorAll(".code-expand").forEach((el) => {
      if (el.dataset.bound === "1") return;
      el.dataset.bound = "1";
      el.addEventListener("click", () => {
        const figure = el.closest("div.highlight");
        if (figure) figure.classList.toggle("code-closed");
      });
    });

    root.querySelectorAll(".code-copy").forEach((el) => {
      if (el.dataset.bound === "1") return;
      el.dataset.bound = "1";
      el.addEventListener("click", async () => {
        const figure = el.closest("div.highlight");
        if (!figure) return;
        const td =
          figure.querySelector("tr td:last-of-type") ||
          figure.querySelector("code");
        const text = td ? td.innerText : "";
        try {
          await navigator.clipboard.writeText(text);
          el.classList.add("icon-check");
          el.classList.remove("icon-copy");
          setTimeout(() => {
            el.classList.add("icon-copy");
            el.classList.remove("icon-check");
          }, 1000);
        } catch (_) {}
      });
    });
  }

  function mermaidTheme() {
    const mode = localStorage.getItem("dark_mode");
    if (mode === "true") return "dark";
    if (mode === "auto") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "default";
    }
    return "default";
  }

  async function renderMermaid(root) {
    if (!window.mermaid) return;
    const nodes = Array.from(root.querySelectorAll(".mermaid"));
    if (!nodes.length) return;
    nodes.forEach((el) => {
      if (!el.getAttribute("data-original-code")) {
        el.setAttribute("data-original-code", el.innerHTML);
      }
      const original = el.getAttribute("data-original-code");
      if (el.getAttribute("data-processed") && original) {
        el.removeAttribute("data-processed");
        el.innerHTML = original;
      }
    });
    try {
      window.mermaid.initialize({ theme: mermaidTheme(), startOnLoad: false });
      await window.mermaid.run({ nodes, suppressErrors: true });
    } catch (err) {
      console.error(err);
    }
  }

  function observeMermaid(root) {
    const nodes = Array.from(root.querySelectorAll(".mermaid"));
    if (!nodes.length) return;
    if (!("IntersectionObserver" in window)) {
      renderMermaid(root);
      return;
    }
    let scheduled = false;
    const kick = new IntersectionObserver(
      (entries) => {
        if (scheduled) return;
        if (entries.some((e) => e.isIntersecting)) {
          scheduled = true;
          kick.disconnect();
          renderMermaid(root);
        }
      },
      { rootMargin: "160px 0px", threshold: 0.01 }
    );
    nodes.forEach((n) => kick.observe(n));
  }

  function showChapter(index, scrollId) {
    if (index < 0 || index >= state.chapters.length) return;
    state.index = index;
    const ch = state.chapters[index];

    entry.innerHTML = state.preambleHtml;
    entry.appendChild(buildNav(index));

    const body = document.createElement("div");
    body.className = "chapter-pager-body";
    body.innerHTML = ch.html;
    entry.appendChild(body);

    enhanceCodeBlocks(body);
    // 首屏交给主题 mermaid；切章后自行渲染
    if (window.mermaid) observeMermaid(body);
    else {
      const timer = setInterval(() => {
        if (!window.mermaid) return;
        clearInterval(timer);
        observeMermaid(body);
      }, 100);
      setTimeout(() => clearInterval(timer), 15000);
    }

    if (scrollId) {
      try {
        history.replaceState(null, "", "#" + scrollId);
      } catch (_) {}
      requestAnimationFrame(() => {
        const target = document.getElementById(scrollId);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        else entry.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } else {
      const topId = ch.ids[0];
      if (topId) {
        try {
          history.replaceState(null, "", "#" + topId);
        } catch (_) {}
      }
      requestAnimationFrame(() => {
        entry.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    syncTocActive(index);
  }

  function syncTocActive(index) {
    const wrap = document.querySelector(".sidebar-toc-wrapper");
    if (!wrap) return;
    wrap.querySelectorAll("a").forEach((a) => a.classList.remove("chapter-pager-toc-active"));
    const ids = new Set(state.chapters[index].ids);
    wrap.querySelectorAll("a[href^='#']").forEach((a) => {
      let id = a.getAttribute("href").slice(1);
      try {
        id = decodeURIComponent(id);
      } catch (_) {}
      if (ids.has(id)) a.classList.add("chapter-pager-toc-active");
    });
  }

  // 首次挂载：只保留当前章，其余以字符串持有
  entry.innerHTML = state.preambleHtml;
  entry.appendChild(buildNav(startIdx));
  const firstBody = document.createElement("div");
  firstBody.className = "chapter-pager-body";
  firstBody.innerHTML = state.chapters[startIdx].html;
  entry.appendChild(firstBody);
  entry.dataset.chapterPagerReady = "1";

  // 主题 mermaid 脚本在 footer；首屏也兜底等待渲染，避免只显示源码
  const bootMermaid = () => {
    if (window.mermaid) {
      observeMermaid(firstBody);
      return true;
    }
    return false;
  };
  if (!bootMermaid()) {
    const timer = setInterval(() => {
      if (bootMermaid()) clearInterval(timer);
    }, 100);
    setTimeout(() => clearInterval(timer), 15000);
  }
  document.addEventListener(
    "click",
    (e) => {
      const a = e.target.closest(
        ".sidebar-toc-wrapper a[href^='#'], .toc a[href^='#']"
      );
      if (!a) return;

      const href = a.getAttribute("href") || "";
      if (!href.startsWith("#")) return;
      let id = href.slice(1);
      try {
        id = decodeURIComponent(id);
      } catch (_) {}
      const idx = state.idToChapter[id];
      if (idx === undefined) return;
      e.preventDefault();
      if (idx === state.index) {
        const target = document.getElementById(id);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        try {
          history.replaceState(null, "", "#" + id);
        } catch (_) {}
        return;
      }
      showChapter(idx, id);
    },
    true
  );

  document.body.addEventListener("dark-theme-set", () => {
    const body = entry.querySelector(".chapter-pager-body");
    if (body) renderMermaid(body);
  });
  document.body.addEventListener("light-theme-set", () => {
    const body = entry.querySelector(".chapter-pager-body");
    if (body) renderMermaid(body);
  });

  window.__CHAPTER_PAGER = {
    show: showChapter,
    state,
  };

  syncTocActive(startIdx);

  // hash 落在非首章时，主题 mermaid 只会看到当前章；首章同理
  if (startIdx !== 0 && location.hash) {
    const id = (() => {
      let x = location.hash.slice(1);
      try {
        x = decodeURIComponent(x);
      } catch (_) {}
      return x;
    })();
    requestAnimationFrame(() => {
      const target = document.getElementById(id);
      if (target) target.scrollIntoView({ block: "start" });
    });
  }
})();
