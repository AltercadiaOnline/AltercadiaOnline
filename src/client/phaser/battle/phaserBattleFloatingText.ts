// @ts-nocheck
const FLOAT_DEPTH = 26;
export function showPhaserBattleFloatingText(scene, anchor, amount, mode = 'damage') {
    const value = Math.max(0, Math.round(amount));
    if (value <= 0 && mode === 'damage')
        return;
    let label = `-${value}`;
    let color = '#f85149';
    if (mode === 'heal') {
        label = `+${value}`;
        color = '#3fb950';
    }
    else if (mode === 'shield') {
        label = `▲${value}`;
        color = '#58a6ff';
    }
    const text = scene.add.text(anchor.x + 28, anchor.y - 24, label, {
        fontFamily: 'Courier New, monospace',
        fontSize: '14px',
        fontStyle: 'bold',
    });
    text.setOrigin(0, 0.5);
    text.setDepth(FLOAT_DEPTH);
    text.setColor(color);
    const start = performance.now();
    const tick = () => {
        const t = (performance.now() - start) / 920;
        if (t >= 1) {
            text.destroy();
            return;
        }
        text.setPosition(anchor.x + 28, anchor.y - 24 - t * 22);
        text.setAlpha(1 - t * 0.85);
        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}
