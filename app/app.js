"use strict";
const $ = (id) => document.getElementById(id);
const KEY = "quick-notes";
const listEl = $("list"), textEl = $("text"), searchEl = $("search"), statusEl = $("status");

let notes = loadNotes();
let currentId = null;
let saveTimer = null;

function loadNotes() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(notes));
    statusEl.textContent = "Saved";
  } catch {
    statusEl.textContent = "Couldn't save (storage is full or blocked).";
  }
}

const titleOf = (n) => n.text.split("\n").find((l) => l.trim())?.trim() || "Untitled";
const when = (t) => new Date(t).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

function renderList() {
  const q = searchEl.value.trim().toLowerCase();
  const shown = [...notes].sort((a, b) => b.updated - a.updated).filter((n) => !q || n.text.toLowerCase().includes(q));
  listEl.replaceChildren(
    ...shown.map((n) => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      const t = document.createElement("span");
      const d = document.createElement("span");
      t.className = "t";
      d.className = "d";
      t.textContent = titleOf(n);
      d.textContent = when(n.updated);
      b.append(t, d);
      b.setAttribute("aria-current", String(n.id === currentId));
      b.addEventListener("click", () => open(n.id));
      li.append(b);
      return li;
    }),
  );
  if (!shown.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = q ? "No notes match." : "No notes yet.";
    listEl.append(li);
  }
}

function open(id) {
  currentId = id;
  const n = notes.find((x) => x.id === id);
  textEl.value = n ? n.text : "";
  statusEl.textContent = n ? `Edited ${when(n.updated)}` : "";
  $("delete").disabled = !n;
  renderList();
  textEl.focus();
}

function newNote(text = "") {
  const n = { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), text, updated: Date.now() };
  notes.push(n);
  searchEl.value = "";
  open(n.id);
  persist();
}

textEl.addEventListener("input", () => {
  if (!currentId) {
    newNote(textEl.value); // typing with no note open starts one
    return;
  }
  const n = notes.find((x) => x.id === currentId);
  n.text = textEl.value;
  n.updated = Date.now();
  statusEl.textContent = "Saving…";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    persist();
    renderList();
  }, 300);
});

$("delete").addEventListener("click", () => {
  const n = notes.find((x) => x.id === currentId);
  if (!n) return;
  if (n.text.trim() && !confirm(`Delete “${titleOf(n)}”?`)) return;
  notes = notes.filter((x) => x.id !== currentId);
  persist();
  const next = [...notes].sort((a, b) => b.updated - a.updated)[0];
  if (next) return open(next.id);
  currentId = null;
  textEl.value = "";
  statusEl.textContent = "";
  $("delete").disabled = true;
  renderList();
});

$("new").addEventListener("click", () => newNote());
searchEl.addEventListener("input", renderList);

// Keep tabs in sync if the app is open twice.
window.addEventListener("storage", (e) => {
  if (e.key !== KEY) return;
  notes = loadNotes();
  renderList();
});

if (!notes.length) {
  notes.push({ id: "welcome", text: "Welcome to Quick Notes\n\nType here and it's saved straight away.\nThe first line becomes the title.\nNotes stay in this browser; nothing is uploaded.", updated: Date.now() });
  persist();
}
open([...notes].sort((a, b) => b.updated - a.updated)[0].id);
