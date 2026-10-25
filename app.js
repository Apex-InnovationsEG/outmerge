// OutMerge download page (D95): the button always points at the newest release; its version, size and SHA-256 come
// from GitHub's API, or from latest.json (written when a release is published) if the API cannot be reached.
// Until a release exists the page says "Download coming soon". Values are checked and set as text only.
(() => {
  "use strict";
  const REPO = "Apex-InnovationsEG/outmerge";
  const DOWNLOAD_URL = `https://github.com/${REPO}/releases/latest/download/OutMerge.exe`;
  const $all = (sel) => Array.from(document.querySelectorAll(sel));
  const $ = (sel) => document.querySelector(sel);

  const comingSoon = (e) => e.preventDefault();
  $all("[data-download][aria-disabled='true']").forEach((a) => a.addEventListener("click", comingSoon));

  const clean = (r) => {
    if (!r) return null;
    const version = typeof r.version === "string" ? r.version.replace(/^v/, "") : "";
    if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) return null;
    const size = Number.isFinite(r.size) && r.size > 0 ? r.size : null;
    const sha256 = typeof r.sha256 === "string" && /^[0-9a-f]{64}$/i.test(r.sha256) ? r.sha256.toLowerCase() : null;
    return { version, size, sha256 };
  };

  async function fromApi() {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 6000);
    try {
      const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: "application/vnd.github+json" }, signal: ctl.signal });
      if (!res.ok) return null;
      const rel = await res.json();
      if (rel.draft || rel.prerelease) return null;
      const exe = (rel.assets || []).find((a) => a.name === "OutMerge.exe");
      if (!exe) return null;
      const digest = typeof exe.digest === "string" && exe.digest.startsWith("sha256:") ? exe.digest.slice(7) : null;
      return clean({ version: rel.tag_name, size: exe.size, sha256: digest });
    } catch {
      return null;
    } finally {
      clearTimeout(t);
    }
  }

  async function fromFile() {
    try {
      const res = await fetch("latest.json", { cache: "no-store" });
      return res.ok ? clean(await res.json()) : null;
    } catch {
      return null;
    }
  }

  function show(r) {
    const mb = r.size ? `${(r.size / 1048576).toFixed(1)} MB` : null;
    $all("[data-download]").forEach((a) => {
      a.removeEventListener("click", comingSoon);
      a.removeAttribute("aria-disabled");
      a.href = DOWNLOAD_URL;
      a.textContent = "Download for Windows";
    });
    $("[data-meta]").textContent = ["Version " + r.version, mb, "no installer, no admin rights"].filter(Boolean).join(" · ");
    $("[data-title]").textContent = "Download OutMerge " + r.version;
    $("[data-version]").textContent = r.version;
    $("[data-size]").textContent = mb ? `${mb} (${r.size.toLocaleString("en-US")} bytes)` : "-";
    if (r.sha256) {
      $("[data-sha]").textContent = r.sha256;
      $("[data-copy]").hidden = false;
    } else {
      $("[data-sha]").textContent = "In SHA256.txt beside the file in the release";
    }
  }

  (async () => {
    const api = await fromApi();
    const file = api && api.sha256 ? null : await fromFile();
    // The API names the newest release; latest.json fills in a hash the API did not give for that same version.
    const r = api ? { ...api, sha256: api.sha256 || (file && file.version === api.version ? file.sha256 : null) } : file;
    if (r) show(r);
  })();

  $("[data-copy]").addEventListener("click", async (e) => {
    const b = e.currentTarget;
    const text = $("[data-sha]").textContent;
    try {
      await navigator.clipboard.writeText(text);
      b.textContent = "Copied";
    } catch {
      const range = document.createRange();
      range.selectNodeContents($("[data-sha]"));
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      b.textContent = "Selected";
    }
    setTimeout(() => (b.textContent = "Copy"), 1800);
  });
})();
