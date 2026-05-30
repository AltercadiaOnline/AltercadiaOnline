export const SceneManager = {
  showExploration(): void {
    document.getElementById('scene-exploration')?.classList.remove('hidden');
    document.getElementById('scene-combat')?.classList.add('hidden');
  },

  showCombat(): void {
    document.getElementById('scene-exploration')?.classList.add('hidden');
    document.getElementById('scene-combat')?.classList.remove('hidden');
    // Aqui futuramente carregaremos os sprites do oponente
  },
};
