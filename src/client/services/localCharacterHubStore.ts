// @ts-nocheck
import { createEmptyCharacterHub, isAccountCharacterHub, listHubCharacters, } from '../../shared/characterHub.js';
import { nextCharacterId, validateCreateCharacterInput, } from '../../shared/characterCreation.js';
import { createDefaultPlayerSkin } from '../../shared/character/playerSkin.js';
import { normalizeAccountCharacter, resolveCharacterSkin, } from '../../shared/character/characterAppearance.js';
const STORAGE_KEY = 'altercadia.local.characterHubs';
function readHubs() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw)
            return {};
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object')
            return {};
        const record = parsed;
        const valid = {};
        for (const [userId, hub] of Object.entries(record)) {
            if (isAccountCharacterHub(hub) && hub.userId === userId) {
                valid[userId] = normalizeCharacterHub(hub);
            }
        }
        return valid;
    }
    catch {
        return {};
    }
}
function writeHubs(hubs) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hubs));
}
function normalizeCharacterHub(hub) {
    let changed = false;
    const slots = hub.slots.map((slot) => {
        if (!slot)
            return null;
        const normalized = normalizeAccountCharacter(slot);
        if (normalized !== slot)
            changed = true;
        return normalized;
    });
    if (!changed)
        return hub;
    return { userId: hub.userId, slots };
}
export function ensureCharacterHub(userId) {
    const hubs = readHubs();
    const existing = hubs[userId];
    if (existing)
        return existing;
    const hub = createEmptyCharacterHub(userId);
    hubs[userId] = hub;
    writeHubs(hubs);
    return hub;
}
export function getCharacterHub(userId) {
    const hub = readHubs()[userId];
    return hub ?? null;
}
export function saveCharacterHub(hub) {
    const hubs = readHubs();
    hubs[hub.userId] = hub;
    writeHubs(hubs);
}
export function resetCharacterHub(userId) {
    const hub = createEmptyCharacterHub(userId);
    saveCharacterHub(hub);
    return hub;
}
export function createCharacterInSlot(userId, input) {
    const validation = validateCreateCharacterInput(input);
    if (!validation.ok) {
        return { ok: false, message: validation.message };
    }
    const hub = ensureCharacterHub(userId);
    if (hub.slots[validation.slotIndex] !== null) {
        return { ok: false, message: 'Este slot já possui um personagem.' };
    }
    const existingNames = listHubCharacters(hub).map((character) => character.name.toLowerCase());
    if (existingNames.includes(validation.name.toLowerCase())) {
        return { ok: false, message: 'Já existe um personagem com este nome nesta conta.' };
    }
    const character = {
        id: nextCharacterId(listHubCharacters(hub).map((entry) => entry.id)),
        name: validation.name,
        class: validation.class,
        level: 1,
        slotIndex: validation.slotIndex,
        skin: createDefaultPlayerSkin(),
    };
    const slots = [...hub.slots];
    slots[validation.slotIndex] = character;
    const updatedHub = {
        userId: hub.userId,
        slots,
    };
    saveCharacterHub(updatedHub);
    return { ok: true, hub: updatedHub, character };
}
export function updateCharacterSkin(userId, characterId, skin) {
    const hub = getCharacterHub(userId);
    if (!hub) {
        return { ok: false, message: 'Hub de personagens indisponível.' };
    }
    const slotIndex = hub.slots.findIndex((slot) => slot !== null && slot.id === characterId);
    if (slotIndex < 0) {
        return { ok: false, message: 'Personagem não encontrado.' };
    }
    const current = hub.slots[slotIndex];
    const nextSkin = resolveCharacterSkin({ skin });
    const character = {
        ...current,
        skin: nextSkin,
    };
    const slots = [...hub.slots];
    slots[slotIndex] = character;
    const updatedHub = { userId: hub.userId, slots };
    saveCharacterHub(updatedHub);
    return { ok: true, hub: updatedHub, character };
}
