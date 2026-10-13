import { countries, flag } from "./countries.js";
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
  const close = () => {
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
          : "Type your car name.";
      menu.append(empty);
    }
    menu.hidden = false;
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
  root.querySelectorAll("select").forEach(enhanceSelect);
  root.querySelectorAll("input[list]").forEach(enhanceSuggestions);
}
document.addEventListener("pointerdown", (e) => {
  if (openMenu && !openMenu.shell.contains(e.target)) closeMenu();
});
window.addEventListener("hashchange", closeMenu);
document.addEventListener("close", closeMenu, true);
// A local liquid highlight, clipped to the title. No page-wide cursor follower.
export function titleMotion(title) {
  if (
    !title ||
    matchMedia("(prefers-reduced-motion: reduce)").matches ||
    !matchMedia("(pointer: fine)").matches
  )
    return () => {};
  let frame,
    x = 0,
    y = 0,
    tx = 0,
    ty = 0,
    active = false;
  const draw = () => {
    x += (tx - x) * 0.18;
    y += (ty - y) * 0.18;
    title.style.setProperty("--ink-x", x + "px");
    title.style.setProperty("--ink-y", y + "px");
    if (active || Math.abs(tx - x) + Math.abs(ty - y) > 0.2)
      frame = requestAnimationFrame(draw);
    else frame = 0;
  };
  const move = (e) => {
    const r = title.getBoundingClientRect();
    tx = e.clientX - r.left;
    ty = e.clientY - r.top;
    if (!active) {
      x = tx;
      y = ty;
    }
    active = true;
    title.classList.add("ink-active");
    if (!frame) frame = requestAnimationFrame(draw);
  };
  const leave = () => {
    active = false;
    title.classList.remove("ink-active");
  };
  title.addEventListener("pointermove", move);
  title.addEventListener("pointerleave", leave);
  return () => {
    cancelAnimationFrame(frame);
    title.removeEventListener("pointermove", move);
    title.removeEventListener("pointerleave", leave);
  };
}
