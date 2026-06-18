"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  Edit3,
  Eye,
  ImagePlus,
  LogOut,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import {
  emptyProductInput,
  formatPrice,
  type Product,
  type ProductInput,
  slugify,
} from "@/lib/products";
import {
  clearStoredSession,
  createProduct,
  deleteProduct,
  fetchProducts,
  getStoredSession,
  isSupabaseConfigured,
  signInAdmin,
  updateProduct,
  uploadProductImage,
} from "@/lib/supabase-rest";

const inputClass =
  "w-full border border-black/15 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#2c6f6d]";
const labelClass = "text-xs font-black uppercase tracking-[0.16em] text-[#666]";

function arrayToText(value: string[]) {
  return value.join(", ");
}

function textToArray(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function ProductForm({
  value,
  products,
  onChange,
  onSubmit,
  onUpload,
  saving,
  uploading,
}: {
  value: ProductInput;
  products: Product[];
  onChange: (value: ProductInput) => void;
  onSubmit: () => void;
  onUpload: (file: File) => void;
  saving: boolean;
  uploading: boolean;
}) {
  const relatedOptions = products.filter((product) => product.id !== value.id);

  function updateField<Key extends keyof ProductInput>(key: Key, nextValue: ProductInput[Key]) {
    onChange({ ...value, [key]: nextValue });
  }

  function handleNameChange(nextName: string) {
    onChange({
      ...value,
      englishName: nextName,
      slug: value.slug || slugify(nextName),
    });
  }

  return (
    <form
      className="grid gap-5"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className={labelClass}>English Name</span>
          <input
            className={inputClass}
            required
            value={value.englishName}
            onChange={(event) => handleNameChange(event.target.value)}
          />
        </label>
        <label className="grid gap-2">
          <span className={labelClass}>Chinese / Local Name</span>
          <input
            className={inputClass}
            value={value.name}
            onChange={(event) => updateField("name", event.target.value)}
          />
        </label>
        <label className="grid gap-2">
          <span className={labelClass}>Slug</span>
          <input
            className={inputClass}
            required
            value={value.slug}
            onChange={(event) => updateField("slug", slugify(event.target.value))}
          />
        </label>
        <label className="grid gap-2">
          <span className={labelClass}>Category</span>
          <input
            className={inputClass}
            value={value.category}
            onChange={(event) => updateField("category", event.target.value)}
          />
        </label>
        <label className="grid gap-2">
          <span className={labelClass}>Collection</span>
          <input
            className={inputClass}
            value={value.collection}
            onChange={(event) => updateField("collection", event.target.value)}
          />
        </label>
        <label className="grid gap-2">
          <span className={labelClass}>Museum</span>
          <input
            className={inputClass}
            value={value.museum}
            onChange={(event) => updateField("museum", event.target.value)}
          />
        </label>
        <label className="grid gap-2">
          <span className={labelClass}>Region</span>
          <input
            className={inputClass}
            value={value.region}
            onChange={(event) => updateField("region", event.target.value)}
          />
        </label>
        <label className="grid gap-2">
          <span className={labelClass}>Province</span>
          <input
            className={inputClass}
            value={value.province}
            onChange={(event) => updateField("province", event.target.value)}
          />
        </label>
        <label className="grid gap-2">
          <span className={labelClass}>City</span>
          <input
            className={inputClass}
            value={value.city}
            onChange={(event) => updateField("city", event.target.value)}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
          <label className="grid gap-2">
            <span className={labelClass}>Price</span>
            <input
              className={inputClass}
              min="0"
              step="0.01"
              type="number"
              value={value.price ?? ""}
              onChange={(event) =>
                updateField(
                  "price",
                  event.target.value ? Number(event.target.value) : null,
                )
              }
            />
          </label>
          <label className="grid gap-2">
            <span className={labelClass}>Currency</span>
            <input
              className={inputClass}
              value={value.currency}
              onChange={(event) => updateField("currency", event.target.value)}
            />
          </label>
        </div>
        <label className="grid gap-2">
          <span className={labelClass}>Inventory Status</span>
          <select
            className={inputClass}
            value={value.inventoryStatus}
            onChange={(event) =>
              updateField("inventoryStatus", event.target.value as ProductInput["inventoryStatus"])
            }
          >
            <option value="in_stock">In stock</option>
            <option value="limited">Limited</option>
            <option value="made_to_order">Made to order</option>
            <option value="sold_out">Sold out</option>
          </select>
        </label>
      </div>

      <label className="grid gap-2">
        <span className={labelClass}>Short Description</span>
        <textarea
          className={inputClass}
          rows={3}
          value={value.shortDescription}
          onChange={(event) => updateField("shortDescription", event.target.value)}
        />
      </label>

      <label className="grid gap-2">
        <span className={labelClass}>Product Story</span>
        <textarea
          className={inputClass}
          rows={8}
          value={value.story}
          onChange={(event) => updateField("story", event.target.value)}
        />
      </label>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-2">
          <span className={labelClass}>Materials</span>
          <input
            className={inputClass}
            value={value.materials}
            onChange={(event) => updateField("materials", event.target.value)}
          />
        </label>
        <label className="grid gap-2">
          <span className={labelClass}>Dimensions</span>
          <input
            className={inputClass}
            value={value.dimensions}
            onChange={(event) => updateField("dimensions", event.target.value)}
          />
        </label>
        <label className="grid gap-2">
          <span className={labelClass}>Weight</span>
          <input
            className={inputClass}
            value={value.weight}
            onChange={(event) => updateField("weight", event.target.value)}
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className={labelClass}>Tags</span>
          <input
            className={inputClass}
            placeholder="bronze, museum gift, stationery"
            value={arrayToText(value.tags)}
            onChange={(event) => updateField("tags", textToArray(event.target.value))}
          />
        </label>
        <label className="grid gap-2">
          <span className={labelClass}>Official Collection</span>
          <input
            className={inputClass}
            placeholder="e.g. Palace Museum Collection"
            value={value.officialCollection}
            onChange={(event) => updateField("officialCollection", event.target.value)}
          />
        </label>
        <label className="grid gap-2">
          <span className={labelClass}>Occasion Tags</span>
          <input
            className={inputClass}
            placeholder="Teacher Gifts, Housewarming, Birthday"
            value={arrayToText(value.occasionTags)}
            onChange={(event) => updateField("occasionTags", textToArray(event.target.value))}
          />
        </label>
        <label className="grid gap-2">
          <span className={labelClass}>Recipient Tags</span>
          <input
            className={inputClass}
            placeholder="Teachers, Friends, Kids"
            value={arrayToText(value.recipientTags)}
            onChange={(event) => updateField("recipientTags", textToArray(event.target.value))}
          />
        </label>
        <label className="grid gap-2">
          <span className={labelClass}>Perfect For</span>
          <input
            className={inputClass}
            placeholder="Teachers, Friends, Housewarming, Collectors"
            value={arrayToText(value.giftRecommendations)}
            onChange={(event) =>
              updateField("giftRecommendations", textToArray(event.target.value))
            }
          />
        </label>
        <label className="grid gap-2">
          <span className={labelClass}>Related Products</span>
          <select
            className={inputClass}
            multiple
            value={value.relatedProductIds}
            onChange={(event) =>
              updateField(
                "relatedProductIds",
                Array.from(event.target.selectedOptions).map((option) => option.value),
              )
            }
          >
            {relatedOptions.map((product) => (
              <option key={product.id} value={product.id}>
                {product.englishName || product.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className={labelClass}>Shipping Note</span>
          <textarea
            className={inputClass}
            rows={3}
            value={value.shippingNote}
            onChange={(event) => updateField("shippingNote", event.target.value)}
          />
        </label>
        <label className="grid gap-2">
          <span className={labelClass}>Return Note</span>
          <textarea
            className={inputClass}
            rows={3}
            value={value.returnNote}
            onChange={(event) => updateField("returnNote", event.target.value)}
          />
        </label>
      </div>

      <div className="grid gap-4">
        <span className={labelClass}>Images</span>
        <label className="flex cursor-pointer items-center justify-center gap-2 border border-dashed border-black/25 bg-white px-4 py-5 text-sm font-black transition hover:border-[#2c6f6d] hover:text-[#2c6f6d]">
          <ImagePlus size={18} />
          {uploading ? "Uploading..." : "Upload product image"}
          <input
            accept="image/*"
            className="hidden"
            disabled={uploading}
            type="file"
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              const file = event.target.files?.[0];
              if (file) {
                onUpload(file);
              }
              event.target.value = "";
            }}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          {value.images.map((image) => (
            <div className="relative border border-black/10 bg-white p-2" key={image}>
              <img alt="" className="aspect-square w-full object-cover" src={image} />
              <button
                className="mt-2 w-full border border-black/10 px-3 py-2 text-xs font-black"
                type="button"
                onClick={() =>
                  updateField(
                    "images",
                    value.images.filter((item) => item !== image),
                  )
                }
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-3 font-black">
        <input
          checked={value.featured}
          type="checkbox"
          onChange={(event) => updateField("featured", event.target.checked)}
        />
        Featured product
      </label>

      <button
        className="inline-flex items-center justify-center gap-2 bg-[#171717] px-6 py-4 text-base font-black text-white transition hover:bg-[#2c6f6d] disabled:opacity-50"
        disabled={saving}
        type="submit"
      >
        <Save size={18} />
        {saving ? "Saving..." : value.id ? "Save Product" : "Add Product"}
      </button>
    </form>
  );
}

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [draft, setDraft] = useState<ProductInput>(emptyProductInput);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === draft.id),
    [draft.id, products],
  );

  async function loadProducts(token = accessToken) {
    if (!token) {
      return;
    }
    setLoadingProducts(true);
    try {
      setProducts(await fetchProducts(token));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to load products.");
    } finally {
      setLoadingProducts(false);
    }
  }

  useEffect(() => {
    const session = getStoredSession();
    if (session?.access_token) {
      setAccessToken(session.access_token);
      void loadProducts(session.access_token);
    }
  }, []);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setStatus("Signing in...");
    try {
      const session = await signInAdmin(email, password);
      setAccessToken(session.access_token);
      setStatus("Signed in.");
      await loadProducts(session.access_token);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Sign in failed.");
    }
  }

  async function handleSave() {
    if (!accessToken) {
      return;
    }
    setSaving(true);
    setStatus("Saving product...");
    try {
      if (draft.id) {
        await updateProduct(draft.id, draft, accessToken);
      } else {
        await createProduct(draft, accessToken);
      }
      setDraft(emptyProductInput);
      await loadProducts(accessToken);
      setStatus("Product saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product: Product) {
    if (!accessToken || !window.confirm(`Delete ${product.englishName || product.name}?`)) {
      return;
    }
    setStatus("Deleting product...");
    try {
      await deleteProduct(product.id, accessToken);
      if (draft.id === product.id) {
        setDraft(emptyProductInput);
      }
      await loadProducts(accessToken);
      setStatus("Product deleted.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Delete failed.");
    }
  }

  async function handleUpload(file: File) {
    if (!accessToken) {
      return;
    }
    setUploading(true);
    setStatus("Uploading image...");
    try {
      const url = await uploadProductImage(file, accessToken);
      setDraft((current) => ({ ...current, images: [...current.images, url] }));
      setStatus("Image uploaded.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function editProduct(product: Product) {
    setDraft({
      id: product.id,
      slug: product.slug,
      name: product.name,
      englishName: product.englishName,
      museum: product.museum,
      region: product.region,
      province: product.province,
      city: product.city,
      category: product.category,
      collection: product.collection,
      price: product.price,
      currency: product.currency,
      shortDescription: product.shortDescription,
      story: product.story,
      materials: product.materials,
      dimensions: product.dimensions,
      weight: product.weight,
      images: product.images,
      tags: product.tags,
      occasionTags: product.occasionTags,
      recipientTags: product.recipientTags,
      giftRecommendations: product.giftRecommendations,
      officialCollection: product.officialCollection,
      inventoryStatus: product.inventoryStatus,
      featured: product.featured,
      relatedProductIds: product.relatedProductIds,
      shippingNote: product.shippingNote,
      returnNote: product.returnNote,
    });
  }

  if (!isSupabaseConfigured()) {
    return (
      <main className="min-h-screen bg-[#fffdf8] px-5 py-16 text-[#171717]">
        <div className="mx-auto max-w-3xl border border-black/10 bg-white p-8">
          <h1 className="text-4xl font-black">Supabase environment missing.</h1>
          <p className="mt-4 text-[#555]">
            Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
            before using the admin dashboard.
          </p>
        </div>
      </main>
    );
  }

  if (!accessToken) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#fffdf8] px-5 text-[#171717]">
        <form className="w-full max-w-md border border-black/10 bg-white p-8" onSubmit={handleLogin}>
          <p className="section-kicker">Admin Login</p>
          <h1 className="mt-4 text-4xl font-black">Little Treasures Admin</h1>
          <label className="mt-8 grid gap-2">
            <span className={labelClass}>Email</span>
            <input
              className={inputClass}
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="mt-4 grid gap-2">
            <span className={labelClass}>Password</span>
            <input
              className={inputClass}
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button className="mt-6 w-full bg-[#171717] px-5 py-4 font-black text-white" type="submit">
            Sign In
          </button>
          {status ? <p className="mt-4 text-sm font-bold text-[#555]">{status}</p> : null}
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fffdf8] text-[#171717]">
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5">
          <div>
            <p className="section-kicker">Admin Dashboard</p>
            <h1 className="mt-2 text-3xl font-black">Product Management</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              className="inline-flex items-center gap-2 border border-black/15 bg-white px-4 py-2 text-sm font-black"
              href="/catalog"
              target="_blank"
            >
              <Eye size={16} />
              View Catalog
            </a>
            <button
              className="inline-flex items-center gap-2 border border-black/15 bg-white px-4 py-2 text-sm font-black"
              type="button"
              onClick={() => loadProducts()}
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            <button
              className="inline-flex items-center gap-2 bg-[#171717] px-4 py-2 text-sm font-black text-white"
              type="button"
              onClick={() => {
                clearStoredSession();
                setAccessToken(null);
              }}
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[0.82fr_1.18fr]">
        <aside className="border border-black/10 bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-black">Products</h2>
            <button
              className="inline-flex items-center gap-2 bg-[#171717] px-3 py-2 text-sm font-black text-white"
              type="button"
              onClick={() => setDraft(emptyProductInput)}
            >
              <Plus size={16} />
              New
            </button>
          </div>
          {loadingProducts ? <p className="mt-5 text-sm font-bold">Loading products...</p> : null}
          <div className="mt-5 grid gap-3">
            {products.map((product) => (
              <article className="border border-black/10 p-4" key={product.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-black leading-tight">
                      {product.englishName || product.name}
                    </h3>
                    <p className="mt-1 text-sm text-[#555]">
                      {product.category || "Uncategorized"} · {formatPrice(product)}
                    </p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#2c6f6d]">
                      {product.featured ? "Featured" : product.inventoryStatus.replaceAll("_", " ")}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      aria-label="Edit product"
                      className="grid size-9 place-items-center border border-black/10"
                      type="button"
                      onClick={() => editProduct(product)}
                    >
                      <Edit3 size={15} />
                    </button>
                    <a
                      aria-label="Preview product"
                      className="grid size-9 place-items-center border border-black/10"
                      href={`/products/${product.slug}`}
                      target="_blank"
                    >
                      <Eye size={15} />
                    </a>
                    <button
                      aria-label="Delete product"
                      className="grid size-9 place-items-center border border-black/10 text-[#b42318]"
                      type="button"
                      onClick={() => handleDelete(product)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {!products.length && !loadingProducts ? (
              <p className="border border-dashed border-black/20 p-5 text-sm font-bold text-[#555]">
                No products yet. Add your first cultural treasure.
              </p>
            ) : null}
          </div>
        </aside>

        <section className="border border-black/10 bg-white p-5">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black">
                {selectedProduct ? "Edit Product" : "Add Product"}
              </h2>
              <p className="mt-1 text-sm text-[#555]">
                Manage story, price, inventory, product images, and related products.
              </p>
            </div>
            {draft.slug ? (
              <a
                className="inline-flex items-center gap-2 border border-black/15 px-3 py-2 text-sm font-black"
                href={`/products/${draft.slug}`}
                target="_blank"
              >
                <Eye size={15} />
                Preview
              </a>
            ) : null}
          </div>
          <ProductForm
            products={products}
            saving={saving}
            uploading={uploading}
            value={draft}
            onChange={setDraft}
            onSubmit={handleSave}
            onUpload={handleUpload}
          />
          {status ? <p className="mt-5 text-sm font-bold text-[#555]">{status}</p> : null}
        </section>
      </section>
    </main>
  );
}
