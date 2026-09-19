export type SeedLeadCategory =
  | "Museums & Cultural Institutions"
  | "Tourism & Attractions"
  | "Universities & Schools"
  | "Nonprofit Organizations"
  | "Corporate & Institutional Gifts"
  | "Retail & Chain Companies"
  | "Influencers & Events";

export type OutreachStatus = "manual_review" | "not_contacted" | "draft_ready" | "missing_contact";

export type SeedLead = {
  name: string;
  category: SeedLeadCategory;
  subcategory: string;
  city: string;
  state: string;
  country: string;
  website_url: string;
  store_url: string | null;
  gift_shop_url: string | null;
  online_store_url: string | null;
  vendor_application_url: string | null;
  wholesale_url: string | null;
  contact_page_url: string | null;
  general_email: string | null;
  correct_business_email: string | null;
  retail_contact_name: string | null;
  retail_contact_title: string | null;
  retail_contact_email: string | null;
  partnership_contact_name: string | null;
  partnership_contact_email: string | null;
  procurement_contact_email: string | null;
  phone: string | null;
  LinkedIn: string | null;
  Instagram: string | null;
  TikTok: string | null;
  YouTube: string | null;
  source_url: string;
  source_type: "official_website" | "official_store" | "contact_page" | "public_directory" | "social_profile";
  evidence_notes: string;
  recommended_product_angle: string;
  opportunity_score: number;
  confidence_score: number;
  outreach_status: OutreachStatus;
  personalized_email_draft: string;
};

type RequiredTextField =
  | "name"
  | "subcategory"
  | "city"
  | "state"
  | "website_url"
  | "source_url"
  | "evidence_notes"
  | "recommended_product_angle";

type LeadInput = Omit<
  SeedLead,
  | RequiredTextField
  | "country"
  | "store_url"
  | "gift_shop_url"
  | "online_store_url"
  | "vendor_application_url"
  | "wholesale_url"
  | "contact_page_url"
  | "general_email"
  | "correct_business_email"
  | "retail_contact_name"
  | "retail_contact_title"
  | "retail_contact_email"
  | "partnership_contact_name"
  | "partnership_contact_email"
  | "procurement_contact_email"
  | "phone"
  | "LinkedIn"
  | "Instagram"
  | "TikTok"
  | "YouTube"
  | "source_type"
  | "outreach_status"
  | "personalized_email_draft"
> &
  { [Field in RequiredTextField]: string | null } &
  Partial<
    Pick<
      SeedLead,
      | "country"
      | "store_url"
      | "gift_shop_url"
      | "online_store_url"
      | "vendor_application_url"
      | "wholesale_url"
      | "contact_page_url"
      | "general_email"
      | "correct_business_email"
      | "retail_contact_name"
      | "retail_contact_title"
      | "retail_contact_email"
      | "partnership_contact_name"
      | "partnership_contact_email"
      | "procurement_contact_email"
      | "phone"
      | "LinkedIn"
      | "Instagram"
      | "TikTok"
      | "YouTube"
      | "source_type"
      | "outreach_status"
    >
  >;

function lead(input: LeadInput): SeedLead {
  const normalized = {
    name: input.name ?? "Unknown institution",
    subcategory: input.subcategory ?? "Prospect",
    city: input.city ?? "Unknown",
    state: input.state ?? "US",
    website_url: input.website_url ?? input.source_url ?? "",
    source_url: input.source_url ?? input.website_url ?? "",
    evidence_notes: input.evidence_notes ?? "Public source requires manual review.",
    recommended_product_angle: input.recommended_product_angle ?? "custom cultural merchandise capsule",
  };

  return {
    country: "US",
    store_url: input.online_store_url ?? input.gift_shop_url ?? null,
    gift_shop_url: null,
    online_store_url: null,
    vendor_application_url: null,
    wholesale_url: null,
    contact_page_url: null,
    general_email: null,
    correct_business_email: null,
    retail_contact_name: null,
    retail_contact_title: null,
    retail_contact_email: null,
    partnership_contact_name: null,
    partnership_contact_email: null,
    procurement_contact_email: null,
    phone: null,
    LinkedIn: null,
    Instagram: null,
    TikTok: null,
    YouTube: null,
    source_type: "official_website",
    outreach_status: "manual_review",
    ...input,
    ...normalized,
    personalized_email_draft: makeDraft(normalized.name, normalized.evidence_notes, normalized.recommended_product_angle),
  };
}

function makeDraft(name: string, fit: string, angle: string) {
  return `Hi ${name} team,\n\nI noticed ${fit}. Auctus Lab designs premium cultural merchandise, city gifts, and limited-edition products for institutions with strong visitor, community, or brand stories.\n\nOne idea that may fit your audience is a ${angle}. We can develop a small custom capsule around a collection, landmark, event, or seasonal campaign and keep the concept retail-ready for gift shops or partner programs.\n\nWould it be worth a brief introductory call to see whether this could fit an upcoming retail, event, or gifting priority?\n\nBest,\nAuctus Lab`;
}

export const seedLeads: SeedLead[] = [
  lead({
    name: "The Metropolitan Museum of Art",
    category: "Museums & Cultural Institutions",
    subcategory: "Art museum",
    city: "New York",
    state: "NY",
    website_url: "https://www.metmuseum.org",
    online_store_url: "https://store.metmuseum.org/",
    gift_shop_url: "https://store.metmuseum.org/",
    contact_page_url: "https://www.metmuseum.org/about-the-met/contact",
    phone: "+1 212-535-7710",
    LinkedIn: "https://www.linkedin.com/company/the-metropolitan-museum-of-art/",
    Instagram: "https://www.instagram.com/metmuseum/",
    source_url: "https://store.metmuseum.org/",
    source_type: "official_store",
    evidence_notes: "official Met Store with broad collection-based merchandise and strong global visitor audience",
    recommended_product_angle: "museum gift capsule",
    opportunity_score: 96,
    confidence_score: 95,
    retail_contact_title: "Museum store / retail partnerships",
  }),
  lead({
    name: "The Museum of Modern Art",
    category: "Museums & Cultural Institutions",
    subcategory: "Modern art museum",
    city: "New York",
    state: "NY",
    website_url: "https://www.moma.org",
    online_store_url: "https://store.moma.org/",
    gift_shop_url: "https://store.moma.org/",
    contact_page_url: "https://www.moma.org/about/contact",
    phone: "+1 212-708-9400",
    LinkedIn: "https://www.linkedin.com/company/the-museum-of-modern-art/",
    Instagram: "https://www.instagram.com/themuseumofmodernart/",
    source_url: "https://store.moma.org/",
    source_type: "official_store",
    evidence_notes: "MoMA Design Store is a leading museum retail model with design-forward gift products",
    recommended_product_angle: "limited-edition design merchandise",
    opportunity_score: 97,
    confidence_score: 96,
    retail_contact_title: "Design store retail team",
  }),
  lead({
    name: "Art Institute of Chicago",
    category: "Museums & Cultural Institutions",
    subcategory: "Art museum",
    city: "Chicago",
    state: "IL",
    website_url: "https://www.artic.edu",
    online_store_url: "https://shop.artic.edu/",
    gift_shop_url: "https://shop.artic.edu/",
    contact_page_url: "https://www.artic.edu/contact",
    phone: "+1 312-443-3600",
    LinkedIn: "https://www.linkedin.com/company/art-institute-of-chicago/",
    Instagram: "https://www.instagram.com/artinstitutechi/",
    source_url: "https://shop.artic.edu/",
    source_type: "official_store",
    evidence_notes: "official museum shop and large encyclopedic art collection",
    recommended_product_angle: "museum gift capsule",
    opportunity_score: 94,
    confidence_score: 94,
    retail_contact_title: "Museum shop retail team",
  }),
  lead({
    name: "J. Paul Getty Museum",
    category: "Museums & Cultural Institutions",
    subcategory: "Art museum",
    city: "Los Angeles",
    state: "CA",
    website_url: "https://www.getty.edu",
    online_store_url: "https://shop.getty.edu/",
    gift_shop_url: "https://shop.getty.edu/",
    contact_page_url: "https://www.getty.edu/about/contact_us.html",
    phone: "+1 310-440-7300",
    LinkedIn: "https://www.linkedin.com/company/getty-museum/",
    Instagram: "https://www.instagram.com/gettymuseum/",
    source_url: "https://shop.getty.edu/",
    source_type: "official_store",
    evidence_notes: "official Getty shop and premium art/culture visitor base",
    recommended_product_angle: "museum gift capsule",
    opportunity_score: 92,
    confidence_score: 92,
    retail_contact_title: "Museum store retail team",
  }),
  lead({
    name: "Smithsonian Institution",
    category: "Museums & Cultural Institutions",
    subcategory: "Museum network",
    city: "Washington",
    state: "DC",
    website_url: "https://www.si.edu",
    online_store_url: "https://www.smithsonianstore.com/",
    gift_shop_url: "https://www.smithsonianstore.com/",
    contact_page_url: "https://www.si.edu/contact",
    phone: "+1 202-633-1000",
    LinkedIn: "https://www.linkedin.com/company/smithsonian-institution/",
    Instagram: "https://www.instagram.com/smithsonian/",
    source_url: "https://www.smithsonianstore.com/",
    source_type: "official_store",
    evidence_notes: "national museum network with official online store and education audience",
    recommended_product_angle: "children's educational gift",
    opportunity_score: 91,
    confidence_score: 92,
    retail_contact_title: "Smithsonian Store retail team",
  }),
  ...[
    ["Whitney Museum of American Art", "Contemporary art museum", "New York", "NY", "https://whitney.org", "https://shop.whitney.org/", "https://www.instagram.com/whitneymuseum/", "contemporary art museum with official online shop"],
    ["Solomon R. Guggenheim Museum", "Art museum", "New York", "NY", "https://www.guggenheim.org", "https://www.guggenheimstore.org/", "https://www.instagram.com/guggenheim/", "global art museum with official Guggenheim Store"],
    ["Los Angeles County Museum of Art", "Art museum", "Los Angeles", "CA", "https://www.lacma.org", "https://www.thelacmastore.org/", "https://www.instagram.com/lacma/", "major Los Angeles art museum with official store"],
    ["Museum of Fine Arts, Boston", "Art museum", "Boston", "MA", "https://www.mfa.org", "https://mfashop.com/", "https://www.instagram.com/mfaboston/", "official MFA Shop and strong cultural gift audience"],
    ["Philadelphia Museum of Art", "Art museum", "Philadelphia", "PA", "https://philamuseum.org", "https://store.philamuseum.org/", "https://www.instagram.com/philamuseum/", "official online store and strong visitor retail opportunity"],
    ["Denver Art Museum", "Art museum", "Denver", "CO", "https://www.denverartmuseum.org", "https://shop.denverartmuseum.org/", "https://www.instagram.com/denverartmuseum/", "official museum shop and regional tourism audience"],
    ["Nelson-Atkins Museum of Art", "Art museum", "Kansas City", "MO", "https://nelson-atkins.org", "https://shop.nelson-atkins.org/", "https://www.instagram.com/nelsonatkins/", "official museum store and collection-based gift fit"],
    ["Cleveland Museum of Art", "Art museum", "Cleveland", "OH", "https://www.clevelandart.org", "https://store.clevelandart.org/", "https://www.instagram.com/clevelandmuseumofart/", "official store and encyclopedic collection"],
    ["Detroit Institute of Arts", "Art museum", "Detroit", "MI", "https://dia.org", "https://diashop.org/", "https://www.instagram.com/diadetroit/", "official DIA shop and city cultural audience"],
    ["Walker Art Center", "Contemporary art museum", "Minneapolis", "MN", "https://walkerart.org", "https://shop.walkerart.org/", "https://www.instagram.com/walkerartcenter/", "official shop and design-forward audience"],
    ["Crystal Bridges Museum of American Art", "Art museum", "Bentonville", "AR", "https://crystalbridges.org", "https://store.crystalbridges.org/", "https://www.instagram.com/crystalbridgesmuseum/", "official store and tourism audience"],
    ["High Museum of Art", "Art museum", "Atlanta", "GA", "https://high.org", "https://museumshop.high.org/", "https://www.instagram.com/highmuseumofart/", "official museum shop and regional cultural audience"],
    ["Asian Art Museum", "Asian art museum", "San Francisco", "CA", "https://asianart.org", "https://shop.asianart.org/", "https://www.instagram.com/asianartmuseum/", "Asian art collection and official shop create strong product fit"],
    ["Peabody Essex Museum", "Art and culture museum", "Salem", "MA", "https://www.pem.org", "https://pemshop.com/", "https://www.instagram.com/peabodyessex/", "official museum shop and Asian export art/culture fit"],
    ["National Gallery of Art", "Art museum", "Washington", "DC", "https://www.nga.gov", "https://shop.nga.gov/", "https://www.instagram.com/ngadc/", "official shop and national art audience"],
  ].map(([name, subcategory, city, state, website, store, instagram, evidence]) =>
    lead({
      name,
      category: "Museums & Cultural Institutions",
      subcategory,
      city,
      state,
      website_url: website,
      online_store_url: store,
      gift_shop_url: store,
      Instagram: instagram,
      source_url: store,
      source_type: "official_store",
      evidence_notes: evidence,
      recommended_product_angle: name.includes("Asian") ? "panda / Chinese culture collection" : "museum gift capsule",
      opportunity_score: name.includes("Asian") ? 94 : 86,
      confidence_score: 88,
      retail_contact_title: "Museum shop retail team",
    }),
  ),
  ...[
    ["Grand Canyon Conservancy", "National park partner store", "Grand Canyon Village", "AZ", "https://www.grandcanyon.org", "https://shop.grandcanyon.org/", "city landmark collection", "official conservancy shop for Grand Canyon visitor audience"],
    ["Golden Gate National Parks Conservancy", "National park partner store", "San Francisco", "CA", "https://www.parksconservancy.org", "https://store.parksconservancy.org/", "city landmark collection", "official park conservancy store and landmark audience"],
    ["Statue City Cruises", "Landmark attraction", "New York", "NY", "https://www.cityexperiences.com/new-york/city-cruises/statue/", null, "city landmark collection", "official Statue of Liberty/Ellis Island cruise operator visitor channel"],
    ["Empire State Building Observatory", "Observation deck", "New York", "NY", "https://www.esbnyc.com", "https://shop.esbnyc.com/", "city landmark collection", "official Empire State Building shop and tourism market"],
    ["Space Needle", "Observation deck", "Seattle", "WA", "https://www.spaceneedle.com", "https://shop.spaceneedle.com/", "city landmark collection", "official shop for major Seattle landmark"],
    ["Gateway Arch Park Foundation", "National park foundation", "St. Louis", "MO", "https://www.archpark.org", "https://shop.archpark.org/", "city landmark collection", "official Gateway Arch park foundation shop"],
    ["Colonial Williamsburg", "Historic site", "Williamsburg", "VA", "https://www.colonialwilliamsburg.org", "https://shop.colonialwilliamsburg.com/", "heritage gift collection", "official shop for historic destination"],
    ["Mount Vernon", "Historic estate", "Mount Vernon", "VA", "https://www.mountvernon.org", "https://shops.mountvernon.org/", "heritage gift collection", "official Mount Vernon shops"],
    ["Alcatraz City Cruises", "Historic attraction", "San Francisco", "CA", "https://www.cityexperiences.com/san-francisco/city-cruises/alcatraz/", null, "city landmark collection", "official Alcatraz tour operator visitor channel"],
    ["Niagara Falls State Park", "State park attraction", "Niagara Falls", "NY", "https://www.niagarafallsstatepark.com", "https://shop.niagarafallsstatepark.com/", "city landmark collection", "official state park shop for major tourism market"],
    ["Independence Visitor Center", "Visitor center", "Philadelphia", "PA", "https://www.phlvisitorcenter.com", "https://www.phlvisitorcenter.com/shop", "city landmark collection", "official visitor center shop"],
    ["Visit Seattle", "Tourism board", "Seattle", "WA", "https://visitseattle.org", null, "city landmark collection", "destination marketing organization with city gift potential"],
    ["NYC Tourism + Conventions", "Tourism board", "New York", "NY", "https://www.nyctourism.com", null, "city landmark collection", "destination marketing organization for major tourism market"],
    ["Choose Chicago", "Tourism board", "Chicago", "IL", "https://www.choosechicago.com", null, "city landmark collection", "tourism board with event and destination gift potential"],
    ["Visit California", "Tourism board", "Sacramento", "CA", "https://www.visitcalifornia.com", null, "city landmark collection", "state tourism organization with broad merchandise potential"],
  ].map(([name, subcategory, city, state, website, store, angle, evidence]) =>
    lead({
      name,
      category: "Tourism & Attractions",
      subcategory,
      city,
      state,
      website_url: website,
      online_store_url: store,
      gift_shop_url: store,
      source_url: store ?? website,
      source_type: store ? "official_store" : "official_website",
      evidence_notes: evidence,
      recommended_product_angle: angle,
      opportunity_score: store ? 86 : 76,
      confidence_score: store ? 87 : 78,
      retail_contact_title: store ? "Attraction retail team" : null,
      contact_page_url: website,
    }),
  ),
  ...[
    ["Harvard Coop", "Campus store", "Cambridge", "MA", "https://www.thecoop.com", "https://www.thecoop.com", "university alumni gift", "major university retail store with alumni and campus gift potential"],
    ["Stanford Bookstore", "Campus store", "Stanford", "CA", "https://www.bkstr.com/stanfordstore", "https://www.bkstr.com/stanfordstore", "university alumni gift", "official Stanford campus store channel"],
    ["Princeton University Store", "Campus store", "Princeton", "NJ", "https://www.pustore.com", "https://www.pustore.com", "university alumni gift", "independent university store with alumni gift potential"],
    ["UCLA Store", "Campus store", "Los Angeles", "CA", "https://shop.uclastore.com", "https://shop.uclastore.com", "university alumni gift", "official UCLA Store with online merchandise"],
    ["University Book Store - University of Washington", "Campus store", "Seattle", "WA", "https://www.ubookstore.com", "https://www.ubookstore.com", "university alumni gift", "university bookstore with broad gift assortment"],
    ["Yale University Art Gallery", "University museum", "New Haven", "CT", "https://artgallery.yale.edu", "https://museumstore.yale.edu/", "museum gift capsule", "university art museum with museum store"],
    ["Harvard Art Museums", "University museum", "Cambridge", "MA", "https://harvardartmuseums.org", "https://shop.harvardartmuseums.org/", "museum gift capsule", "university art museum with online shop"],
    ["Berkeley Art Museum and Pacific Film Archive", "University museum", "Berkeley", "CA", "https://bampfa.org", "https://shop.bampfa.org/", "museum gift capsule", "university museum with store and cultural programming"],
    ["University of Michigan Museum of Art", "University museum", "Ann Arbor", "MI", "https://umma.umich.edu", "https://umma.umich.edu/shop", "museum gift capsule", "university museum shop and education audience"],
    ["Princeton University Art Museum", "University museum", "Princeton", "NJ", "https://artmuseum.princeton.edu", "https://artmuseum.princeton.edu/visit/shop", "museum gift capsule", "university art museum shop"],
    ["MIT Museum", "University museum", "Cambridge", "MA", "https://mitmuseum.mit.edu", "https://mitmuseum.mit.edu/visit/museum-store", "children's educational gift", "science/technology university museum with store"],
    ["Cal Student Store", "Campus store", "Berkeley", "CA", "https://calstudentstore.berkeley.edu", "https://calstudentstore.berkeley.edu", "university alumni gift", "official UC Berkeley campus retail store"],
    ["NYU Bookstore", "Campus store", "New York", "NY", "https://www.bkstr.com/nyustore", "https://www.bkstr.com/nyustore", "university alumni gift", "official NYU bookstore channel"],
    ["The Cornell Store", "Campus store", "Ithaca", "NY", "https://www.cornellstore.com", "https://www.cornellstore.com", "university alumni gift", "official Cornell Store with online retail"],
    ["Notre Dame Hammes Bookstore", "Campus store", "Notre Dame", "IN", "https://www.bkstr.com/notredamestore", "https://www.bkstr.com/notredamestore", "university alumni gift", "official Notre Dame bookstore channel"],
  ].map(([name, subcategory, city, state, website, store, angle, evidence]) =>
    lead({
      name,
      category: "Universities & Schools",
      subcategory,
      city,
      state,
      website_url: website,
      online_store_url: store,
      gift_shop_url: store,
      source_url: store,
      source_type: "official_store",
      evidence_notes: evidence,
      recommended_product_angle: angle,
      opportunity_score: 84,
      confidence_score: 86,
      retail_contact_title: "Campus store / museum store retail team",
    }),
  ),
  ...[
    ["Asia Society", "Asian culture nonprofit", "New York", "NY", "https://asiasociety.org", "https://asiasociety.org/store", "panda / Chinese culture collection", "Asian culture nonprofit with events, education, and store potential"],
    ["Chinese Historical Society of America", "Chinese American cultural nonprofit", "San Francisco", "CA", "https://chsa.org", "https://chsa.org/shop/", "panda / Chinese culture collection", "Chinese American museum/nonprofit with online shop"],
    ["Museum of Chinese in America", "Chinese American cultural institution", "New York", "NY", "https://www.mocanyc.org", "https://www.mocanyc.org/shop", "panda / Chinese culture collection", "Chinese American cultural institution with shop potential"],
    ["Japanese American National Museum", "Asian American cultural institution", "Los Angeles", "CA", "https://www.janm.org", "https://janmstore.com/", "museum gift capsule", "Asian American museum with official store"],
    ["Chinese Culture Center of San Francisco", "Chinese culture nonprofit", "San Francisco", "CA", "https://www.cccsf.us", null, "panda / Chinese culture collection", "Chinese culture nonprofit with events and partnership potential"],
    ["Asian American Arts Alliance", "Arts nonprofit", "New York", "NY", "https://www.aaartsalliance.org", null, "festival gift box", "Asian American arts nonprofit with community network"],
    ["Gold House", "Asian Pacific nonprofit network", "Los Angeles", "CA", "https://goldhouse.org", null, "influencer limited-edition merchandise", "Asian Pacific community and creator network"],
    ["Committee of 100", "Chinese American association", "New York", "NY", "https://www.committee100.org", null, "corporate cultural gift", "Chinese American leadership nonprofit with events"],
    ["National Museum of Mexican Art", "Cultural nonprofit museum", "Chicago", "IL", "https://nationalmuseumofmexicanart.org", "https://shop.nationalmuseumofmexicanart.org/", "museum gift capsule", "cultural museum with shop and strong community audience"],
    ["The Wing Luke Museum", "Asian Pacific American museum", "Seattle", "WA", "https://www.wingluke.org", "https://shop.wingluke.org/", "panda / Chinese culture collection", "Asian Pacific American museum with shop"],
    ["Korean Cultural Center New York", "Cultural center", "New York", "NY", "https://www.koreanculture.org", null, "festival gift box", "cultural center with public programs and events"],
    ["Japan Society", "Cultural nonprofit", "New York", "NY", "https://japansociety.org", "https://shop.japansociety.org/", "museum gift capsule", "cultural nonprofit with official shop and event audience"],
    ["Queens Botanical Garden", "Community nonprofit garden", "Queens", "NY", "https://queensbotanical.org", "https://queensbotanical.org/garden-gift-shop/", "festival gift box", "public garden/community nonprofit with gift shop"],
    ["826 National", "Education nonprofit", "San Francisco", "CA", "https://826national.org", null, "children's educational gift", "education nonprofit with youth audience"],
    ["National Book Foundation", "Literary nonprofit", "New York", "NY", "https://www.nationalbook.org", null, "festival gift box", "literary nonprofit with events and book fair audience"],
  ].map(([name, subcategory, city, state, website, store, angle, evidence]) =>
    lead({
      name,
      category: "Nonprofit Organizations",
      subcategory,
      city,
      state,
      website_url: website,
      online_store_url: store,
      gift_shop_url: store,
      contact_page_url: website,
      source_url: store ?? website,
      source_type: store ? "official_store" : "official_website",
      evidence_notes: evidence,
      recommended_product_angle: angle,
      opportunity_score: store ? 82 : 72,
      confidence_score: store ? 84 : 74,
      retail_contact_title: store ? "Store / programs team" : null,
    }),
  ),
  ...[
    ["Marriott International", "Hospitality group", "Bethesda", "MD", "https://www.marriott.com", "corporate cultural gift", "large hospitality brand with client, event, and employee gifting potential"],
    ["Hyatt Hotels Corporation", "Hospitality group", "Chicago", "IL", "https://www.hyatt.com", "corporate cultural gift", "hospitality group with premium guest and event gift potential"],
    ["Hilton", "Hospitality group", "McLean", "VA", "https://www.hilton.com", "corporate cultural gift", "global hospitality group with corporate and event gift potential"],
    ["Salesforce", "Technology company", "San Francisco", "CA", "https://www.salesforce.com", "corporate cultural gift", "large tech company with events, employees, and branded gift needs"],
    ["Google", "Technology company", "Mountain View", "CA", "https://about.google", "corporate cultural gift", "large tech company with employee and event gifting potential"],
    ["Microsoft", "Technology company", "Redmond", "WA", "https://www.microsoft.com", "corporate cultural gift", "large tech company with event and employee experience teams"],
    ["Apple", "Technology company", "Cupertino", "CA", "https://www.apple.com", "limited-edition design merchandise", "design-led company with premium gifting and retail sensibility"],
    ["Deloitte", "Consulting firm", "New York", "NY", "https://www.deloitte.com", "corporate cultural gift", "large consulting firm with client events and employee experience needs"],
    ["Accenture", "Consulting firm", "New York", "NY", "https://www.accenture.com", "corporate cultural gift", "large consulting firm with events and corporate gift potential"],
    ["JPMorgan Chase", "Financial institution", "New York", "NY", "https://www.jpmorganchase.com", "corporate cultural gift", "large finance company with client and employee gifting potential"],
    ["Goldman Sachs", "Financial institution", "New York", "NY", "https://www.goldmansachs.com", "corporate cultural gift", "financial institution with client event gift potential"],
    ["Mayo Clinic", "Hospital system", "Rochester", "MN", "https://www.mayoclinic.org", "corporate cultural gift", "large healthcare institution with patient, donor, and staff gift potential"],
    ["Cleveland Clinic", "Hospital system", "Cleveland", "OH", "https://my.clevelandclinic.org", "corporate cultural gift", "large healthcare institution with donor and staff gifting potential"],
    ["Delta Air Lines", "Airline", "Atlanta", "GA", "https://www.delta.com", "city landmark collection", "major airline with travel and premium customer gift potential"],
    ["American Express", "Financial services", "New York", "NY", "https://www.americanexpress.com", "corporate cultural gift", "premium financial brand with event and member gift potential"],
  ].map(([name, subcategory, city, state, website, angle, evidence]) =>
    lead({
      name,
      category: "Corporate & Institutional Gifts",
      subcategory,
      city,
      state,
      website_url: website,
      contact_page_url: website,
      source_url: website,
      source_type: "official_website",
      evidence_notes: evidence,
      recommended_product_angle: angle,
      opportunity_score: 72,
      confidence_score: 70,
      outreach_status: "missing_contact",
    }),
  ),
  ...[
    ["Barnes & Noble", "Bookstore chain", "New York", "NY", "https://www.barnesandnoble.com", "https://www.barnesandnoble.com", "children's educational gift", "national bookstore chain with gift and education products"],
    ["Paper Source", "Stationery retailer", "Chicago", "IL", "https://www.papersource.com", "https://www.papersource.com", "limited-edition design merchandise", "stationery and gift retailer with design merchandise fit"],
    ["Uncommon Goods", "Online gift retailer", "Brooklyn", "NY", "https://www.uncommongoods.com", "https://www.uncommongoods.com", "limited-edition design merchandise", "online gift marketplace with maker and cultural product fit"],
    ["Poketo", "Design store", "Los Angeles", "CA", "https://www.poketo.com", "https://www.poketo.com", "limited-edition design merchandise", "design store with colorful creative merchandise audience"],
    ["Kinokuniya USA", "Bookstore chain", "New York", "NY", "https://usa.kinokuniya.com", "https://united-states.kinokuniya.com", "panda / Chinese culture collection", "Asian bookstore chain with stationery and gift audience"],
    ["H Mart", "Asian supermarket chain", "Lyndhurst", "NJ", "https://www.hmart.com", "https://www.hmart.com", "custom edible souvenir", "Asian supermarket chain with food gift and cultural product relevance"],
    ["99 Ranch Market", "Asian supermarket chain", "Buena Park", "CA", "https://www.99ranch.com", "https://www.99ranch.com", "custom edible souvenir", "Asian supermarket chain with cultural grocery audience"],
    ["Weee!", "Online grocery platform", "Fremont", "CA", "https://www.sayweee.com", "https://www.sayweee.com", "custom edible souvenir", "online Asian grocery platform with food gift relevance"],
    ["World Market", "Lifestyle retailer", "Alameda", "CA", "https://www.worldmarket.com", "https://www.worldmarket.com", "city landmark collection", "lifestyle retailer carrying global gifts and food products"],
    ["LEGO Store", "Toy retailer", "New York", "NY", "https://www.lego.com/en-us/stores", "https://www.lego.com/en-us/stores", "children's educational gift", "toy retail channel with educational/family audience"],
  ].map(([name, subcategory, city, state, website, store, angle, evidence]) =>
    lead({
      name,
      category: "Retail & Chain Companies",
      subcategory,
      city,
      state,
      website_url: website,
      online_store_url: store,
      source_url: store,
      source_type: "official_store",
      evidence_notes: evidence,
      recommended_product_angle: angle,
      opportunity_score: 76,
      confidence_score: 78,
      retail_contact_title: "Retail buying / partnerships team",
    }),
  ),
  ...[
    ["Sakura Matsuri - Brooklyn Botanic Garden", "Cultural festival", "Brooklyn", "NY", "https://www.bbg.org/collections/cherries", null, "festival gift box", "large cherry blossom cultural event audience"],
    ["National Cherry Blossom Festival", "City festival", "Washington", "DC", "https://nationalcherryblossomfestival.org", null, "festival gift box", "major city festival with cultural gift potential"],
    ["San Francisco Chinese New Year Festival & Parade", "Lunar New Year event", "San Francisco", "CA", "https://chineseparade.com", null, "panda / Chinese culture collection", "major Chinatown Lunar New Year event"],
    ["Lunar New Year Parade & Festival NYC", "Lunar New Year event", "New York", "NY", "https://betterchinatown.com", null, "panda / Chinese culture collection", "NY Chinatown cultural event audience"],
    ["LA Times Festival of Books", "Book fair", "Los Angeles", "CA", "https://events.latimes.com/festivalofbooks/", null, "festival gift box", "large book fair with family and education audience"],
    ["SXSW", "Conference and festival", "Austin", "TX", "https://www.sxsw.com", null, "influencer limited-edition merchandise", "large conference/festival with branded merchandise potential"],
    ["ComplexCon", "Culture festival", "Long Beach", "CA", "https://www.complexcon.com", null, "influencer limited-edition merchandise", "large creator/streetwear culture event"],
    ["New York Comic Con", "Pop culture event", "New York", "NY", "https://www.newyorkcomiccon.com", null, "limited-edition design merchandise", "large fan event with limited edition merchandise culture"],
    ["Travel + Leisure", "Travel media community", "New York", "NY", "https://www.travelandleisure.com", null, "city landmark collection", "large travel media audience and destination gift relevance"],
    ["Time Out New York", "Local culture media", "New York", "NY", "https://www.timeout.com/newyork", null, "city landmark collection", "large local culture and events audience"],
  ].map(([name, subcategory, city, state, website, store, angle, evidence]) =>
    lead({
      name,
      category: "Influencers & Events",
      subcategory,
      city,
      state,
      website_url: website,
      online_store_url: store,
      contact_page_url: website,
      source_url: website,
      source_type: "official_website",
      evidence_notes: evidence,
      recommended_product_angle: angle,
      opportunity_score: 70,
      confidence_score: 72,
      outreach_status: "missing_contact",
    }),
  ),
];

export type DashboardSeedLead = {
  id: string;
  name: string;
  category: "Museum" | "University" | "Corporate" | "Zoo/Aquarium" | "Attraction";
  state: string;
  city: string;
  score: number;
  contactStatus: "Unverified" | "Generic" | "Missing";
  pipelineStage: "Not Contacted";
  decisionMaker?: string;
  websiteUrl?: string;
  giftShopUrl?: string;
  vendorUrl?: string;
  wholesaleUrl?: string;
  theme: string;
  productIdea: string;
  latitude: number;
  longitude: number;
  notes: string[];
  seed: SeedLead;
};

const stateCoordinates: Record<string, { latitude: number; longitude: number }> = {
  AL: { latitude: 32.8067, longitude: -86.7911 },
  AR: { latitude: 34.9697, longitude: -92.3731 },
  AZ: { latitude: 33.7298, longitude: -111.4312 },
  CA: { latitude: 36.7783, longitude: -119.4179 },
  CO: { latitude: 39.5501, longitude: -105.7821 },
  CT: { latitude: 41.6032, longitude: -73.0877 },
  DC: { latitude: 38.9072, longitude: -77.0369 },
  GA: { latitude: 32.1656, longitude: -82.9001 },
  IL: { latitude: 40.6331, longitude: -89.3985 },
  IN: { latitude: 40.2672, longitude: -86.1349 },
  MA: { latitude: 42.4072, longitude: -71.3824 },
  MD: { latitude: 39.0458, longitude: -76.6413 },
  MI: { latitude: 44.3148, longitude: -85.6024 },
  MN: { latitude: 46.7296, longitude: -94.6859 },
  MO: { latitude: 37.9643, longitude: -91.8318 },
  NJ: { latitude: 40.0583, longitude: -74.4057 },
  NY: { latitude: 43, longitude: -75 },
  OH: { latitude: 40.4173, longitude: -82.9071 },
  PA: { latitude: 41.2033, longitude: -77.1945 },
  TX: { latitude: 31.9686, longitude: -99.9018 },
  VA: { latitude: 37.4316, longitude: -78.6569 },
  WA: { latitude: 47.7511, longitude: -120.7401 },
};

export function toDashboardLead(lead: SeedLead, index: number): DashboardSeedLead {
  const coordinate = stateCoordinates[lead.state] ?? { latitude: 39, longitude: -98 };
  const dashboardCategory =
    lead.category === "Universities & Schools"
      ? "University"
      : lead.category === "Corporate & Institutional Gifts" || lead.category === "Retail & Chain Companies"
        ? "Corporate"
        : lead.category === "Tourism & Attractions" || lead.category === "Nonprofit Organizations" || lead.category === "Influencers & Events"
          ? "Attraction"
          : "Museum";

  return {
    id: `seed-${index + 1}`,
    name: lead.name,
    category: dashboardCategory,
    state: lead.state,
    city: lead.city,
    score: lead.opportunity_score,
    contactStatus: lead.correct_business_email || lead.retail_contact_email ? "Unverified" : lead.contact_page_url || lead.phone ? "Generic" : "Missing",
    pipelineStage: "Not Contacted",
    decisionMaker: lead.retail_contact_title ?? lead.procurement_contact_email ?? undefined,
    websiteUrl: lead.website_url,
    giftShopUrl: lead.gift_shop_url ?? lead.store_url ?? undefined,
    vendorUrl: lead.vendor_application_url ?? lead.contact_page_url ?? undefined,
    wholesaleUrl: lead.wholesale_url ?? undefined,
    theme: `${lead.subcategory}. ${lead.evidence_notes}`,
    productIdea: lead.recommended_product_angle,
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
    notes: [
      `Source: ${lead.source_url}`,
      `Confidence: ${lead.confidence_score}`,
      `Review status: ${lead.outreach_status}`,
    ],
    seed: lead,
  };
}

export const seedDashboardLeads = seedLeads.map(toDashboardLead);
