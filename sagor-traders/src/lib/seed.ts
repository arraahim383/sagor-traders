// Demo content used only when no Supabase project is configured.
// It mirrors the rows seeded into the database, so the site looks the same either way.
import type { Brand, Category, Offer, Product, SiteSettings, TeamMember } from "./types";

export const seedSettings: SiteSettings = {
  company_name: "M/S Sagor Traders",
  logo_text: "Sagor Traders",
  logo_url: null,
  hero_eyebrow: "M/S Sagor Traders",
  hero_title: "Trusted\nFMCG Brands\nNear You",
  hero_highlight: "Near You",
  hero_image_url: "/media/site/hero.webp",
  about_eyebrow: "About Us",
  about_title: "M/S Sagor Traders",
  about_intro: "A dynamic FMCG distribution company serving Ullapara, Sirajganj since 2019.",
  about_body: `M/S Sagor Traders is a growing and dedicated distribution company that has been serving the fast-moving consumer goods (FMCG) sector in Ullapara, Sirajganj since 2019. Established with a clear vision to bridge manufacturers and end consumers efficiently, the company specializes in the distribution of everyday essential products, including food items, personal care goods, household necessities, and other high-turnover consumer products that form the backbone of daily life in urban and semi-urban areas.

## Team and logistics strength
The company operates with a compact yet highly effective team of 22 members. This dedicated workforce includes sales representatives, delivery personnel, drivers, warehouse staff, accounts and administrative professionals, and management. The company operates with a compact yet effective fleet of pickup and delivery vans, used to deliver orders to retail points across assigned territories, enabling quick turnaround times and frequent replenishment.

## Key strengths
- **Efficient supply chain:** prompt delivery and stock availability help retailers minimize out-of-stock situations.
- **Wide coverage:** serving general trade outlets (small shops), convenience stores and emerging modern retail channels.
- **Relationship-driven:** long-term ties with retailers through consistent service, competitive pricing and trade promotions.
- **Adaptability:** navigating transportation logistics, seasonal demand and market competition in a dynamic industry.

In a market where FMCG distribution is highly fragmented and competitive, M/S Sagor Traders stands out through its commitment to service quality and operational discipline.`,
  about_image_url: "/media/site/about.webp",
  stats: [
    { icon: "truck", value: "", label: "Trusted Distribution" },
    { icon: "users", value: "22+", label: "Team Members" },
    { icon: "map-pin", value: "", label: "Urban & Semi-Urban" },
  ],
  products_eyebrow: "Our Products",
  team_eyebrow: "Our Team",
  contact_eyebrow: "Contact Us",
  contact_title: "Get in Touch",
  contact_image_url: "/media/site/contact.webp",
  phone: "01710454519",
  whatsapp: "8801710454519",
  email: "info@omar-faruqe.com",
  address: "Ullapara, Sirajganj, Bangladesh",
  map_url: null,
  facebook_url: null,
  twitter_url: null,
  youtube_url: null,
  linkedin_url: null,
  founded_year: 2019,
  staff_count: 22,
  seo_title: "M/S Sagor Traders | Marico distributor in Ullapara, Sirajganj",
  seo_description:
    "M/S Sagor Traders distributes Marico brands including Parachute, Saffola, Nihar and Livon to retailers across Ullapara, Sirajganj.",
  footer_credit: null,
};

const brandRows: [string, string, boolean][] = [
  ["Marico", "marico", true],
  ["Set Wet", "set-wet", false],
  ["Saffola Active", "saffola-active", false],
  ["Livon", "livon", false],
  ["Parachute Advansed", "parachute-advansed", false],
  ["Parachute Gold", "parachute-gold", false],
  ["Hair & Care", "hair-and-care", false],
  ["Parachute", "parachute", false],
  ["Nihar Naturals", "nihar-naturals", false],
  ["Fiancée", "fiancee", false],
  ["Caivil", "caivil", false],
  ["Hair Code", "hair-code", false],
  ["Black Chic", "black-chic", false],
  ["X-Men", "x-men", false],
];

export const seedBrands: Brand[] = brandRows.map(([name, slug, isParent], i) => ({
  id: `brand-${slug}`,
  name,
  slug,
  logo_url: `/media/brands/${slug}.png`,
  description: null,
  company: "Marico Bangladesh",
  is_parent: isParent,
  show_in_hero: true,
  sort_order: i,
}));

export const seedCategories: Category[] = [
  ["Hair Oil", "hair-oil"],
  ["Skin Care", "skin-care"],
  ["Hair Colour", "hair-colour"],
  ["Edible Oil", "edible-oil"],
  ["Styling & Grooming", "styling-grooming"],
].map(([name, slug], i) => ({ id: `cat-${slug}`, name, slug, sort_order: i + 1 }));

const productRows: [string, string, string, string, string][] = [
  ["parachute", "skin-care", "Aloe Vera Gel", "aloe-vera-gel", "Parachute SkinPure aloe vera gel for everyday skin care."],
  ["parachute-advansed", "hair-oil", "Aloe Vera Hair Oil", "aloe-vera-hair-oil", "Parachute Advansed light hair oil enriched with aloe vera."],
  ["parachute", "hair-oil", "Parachute Extra Care", "parachute-extra-care", "Anti-hairfall hair oil with a comb applicator."],
  ["hair-code", "hair-colour", "Hair Color Shampoo", "hair-color-shampoo", "Hair Code shampoo hair colour that works in five minutes."],
  ["parachute", "skin-care", "Olive Oil", "olive-oil", "Parachute SkinPure beauty olive oil for skin and hair."],
];

export const seedProducts: Product[] = productRows.map(([brand, cat, name, slug, summary], i) => {
  const b = seedBrands.find((x) => x.slug === brand)!;
  const c = seedCategories.find((x) => x.slug === cat)!;
  return {
    id: `product-${slug}`,
    brand_id: b.id,
    category_id: c.id,
    name,
    slug,
    summary,
    description: null,
    pack_sizes: null,
    price: null,
    image_url: `/media/products/${slug}.webp`,
    is_featured: true,
    is_active: true,
    in_stock: true,
    sort_order: i + 1,
    brand: { id: b.id, name: b.name, slug: b.slug },
    category: { id: c.id, name: c.name, slug: c.slug },
  };
});

const teamRows: [string, string, string, string][] = [
  ["Md. Omar Faruqe (Sagor)", "Managing Director", "01710-454519", "omar-faruqe"],
  ["Md. Musa Karim", "Territory Manager, Marico Bangladesh Ltd", "01313-796454", "musa-karim"],
  ["Md. Atik Hasan", "Operation Manager", "01764-239259", "atik-hasan"],
  ["Md. Nasir Uddin", "Distributor Sales Representative", "01409-997694", "nasir-uddin"],
  ["Md. Shihab Ali", "Distributor Sales Representative", "01611-911534", "shihab-ali"],
  ["Md. Korban Ali", "Distributor Sales Representative", "01746-210215", "korban-ali"],
  ["Md. Rezaul Karim", "Distributor Sales Representative", "01736-147812", "rezaul-karim"],
  ["Md. Mamun Islam", "Distributor Sales Representative", "01972-996065", "mamun-islam"],
  ["Md. Tarikul Islam", "Distributor Sales Representative", "01734-207579", "tarikul-islam"],
  ["Md. AL Mobarok", "Distributor Sales Representative", "01600-060709", "al-mobarok"],
  ["Md. Rokon Ali", "Computer Operator", "01750-401511", "rokon-ali"],
];

export const seedTeam: TeamMember[] = teamRows.map(([name, role, phone, slug], i) => ({
  id: `team-${slug}`,
  name,
  role,
  phone,
  photo_url: `/media/team/${slug}.webp`,
  sort_order: i + 1,
  is_visible: true,
}));

export const seedOffers: Offer[] = [];
