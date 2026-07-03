export type InventoryStatus = "in_stock" | "limited" | "made_to_order" | "sold_out";
export type PublishingStatus = "draft" | "published" | "archived";

export type Product = {
  id: string;
  slug: string;
  name: string;
  englishName: string;
  museum: string;
  museumId: string;
  region: string;
  province: string;
  city: string;
  category: string;
  categoryId: string;
  collection: string;
  collectionId: string;
  price: number | null;
  currency: string;
  shortDescription: string;
  story: string;
  materials: string;
  dimensions: string;
  weight: string;
  images: string[];
  tags: string[];
  occasionTags: string[];
  recipientTags: string[];
  giftRecommendations: string[];
  officialCollection: string;
  inventoryStatus: InventoryStatus;
  status: PublishingStatus;
  featured: boolean;
  relatedProductIds: string[];
  shippingNote: string;
  returnNote: string;
  seoTitle: string;
  seoDescription: string;
  altText: string;
  createdAt: string;
  updatedAt: string;
};

export type ProductInput = Omit<Product, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};

export const emptyProductInput: ProductInput = {
  slug: "",
  name: "",
  englishName: "",
  museum: "",
  museumId: "",
  region: "",
  province: "",
  city: "",
  category: "",
  categoryId: "",
  collection: "",
  collectionId: "",
  price: null,
  currency: "USD",
  shortDescription: "",
  story: "",
  materials: "",
  dimensions: "",
  weight: "",
  images: [],
  tags: [],
  occasionTags: [],
  recipientTags: [],
  giftRecommendations: [],
  officialCollection: "",
  inventoryStatus: "made_to_order",
  status: "published",
  featured: false,
  relatedProductIds: [],
  shippingNote: "International shipping quoted separately.",
  returnNote: "Returns and exchanges are reviewed case by case before order confirmation.",
  seoTitle: "",
  seoDescription: "",
  altText: "",
};

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatPrice(product: Pick<Product, "price" | "currency">) {
  if (product.price == null) {
    return "Request price";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: product.currency || "USD",
  }).format(product.price);
}
