const productCatalog = [
  { id: '1', type: 'electronics', name: 'Laptop', inStock: true, price: 999 },
  { id: '2', type: 'apparel', name: 'T-Shirt', inStock: true, price: 20 },
  { id: '3', type: 'internal', name: 'Internal Config', price: 0 }
];

exports.filterProducts = (query) => {
    if (!query || typeof query !== 'object') {
        return productCatalog;
    }
    return productCatalog.filter(doc => {
        for (let k in query) {
            // To prevent NoSQL query injection / logical query bypass,
            // we do not support object-based query structures (like $ne, $in, etc.).
            // Only primitive comparisons (strings, numbers, booleans) are permitted.
            if (typeof query[k] === 'object' && query[k] !== null) {
                return false;
            }
            if (doc[k] !== query[k]) {
                return false;
            }
        }
        return true;
    });
};
