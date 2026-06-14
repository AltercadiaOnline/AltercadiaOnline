import type { EquipmentUiSlotId } from '../../../shared/character/equipmentUiSlots.js';

/** Silhuetas pixel — indicam o tipo de slot quando vazio (estilo SET lateral). */
const EQUIP_SLOT_GLYPH_SVG: Record<EquipmentUiSlotId, string> = {
  helmet: `
    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="currentColor" d="M4 4h8v1H4V4zm-1 1h10v2H3V5zm1 2h8v1H4V7zm-1 1h1v3H3V8zm11 0h1v3h-1V8zm-9 3h8v1H5v-1zm1 1h6v1H6v-1z"/>
    </svg>
  `,
  armor: `
    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="currentColor" d="M5 3h6v1H5V3zm-2 1h10v1H3V4zm0 1h2v7H3V5zm10 0h2v7h-2V5zm-8 0h6v2H5V5zm0 2h6v1H5V7zm0 1h6v4H5v-4z"/>
    </svg>
  `,
  legs: `
    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="currentColor" d="M6 3h4v1H6V3zm-1 1h6v4H5V4zm0 4h2v5H5V8zm6 0h2v5h-2V8zm-4 0h2v5H7V8z"/>
    </svg>
  `,
  boots: `
    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="currentColor" d="M5 9h2v2H5V9zm4 0h2v2H9V9zm-4 2h6v1H5v-1zm-5 1h3v2H1v-2zm10 0h3v2h-3v-2zm-8 2h10v1H3v-1z"/>
    </svg>
  `,
  amulet: `
    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="currentColor" d="M7 2h2v1H7V2zm-2 1h6v1H5V3zm-1 1h1v2H4V4zm10 0h1v2h-1V4zm-4 2h2v1H8V6zm-2 1h6v1H6V7zm-2 1h1v3H4V8zm10 0h1v3h-1V8zm-3 3h2v1h-2v-1zm-4 0h2v1H7v-1z"/>
    </svg>
  `,
  card: `
    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="currentColor" d="M4 3h8v10H4V3zm1 1v8h6V4H5zm1 1h4v1H6V5zm0 2h3v1H6V7zm0 2h4v1H6V9z"/>
    </svg>
  `,
  books: `
    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="currentColor" d="M3 4h4v9H3V4zm1 1v7h2V5H4zm6-1h4v9H9V4zm1 1v7h2V5h-2z"/>
    </svg>
  `,
  runes: `
    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="currentColor" d="M5 3h6v1H5V3zm-1 1h8v9H4V4zm1 1h6v1H5V5zm0 2h1v5H5V7zm4 0h1v5H9V7zm-3 1h2v1H6V8zm0 2h2v1H6v-1z"/>
    </svg>
  `,
  ring_left: `
    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="currentColor" d="M6 5h4v1H6V5zm-2 1h8v5H4V6zm1 1v3h6V7H5zm-1 4h1v1H4v-1zm10 0h1v1h-1v-1zm-2 1h2v1h-2v-1zm-6 0h2v1H6v-1z"/>
    </svg>
  `,
  ring_right: `
    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="currentColor" d="M6 5h4v1H6V5zm-2 1h8v5H4V6zm1 1v3h6V7H5zm-1 4h1v1H4v-1zm10 0h1v1h-1v-1zm-2 1h2v1h-2v-1zm-6 0h2v1H6v-1z"/>
    </svg>
  `,
};

export function renderEquipSlotGlyph(slotId: EquipmentUiSlotId): string {
  const svg = EQUIP_SLOT_GLYPH_SVG[slotId];
  return `<span class="equip-slot__glyph">${svg}</span>`;
}
