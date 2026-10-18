export type Stat = { icon: "truck" | "users" | "map-pin" | "store" | "award" | "package"; value: string; label: string };

export type SiteSettings = {
  company_name: string;
  logo_text: string;
  logo_url: string | null;
  hero_eyebrow: string | null;
  hero_title: string | null;
  hero_highlight: string | null;
  hero_image_url: string | null;
  about_eyebrow: string | null;
  about_title: string | null;
  about_intro: string | null;
  about_body: string | null;
  about_image_url: string | null;
  stats: Stat[];
  products_eyebrow: string | null;
  team_eyebrow: string | null;
  contact_eyebrow: string | null;
  contact_title: string | null;
  contact_image_url: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  map_url: string | null;
  facebook_url: string | null;
  twitter_url: string | null;
  youtube_url: string | null;
  linkedin_url: string | null;
  founded_year: number | null;
  staff_count: number | null;
  seo_title: string | null;
  seo_description: string | null;
  footer_credit: string | null;
};

export type Brand = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  company: string;
  is_parent: boolean;
  show_in_hero: boolean;
  sort_order: number;
};

export type Category = { id: string; name: string; slug: string; sort_order: number };

export type Product = {
  id: string;
  brand_id: string | null;
  category_id: string | null;
  name: string;
  slug: string;
  summary: string | null;
  description: string | null;
  pack_sizes: string | null;
  price: number | null;
  image_url: string | null;
  is_featured: boolean;
  is_active: boolean;
  in_stock: boolean;
  sort_order: number;
  brand?: Pick<Brand, "id" | "name" | "slug"> | null;
  category?: Pick<Category, "id" | "name" | "slug"> | null;
};

export type TeamMember = {
  id: string;
  name: string;
  role: string | null;
  phone: string | null;
  photo_url: string | null;
  sort_order: number;
  is_visible: boolean;
};

export type Offer = {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  product_id: string | null;
  starts_on: string | null;
  ends_on: string | null;
  is_active: boolean;
  product?: Pick<Product, "id" | "name" | "slug"> | null;
};

export type Inquiry = {
  id: string;
  kind: "contact" | "product";
  name: string;
  email: string | null;
  phone: string | null;
  shop_name: string | null;
  area: string | null;
  message: string | null;
  product_id: string | null;
  product_name: string | null;
  quantity: string | null;
  status: "new" | "contacted" | "closed";
  staff_note: string | null;
  created_at: string;
};
