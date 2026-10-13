import { countries, flag } from "./countries.js";
import { enhanceLapInput } from "./lap-input.js";
let sequence = 0;
const chevron =
  '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7 5 5 5-5"/></svg>';
let openMenu;
function closeMenu() {
  openMenu?.close();
  openMenu = null;
}
function labelFor(input, button) {
  const labels = [...(input.labels || [])];
  if (labels.length) {
    button.setAttribute(
      "aria-label",
      labels
        .map((label) => {
          const copy = label.cloneNode(true);
          copy
            .querySelectorAll(".select-shell,select,input,button,textarea")
            .forEach((node) => node.remove());
          return copy.textContent.trim();
        })
        .join(" "),
    );
  } else
    button.setAttribute(
      "aria-label",
      input.getAttribute("aria-label") || input.name || "Choose an option",
    );
}
function enhanceSelect(select) {
  if (select.dataset.enhanced) {
    select._sync?.();
    return;
  }
  select.dataset.enhanced = "true";
  const shell = document.createElement("div");
  shell.className = "select-shell";
  select.before(shell);
  shell.append(select);
  select.classList.add("select-native");
  select.tabIndex = -1;
  select.setAttribute("aria-hidden", "true");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "select-trigger";
  button.id = "select-button-" + ++sequence;
  const menu = document.createElement("div");
  menu.className = "select-menu";
  menu.id = "select-menu-" + sequence;
  menu.hidden = true;
  menu.setAttribute("role", "listbox");
  button.setAttribute("role", "combobox");
  button.setAttribute("aria-haspopup", "listbox");
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-controls", menu.id);
  shell.append(button, menu);
  labelFor(select, button);
  let active = 0,
    search = "",
    searchTimer,
    choices = [];
  const sync = () => {
    const title = select.selectedOptions[0]?.textContent || "Select an option";
    if (button.querySelector("span")?.textContent !== title)
      button.innerHTML = "<span></span>" + chevron;
    button.querySelector("span").textContent = title;
    button.disabled = select.disabled;
  };
  const close = () => {
    menu.hidden = true;
    button.setAttribute("aria-expanded", "false");
    button.removeAttribute("aria-activedescendant");
    shell.classList.remove("is-open");
  };
  const highlight = () => {
    choices.forEach((c, i) => c.classList.toggle("focused", i === active));
    button.setAttribute("aria-activedescendant", choices[active]?.id || "");
    choices[active]?.scrollIntoView({ block: "nearest" });
  };
  const choose = (index) => {
    const option = choices[index]?._option;
    if (!option) return;
    select.value = option.value;
    button.removeAttribute("aria-invalid");
    closeMenu();
    sync();
    button.focus();
    select.dispatchEvent(new Event("change", { bubbles: true }));
    const next = select.id
      ? document.getElementById(select.id)
      : select.dataset.filter
        ? document.querySelector(
            `select[data-filter="${select.dataset.filter}"]`,
          )
        : select;
    next?._button?.focus();
  };
  const open = () => {
    if (select.disabled) return;
    closeMenu();
    menu.replaceChildren();
    choices = [];
    for (const option of select.options) {
      if (option.disabled) continue;
      const row = document.createElement("button");
      row.type = "button";
      row.className = "select-option";
      row.setAttribute("role", "option");
      row.tabIndex = -1;
      row.id = menu.id + "-option-" + choices.length;
      row.textContent = option.textContent;
      row._option = option;
      row.setAttribute("aria-selected", String(option.selected));
      const index = choices.length;
      row.addEventListener("click", () => choose(index));
      choices.push(row);
      menu.append(row);
    }
    active = Math.max(
      0,
      choices.findIndex((c) => c._option.selected),
    );
    menu.hidden = false;
    shell.classList.add("is-open");
    button.setAttribute("aria-expanded", "true");
    openMenu = { close, shell };
    highlight();
  };
  button.addEventListener("click", () => (menu.hidden ? open() : closeMenu()));
  button.addEventListener("keydown", (event) => {
    const key = event.key;
    if (key === "Escape" && !menu.hidden) {
      event.preventDefault();
      event.stopPropagation();
      closeMenu();
      return;
    }
    if (key === "Tab") {
      closeMenu();
      return;
    }
    if (["ArrowDown", "ArrowUp", "Home", "End", "Enter", " "].includes(key)) {
      event.preventDefault();
      if (menu.hidden) {
        open();
        return;
      }
      if (key === "Enter" || key === " ") {
        choose(active);
        return;
      }
      active =
        key === "Home"
          ? 0
          : key === "End"
            ? choices.length - 1
            : (active + (key === "ArrowDown" ? 1 : -1) + choices.length) %
              choices.length;
      highlight();
      return;
    }
    if (key.length === 1 && !event.ctrlKey && !event.metaKey) {
      clearTimeout(searchTimer);
      search += key.toLowerCase();
      searchTimer = setTimeout(() => (search = ""), 650);
      if (menu.hidden) open();
      const found = choices.findIndex((c) =>
        c.textContent.toLowerCase().startsWith(search),
      );
      if (found >= 0) {
        active = found;
        highlight();
      }
    }
  });
  select.addEventListener("focus", () => button.focus());
  select.addEventListener("invalid", () => {
    button.setAttribute("aria-invalid", "true");
    button.focus();
  });
  select.addEventListener("change", sync);
  select._button = button;
  select._sync = sync;
  sync();
}
function enhanceSuggestions(input) {
  if (input.dataset.enhanced) return;
  const list = document.getElementById(input.getAttribute("list"));
  if (!list) return;
  const values =
    input.id === "country-input"
      ? countries.map((c) => ({
          value: c.name,
          description: c.code,
          icon: flag(c.code),
        }))
      : [...list.options].map((o) => ({
          value: o.value,
          description: "",
          icon: "",
        }));
  input.dataset.enhanced = "true";
  input.removeAttribute("list");
  const shell = document.createElement("div");
  shell.className = "suggestion-shell";
  input.before(shell);
  shell.append(input);
  const menu = document.createElement("div");
  menu.className = "select-menu suggestion-menu";
  menu.id = "suggestions-" + ++sequence;
  menu.hidden = true;
  menu.setAttribute("role", "listbox");
  shell.append(menu);
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-controls", menu.id);
  let choices = [],
    active = -1;
  const floating =
    input.hasAttribute("data-driver-picker") &&
    typeof menu.showPopover === "function";
  if (floating) {
    menu.setAttribute("popover", "manual");
    menu.classList.add("driver-suggestions");
  }
  const close = () => {
    if (floating && menu.matches(":popover-open")) menu.hidePopover();
    menu.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    active = -1;
  };
  const pick = (index) => {
    if (!choices[index]) return;
    input.value = choices[index]._value;
    closeMenu();
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.focus();
  };
  const open = () => {
    closeMenu();
    menu.replaceChildren();
    active = -1;
    const q = input.value.trim().toLowerCase();
    const matches = values
      .filter(
        (v) =>
          !q ||
          v.value.toLowerCase().includes(q) ||
          v.description.toLowerCase() === q,
      )
      .slice(0, 30);
    choices = [];
    for (const item of matches) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "select-option";
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", String(input.value === item.value));
      row.tabIndex = -1;
      row.id = menu.id + "-" + choices.length;
      row._value = item.value;
      const icon = document.createElement("span");
      icon.className = "option-flag";
      icon.textContent = item.icon;
      const label = document.createElement("span");
      label.textContent = item.value;
      const code = document.createElement("small");
      code.textContent = item.description;
      row.append(icon, label, code);
      const index = choices.length;
      row.addEventListener("pointerdown", (e) => e.preventDefault());
      row.addEventListener("click", () => pick(index));
      choices.push(row);
      menu.append(row);
    }
    if (!choices.length) {
      const empty = document.createElement("p");
      empty.className = "menu-empty";
      empty.textContent =
        input.id === "country-input"
          ? "No countries found."
          : input.hasAttribute("data-driver-picker")
            ? "Choose a registered driver."
            : "Type your car name.";
      menu.append(empty);
    }
    menu.hidden = false;
    if (floating) {
      const r = input.getBoundingClientRect();
      const width = Math.min(r.width, innerWidth - 24),
        below = innerHeight - r.bottom;
      menu.style.left =
        Math.max(12, Math.min(r.left, innerWidth - width - 12)) + "px";
      menu.style.top =
        (below < 150
          ? Math.max(12, r.top - Math.min(240, r.top - 12) - 5)
          : r.bottom + 5) + "px";
      menu.style.width = width + "px";
      menu.style.maxHeight =
        Math.max(120, Math.min(240, innerHeight - r.bottom - 20)) + "px";
      menu.showPopover();
    }
    input.setAttribute("aria-expanded", "true");
    openMenu = { close, shell };
  };
  input.addEventListener("input", open);
  input.addEventListener("focus", open);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !menu.hidden) {
      e.preventDefault();
      e.stopPropagation();
      closeMenu();
      return;
    }
    if (e.key === "Tab") {
      closeMenu();
      return;
    }
    if (e.key === "Enter" && !menu.hidden && active >= 0) {
      e.preventDefault();
      pick(active);
      return;
    }
    if (!["ArrowDown", "ArrowUp"].includes(e.key)) return;
    e.preventDefault();
    if (menu.hidden) open();
    if (!choices.length) return;
    active =
      (active + (e.key === "ArrowDown" ? 1 : -1) + choices.length) %
      choices.length;
    choices.forEach((c, i) => c.classList.toggle("focused", i === active));
    input.setAttribute("aria-activedescendant", choices[active].id);
    choices[active].scrollIntoView({ block: "nearest" });
  });
  input.addEventListener("blur", () =>
    setTimeout(() => {
      if (openMenu?.shell === shell) closeMenu();
    }, 150),
  );
}
export function enhanceControls(root = document) {
  root.querySelectorAll("input[data-lap-mask]").forEach(enhanceLapInput);
  root.querySelectorAll("select").forEach(enhanceSelect);
  root.querySelectorAll("input[list]").forEach(enhanceSuggestions);
}
document.addEventListener("pointerdown", (e) => {
  if (openMenu && !openMenu.shell.contains(e.target)) closeMenu();
});
window.addEventListener("hashchange", closeMenu);
document.addEventListener("close", closeMenu, true);
// Thin, short-lived sparks follow movement across the headline.
export function titleMotion(title) {
  if (
    !title ||
    matchMedia("(prefers-reduced-motion: reduce)").matches ||
    !matchMedia("(pointer: fine)").matches
  )
    return () => {};
  const canvas = document.createElement("canvas");
  canvas.className = "title-sparks";
  canvas.setAttribute("aria-hidden", "true");
  title.append(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => canvas.remove();
  let particles = [],
    frame = 0,
    last = null,
    previous = 0;
  const resize = () => {
    const r = title.getBoundingClientRect(),
      dpr = Math.min(devicePixelRatio, 2);
    canvas.width = r.width * dpr;
    canvas.height = r.height * dpr;
    canvas.style.width = r.width + "px";
    canvas.style.height = r.height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(title);
  const draw = (now) => {
    const dt = Math.min(0.035, (now - previous) / 1000 || 0.016);
    previous = now;
    const r = title.getBoundingClientRect();
    ctx.clearRect(0, 0, r.width, r.height);
    particles = particles.filter((p) => p.life > 0);
    for (const p of particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 120 * dt;
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.strokeStyle = p.hot ? "#fff7cb" : "#ffba35";
      ctx.lineWidth = p.hot ? 1.3 : 0.7;
      ctx.shadowColor = "#ffb029";
      ctx.shadowBlur = p.hot ? 5 : 2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.022, p.y - p.vy * 0.022);
      ctx.stroke();
    }
    if (particles.length) frame = requestAnimationFrame(draw);
    else frame = 0;
  };
  const move = (event) => {
    if (document.body.classList.contains("motion-off")) return;
    const r = title.getBoundingClientRect(),
      x = event.clientX - r.left,
      y = event.clientY - r.top;
    title.style.setProperty("--ink-x", x + "px");
    title.style.setProperty("--ink-y", y + "px");
    title.classList.add("ink-active");
    const dx = last ? x - last.x : 8,
      dy = last ? y - last.y : 0,
      distance = Math.hypot(dx, dy);
    if (distance > 2) {
      const count = Math.min(12, Math.ceil(distance / 4));
      for (let i = 0; i < count; i++) {
        const life = 0.18 + Math.random() * 0.32;
        particles.push({
          x: x - (dx * i) / count,
          y: y - (dy * i) / count,
          vx: -dx * 3 + (Math.random() - 0.5) * 100,
          vy: dy * 0.6 + (Math.random() - 0.5) * 65,
          life,
          max: life,
          hot: i % 3 === 0,
        });
      }
      particles = particles.slice(-100);
      if (!frame) {
        previous = performance.now();
        frame = requestAnimationFrame(draw);
      }
    }
    last = { x, y };
  };
  const leave = () => {
    last = null;
    title.classList.remove("ink-active");
  };
  title.addEventListener("pointermove", move);
  title.addEventListener("pointerleave", leave);
  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    title.removeEventListener("pointermove", move);
    title.removeEventListener("pointerleave", leave);
    canvas.remove();
  };
}
let lastPage;
export function pageTransition(root, page, force = false) {
  if (
    (lastPage !== page || force) &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    root.animate(
      [
        { opacity: 0.15, transform: "translateY(14px)", filter: "blur(3px)" },
        { opacity: 1, transform: "translateY(0)", filter: "blur(0)" },
      ],
      { duration: 380, easing: "cubic-bezier(.2,.7,.2,1)" },
    );
  lastPage = page;
}
const bootStarted = performance.now();
let bootFinishing = false;
export async function finishBoot(ready = true) {
  const screen = document.getElementById("boot-screen");
  if (!screen || bootFinishing) return;
  bootFinishing = true;
  const status = screen.querySelector(".boot-status");
  if (status)
    status.textContent = ready ? "GRID READY" : "CONNECTING TO THE PADDOCK";
  if (ready) screen.classList.add("boot-ready");
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
    await new Promise((resolve) =>
      setTimeout(resolve, Math.max(0, 950 - (performance.now() - bootStarted))),
    );
  screen.classList.add("boot-exit");
  document.body.classList.remove("booting");
  document
    .querySelectorAll("#header,#app,#footer")
    .forEach((el) => (el.inert = false));
  setTimeout(() => screen.remove(), 450);
}
setTimeout(() => finishBoot(false), 7000);
