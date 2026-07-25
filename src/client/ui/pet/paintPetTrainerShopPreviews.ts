// @ts-nocheck
import { getDefaultPetColorId, } from '../../../shared/pet/petColorPalette.js';
import { PET_KIND_ORDER, } from '../../../shared/pet/petCatalog.js';
export function paintPetTrainerShopPreviews(root, state) {
    if (!root)
        return;
    void import('../../entities/pet/petRenderer.js').then(({ renderPetShopPreview }) => {
        if (state.customizeOpen && state.selectedKind) {
            const canvas = root.querySelector('[data-pet-custom-preview]');
            const ctx = canvas?.getContext('2d');
            if (canvas && ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                const colorId = state.selectedColor ?? getDefaultPetColorId(state.selectedKind);
                renderPetShopPreview(ctx, state.selectedKind, 8, 8, canvas.width - 16, colorId, state.selectedGender);
            }
            return;
        }
        for (const kindId of PET_KIND_ORDER) {
            const canvas = root.querySelector(`[data-pet-preview="${kindId}"]`);
            const ctx = canvas?.getContext('2d');
            if (!canvas || !ctx)
                continue;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            renderPetShopPreview(ctx, kindId, 8, 8, canvas.width - 16);
        }
    });
}
