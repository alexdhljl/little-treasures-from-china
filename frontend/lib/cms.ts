export type CmsCategory = {
  id: string;
  slug: string;
  name: string;
  nameZh: string;
  kind: "product" | "occasion" | "recipient";
  description: string;
  image: string;
  featured: boolean;
  sortOrder: number;
  createdAt: string;
};

export type CmsMuseum = {
  id: string;
  slug: string;
  name: string;
  nameZh: string;
  country: string;
  province: string;
  city: string;
  website: string;
  logo: string;
  coverImage: string;
  description: string;
  descriptionZh: string;
  story: string;
  storyZh: string;
  featured: boolean;
  sortOrder: number;
  createdAt: string;
};

export type CmsCollection = {
  id: string;
  slug: string;
  name: string;
  nameZh: string;
  museumId: string;
  bannerImage: string;
  description: string;
  descriptionZh: string;
  story: string;
  storyZh: string;
  series: string[];
  featured: boolean;
  sortOrder: number;
  createdAt: string;
};

export type CmsStory = {
  id: string;
  slug: string;
  title: string;
  titleZh: string;
  kind: "editorial" | "about" | "gift_guide";
  excerpt: string;
  excerptZh: string;
  body: string;
  bodyZh: string;
  coverImage: string;
  featured: boolean;
  published: boolean;
  createdAt: string;
};

export type CmsMedia = {
  id: string;
  url: string;
  filename: string;
  altText: string;
  mimeType: string;
  width: number;
  height: number;
  createdAt: string;
};

export type SiteSetting = {
  key: string;
  value: Record<string, unknown>;
  updatedAt: string;
};
