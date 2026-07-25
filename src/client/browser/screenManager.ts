// @ts-nocheck
export function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach((screen) => {
        screen.classList.add('hidden');
    });
    document.getElementById(screenId)?.classList.remove('hidden');
}
