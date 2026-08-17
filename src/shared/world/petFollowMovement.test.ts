import { describe, expect, it } from 'vitest';
import { TILE_SIZE } from './mapConstants.js';
import {
  PET_FOLLOW_CATCHUP_MAX_MULT,
  PET_FOLLOW_OFFSET_PX,
  PET_IDLE_FLANK_OFFSET_PX,
  PET_SOUTH_IDLE_FLANK_DELAY_MS,
  nextPetSouthIdleMs,
  resolvePetFollowAnchor,
  resolvePetFollowSpeedPxPerSec,
  resolvePetSouthIdleFlankAnchor,
  tickPetFollow,
  type PetFollowState,
} from './petFollowMovement.js';

function openMap(tiles = 40): number[][] {
  return Array.from({ length: tiles }, () => Array.from({ length: tiles }, () => 0));
}

function behindSouth(player: { x: number; y: number }): PetFollowState {
  const anchor = resolvePetFollowAnchor(player, 'south');
  return { x: anchor.x, y: anchor.y, facing: 'south', southIdleMs: 0 };
}

describe('idle sul do pet — flanco lateral', () => {
  const player = { x: 320, y: 320 };
  const mapData = openMap();
  const pixelWidth = 40 * TILE_SIZE;
  const pixelHeight = 40 * TILE_SIZE;

  it('âncora sul continua atrás até o idle completar', () => {
    const behind = resolvePetFollowAnchor(player, 'south');
    expect(behind.x).toBe(player.x);
    expect(behind.y).toBe(player.y - PET_FOLLOW_OFFSET_PX);
  });

  it('flanco idle escolhe leste no empate e o lado mais perto quando há diferença', () => {
    const east = resolvePetSouthIdleFlankAnchor(player, player, mapData);
    expect(east).toEqual({
      x: player.x + PET_IDLE_FLANK_OFFSET_PX,
      y: player.y,
    });

    const westPet = { x: player.x - 8, y: player.y - PET_FOLLOW_OFFSET_PX };
    const west = resolvePetSouthIdleFlankAnchor(player, westPet, mapData);
    expect(west).toEqual({
      x: player.x - PET_IDLE_FLANK_OFFSET_PX,
      y: player.y,
    });
  });

  it('timer só corre em idle sul e zera ao andar', () => {
    expect(nextPetSouthIdleMs(false, 'south', 0, 500)).toBe(500);
    expect(nextPetSouthIdleMs(false, 'south', 1800, 500)).toBe(PET_SOUTH_IDLE_FLANK_DELAY_MS);
    expect(nextPetSouthIdleMs(true, 'south', 1500, 16)).toBe(0);
    expect(nextPetSouthIdleMs(false, 'north', 1500, 16)).toBe(0);
  });

  it('após 2s parado olhando sul, o pet anda para o lado (não fica atrás)', () => {
    let pet = behindSouth(player);
    const inputBase = {
      playerPosition: player,
      playerFacing: 'south' as const,
      mapData,
      pixelWidth,
      pixelHeight,
      playerMoving: false,
    };

    for (let elapsed = 0; elapsed < 1500; elapsed += 48) {
      pet = tickPetFollow({ ...inputBase, pet, deltaMs: 48 });
    }
    expect(pet.southIdleMs).toBeLessThan(PET_SOUTH_IDLE_FLANK_DELAY_MS);
    expect(pet.x).toBeCloseTo(player.x, 0);

    const startX = pet.x;
    for (let elapsed = 1500; elapsed < 2800; elapsed += 48) {
      pet = tickPetFollow({ ...inputBase, pet, deltaMs: 48 });
    }
    expect(pet.southIdleMs).toBe(PET_SOUTH_IDLE_FLANK_DELAY_MS);
    expect(pet.x).toBeGreaterThan(startX + 8);
    expect(Math.abs(pet.y - player.y)).toBeLessThan(PET_FOLLOW_OFFSET_PX);
  });

  it('ao voltar a andar, o pet retoma o follow atrás imediatamente', () => {
    let pet: PetFollowState = {
      x: player.x + PET_IDLE_FLANK_OFFSET_PX,
      y: player.y,
      facing: 'south',
      southIdleMs: PET_SOUTH_IDLE_FLANK_DELAY_MS,
    };

    pet = tickPetFollow({
      pet,
      playerPosition: player,
      playerFacing: 'east',
      mapData,
      pixelWidth,
      pixelHeight,
      deltaMs: 48,
      playerMoving: true,
    });

    expect(pet.southIdleMs).toBe(0);
    const behindEast = resolvePetFollowAnchor(player, 'east');
    expect(pet.x).toBeLessThan(player.x + PET_IDLE_FLANK_OFFSET_PX);
    expect(Math.abs(pet.x - behindEast.x) + Math.abs(pet.y - behindEast.y)).toBeLessThan(
      Math.abs(player.x + PET_IDLE_FLANK_OFFSET_PX - behindEast.x),
    );
  });
});

describe('velocidade de follow do pet', () => {
  it('nunca fica abaixo da velocidade do jogador, mesmo com espécie lenta', () => {
    const playerSpeed = 140;
    expect(resolvePetFollowSpeedPxPerSec(playerSpeed, 4, 0.86)).toBeGreaterThanOrEqual(playerSpeed);
    expect(resolvePetFollowSpeedPxPerSec(playerSpeed, 4, 1)).toBe(playerSpeed);
  });

  it('acelera o catch-up quando atrasado, sem ser teleporte', () => {
    const playerSpeed = 120;
    const close = resolvePetFollowSpeedPxPerSec(playerSpeed, 8, 1);
    const far = resolvePetFollowSpeedPxPerSec(playerSpeed, TILE_SIZE * 3, 1);
    expect(close).toBe(playerSpeed);
    expect(far).toBeGreaterThan(playerSpeed);
    expect(far).toBeLessThanOrEqual(playerSpeed * PET_FOLLOW_CATCHUP_MAX_MULT + 0.01);
  });

  it('atraso de 4 tiles: anda em direção à âncora em vez de teleportar', () => {
    const player = { x: 320, y: 320 };
    const mapData = openMap();
    const behind = resolvePetFollowAnchor(player, 'east');
    let pet: PetFollowState = {
      x: behind.x - TILE_SIZE * 4,
      y: behind.y,
      facing: 'east',
      southIdleMs: 0,
    };
    const start = { x: pet.x, y: pet.y };

    pet = tickPetFollow({
      pet,
      playerPosition: player,
      playerFacing: 'east',
      mapData,
      pixelWidth: 40 * TILE_SIZE,
      pixelHeight: 40 * TILE_SIZE,
      deltaMs: 48,
      playerMoving: true,
      playerSpeedPxPerSec: 160,
      followSpeedMult: 0.86,
    });

    expect(pet.x).not.toBe(behind.x);
    expect(pet.x).toBeGreaterThan(start.x);
    expect(pet.y).toBeCloseTo(start.y, 5);
  });
});
