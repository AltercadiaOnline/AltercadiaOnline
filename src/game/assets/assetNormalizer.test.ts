import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  evaluateAssetScale,
  normalizeAsset,
  resetAssetScaleAlerts,
} from './assetNormalizer.js';

describe('assetNormalizer', () => {
  it('detecta resize forçado quando fonte difere do alvo', () => {
    const result = evaluateAssetScale(80, 40, 40, 40);
    assert.equal(result.forcedResize, true);
  });

  it('detecta mismatch de proporção acima de 10%', () => {
    const mismatch = evaluateAssetScale(80, 40, 40, 40);
    assert.equal(mismatch.proportionMismatch, true);

    const ok = evaluateAssetScale(35, 54, 35, 54);
    assert.equal(ok.proportionMismatch, false);
  });

  it('normalizeAsset aplica tamanho alvo e tint de aviso', () => {
    resetAssetScaleAlerts();
    let displayW = 0;
    let displayH = 0;
    let tinted = false;

    normalizeAsset(
      {
        sourceWidth: 100,
        sourceHeight: 50,
        fileName: 'test_prop.png',
        setDisplaySize: (w, h) => {
          displayW = w;
          displayH = h;
        },
        setWarningTint: (active) => {
          tinted = active;
        },
      },
      40,
      40,
    );

    assert.equal(displayW, 40);
    assert.equal(displayH, 40);
    assert.equal(tinted, true);
  });
});
