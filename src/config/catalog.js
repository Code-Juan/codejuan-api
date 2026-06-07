//server-side price catalog -- checkout sessions may only reference these items
//amounts are in cents; keep in sync with the services pricing page
//add entries here as new offerings (deposits, maintenance, add-ons) need checkout support
const catalog = {
  'basic-website': { name: 'Basic Website', amount: 75000 },
  'starter-website': { name: 'Starter Website', amount: 150000 },
  'professional-website': { name: 'Professional Website', amount: 350000 },
  'premium-commerce': { name: 'Premium Commerce Website', amount: 750000 },
};

function getCatalogItem(itemId) {
  return catalog[itemId] || null;
}

module.exports = { catalog, getCatalogItem };
