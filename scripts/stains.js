/*
 * MK-Erebus-Mythos
 * Foundry VTT v12/v13 module for Erebus Mythos / Shadowdark campaigns.
 * v0.1.5: detect visible Devout class blocks on Shadowdark sheets.
 */

const MKEM = {
  ID: "mk-erebus-mythos",
  LEGACY_IDS: ["mk-erebus-stains"],
  MIN_STAIN: 1,
  MAX_STAIN: 6,
  DEVOUT_MAX_STAIN: 4,
  FLAGS: {
    stain: "stain",
    evilEye: "evilEye"
  },
  EYE_ICON: "icons/magic/perception/eye-ringed-glow-angry-red.webp"
};

function clampNumber(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function htmlElement(html) {
  if (html instanceof HTMLElement) return html;
  if (html?.[0] instanceof HTMLElement) return html[0];
  return null;
}

function getFlagCompat(actor, key) {
  if (!actor) return undefined;

  // getFlag() validates that the flag scope belongs to an active package.
  // After the module rename, the old mk-erebus-stains scope is no longer active,
  // so reading it via getFlag() throws in Foundry v12. Read legacy flags directly.
  const current = actor.getFlag?.(MKEM.ID, key);
  if (current !== undefined) return current;

  for (const namespace of MKEM.LEGACY_IDS ?? []) {
    const legacy = foundry.utils.getProperty(actor, `flags.${namespace}.${key}`);
    if (legacy !== undefined) return legacy;
  }

  return undefined;
}

function normalizeName(value) {
  return String(value ?? "").trim().toLowerCase();
}

function hasDevoutName(value) {
  return /\bdevout\b/i.test(String(value ?? ""));
}

function compactText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function itemType(item) {
  return normalizeName(item?.type ?? item?.documentName ?? "");
}

function itemName(item) {
  return normalizeName(item?.name ?? item?.system?.name ?? "");
}

function getClassNames(actor) {
  if (!actor) return [];

  const names = [];
  const push = value => {
    const name = normalizeName(value?.name ?? value?.label ?? value?.value ?? value?.title ?? value);
    if (name) names.push(name);
  };

  push(actor.system?.class);
  push(actor.system?.className);
  push(actor.system?.details?.class);
  push(actor.system?.details?.className);
  push(actor.system?.character?.class);
  push(actor.system?.character?.className);

  for (const value of Object.values(actor.system?.classes ?? {})) {
    push(value);
  }

  for (const item of actor.items ?? []) {
    const type = itemType(item);
    const name = itemName(item);
    const category = normalizeName(item?.system?.category ?? item?.system?.type ?? "");
    if (name && (type.includes("class") || category.includes("class") || hasDevoutName(name))) push(name);
  }

  return [...new Set(names)];
}

function hasVisibleDevoutClass(root) {
  if (!root) return false;

  return [...root.querySelectorAll(".SD-box, .item, .resource, .form-group, [data-item-id], li, section, article")]
    .some(element => {
      const text = compactText(element.textContent);
      return text.length <= 120 && /\bclass\b/i.test(text) && hasDevoutName(text);
    });
}

function getMaxStain(actor, root = null) {
  return getClassNames(actor).some(hasDevoutName) || hasVisibleDevoutClass(root) ? MKEM.DEVOUT_MAX_STAIN : MKEM.MAX_STAIN;
}

function getState(actor, root = null) {
  const maxStain = getMaxStain(actor, root);
  return {
    stain: clampNumber(getFlagCompat(actor, MKEM.FLAGS.stain) ?? MKEM.MIN_STAIN, MKEM.MIN_STAIN, maxStain),
    evilEye: Boolean(getFlagCompat(actor, MKEM.FLAGS.evilEye))
  };
}

function canControl(actor) {
  return Boolean(actor && (game.user.isGM || actor.isOwner));
}

function actorSpeaker(actor) {
  return ChatMessage.getSpeaker({ actor });
}

function getDiceResults(roll) {
  const results = [];
  for (const term of roll.terms ?? []) {
    if (Array.isArray(term.results)) {
      for (const r of term.results) results.push(r.result);
    }
  }
  return results;
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
}

async function setStain(actor, value, root = null) {
  if (!canControl(actor)) return ui.notifications.warn("You do not own this actor.");
  const stain = clampNumber(value, MKEM.MIN_STAIN, getMaxStain(actor, root));
  await actor.setFlag(MKEM.ID, MKEM.FLAGS.stain, stain);
}

async function setEvilEye(actor, active) {
  if (!canControl(actor)) return ui.notifications.warn("You do not own this actor.");
  await actor.setFlag(MKEM.ID, MKEM.FLAGS.evilEye, Boolean(active));
}

async function addStain(actor, amount = 1) {
  if (!actor) return ui.notifications.warn("Select a token or open a character sheet first.");
  const state = getState(actor);
  await setStain(actor, state.stain + Number(amount || 0));
}

async function clearStain(actor) {
  if (!actor) return ui.notifications.warn("Select a token or open a character sheet first.");
  await setStain(actor, MKEM.MIN_STAIN);
  await setEvilEye(actor, false);
}

function renderChatCard(actor, title, body) {
  return `
  <div class="mk-em-chat-card">
    <strong>${escapeHtml(title)}</strong><br>
    <span>${body}</span>
  </div>`;
}

async function rollEvilEye(actor, root = null) {
  if (!actor) return ui.notifications.warn("Select a token or open a character sheet first.");
  if (!canControl(actor)) return ui.notifications.warn("You do not own this actor.");

  const state = getState(actor, root);
  const maxStain = getMaxStain(actor, root);
  const roll = await new Roll(`${state.stain}d6`).evaluate({ async: true });
  const dice = getDiceResults(roll);
  const ones = dice.filter(d => d === 1).length;
  const triggered = ones > 0;

  const title = triggered ? "Evil Eye: TRIGGERED" : "Evil Eye: Safe";
  const body = [
    `${escapeHtml(actor.name)} rolls <strong>${state.stain}d6</strong> for Stain.`,
    `Dice: <span class="mk-em-rolls">${dice.join(", ")}</span>`,
    triggered
      ? `<strong>${ones}</strong> one${ones === 1 ? "" : "s"} rolled. The Evil Eye manifests and the Stain track is set to ${maxStain}.`
      : `No 1 was rolled.`
  ].join("<br>");

  await roll.toMessage({
    speaker: actorSpeaker(actor),
    flavor: renderChatCard(actor, title, body)
  });

  if (triggered) {
    await setStain(actor, maxStain, root);
    await setEvilEye(actor, true);
  }
}

function selectedActor() {
  const token = canvas?.tokens?.controlled?.[0];
  if (token?.actor) return token.actor;
  if (game.user.character) return game.user.character;
  return null;
}

function buildTracker(actor, root = null) {
  const state = getState(actor, root);
  const maxStain = getMaxStain(actor, root);
  const wrapper = document.createElement("div");
  wrapper.className = `SD-box mk-em-tracker${state.evilEye ? " mk-em-evil" : ""}`;
  wrapper.dataset.mkErebusMythos = "tracker";

  const pips = Array.from({ length: MKEM.MAX_STAIN }, (_, i) => {
    const value = i + 1;
    const active = value <= state.stain;
    const disabled = value > maxStain;
    return `
      <button type="button"
        class="mk-em-stain-pip${active ? " active" : ""}${disabled ? " disabled" : ""}"
        data-mkem-action="set-stain"
        data-mkem-value="${value}"
        ${disabled ? "disabled" : ""}
        aria-label="${disabled ? `Stain ${value} is unavailable for Devout characters` : `Set Stain to ${value}`}"
        title="${disabled ? `Stain ${value} is unavailable for Devout characters` : `Set Stain to ${value}`}">${value}</button>`;
  }).join("");

  wrapper.innerHTML = `
    <div class="header">
      <label>Stain Track</label>
      <span class="mk-em-stain-value">Stain ${state.stain}/${maxStain}</span>
    </div>
    <div class="content mk-em-content">
      <div class="mk-em-track" aria-label="Stain tracker 1 to 6">${pips}</div>
      <button type="button" class="mk-em-eye-button" data-mkem-action="roll-evil-eye" title="Roll Evil Eye" aria-label="Roll Evil Eye">
        <img src="${MKEM.EYE_ICON}" alt="">
      </button>
    </div>`;

  wrapper.querySelectorAll("[data-mkem-action='set-stain']").forEach(button => {
    button.addEventListener("click", async ev => {
      ev.preventDefault();
      ev.stopPropagation();
      if (button.disabled) return;
      const value = clampNumber(button.dataset.mkemValue, 1, maxStain);
      const current = getState(actor, root).stain;
      const next = current === value ? Math.max(MKEM.MIN_STAIN, value - 1) : value;
      await setStain(actor, next, root);
    });
  });

  wrapper.querySelector("[data-mkem-action='roll-evil-eye']")?.addEventListener("click", async ev => {
    ev.preventDefault();
    ev.stopPropagation();
    await rollEvilEye(actor, root);
  });

  return wrapper;
}

function findSpecialAbilitiesBox(root) {
  const boxes = [...root.querySelectorAll(".tab-abilities .grid-1-columns > .SD-box")];
  if (!boxes.length) return null;

  // The Shadowdark player abilities tab currently renders Attacks first and Special Abilities second.
  // Prefer the box whose header reads Special Abilities, but fall back to the last box in the right column.
  const special = boxes.find(box => {
    const label = box.querySelector(":scope > .header label")?.textContent?.trim()?.toLowerCase() ?? "";
    return label.includes("special") || label.includes("abilities");
  });
  return special ?? boxes.at(-1);
}

function hideLuckBox(root) {
  const luckBox = [...root.querySelectorAll(".SD-box")].find(box => {
    const label = box.querySelector(":scope > .header label")?.textContent?.trim()?.toLowerCase() ?? "";
    return label.includes("luck");
  });

  if (luckBox) luckBox.style.display = "none";
}

function injectTracker(app, html) {
  const actor = app?.actor;
  if (!actor || !canControl(actor)) return;

  const root = htmlElement(html);
  if (!root) return;
  if (root.querySelector("[data-mk-erebus-mythos='tracker']")) return;

  const tab = root.querySelector(".tab-abilities");
  if (!tab) return;

  hideLuckBox(root);

  const tracker = buildTracker(actor, root);
  const specialBox = findSpecialAbilitiesBox(root);
  if (specialBox) {
    specialBox.insertAdjacentElement("afterend", tracker);
    return;
  }

  const fallbackColumn = tab.querySelector(".grid-1-columns") ?? tab;
  fallbackColumn.appendChild(tracker);
}

function registerHooks() {
  Hooks.on("renderActorSheet", injectTracker);

  // Some Shadowdark sheet classes emit their concrete render hook names instead of only renderActorSheet.
  Hooks.on("renderShadowdarkPlayerSheet", injectTracker);
  Hooks.on("renderShadowdarkActorSheet", injectTracker);
  Hooks.on("renderSDPlayerSheet", injectTracker);
}

Hooks.once("ready", () => {
  registerHooks();

  const api = {
    getState,
    getMaxStain,
    setStain,
    addStain,
    clearStain,
    rollEvilEye,
    setEvilEye,
    selectedActor
  };

  game.mkErebusMythos = api;
  game.mkErebusStains = api; // Backward-compatible alias for v0.1.0 macros.
  console.log(`${MKEM.ID} | Ready. Erebus Mythos tracker injected into Shadowdark actor abilities sheets.`);
});
