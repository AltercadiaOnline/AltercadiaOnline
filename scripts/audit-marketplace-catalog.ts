import { ITEM_CATALOG } from '../src/shared/items/itemCatalog.js';
import { isMarketplaceBrowseListableItem } from '../src/shared/items/marketplaceCatalogDefaults.js';
import { ItemCategory } from '../src/shared/items/itemSchema.js';
import { listMarketBrowseItems } from '../src/shared/economy/marketplaceOrderBook.js';

function main(): void {
  const tradableCatalog = ITEM_CATALOG.filter((item) => (
    item.category !== ItemCategory.Currency && item.isTradable !== false
  ));

  const missingBrowse = tradableCatalog.filter((item) => !isMarketplaceBrowseListableItem(item));
  const allBrowse = listMarketBrowseItems('all');

  console.log(`[audit-marketplace-catalog] Catálogo tradable: ${tradableCatalog.length}`);
  console.log(`[audit-marketplace-catalog] Browse ALL: ${allBrowse.length}`);

  if (missingBrowse.length > 0) {
    console.error('[audit-marketplace-catalog] Itens tradable sem entrada no marketplace:');
    for (const item of missingBrowse) {
      console.error(`  - ${item.id} (${item.name})`);
    }
    process.exit(1);
  }

  console.log('[audit-marketplace-catalog] OK — todo item tradable está no browse ALL.');
}

main();
