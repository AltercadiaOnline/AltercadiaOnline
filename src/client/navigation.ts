export function showScreen(screenId: string): void {
  document.querySelectorAll('.screen').forEach((screen) => {
    (screen as HTMLElement).style.display = 'none';
  });

  const screen = document.getElementById(screenId);
  if (!screen) return;

  screen.style.display = screen.classList.contains('full-screen') ? 'flex' : 'block';
}
