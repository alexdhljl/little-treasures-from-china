"use client";

import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  Eye,
  FolderTree,
  GripVertical,
  ImagePlus,
  Images,
  Landmark,
  LayoutDashboard,
  LogOut,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import type { CmsCategory, CmsCollection, CmsMedia, CmsMuseum, CmsStory, SiteSetting } from "@/lib/cms";
import { emptyProductInput, formatPrice, slugify, type Product, type ProductInput } from "@/lib/products";
import {
  clearStoredSession,
  createProduct,
  deleteCmsRecord,
  deleteProduct,
  fetchCategories,
  fetchCollections,
  fetchMedia,
  fetchMuseums,
  fetchInquiries,
  fetchProducts,
  fetchSiteSettings,
  fetchStories,
  getStoredSession,
  isSupabaseConfigured,
  registerMedia,
  saveCmsRecord,
  saveSiteSetting,
  signInAdmin,
  updateProduct,
  uploadProductImage,
  type InquiryRecord,
} from "@/lib/supabase-rest";

type Section = "dashboard" | "products" | "categories" | "museums" | "collections" | "stories" | "media" | "settings";
type CmsSection = "categories" | "museums" | "collections" | "stories";
type CmsRecord = CmsCategory | CmsMuseum | CmsCollection | CmsStory;

const inputClass = "w-full border border-black/15 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#2c6f6d]";
const labelClass = "text-[11px] font-black uppercase tracking-[0.15em] text-[#666]";
const pageSize = 10;

const nav: Array<{ id: Section; label: string; icon: typeof Boxes }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: Boxes },
  { id: "categories", label: "Categories", icon: FolderTree },
  { id: "museums", label: "Museums", icon: Landmark },
  { id: "collections", label: "Collections", icon: Star },
  { id: "stories", label: "Stories", icon: Pencil },
  { id: "media", label: "Media Library", icon: Images },
  { id: "settings", label: "Settings", icon: Settings },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2"><span className={labelClass}>{label}</span>{children}</label>;
}

function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

async function optimizeImage(file: File) {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} is not an image.`);
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / bitmap.width);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Image conversion failed.")), "image/webp", 0.86),
  );
  return {
    file: new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" }),
    width,
    height,
  };
}

function ProductEditor({ value, products, categories, museums, collections, saving, uploading, onChange, onSave, onUpload }: {
  value: ProductInput;
  products: Product[];
  categories: CmsCategory[];
  museums: CmsMuseum[];
  collections: CmsCollection[];
  saving: boolean;
  uploading: boolean;
  onChange: (value: ProductInput) => void;
  onSave: () => void;
  onUpload: (files: File[]) => void;
}) {
  const set = <K extends keyof ProductInput>(key: K, next: ProductInput[K]) => onChange({ ...value, [key]: next });
  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= value.images.length) return;
    const images = [...value.images];
    const [image] = images.splice(from, 1);
    images.splice(to, 0, image);
    set("images", images);
  };
  const receiveFiles = (files: FileList | File[]) => onUpload(Array.from(files));

  return (
    <form className="grid gap-6" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Product Name EN"><input className={inputClass} required value={value.englishName} onChange={(event) => onChange({ ...value, englishName: event.target.value, slug: value.slug || slugify(event.target.value) })} /></Field>
        <Field label="Product Name ZH"><input className={inputClass} value={value.name} onChange={(event) => set("name", event.target.value)} /></Field>
        <Field label="SKU"><input className={inputClass} placeholder="AH-PEN-0001" value={value.sku} onChange={(event) => set("sku", event.target.value.toUpperCase())} /></Field>
        <Field label="Slug"><input className={inputClass} required value={value.slug} onChange={(event) => set("slug", slugify(event.target.value))} /></Field>
        <Field label="Brand"><input className={inputClass} value={value.brand} onChange={(event) => set("brand", event.target.value)} /></Field>
        <Field label="Supplier"><input className={inputClass} value={value.supplier} onChange={(event) => set("supplier", event.target.value)} /></Field>
        <Field label="Status"><select className={inputClass} value={value.status} onChange={(event) => set("status", event.target.value as ProductInput["status"])}><option value="draft">Draft</option><option value="review">Review</option><option value="active">Active</option><option value="hidden">Hidden</option><option value="archived">Archived</option></select></Field>
        <Field label="Museum"><select className={inputClass} value={value.museumId} onChange={(event) => { const museum = museums.find((item) => item.id === event.target.value); onChange({ ...value, museumId: event.target.value, museum: museum?.name || "", province: museum?.province || value.province, city: museum?.city || value.city }); }}><option value="">Select museum</option>{museums.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <Field label="Collection"><select className={inputClass} value={value.collectionId} onChange={(event) => { const item = collections.find((entry) => entry.id === event.target.value); onChange({ ...value, collectionId: event.target.value, collection: item?.name || "" }); }}><option value="">Select collection</option>{collections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <Field label="Category"><select className={inputClass} value={value.categoryId} onChange={(event) => { const item = categories.find((entry) => entry.id === event.target.value); onChange({ ...value, categoryId: event.target.value, category: item?.name || "" }); }}><option value="">Select category</option>{categories.filter((item) => item.kind === "product").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <Field label="Subcategory"><input className={inputClass} placeholder="Pen, Magnet, Stapler" value={value.subcategory} onChange={(event) => set("subcategory", event.target.value)} /></Field>
        <Field label="Series"><input className={inputClass} value={value.series} onChange={(event) => set("series", event.target.value)} /></Field>
        <Field label="Gift Occasion"><input className={inputClass} placeholder="Teacher Gifts, Birthday" value={value.occasionTags.join(", ")} onChange={(event) => set("occasionTags", splitList(event.target.value))} /></Field>
        <Field label="Target Audience"><input className={inputClass} placeholder="Kids, Teachers, Collectors" value={value.targetAudience.join(", ")} onChange={(event) => set("targetAudience", splitList(event.target.value))} /></Field>
        <Field label="Province"><input className={inputClass} value={value.province} onChange={(event) => set("province", event.target.value)} /></Field>
        <Field label="City"><input className={inputClass} value={value.city} onChange={(event) => set("city", event.target.value)} /></Field>
        <Field label="Retail Price"><input className={inputClass} min="0" step="0.01" type="number" value={value.price ?? ""} onChange={(event) => set("price", event.target.value ? Number(event.target.value) : null)} /></Field>
        <Field label="Inventory"><select className={inputClass} value={value.inventoryStatus} onChange={(event) => set("inventoryStatus", event.target.value as ProductInput["inventoryStatus"])}><option value="in_stock">In stock</option><option value="limited">Limited</option><option value="made_to_order">Made to order</option><option value="sold_out">Sold out</option></select></Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2"><Field label="Short Description EN"><textarea className={inputClass} rows={3} value={value.shortDescription} onChange={(event) => set("shortDescription", event.target.value)} /></Field><Field label="Short Description ZH"><textarea className={inputClass} rows={3} value={value.shortDescriptionZh} onChange={(event) => set("shortDescriptionZh", event.target.value)} /></Field><Field label="Long Description EN"><textarea className={inputClass} rows={6} value={value.longDescription} onChange={(event) => set("longDescription", event.target.value)} /></Field><Field label="Long Description ZH"><textarea className={inputClass} rows={6} value={value.longDescriptionZh} onChange={(event) => set("longDescriptionZh", event.target.value)} /></Field><Field label="Story EN"><textarea className={inputClass} rows={8} value={value.story} onChange={(event) => set("story", event.target.value)} /></Field><Field label="Story ZH"><textarea className={inputClass} rows={8} value={value.storyZh} onChange={(event) => set("storyZh", event.target.value)} /></Field></div>
      <div className="grid gap-4 md:grid-cols-2"><Field label="Features"><input className={inputClass} placeholder="Museum licensed, Educational" value={value.features.join(", ")} onChange={(event) => set("features", splitList(event.target.value))} /></Field><Field label="What's Included"><input className={inputClass} placeholder="Product, Gift box, Story card" value={value.whatsIncluded.join(", ")} onChange={(event) => set("whatsIncluded", splitList(event.target.value))} /></Field></div>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Material"><input className={inputClass} value={value.materials} onChange={(event) => set("materials", event.target.value)} /></Field>
        <Field label="Colors"><input className={inputClass} value={value.colors.join(", ")} onChange={(event) => set("colors", splitList(event.target.value))} /></Field>
        <Field label="Dimensions"><input className={inputClass} value={value.dimensions} onChange={(event) => set("dimensions", event.target.value)} /></Field>
        <Field label="Weight"><input className={inputClass} value={value.weight} onChange={(event) => set("weight", event.target.value)} /></Field>
        <Field label="Package Size"><input className={inputClass} value={value.packageSize} onChange={(event) => set("packageSize", event.target.value)} /></Field>
        <Field label="Package Weight"><input className={inputClass} value={value.packageWeight} onChange={(event) => set("packageWeight", event.target.value)} /></Field>
      </div>
      <div className="grid gap-4 md:grid-cols-4"><Field label="Estimated Price Min"><input className={inputClass} min="0" step="0.01" type="number" value={value.estimatedPriceMin ?? ""} onChange={(event) => set("estimatedPriceMin", event.target.value ? Number(event.target.value) : null)} /></Field><Field label="Estimated Price Max"><input className={inputClass} min="0" step="0.01" type="number" value={value.estimatedPriceMax ?? ""} onChange={(event) => set("estimatedPriceMax", event.target.value ? Number(event.target.value) : null)} /></Field><Field label="Wholesale Price"><input className={inputClass} min="0" step="0.01" type="number" value={value.wholesalePrice ?? ""} onChange={(event) => set("wholesalePrice", event.target.value ? Number(event.target.value) : null)} /></Field><Field label="MOQ"><input className={inputClass} min="1" type="number" value={value.moq} onChange={(event) => set("moq", Math.max(1, Number(event.target.value)))} /></Field><Field label="Lead Time"><input className={inputClass} value={value.leadTime} onChange={(event) => set("leadTime", event.target.value)} /></Field><Field label="Inventory Quantity"><input className={inputClass} type="number" value={value.inventoryQuantity ?? ""} onChange={(event) => set("inventoryQuantity", event.target.value ? Number(event.target.value) : null)} /></Field><Field label="Origin"><input className={inputClass} value={value.origin} onChange={(event) => set("origin", event.target.value)} /></Field><Field label="Countries Available"><input className={inputClass} value={value.countriesAvailable.join(", ")} onChange={(event) => set("countriesAvailable", splitList(event.target.value))} /></Field></div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Tags"><input className={inputClass} value={value.tags.join(", ")} onChange={(event) => set("tags", splitList(event.target.value))} /></Field>
        <Field label="Related Products"><select className={`${inputClass} min-h-28`} multiple value={value.relatedProductIds} onChange={(event) => set("relatedProductIds", Array.from(event.target.selectedOptions).map((option) => option.value))}>{products.filter((item) => item.id !== value.id).map((item) => <option key={item.id} value={item.id}>{item.englishName || item.name}</option>)}</select></Field>
        <Field label="SEO Title EN"><input className={inputClass} maxLength={60} value={value.seoTitle} onChange={(event) => set("seoTitle", event.target.value)} /></Field>
        <Field label="SEO Title ZH"><input className={inputClass} maxLength={60} value={value.seoTitleZh} onChange={(event) => set("seoTitleZh", event.target.value)} /></Field>
        <Field label="SEO Description EN"><textarea className={inputClass} maxLength={160} rows={3} value={value.seoDescription} onChange={(event) => set("seoDescription", event.target.value)} /></Field>
        <Field label="SEO Description ZH"><textarea className={inputClass} maxLength={160} rows={3} value={value.seoDescriptionZh} onChange={(event) => set("seoDescriptionZh", event.target.value)} /></Field>
        <Field label="SEO Keywords"><input className={inputClass} value={value.seoKeywords.join(", ")} onChange={(event) => set("seoKeywords", splitList(event.target.value))} /></Field>
        <Field label="Image Alt EN"><input className={inputClass} value={value.altText} onChange={(event) => set("altText", event.target.value)} /></Field>
        <Field label="Image Alt ZH"><input className={inputClass} value={value.altTextZh} onChange={(event) => set("altTextZh", event.target.value)} /></Field>
        <Field label="Source Folder"><input className={inputClass} value={value.sourceFolder} onChange={(event) => set("sourceFolder", event.target.value)} /></Field>
        <label className="flex items-center gap-3 self-end border border-black/10 px-4 py-3 font-bold"><input checked={value.featured} type="checkbox" onChange={(event) => set("featured", event.target.checked)} />Featured product</label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="flex items-center gap-3 border border-black/10 px-4 py-3 text-sm font-bold"><input checked={value.needsReview} type="checkbox" onChange={(event) => set("needsReview", event.target.checked)} />Needs Review</label><label className="flex items-center gap-3 border border-black/10 px-4 py-3 text-sm font-bold"><input checked={value.aiGenerated} type="checkbox" onChange={(event) => set("aiGenerated", event.target.checked)} />AI Generated</label><label className="flex items-center gap-3 border border-black/10 px-4 py-3 text-sm font-bold"><input checked={value.translationChecked} type="checkbox" onChange={(event) => set("translationChecked", event.target.checked)} />Translation Checked</label><label className="flex items-center gap-3 border border-black/10 px-4 py-3 text-sm font-bold"><input checked={value.photoChecked} type="checkbox" onChange={(event) => set("photoChecked", event.target.checked)} />Photo Checked</label></div>
      <div className="grid gap-3">
        <span className={labelClass}>Images</span>
        <label className="grid min-h-32 cursor-pointer place-items-center border border-dashed border-black/25 bg-[#faf9f6] p-5 text-center" onDragOver={(event) => event.preventDefault()} onDrop={(event: DragEvent<HTMLLabelElement>) => { event.preventDefault(); receiveFiles(event.dataTransfer.files); }}>
          <span><ImagePlus className="mx-auto" size={24} /><strong className="mt-2 block">{uploading ? "Optimizing and uploading..." : "Drop images here or browse"}</strong><small className="mt-1 block text-[#777]">Multiple files · resized to 1600px · WebP</small></span>
          <input accept="image/*" className="hidden" disabled={uploading} multiple type="file" onChange={(event: ChangeEvent<HTMLInputElement>) => event.target.files && receiveFiles(event.target.files)} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {value.images.map((image, index) => <div className="border border-black/10 bg-white p-2" key={image}><div className="relative bg-white"><img alt={value.altText} className="aspect-[4/3] w-full object-contain" loading="lazy" src={image} />{index === 0 ? <span className="absolute left-2 top-2 bg-[#171717] px-2 py-1 text-[10px] font-black uppercase text-white">Cover</span> : null}</div><div className="mt-2 flex items-center justify-between"><GripVertical size={16} /><div className="flex gap-1"><button aria-label="Move left" className="border p-1.5" type="button" onClick={() => moveImage(index, index - 1)}><ArrowLeft size={14} /></button><button aria-label="Move right" className="border p-1.5" type="button" onClick={() => moveImage(index, index + 1)}><ArrowRight size={14} /></button><button aria-label="Delete image" className="border p-1.5 text-red-700" type="button" onClick={() => set("images", value.images.filter((_, imageIndex) => imageIndex !== index))}><Trash2 size={14} /></button></div></div></div>)}
        </div>
      </div>
      <button className="inline-flex items-center justify-center gap-2 bg-[#171717] px-6 py-3.5 font-black text-white disabled:opacity-50" disabled={saving} type="submit"><Save size={18} />{saving ? "Saving..." : "Save Product"}</button>
    </form>
  );
}

const cmsFields: Record<"categories" | "museums" | "collections" | "stories", Array<{ key: string; label: string; type?: string }>> = {
  categories: [{ key: "name", label: "Name" }, { key: "nameZh", label: "Chinese Name" }, { key: "slug", label: "Slug" }, { key: "kind", label: "Kind", type: "categoryKind" }, { key: "description", label: "Description", type: "textarea" }, { key: "image", label: "Image URL" }, { key: "sortOrder", label: "Sort Order", type: "number" }, { key: "featured", label: "Featured", type: "checkbox" }],
  museums: [{ key: "name", label: "Museum Name EN" }, { key: "nameZh", label: "Museum Name ZH" }, { key: "slug", label: "Slug" }, { key: "country", label: "Country" }, { key: "province", label: "Province" }, { key: "city", label: "City" }, { key: "website", label: "Website" }, { key: "logo", label: "Logo URL" }, { key: "coverImage", label: "Cover URL" }, { key: "description", label: "Description EN", type: "textarea" }, { key: "descriptionZh", label: "Description ZH", type: "textarea" }, { key: "story", label: "Story EN", type: "textarea" }, { key: "storyZh", label: "Story ZH", type: "textarea" }, { key: "sortOrder", label: "Sort Order", type: "number" }, { key: "featured", label: "Featured", type: "checkbox" }],
  collections: [{ key: "name", label: "Collection Name EN" }, { key: "nameZh", label: "Collection Name ZH" }, { key: "slug", label: "Slug" }, { key: "museumId", label: "Museum", type: "museum" }, { key: "bannerImage", label: "Banner URL" }, { key: "description", label: "Description EN", type: "textarea" }, { key: "descriptionZh", label: "Description ZH", type: "textarea" }, { key: "story", label: "Story EN", type: "textarea" }, { key: "storyZh", label: "Story ZH", type: "textarea" }, { key: "series", label: "Series (comma separated)", type: "list" }, { key: "sortOrder", label: "Sort Order", type: "number" }, { key: "featured", label: "Featured", type: "checkbox" }],
  stories: [{ key: "title", label: "Title" }, { key: "titleZh", label: "Chinese Title" }, { key: "slug", label: "Slug" }, { key: "kind", label: "Kind", type: "storyKind" }, { key: "excerpt", label: "Excerpt", type: "textarea" }, { key: "excerptZh", label: "Chinese Excerpt", type: "textarea" }, { key: "body", label: "Body", type: "textarea" }, { key: "bodyZh", label: "Chinese Body", type: "textarea" }, { key: "coverImage", label: "Cover URL" }, { key: "featured", label: "Featured", type: "checkbox" }, { key: "published", label: "Published", type: "checkbox" }],
};

function CmsManager({ section, records, museums, onSave, onDelete }: { section: CmsSection; records: CmsRecord[]; museums: CmsMuseum[]; onSave: (section: CmsSection, value: Record<string, unknown>) => Promise<void>; onDelete: (section: CmsSection, id: string) => Promise<void> }) {
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const fields = cmsFields[section];
  const newRecord = () => setDraft({ slug: "", name: "", title: "", country: "China", series: [], featured: false, published: true, sortOrder: 0, kind: section === "stories" ? "editorial" : "product" });
  return <div className="grid gap-6"><div className="flex items-center justify-between"><div><h1 className="text-3xl font-black capitalize">{section}</h1><p className="mt-1 text-sm text-[#666]">Manage storefront content without code changes.</p></div><button className="inline-flex items-center gap-2 bg-[#171717] px-4 py-2.5 text-sm font-black text-white" onClick={newRecord}><Plus size={16} />New</button></div><div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]"><div className="overflow-x-auto border border-black/10 bg-white"><table className="w-full min-w-[560px] text-left text-sm"><thead className="border-b bg-[#faf9f6] text-xs uppercase tracking-[0.12em]"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Featured</th><th className="px-4 py-3">Order</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody>{records.map((record) => { const row = record as unknown as Record<string, unknown>; return <tr className="border-b last:border-0" key={record.id}><td className="px-4 py-3 font-bold">{String(row.name || row.title || "Untitled")}</td><td className="px-4 py-3">{row.featured ? "Yes" : "No"}</td><td className="px-4 py-3">{String(row.sortOrder ?? "—")}</td><td className="px-4 py-3"><div className="flex justify-end gap-2"><button className="border p-2" onClick={() => setDraft({ ...row })}><Pencil size={14} /></button><button className="border p-2 text-red-700" onClick={() => onDelete(section, record.id)}><Trash2 size={14} /></button></div></td></tr>; })}</tbody></table></div>{draft ? <form className="grid gap-4 border border-black/10 bg-white p-5" onSubmit={async (event) => { event.preventDefault(); await onSave(section, draft); setDraft(null); }}><div className="flex justify-between"><h2 className="text-xl font-black">{draft.id ? "Edit" : "New"} {section.slice(0, -1)}</h2><button type="button" onClick={() => setDraft(null)}><X /></button></div>{fields.map((field) => <Field key={field.key} label={field.label}>{field.type === "textarea" ? <textarea className={inputClass} rows={field.key.toLowerCase().includes("body") || field.key === "story" ? 6 : 3} value={String(draft[field.key] || "")} onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })} /> : field.type === "checkbox" ? <input className="size-5" checked={Boolean(draft[field.key])} type="checkbox" onChange={(event) => setDraft({ ...draft, [field.key]: event.target.checked })} /> : field.type === "number" ? <input className={inputClass} type="number" value={Number(draft[field.key] || 0)} onChange={(event) => setDraft({ ...draft, [field.key]: Number(event.target.value) })} /> : field.type === "list" ? <input className={inputClass} value={Array.isArray(draft[field.key]) ? (draft[field.key] as string[]).join(", ") : String(draft[field.key] || "")} onChange={(event) => setDraft({ ...draft, [field.key]: splitList(event.target.value) })} /> : field.type === "museum" ? <select className={inputClass} value={String(draft[field.key] || "")} onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })}><option value="">None</option>{museums.map((museum) => <option key={museum.id} value={museum.id}>{museum.name}</option>)}</select> : field.type === "categoryKind" ? <select className={inputClass} value={String(draft[field.key] || "product")} onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })}><option value="product">Product</option><option value="occasion">Occasion</option><option value="recipient">Recipient</option></select> : field.type === "storyKind" ? <select className={inputClass} value={String(draft[field.key] || "editorial")} onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })}><option value="editorial">Editorial</option><option value="about">About</option><option value="gift_guide">Gift Guide</option></select> : <input className={inputClass} value={String(draft[field.key] || "")} onChange={(event) => setDraft({ ...draft, [field.key]: field.key === "slug" ? slugify(event.target.value) : event.target.value, ...((field.key === "name" || field.key === "title") && !draft.slug ? { slug: slugify(event.target.value) } : {}) })} />}</Field>)}<button className="inline-flex items-center justify-center gap-2 bg-[#171717] px-4 py-3 font-black text-white"><Save size={16} />Save</button></form> : <div className="grid place-items-center border border-dashed border-black/20 p-8 text-center text-sm text-[#777]">Select an item or create a new one.</div>}</div></div>;
}

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [section, setSection] = useState<Section>("dashboard");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CmsCategory[]>([]);
  const [museums, setMuseums] = useState<CmsMuseum[]>([]);
  const [collections, setCollections] = useState<CmsCollection[]>([]);
  const [stories, setStories] = useState<CmsStory[]>([]);
  const [media, setMedia] = useState<CmsMedia[]>([]);
  const [settings, setSettings] = useState<SiteSetting[]>([]);
  const [inquiries, setInquiries] = useState<InquiryRecord[]>([]);
  const [draft, setDraft] = useState<ProductInput | null>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function loadAll(token = accessToken) {
    if (!token) return;
    setStatus("Refreshing content...");
    try {
      const result = await Promise.all([fetchProducts(token), fetchCategories(token), fetchMuseums(token), fetchCollections(token), fetchStories(token), fetchMedia(token), fetchSiteSettings(token), fetchInquiries(token)]);
      setProducts(result[0]); setCategories(result[1]); setMuseums(result[2]); setCollections(result[3]); setStories(result[4]); setMedia(result[5]); setSettings(result[6]); setInquiries(result[7]); setStatus("");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Unable to load CMS data. Run the latest Supabase schema first."); }
  }

  useEffect(() => { const session = getStoredSession(); if (session?.access_token) { setAccessToken(session.access_token); void loadAll(session.access_token); } }, []);

  const filteredProducts = useMemo(() => products.filter((product) => {
    const text = `${product.englishName} ${product.name} ${product.museum} ${product.category}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (!categoryFilter || product.categoryId === categoryFilter || product.category === categoryFilter);
  }), [products, query, categoryFilter]);
  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const visibleProducts = filteredProducts.slice((page - 1) * pageSize, page * pageSize);

  async function login(event: FormEvent) { event.preventDefault(); setStatus("Signing in..."); try { const session = await signInAdmin(email, password); setAccessToken(session.access_token); await loadAll(session.access_token); } catch (error) { setStatus(error instanceof Error ? error.message : "Sign in failed."); } }
  async function saveProduct() { if (!accessToken || !draft) return; setSaving(true); try { if (draft.id) await updateProduct(draft.id, draft, accessToken); else await createProduct(draft, accessToken); setDraft(null); await loadAll(accessToken); setStatus("Product saved."); } catch (error) { setStatus(error instanceof Error ? error.message : "Save failed."); } finally { setSaving(false); } }
  async function removeProduct(product: Product) { if (!accessToken || !window.confirm(`Delete ${product.englishName || product.name}?`)) return; await deleteProduct(product.id, accessToken); await loadAll(accessToken); }
  async function uploadFiles(files: File[]) { if (!accessToken || !draft) return; setUploading(true); try { const urls: string[] = []; for (const source of files) { const optimized = await optimizeImage(source); const url = await uploadProductImage(optimized.file, accessToken); urls.push(url); await registerMedia({ url, filename: optimized.file.name, altText: draft.altText, mimeType: "image/webp", width: optimized.width, height: optimized.height }, accessToken); } setDraft((current) => current ? { ...current, images: [...current.images, ...urls] } : current); await loadAll(accessToken); } catch (error) { setStatus(error instanceof Error ? error.message : "Upload failed."); } finally { setUploading(false); } }
  async function uploadToLibrary(files: File[]) { if (!accessToken) return; setUploading(true); try { for (const source of files) { const optimized = await optimizeImage(source); const url = await uploadProductImage(optimized.file, accessToken); await registerMedia({ url, filename: optimized.file.name, altText: "", mimeType: "image/webp", width: optimized.width, height: optimized.height }, accessToken); } await loadAll(accessToken); } catch (error) { setStatus(error instanceof Error ? error.message : "Upload failed."); } finally { setUploading(false); } }
  async function saveCms(sectionName: CmsSection, value: Record<string, unknown>) { if (!accessToken) return; await saveCmsRecord(sectionName, value, accessToken); await loadAll(accessToken); }
  async function deleteCms(sectionName: CmsSection, id: string) { if (!accessToken || !window.confirm("Delete this record?")) return; await deleteCmsRecord(sectionName, id, accessToken); await loadAll(accessToken); }

  if (!isSupabaseConfigured()) return <main className="grid min-h-screen place-items-center bg-[#f5f4f0] p-5"><div className="max-w-xl border bg-white p-8"><h1 className="text-3xl font-black">Supabase environment missing.</h1></div></main>;
  if (!accessToken) return <main className="grid min-h-screen place-items-center bg-[#f5f4f0] p-5"><form className="w-full max-w-md border border-black/10 bg-white p-7" onSubmit={login}><BrandLogo className="w-[270px]" priority /><p className="mt-7 section-kicker">CMS Login</p><Field label="Email"><input className={inputClass} required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field><div className="mt-4"><Field label="Password"><input className={inputClass} required type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></Field></div><button className="mt-6 w-full bg-[#171717] px-5 py-3.5 font-black text-white">Sign In</button>{status ? <p className="mt-4 text-sm text-red-700">{status}</p> : null}</form></main>;

  const cmsRecords = section === "categories" ? categories : section === "museums" ? museums : section === "collections" ? collections : stories;
  const homepage = (settings.find((item) => item.key === "homepage")?.value || {}) as Record<string, string>;

  return <main className="min-h-screen bg-[#f5f4f0] text-[#171717]"><div className="grid min-h-screen lg:grid-cols-[230px_1fr]"><aside className="border-r border-black/10 bg-white p-4 lg:sticky lg:top-0 lg:h-screen"><BrandLogo className="w-[200px]" /><nav className="mt-8 grid grid-cols-2 gap-1 lg:grid-cols-1">{nav.map((item) => { const Icon = item.icon; return <button className={`flex items-center gap-3 px-3 py-2.5 text-left text-sm font-bold ${section === item.id ? "bg-[#171717] text-white" : "hover:bg-[#f2f0ea]"}`} key={item.id} onClick={() => { setSection(item.id); setDraft(null); }}><Icon size={17} />{item.label}</button>; })}<a className="flex items-center gap-3 px-3 py-2.5 text-left text-sm font-bold hover:bg-[#f2f0ea]" href="/admin/inquiries"><Mail size={17} />Inquiries</a></nav><button className="mt-8 flex items-center gap-2 px-3 py-2 text-sm font-bold text-[#666]" onClick={() => { clearStoredSession(); setAccessToken(null); }}><LogOut size={16} />Sign out</button></aside><section className="min-w-0 p-4 sm:p-6 lg:p-8"><header className="mb-7 flex flex-wrap items-center justify-between gap-4"><div><p className="section-kicker">Auctus Heritage CMS</p><p className="mt-1 text-sm text-[#666]">Content updates publish instantly through Supabase.</p></div><div className="flex items-center gap-2"><a className="inline-flex items-center gap-2 border bg-white px-3 py-2 text-sm font-bold" href="/en" target="_blank"><Eye size={16} />View site</a><button className="inline-flex items-center gap-2 border bg-white px-3 py-2 text-sm font-bold" onClick={() => loadAll()}><RefreshCw size={16} />Refresh</button></div></header>{status ? <div className="mb-5 border border-[#e4b44f] bg-[#fff8df] px-4 py-3 text-sm font-bold">{status}</div> : null}
    {section === "dashboard" ? <div><h1 className="text-3xl font-black">Dashboard</h1><div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{[["New inquiries", inquiries.filter((item) => item.status === "new").length], ["Reviewing", inquiries.filter((item) => item.status === "reviewing").length], ["Quote sent", inquiries.filter((item) => item.status === "quote_sent").length], ["Won", inquiries.filter((item) => item.status === "won").length], ["Failed emails", inquiries.filter((item) => item.notification_status === "failed" || item.confirmation_status === "failed").length]].map(([label, value]) => <div className="border border-black/10 bg-white p-5" key={label}><p className={labelClass}>{label}</p><p className="mt-4 text-4xl font-black">{value}</p></div>)}</div><div className="mt-6 grid gap-5 xl:grid-cols-2"><div className="border border-black/10 bg-white p-5"><div className="flex items-center justify-between"><h2 className="text-lg font-black">Latest inquiries</h2><a className="text-sm font-bold" href="/admin/inquiries">View all</a></div><div className="mt-4 divide-y">{inquiries.slice(0, 5).map((item) => <a className="flex items-center justify-between gap-4 py-3 text-sm" href={`/admin/inquiries/${item.id}`} key={item.id}><span><strong className="block">{item.name}</strong><span className="text-[#666]">{item.company || item.country}</span></span><span className="text-xs font-bold">{item.status}</span></a>)}{!inquiries.length ? <p className="py-4 text-sm text-[#666]">No inquiries yet.</p> : null}</div></div><div className="border border-black/10 bg-white p-5"><h2 className="text-lg font-black">Latest failed email deliveries</h2><div className="mt-4 divide-y">{inquiries.filter((item) => item.notification_status === "failed" || item.confirmation_status === "failed").slice(0, 5).map((item) => <a className="flex items-center justify-between gap-4 py-3 text-sm" href={`/admin/inquiries/${item.id}`} key={item.id}><span><strong className="block">{item.name}</strong><span className="text-[#666]">{item.id.slice(0, 8)}</span></span><span className="text-xs font-bold text-red-700">Needs retry</span></a>)}{!inquiries.some((item) => item.notification_status === "failed" || item.confirmation_status === "failed") ? <p className="py-4 text-sm text-[#666]">No failed email deliveries.</p> : null}</div></div></div></div> : null}
    {section === "products" ? draft ? <div><div className="mb-6 flex items-center justify-between"><button className="inline-flex items-center gap-2 text-sm font-bold" onClick={() => setDraft(null)}><ArrowLeft size={16} />Back to products</button>{draft.slug ? <a className="inline-flex items-center gap-2 border bg-white px-3 py-2 text-sm font-bold" href={`/en/products/${draft.slug}`} target="_blank"><Eye size={16} />Preview</a> : null}</div><div className="border border-black/10 bg-white p-4 sm:p-6"><h1 className="mb-6 text-2xl font-black">{draft.id ? "Edit Product" : "New Product"}</h1><ProductEditor categories={categories} collections={collections} museums={museums} onChange={setDraft} onSave={saveProduct} onUpload={uploadFiles} products={products} saving={saving} uploading={uploading} value={draft} /></div></div> : <div><div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-black">Products</h1><p className="mt-1 text-sm text-[#666]">{filteredProducts.length} products</p></div><button className="inline-flex items-center gap-2 bg-[#171717] px-4 py-2.5 text-sm font-black text-white" onClick={() => setDraft({ ...emptyProductInput })}><Plus size={16} />New Product</button></div><div className="mt-5 flex flex-wrap gap-3"><label className="relative min-w-[240px] flex-1"><Search className="absolute left-3 top-3" size={16} /><input className={`${inputClass} pl-9`} placeholder="Search products" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} /></label><select className={`${inputClass} w-auto min-w-[180px]`} value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setPage(1); }}><option value="">All categories</option>{categories.filter((item) => item.kind === "product").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div className="mt-4 overflow-x-auto border border-black/10 bg-white"><table className="w-full min-w-[920px] text-left text-sm"><thead className="border-b bg-[#faf9f6] text-xs uppercase tracking-[0.12em]"><tr><th className="px-4 py-3">Thumbnail</th><th className="px-4 py-3">Product</th><th className="px-4 py-3">Museum</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Occasion</th><th className="px-4 py-3">Featured</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Created</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody>{visibleProducts.map((product) => <tr className="border-b last:border-0" key={product.id}><td className="px-4 py-3">{product.images[0] ? <img alt="" className="size-12 bg-white object-contain" loading="lazy" src={product.images[0]} /> : <div className="size-12 bg-[#eee]" />}</td><td className="px-4 py-3"><strong>{product.englishName || product.name}</strong><small className="block text-[#777]">{formatPrice(product)}</small></td><td className="px-4 py-3">{product.museum || "—"}</td><td className="px-4 py-3">{product.category || "—"}</td><td className="max-w-40 truncate px-4 py-3">{product.occasionTags.join(", ") || "—"}</td><td className="px-4 py-3">{product.featured ? "Yes" : "No"}</td><td className="px-4 py-3 capitalize">{product.status}</td><td className="px-4 py-3">{new Date(product.createdAt).toLocaleDateString()}</td><td className="px-4 py-3"><div className="flex justify-end gap-1"><button className="border p-2" onClick={() => setDraft({ ...product })}><Pencil size={14} /></button><a className="border p-2" href={`/en/products/${product.slug}`} target="_blank"><Eye size={14} /></a><button className="border p-2 text-red-700" onClick={() => removeProduct(product)}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table></div><div className="mt-4 flex items-center justify-between text-sm"><span>Page {page} of {pageCount}</span><div className="flex gap-2"><button className="border bg-white px-3 py-2 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button><button className="border bg-white px-3 py-2 disabled:opacity-40" disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)}>Next</button></div></div></div> : null}
    {(["categories", "museums", "collections", "stories"] as Section[]).includes(section) ? <CmsManager museums={museums} onDelete={deleteCms} onSave={saveCms} records={cmsRecords as CmsRecord[]} section={section as CmsSection} /> : null}
    {section === "media" ? <div><div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-black">Media Library</h1><p className="mt-1 text-sm text-[#666]">Optimized WebP images stored in Supabase Storage.</p></div><label className="inline-flex cursor-pointer items-center gap-2 bg-[#171717] px-4 py-2.5 text-sm font-black text-white"><ImagePlus size={16} />{uploading ? "Uploading..." : "Upload Media"}<input accept="image/*" className="hidden" multiple type="file" onChange={(event) => event.target.files && uploadToLibrary(Array.from(event.target.files))} /></label></div><div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">{media.map((item) => <article className="border border-black/10 bg-white p-2" key={item.id}><img alt={item.altText} className="aspect-square w-full object-contain" loading="lazy" src={item.url} /><p className="mt-2 truncate text-xs font-bold">{item.filename}</p><p className="text-xs text-[#777]">{item.width} × {item.height}</p></article>)}</div></div> : null}
    {section === "settings" ? <form className="max-w-3xl border border-black/10 bg-white p-5 sm:p-7" onSubmit={async (event) => { event.preventDefault(); if (!accessToken) return; const form = new FormData(event.currentTarget); await saveSiteSetting("homepage", Object.fromEntries(form.entries()), accessToken); await loadAll(accessToken); setStatus("Settings saved."); }}><h1 className="text-3xl font-black">Homepage Settings</h1><div className="mt-6 grid gap-4"><Field label="Hero Title"><input className={inputClass} defaultValue={homepage.heroTitle || ""} name="heroTitle" /></Field><Field label="Chinese Hero Title"><input className={inputClass} defaultValue={homepage.heroTitleZh || ""} name="heroTitleZh" /></Field><Field label="Hero Description"><textarea className={inputClass} defaultValue={homepage.heroDescription || ""} name="heroDescription" rows={3} /></Field><Field label="Chinese Hero Description"><textarea className={inputClass} defaultValue={homepage.heroDescriptionZh || ""} name="heroDescriptionZh" rows={3} /></Field><Field label="Hero Image URL"><input className={inputClass} defaultValue={homepage.heroImage || ""} name="heroImage" /></Field><button className="inline-flex items-center justify-center gap-2 bg-[#171717] px-5 py-3 font-black text-white"><Save size={16} />Save Settings</button></div></form> : null}
  </section></div></main>;
}
