/*
 * MK-Erebus-Mythos
 * Foundry VTT v12/v13 module for Erebus Mythos / Shadowdark campaigns.
 * v0.1.2: fix legacy flag reads after module rename.
 */

const MKEM = {
  ID: "mk-erebus-mythos",
  LEGACY_IDS: ["mk-erebus-stains"],
  MAX_STAIN: 6,
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

function getState(actor) {
  return {
    stain: clampNumber(getFlagCompat(actor, MKEM.FLAGS.stain) ?? 0, 0, MKEM.MAX_STAIN),
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

async function setStain(actor, value) {
  if (!canControl(actor)) return ui.notifications.warn("You do not own this actor.");
  const stain = clampNumber(value, 0, MKEM.MAX_STAIN);
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
  await setStain(actor, 0);
  await setEvilEye(actor, false);
}

function renderChatCard(actor, title, body) {
  return `
  <div class="mk-em-chat-card">
    <strong>${escapeHtml(title)}</strong><br>
    <span>${body}</span>
  </div>`;
}

async function rollEvilEye(actor) {
  if (!actor) return ui.notifications.warn("Select a token or open a character sheet first.");
  if (!canControl(actor)) return ui.notifications.warn("You do not own this actor.");

  const state = getState(actor);
  if (state.stain <= 0) {
    await ChatMessage.create({
      speaker: actorSpeaker(actor),
      content: renderChatCard(actor, "Evil Eye", `${escapeHtml(actor.name)} has no Stain.`)
    });
    return;
  }

  const roll = await new Roll(`${state.stain}d6`).evaluate({ async: true });
  const dice = getDiceResults(roll);
  const ones = dice.filter(d => d === 1).length;
  const triggered = ones > 0;

  const title = triggered ? "Evil Eye: TRIGGERED" : "Evil Eye: Safe";
  const body = [
    `${escapeHtml(actor.name)} rolls <strong>${state.stain}d6</strong> for Stain.`,
    `Dice: <span class="mk-em-rolls">${dice.join(", ")}</span>`,
    triggered
      ? `<strong>${ones}</strong> one${ones === 1 ? "" : "s"} rolled. The Evil Eye manifests and the Stain track is set to 6.`
      : `No 1 was rolled.`
  ].join("<br>");

  await roll.toMessage({
    speaker: actorSpeaker(actor),
    flavor: renderChatCard(actor, title, body)
  });

  if (triggered) {
    await setStain(actor, MKEM.MAX_STAIN);
    await setEvilEye(actor, true);
  }
}

function selectedActor() {
  const token = canvas?.tokens?.controlled?.[0];
  if (token?.actor) return token.actor;
  if (game.user.character) return game.user.character;
  return null;
}

function buildTracker(actor) {
  const state = getState(actor);
  const wrapper = document.createElement("div");
  wrapper.className = `SD-box mk-em-tracker${state.evilEye ? " mk-em-evil" : ""}`;
  wrapper.dataset.mkErebusMythos = "tracker";

  const pips = Array.from({ length: MKEM.MAX_STAIN }, (_, i) => {
    const value = i + 1;
    const active = value <= state.stain;
    return `
      <button type="button"
        class="mk-em-stain-pip${active ? " active" : ""}"
        data-mkem-action="set-stain"
        data-mkem-value="${value}"
        aria-label="Set Stain to ${value}"
        title="Set Stain to ${value}">${value}</button>`;
  }).join("");

  wrapper.innerHTML = `
    <div class="header">
      <label>Stain Track</label>
      <span class="mk-em-stain-value">Stain ${state.stain}/${MKEM.MAX_STAIN}</span>
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
      const value = clampNumber(button.dataset.mkemValue, 1, MKEM.MAX_STAIN);
      const current = getState(actor).stain;
      // Clicking the already-selected first mark clears the track without adding another visible control.
      const next = current === value ? Math.max(0, value - 1) : value;
      await setStain(actor, next);
    });
  });

  wrapper.querySelector("[data-mkem-action='roll-evil-eye']")?.addEventListener("click", async ev => {
    ev.preventDefault();
    ev.stopPropagation();
    await rollEvilEye(actor);
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

  const tracker = buildTracker(actor);
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
