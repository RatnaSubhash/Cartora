// ============================================
// CARTORA - Product & Category Data
// data.js  | Used across all HTML pages
// ============================================

const PRODUCTS = [
  {
    id: 1, name: "Premium Leather Handbag", price: 24999, originalPrice: 32999,
    image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&q=80",
    category: "Bags", rating: 4.8, reviews: 124,
    description: "Crafted from genuine Italian leather, this premium handbag combines timeless elegance with modern functionality. Features multiple compartments, a detachable shoulder strap, and gold-tone hardware.",
    inStock: true, isNew: false, isFeatured: true
  },
  {
    id: 2, name: "Cashmere Wool Sweater", price: 15999, originalPrice: null,
    image: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=500&q=80",
    category: "Clothing", rating: 4.9, reviews: 89,
    description: "Luxuriously soft cashmere sweater in a relaxed fit. This piece offers unparalleled comfort and sophisticated style for any occasion.",
    inStock: true, isNew: true, isFeatured: true
  },
  {
    id: 3, name: "Swiss Automatic Watch", price: 108999, originalPrice: 134999,
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80",
    category: "Watches", rating: 4.7, reviews: 56,
    description: "A masterpiece of Swiss craftsmanship. Features a sapphire crystal face, water resistance to 100m, and a genuine leather band with deployant clasp.",
    inStock: true, isNew: false, isFeatured: true
  },
  {
    id: 4, name: "Silk Evening Dress", price: 37999, originalPrice: null,
    image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&q=80",
    category: "Clothing", rating: 4.6, reviews: 42,
    description: "Elegant silk evening dress with a flowing silhouette, perfect for formal occasions and galas.",
    inStock: true, isNew: true, isFeatured: true
  },
  {
    id: 5, name: "Designer Sunglasses", price: 23499, originalPrice: 28999,
    image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500&q=80",
    category: "Accessories", rating: 4.5, reviews: 78,
    description: "Premium acetate frames with polarized UV400 lenses. Comes with a branded hard case and cleaning cloth.",
    inStock: true, isNew: false, isFeatured: true
  },
  {
    id: 6, name: "Leather Oxford Shoes", price: 28999, originalPrice: null,
    image: "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=500&q=80",
    category: "Shoes", rating: 4.8, reviews: 93,
    description: "Handcrafted leather Oxford shoes with Goodyear welt construction. A timeless classic for the discerning gentleman.",
    inStock: true, isNew: false, isFeatured: true
  },
  {
    id: 7, name: "Pearl Necklace Set", price: 49999, originalPrice: 62999,
    image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=500&q=80",
    category: "Jewelry", rating: 4.9, reviews: 67,
    description: "Exquisite freshwater pearl necklace set with matching earrings. Each pearl is hand-selected for luster and perfection.",
    inStock: true, isNew: false, isFeatured: true
  },
  {
    id: 8, name: "Merino Wool Coat", price: 58999, originalPrice: null,
    image: "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=500&q=80",
    category: "Clothing", rating: 4.7, reviews: 51,
    description: "Premium merino wool coat with silk lining and tailored silhouette. The ultimate investment piece for your wardrobe.",
    inStock: true, isNew: true, isFeatured: true
  },
  {
    id: 9, name: "Artisan Ceramic Vase", price: 10999, originalPrice: null,
    image: "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=500&q=80",
    category: "Home", rating: 4.6, reviews: 34,
    description: "Handcrafted ceramic vase with unique glaze finish. Each piece is truly one-of-a-kind.",
    inStock: true, isNew: true, isFeatured: false
  },
  {
    id: 10, name: "French Linen Bedding", price: 20999, originalPrice: 24999,
    image: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=500&q=80",
    category: "Home", rating: 4.8, reviews: 112,
    description: "Premium French linen bedding set including duvet cover and two pillowcases. Naturally temperature-regulating.",
    inStock: true, isNew: false, isFeatured: false
  },
  {
    id: 11, name: "Vintage Leather Wallet", price: 7499, originalPrice: null,
    image: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=500&q=80",
    category: "Accessories", rating: 4.5, reviews: 156,
    description: "Full-grain leather wallet with vintage patina finish. Multiple card slots and an RFID-blocking layer.",
    inStock: true, isNew: false, isFeatured: false
  },
  {
    id: 12, name: "Silk Scarf Collection", price: 13499, originalPrice: 16999,
    image: "https://images.unsplash.com/photo-1584030373081-f37408581b63?w=500&q=80",
    category: "Accessories", rating: 4.7, reviews: 73,
    description: "Hand-painted silk scarf with an exclusive botanical print. Wear as a headscarf, neckerchief or bag accent.",
    inStock: true, isNew: true, isFeatured: false
  },
  {
    id: 13, name: "Gold Diamond Ring", price: 89999, originalPrice: 109999,
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500&q=80",
    category: "Jewelry", rating: 5.0, reviews: 28,
    description: "18K gold ring set with a 0.5ct round brilliant diamond. Comes with a GIA certificate and luxury gift box.",
    inStock: true, isNew: false, isFeatured: false
  },
  {
    id: 14, name: "Canvas Tote Bag", price: 4999, originalPrice: null,
    image: "https://images.unsplash.com/photo-1597348989645-64c76daa2a4e?w=500&q=80",
    category: "Bags", rating: 4.3, reviews: 201,
    description: "Heavy-duty canvas tote with leather handles and brass rivets. Large enough for a full day out.",
    inStock: true, isNew: true, isFeatured: false
  },
  {
    id: 15, name: "Ankle Strap Heels", price: 19999, originalPrice: 23999,
    image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=500&q=80",
    category: "Shoes", rating: 4.4, reviews: 88,
    description: "Suede ankle-strap block heels with cushioned insole. The perfect blend of style and comfort.",
    inStock: false, isNew: false, isFeatured: false
  },
  {
    id: 16, name: "Luxury Perfume Set", price: 12999, originalPrice: null,
    image: "https://images.unsplash.com/photo-1541643600914-78b084683702?w=500&q=80",
    category: "Beauty", rating: 4.8, reviews: 145,
    description: "Trio of eau de parfum in oriental, floral and woody notes. Presented in a beautiful gift-ready box.",
    inStock: true, isNew: true, isFeatured: false
  }
];

const CATEGORIES = [
  { name:"Clothing",    image:"https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&q=80", count:3 },
  { name:"Bags",        image:"https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&q=80", count:2  },
  { name:"Shoes",       image:"https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&q=80", count:2 },
  { name:"Watches",     image:"https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&q=80", count:1  },
  { name:"Jewelry",     image:"https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&q=80", count:2  },
  { name:"Accessories", image:"https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=400&q=80", count:3  },
  { name:"Home",        image:"https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=400&q=80", count:2 },
  { name:"Beauty",      image:"https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=80", count:1  }
];
