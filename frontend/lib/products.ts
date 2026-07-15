export type InventoryStatus = "in_stock" | "limited" | "made_to_order" | "sold_out";
export type PublishingStatus = "draft" | "review" | "active" | "hidden" | "archived" | "published";

export type Product = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  englishName: string;
  brand: string;
  supplier: string;
  museum: string;
  museumId: string;
  region: string;
  province: string;
  city: string;
  category: string;
  categoryId: string;
  subcategory: string;
  collection: string;
  collectionId: string;
  series: string;
  price: number | null;
  estimatedPriceMin: number | null;
  estimatedPriceMax: number | null;
  wholesalePrice: number | null;
  currency: string;
  shortDescription: string;
  shortDescriptionZh: string;
  longDescription: string;
  longDescriptionZh: string;
  story: string;
  storyZh: string;
  features: string[];
  whatsIncluded: string[];
  materials: string;
  colors: string[];
  dimensions: string;
  weight: string;
  packageSize: string;
  packageWeight: string;
  moq: number;
  leadTime: string;
  inventoryQuantity: number | null;
  origin: string;
  images: string[];
  coverImage: string;
  galleryImages: string[];
  packagingImages: string[];
  lifestyleImages: string[];
  tags: string[];
  occasionTags: string[];
  recipientTags: string[];
  targetAudience: string[];
  giftRecommendations: string[];
  officialCollection: string;
  inventoryStatus: InventoryStatus;
  status: PublishingStatus;
  featured: boolean;
  relatedProductIds: string[];
  shippingNote: string;
  returnNote: string;
  seoTitle: string;
  seoTitleZh: string;
  seoDescription: string;
  seoDescriptionZh: string;
  seoKeywords: string[];
  altText: string;
  altTextZh: string;
  needsReview: boolean;
  aiGenerated: boolean;
  translationChecked: boolean;
  photoChecked: boolean;
  sourceFolder: string;
  originalFileNames: string[];
  countriesAvailable: string[];
  languages: string[];
  ltpsVersion: string;
  createdAt: string;
  updatedAt: string;
};

export type ProductInput = Omit<Product, "id" | "createdAt" | "updatedAt"> & { id?: string };

export const emptyProductInput: ProductInput = {
  sku: "", slug: "", name: "", englishName: "", brand: "Auctus Heritage", supplier: "",
  museum: "", museumId: "", region: "", province: "", city: "", category: "", categoryId: "",
  subcategory: "", collection: "", collectionId: "", series: "", price: null, estimatedPriceMin: null,
  estimatedPriceMax: null, wholesalePrice: null, currency: "USD", shortDescription: "", shortDescriptionZh: "",
  longDescription: "", longDescriptionZh: "", story: "", storyZh: "", features: [], whatsIncluded: [],
  materials: "", colors: [], dimensions: "", weight: "", packageSize: "", packageWeight: "", moq: 1,
  leadTime: "", inventoryQuantity: null, origin: "China", images: [], coverImage: "", galleryImages: [],
  packagingImages: [], lifestyleImages: [], tags: [], occasionTags: [], recipientTags: [], targetAudience: [],
  giftRecommendations: [], officialCollection: "", inventoryStatus: "made_to_order", status: "draft", featured: false,
  relatedProductIds: [], shippingNote: "International shipping quoted separately.",
  returnNote: "Returns and exchanges are reviewed case by case before order confirmation.", seoTitle: "", seoTitleZh: "",
  seoDescription: "", seoDescriptionZh: "", seoKeywords: [], altText: "", altTextZh: "", needsReview: true,
  aiGenerated: false, translationChecked: false, photoChecked: false, sourceFolder: "", originalFileNames: [],
  countriesAvailable: ["US"], languages: ["en", "zh"], ltpsVersion: "1.0",
};

export function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function formatPrice(product: Pick<Product, "price" | "estimatedPriceMin" | "estimatedPriceMax" | "currency">) {
  const currency = product.currency || "USD";
  const format = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
  if (product.estimatedPriceMin != null && product.estimatedPriceMax != null && product.estimatedPriceMin !== product.estimatedPriceMax) {
    return `${format(product.estimatedPriceMin)}–${format(product.estimatedPriceMax)}`;
  }
  const price = product.price ?? product.estimatedPriceMin ?? product.estimatedPriceMax;
  return price == null ? "Request price" : format(price);
}
