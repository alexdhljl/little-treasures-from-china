import type { Product } from "@/lib/products";

export const locales = ["en", "zh"] as const;
export type Locale = (typeof locales)[number];

export function isLocale(value: string | undefined): value is Locale {
  return value === "en" || value === "zh";
}

export function normalizeLocale(value: string | undefined): Locale {
  return isLocale(value) ? value : "en";
}

export function localizedPath(locale: Locale, path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${normalized === "/" ? "" : normalized}`;
}

export function productTitle(product: Product, locale: Locale) {
  if (locale === "zh") {
    return product.name || "未命名产品";
  }
  return product.englishName || product.name;
}

export function productSubtitle(product: Product, locale: Locale) {
  if (locale === "zh") {
    return "";
  }
  return product.name && product.name !== product.englishName ? product.name : "";
}

export const categoryOptions = {
  en: [
    ["Home & Living", "Home & Living"],
    ["Stationery & Office", "Stationery & Office"],
    ["Kids & Family", "Kids & Family"],
    ["Wear & Accessories", "Wear & Accessories"],
  ],
  zh: [
    ["Home & Living", "家居生活"],
    ["Stationery & Office", "文具办公"],
    ["Kids & Family", "亲子儿童"],
    ["Wear & Accessories", "穿戴配饰"],
  ],
} as const;

export const localizedFilterLabels: Record<Locale, Record<string, string>> = {
  en: {},
  zh: {
    "Home & Living": "家居生活",
    "Stationery & Office": "文具办公",
    "Kids & Family": "亲子儿童",
    "Wear & Accessories": "穿戴配饰",
    Stationery: "文具办公",
    Accessories: "配饰",
    Jewelry: "首饰",
    "Tea & Lifestyle": "茶与生活",
    "Desk Accessories": "桌面用品",
    "Maya Cultural Gifts": "玛雅文化礼品",
    "Sports Gifts": "运动礼品",
    "Panda Gifts": "熊猫礼品",
    "Curated Selection": "精选系列",
    "Chinese Heritage Collection": "中国文化遗产系列",
    "Bronze Age": "青铜文明",
    "Chinese Characters": "汉字文化",
    "Forbidden City": "故宫系列",
    Sanxingdui: "三星堆系列",
    "Teacher Gifts": "教师礼物",
    "Student Gifts": "学生礼物",
    Housewarming: "乔迁礼物",
    "Housewarming Gifts": "乔迁礼物",
    "Thank You Gifts": "感谢礼物",
    "Birthday Gifts": "生日礼物",
    Birthday: "生日礼物",
    "Gifts for Kids": "送给孩子",
    "Travel Souvenirs": "旅行纪念",
    "Desk & Office Gifts": "办公桌礼物",
    "Corporate Gifts": "企业礼赠",
    "Premium Gifts": "高端礼物",
    "Collector Gifts": "收藏礼物",
    "Colleague Gifts": "同事礼物",
    "New Baby & Family": "新生儿与家庭",
    "Host & Hostess Gifts": "主人礼",
    "Holiday Gifts": "节日礼物",
    "For Parents": "送父母",
    "For Grandparents": "送祖父母",
    "For Friends": "送朋友",
    "For Kids": "送孩子",
    "For Teachers": "送老师",
    "For Colleagues": "送同事",
    "Under $20": "20 美元以内",
    "Under $50": "50 美元以内",
    "Under $100": "100 美元以内",
    "Premium Gift Boxes": "高端礼盒",
  },
};

export function displayFilter(value: string, locale: Locale) {
  if (!value) {
    return "";
  }
  return localizedFilterLabels[locale][value] || value;
}

const productAttributeLabels: Record<string, string> = {
  "Plastic, metal, and silicone": "塑料、金属与硅胶",
  "Metal alloy and magnet": "金属合金与磁体",
  "Resin and magnet": "树脂与磁体",
  "Paper, board, and metal ornament": "纸张、纸板与金属装饰",
  "Paper and board": "纸张与纸板",
  "Cotton blend": "棉混纺",
  "Metal alloy, acrylic, textile loop, and faux leather": "金属合金、亚克力、织物挂绳与人造皮革",
  "PVC, resin, and magnet": "PVC、树脂与磁体",
  "Metal alloy, enamel, and magnet": "金属合金、珐琅与磁体",
  "Plastic, silicone, and ink": "塑料、硅胶与墨水",
  "Rubber eraser": "橡皮材质",
  "Metal, enamel, paper gift box": "金属、珐琅与纸质礼盒",
  TBD: "待确认",
  China: "中国",
  "International shipping quoted separately.": "国际运输费用另行报价。",
  "Returns and exchanges are reviewed case by case before order confirmation.": "订单确认前将逐案审核退换货安排。",
  "Confirmed with quote": "报价时确认",
  "To be confirmed": "待确认",
};

export function displayProductAttribute(value: string | null | undefined, locale: Locale, fallback = "") {
  if (!value) return fallback;
  return locale === "zh" ? productAttributeLabels[value] || value : value;
}

export const museumLabels: Record<Locale, Record<string, string>> = {
  en: {},
  zh: {
    "Forbidden City": "故宫博物院",
    "National Museum of China": "中国国家博物馆",
    "Henan Museum": "河南博物院",
    "Shaanxi History Museum": "陕西历史博物馆",
    "Hubei Provincial Museum": "湖北省博物馆",
    "Shanghai Museum": "上海博物馆",
    "Sichuan Museum": "四川博物院",
    "Sanxingdui Museum": "三星堆博物馆",
    "Dunhuang Museum": "敦煌博物馆",
    "Suzhou Museum": "苏州博物馆",
    "Nanjing Museum": "南京博物院",
    "Hunan Museum": "湖南博物院",
    "Guangdong Museum": "广东省博物馆",
    "Yunnan Museum": "云南省博物馆",
    "Fujian Museum": "福建博物院",
    "Baoji Bronze Museum": "宝鸡青铜器博物院",
    "Yinxu Museum": "殷墟博物馆",
    "Curated Selection": "精选策划",
    Dunhuang: "敦煌",
    Sanxingdui: "三星堆",
    Kids: "儿童",
    "Festival Gifts": "节日礼品",
    "Bronze Age": "青铜时代",
    "Chinese Characters": "汉字文化",
    Beijing: "北京",
    Shanghai: "上海",
    Sichuan: "四川",
    Hubei: "湖北",
    Henan: "河南",
    Shaanxi: "陕西",
    Gansu: "甘肃",
    Jiangsu: "江苏",
    Guangdong: "广东",
    Yunnan: "云南",
    Fujian: "福建",
  },
};

export function displayName(value: string, locale: Locale) {
  if (!value) {
    return "";
  }
  return museumLabels[locale][value] || value;
}

export function formatPriceForLocale(product: Pick<Product, "price" | "currency">, locale: Locale) {
  if (product.price == null) {
    return locale === "zh" ? "询价" : "Request price";
  }

  return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", {
    style: "currency",
    currency: product.currency || "USD",
  }).format(product.price);
}

export function inventoryLabel(value: Product["inventoryStatus"], locale: Locale) {
  const zh: Record<Product["inventoryStatus"], string> = {
    in_stock: "现货",
    limited: "少量库存",
    made_to_order: "按需订购",
    sold_out: "暂时售罄",
  };
  if (locale === "zh") {
    return zh[value] || value;
  }
  return value.replaceAll("_", " ");
}

export const dictionary = {
  en: {
    brand: "Little Treasures From China",
    curator: "Curated by Auctus Lab",
    requestCatalog: "Request Catalog",
    nav: {
      gifts: "Gifts",
      home: "Home & Living",
      stationery: "Stationery & Office",
      kids: "Kids & Family",
      wear: "Wear & Accessories",
      collections: "Museum Collections",
      new: "New Arrivals",
      about: "About",
      contact: "Contact",
    },
    giftMenu: {
      occasion: "Shop by Occasion",
      recipient: "Shop by Recipient",
      budget: "Shop by Budget",
      occasions: [
        "Teacher Gifts",
        "Housewarming Gifts",
        "Thank You Gifts",
        "Birthday Gifts",
        "New Baby & Family",
        "Host & Hostess Gifts",
        "Holiday Gifts",
      ],
      recipients: [
        "For Parents",
        "For Grandparents",
        "For Friends",
        "For Kids",
        "For Teachers",
        "For Colleagues",
      ],
      budgets: ["Under $20", "Under $50", "Under $100", "Premium Gift Boxes"],
    },
    home: {
      tagline: "Thoughtful Gifts. Beautiful Stories.",
      subheadline: "Thoughtful gifts inspired by China's museums, traditions, and everyday beauty.",
      findGift: "Find a Gift",
      exploreCollections: "Explore Collections",
      occasionKicker: "Shop by Occasion",
      occasionTitle: "Start with the person, not the museum.",
      bestKicker: "Best Sellers",
      bestTitle: "Most requested little treasures.",
      viewAll: "View all products",
      storiesKicker: "Stories Behind the Gifts",
      storiesTitle: "A beautiful gift with a meaningful story.",
      relatedGifts: "Find related gifts",
      museumKicker: "Museum Collections",
      museumTitle: "Museums as inspiration, not a maze.",
      journalKicker: "Little Treasures Journal",
      journalTitle: "Gift guides, culture notes, and museum stories.",
      comingSoon: "Coming soon",
      addInAdmin: "Add in Admin",
    },
    catalog: {
      kicker: "Product Catalog",
      title: "Curated cultural gifts, ready for inquiry.",
      intro:
        "Discover thoughtful gifts by occasion, recipient, product category, and museum collection. Every object has a story worth sharing.",
      clear: "Clear filter",
      notConfigured: "Supabase is not configured yet.",
      noMatch: "No products match this filter yet.",
      noProducts: "No products yet.",
      view: "View",
      fallbackMuseum: "Little Treasures",
    },
    product: {
      notFound: "Product not found.",
      notFoundNote: "This product may not exist yet, or Supabase is not configured.",
      backCatalog: "Back to catalog",
      gift: "Museum Gift",
      price: "Price",
      inventory: "Inventory",
      museumSource: "Museum Source",
      location: "Location",
      curated: "Curated selection",
      confirm: "To be confirmed",
      requestPrice: "Request Price",
      ask: "Ask About This Product",
      storyTitle: "Story Behind the Gift",
      storyPending: "Story details will be added soon.",
      officialCollection: "Official Collection",
      perfectFor: "Perfect For",
      perfectDefaults: ["Teachers", "Friends", "Housewarming", "Collectors"],
      materials: "Materials",
      dimensions: "Dimensions",
      weight: "Weight",
      shipping: "Shipping",
      returns: "Returns",
      related: "Related Products",
    },
    staticPages: {
      about: {
        kicker: "About Us",
        title: "Little Treasures From China",
        intro:
          "Our story begins with a simple feeling: beautiful cultural objects should not stay hidden on a quiet museum shelf.",
        body: [
          "We are a group of people who love Chinese culture, museum collections, thoughtful design, and meaningful gifts.",
          "Little Treasures From China was created to share museum-inspired objects, heritage designs, educational gifts, and collectible keepsakes with friends, families, educators, collectors, and cultural enthusiasts around the world.",
          "We believe a small object can carry a story. A bookmark can inspire curiosity about history. A gift can become a bridge between cultures.",
          "Our mission is simple: to curate beautiful cultural treasures from China and help them find a place in everyday life.",
        ],
      },
      collections: {
        kicker: "Collections",
        title: "Curated shelves of museum-inspired gifts.",
        intro:
          "Each collection starts with a cultural story, then becomes a small world of giftable objects, learning tools, home pieces, and keepsakes.",
      },
      contact: {
        kicker: "Order Inquiry",
        title: "Little Treasures From China Starter Catalog",
        intro:
          "Tell us what you are looking for and we will prepare a curated quote or catalog conversation.",
        button: "Request Quote",
      },
      institutions: {
        kicker: "For Institutions",
        title: "Catalogs for museum shops, cultural programs, and gift buyers.",
        intro:
          "We help institutions discover Chinese cultural products that feel thoughtful, well-designed, and easy to explain to visitors.",
      },
      museums: {
        kicker: "Museums",
        title: "Cultural treasures, organized by museum.",
        intro:
          "Every museum path highlights a signature cultural anchor and a thoughtful product direction for gifts, education, and collecting.",
      },
      regions: {
        kicker: "Regions of China",
        title: "China, organized by cultural mood.",
        intro:
          "Shop by place, story, landscape, and local museum culture. Each region suggests a different design language and gift direction.",
      },
    },
  },
  zh: {
    brand: "Little Treasures From China",
    curator: "Auctus Lab 精选策划",
    requestCatalog: "索取目录",
    nav: {
      gifts: "礼品",
      home: "家居生活",
      stationery: "文具办公",
      kids: "亲子儿童",
      wear: "穿戴配饰",
      collections: "博物馆系列",
      new: "新品",
      about: "关于我们",
      contact: "联系订购",
    },
    giftMenu: {
      occasion: "按场景选礼",
      recipient: "按收礼人选礼",
      budget: "按预算选礼",
      occasions: ["教师礼物", "乔迁礼物", "感谢礼物", "生日礼物", "新生儿与家庭", "主人礼", "节日礼物"],
      recipients: ["送父母", "送祖父母", "送朋友", "送孩子", "送老师", "送同事"],
      budgets: ["20 美元以内", "50 美元以内", "100 美元以内", "高端礼盒"],
    },
    home: {
      tagline: "有心意的礼物，有故事的美物。",
      subheadline: "来自中国博物馆、传统文化与日常审美灵感的精选礼品。",
      findGift: "开始选礼",
      exploreCollections: "探索系列",
      occasionKicker: "按场景选礼",
      occasionTitle: "先从送给谁开始，而不是先从博物馆开始。",
      bestKicker: "热门精选",
      bestTitle: "最受关注的小小珍宝。",
      viewAll: "查看全部产品",
      storiesKicker: "礼物背后的故事",
      storiesTitle: "一件美好的礼物，也可以有一段有意义的故事。",
      relatedGifts: "查看相关礼品",
      museumKicker: "博物馆系列",
      museumTitle: "以博物馆为灵感，而不是让人迷路的目录。",
      journalKicker: "Little Treasures 日志",
      journalTitle: "礼品指南、文化笔记与博物馆故事。",
      comingSoon: "即将上线",
      addInAdmin: "在后台添加",
    },
    catalog: {
      kicker: "产品目录",
      title: "精选文化礼品，可咨询订购。",
      intro: "你可以按送礼场景、收礼人、产品类别和博物馆系列发现礼物。每一件小物都有值得分享的故事。",
      clear: "清除筛选",
      notConfigured: "Supabase 还没有配置完成。",
      noMatch: "暂时没有符合这个筛选的产品。",
      noProducts: "还没有产品。",
      view: "查看",
      fallbackMuseum: "精选好物",
    },
    product: {
      notFound: "没有找到这个产品。",
      notFoundNote: "这个产品可能还没有创建，或 Supabase 尚未配置完成。",
      backCatalog: "返回目录",
      gift: "博物馆文创礼品",
      price: "价格",
      inventory: "库存",
      museumSource: "博物馆来源",
      location: "地点",
      curated: "精选产品",
      confirm: "待确认",
      requestPrice: "询价",
      ask: "咨询这个产品",
      storyTitle: "礼物背后的故事",
      storyPending: "产品故事即将补充。",
      officialCollection: "馆藏/灵感来源",
      perfectFor: "适合送给",
      perfectDefaults: ["老师", "朋友", "乔迁", "收藏爱好者"],
      materials: "材质",
      dimensions: "尺寸",
      weight: "重量",
      shipping: "配送",
      returns: "退换说明",
      related: "相关产品",
    },
    staticPages: {
      about: {
        kicker: "关于我们",
        title: "Little Treasures From China",
        intro: "我们的故事，开始于一个简单的想法：美好的中国文化小物，不应该只停留在安静的博物馆货架上。",
        body: [
          "我们是一群热爱中国文化、博物馆收藏、文创设计和有意义礼物的人。",
          "Little Treasures From China 希望把来自中国博物馆、传统工艺、历史建筑、文学节庆和日常故事的美好小物，分享给世界各地的朋友、家庭、教育者、收藏者和文化爱好者。",
          "我们相信，一件小物也可以承载故事。一个书签可以唤起对历史的好奇，一件礼物也可以成为文化之间的桥梁。",
          "我们的使命很简单：精选来自中国的文化珍宝，让它们进入日常生活，成为可以被使用、被赠送、被记住的美好礼物。",
        ],
      },
      collections: {
        kicker: "系列",
        title: "以博物馆灵感策划的一组组礼品。",
        intro: "每个系列都从一个文化故事出发，延展为适合送礼、学习、家居和收藏的小世界。",
      },
      contact: {
        kicker: "订购咨询",
        title: "Little Treasures From China 精选目录",
        intro: "告诉我们你的需求，我们会为你准备精选报价或产品目录沟通。",
        button: "发送咨询",
      },
      institutions: {
        kicker: "机构合作",
        title: "为博物馆商店、文化项目和礼品采购者准备的精选目录。",
        intro: "我们帮助机构发现有设计感、易讲述、适合面向海外用户介绍的中国文化产品。",
      },
      museums: {
        kicker: "博物馆",
        title: "按博物馆整理中国文化珍宝。",
        intro: "每条博物馆路径都会呈现代表性文化主题，以及适合礼品、教育和收藏的文创方向。",
      },
      regions: {
        kicker: "中国地区",
        title: "按地域气质理解中国文化礼品。",
        intro: "从城市、故事、风景和地方博物馆文化出发，每个地区都有不同的设计语言和礼品方向。",
      },
    },
  },
} as const;

export const localizedOccasions = {
  en: [
    ["Teacher Gifts", "Small cultural objects that make classrooms feel curious and alive."],
    ["Housewarming", "Warm objects for shelves, tables, tea corners, and new homes."],
    ["Thank You Gifts", "Thoughtful pieces with a story, easy to give and easy to remember."],
    ["For Kids", "Gentle introductions to museums, characters, myths, and making."],
    ["Premium Gift Boxes", "Curated sets for institutions, hosts, collectors, and special moments."],
    ["Chinese Heritage Collection", "Gift-ready objects inspired by museums, cities, and traditions."],
  ],
  zh: [
    ["教师礼物", "适合课堂、老师和文化启发的小礼物。"],
    ["乔迁礼物", "适合书架、餐桌、茶角和新家的温暖小物。"],
    ["感谢礼物", "有故事、有心意，也容易被记住。"],
    ["送给孩子", "用温柔有趣的方式认识博物馆、汉字、神话与手作。"],
    ["高端礼盒", "适合机构、主人礼、收藏者和重要时刻的精选组合。"],
    ["中国文化遗产系列", "来自博物馆、城市和传统灵感的可赠送文化好物。"],
  ],
} as const;

export const localizedStories = {
  en: [
    ["The Legend of the Nine-Colored Deer", "A Dunhuang story about kindness, promise, and the luminous colors of the Silk Road."],
    ["The Mystery of Sanxingdui", "Bronze masks, sacred trees, and a visual language that still feels futuristic."],
    ["The Beauty of Dunhuang", "Murals, desert light, celestial figures, and colors that travel beautifully into gifts."],
    ["The Story of the Palace Museum", "Everyday objects, imperial color, architecture, and details made for modern life."],
  ],
  zh: [
    ["九色鹿的传说", "来自敦煌的故事，关于善意、承诺与丝路色彩。"],
    ["三星堆之谜", "青铜面具、神树与至今仍有未来感的视觉语言。"],
    ["敦煌之美", "壁画、沙漠光线、飞天与适合转化为礼物的色彩。"],
    ["故宫的故事", "宫廷色彩、建筑细节与可以进入现代生活的日常美物。"],
  ],
} as const;

export const journalTopicsByLocale = {
  en: ["Gift Guides", "Chinese Culture", "Museum Stories", "Artist Interviews", "Travel Inspiration"],
  zh: ["礼品指南", "中国文化", "博物馆故事", "艺术家访谈", "旅行灵感"],
} as const;

export const filterAliases: Record<string, string[]> = {
  "教师礼物": ["Teacher Gifts", "For Teachers"],
  "学生礼物": ["Student Gifts"],
  "乔迁礼物": ["Housewarming Gifts", "Housewarming"],
  "感谢礼物": ["Thank You Gifts"],
  "生日礼物": ["Birthday Gifts"],
  "新生儿与家庭": ["New Baby & Family"],
  "主人礼": ["Host & Hostess Gifts"],
  "节日礼物": ["Holiday Gifts", "Festival Gifts"],
  "旅行纪念": ["Travel Souvenirs"],
  "办公桌礼物": ["Desk & Office Gifts"],
  "企业礼赠": ["Corporate Gifts"],
  "高端礼物": ["Premium Gifts"],
  "收藏礼物": ["Collector Gifts"],
  "送父母": ["For Parents"],
  "送祖父母": ["For Grandparents"],
  "送朋友": ["For Friends"],
  "送孩子": ["Gifts for Kids", "For Kids", "Kids & Family"],
  "送给孩子": ["Gifts for Kids", "For Kids", "Kids & Family"],
  "送老师": ["For Teachers", "Teacher Gifts"],
  "送同事": ["For Colleagues"],
  "20 美元以内": ["Under $20"],
  "50 美元以内": ["Under $50"],
  "100 美元以内": ["Under $100"],
  "高端礼盒": ["Premium Gift Boxes"],
  "Housewarming Gifts": ["Housewarming"],
  "Gifts for Kids": ["For Kids", "Kids & Family"],
  "Birthday Gifts": ["Birthday"],
};
