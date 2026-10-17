// Describes each editable table once; the admin list pages, forms and save action all read from here.

export type FieldType = "text" | "textarea" | "markdown" | "number" | "checkbox" | "select" | "image" | "date" | "tel" | "url";

export type Field = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
  placeholder?: string;
  options?: "brands" | "categories" | "products";
  folder?: string;
  wide?: boolean;
  defaultValue?: string | number | boolean;
};

export type Resource = {
  key: string;
  table: string;
  title: string;
  singular: string;
  nameField: string;
  imageField?: string;
  slugFrom?: string;
  order: { column: string; ascending: boolean }[];
  select?: string;
  columns: { label: string; get: string }[];
  flags?: { field: string; on: string; off: string }[];
  fields: Field[];
};

export const RESOURCES: Record<string, Resource> = {
  products: {
    key: "products",
    table: "products",
    title: "Products",
    singular: "product",
    nameField: "name",
    imageField: "image_url",
    slugFrom: "name",
    order: [{ column: "sort_order", ascending: true }, { column: "name", ascending: true }],
    select: "*, brand:brands(name), category:categories(name)",
    columns: [
      { label: "Brand", get: "brand.name" },
      { label: "Type", get: "category.name" },
    ],
    flags: [
      { field: "is_active", on: "Live", off: "Hidden" },
      { field: "is_featured", on: "On home page", off: "" },
      { field: "in_stock", on: "", off: "Out of stock" },
    ],
    fields: [
      { name: "name", label: "Product name", type: "text", required: true, placeholder: "Parachute Coconut Oil 200 ml" },
      { name: "slug", label: "Web address", type: "text", help: "Leave blank to create it from the name." },
      { name: "brand_id", label: "Brand", type: "select", options: "brands" },
      { name: "category_id", label: "Type", type: "select", options: "categories" },
      { name: "image_url", label: "Photo", type: "image", folder: "products", wide: true, help: "A product photo on a white or plain background works best." },
      { name: "summary", label: "Short description", type: "textarea", wide: true, placeholder: "One line shown under the name." },
      { name: "description", label: "Full description", type: "markdown", wide: true, help: "Use ## for a heading, - for a bullet and **bold**." },
      { name: "pack_sizes", label: "Pack sizes", type: "text", placeholder: "100 ml, 200 ml, 500 ml" },
      { name: "price", label: "Price (৳, optional)", type: "number", help: "Leave blank to hide prices." },
      { name: "sort_order", label: "Order", type: "number", defaultValue: 0, help: "Lower numbers show first." },
      { name: "is_active", label: "Show on the website", type: "checkbox", defaultValue: true },
      { name: "is_featured", label: "Show on the home page carousel", type: "checkbox", defaultValue: true },
      { name: "in_stock", label: "In stock", type: "checkbox", defaultValue: true },
    ],
  },
  brands: {
    key: "brands",
    table: "brands",
    title: "Brands",
    singular: "brand",
    nameField: "name",
    imageField: "logo_url",
    slugFrom: "name",
    order: [{ column: "sort_order", ascending: true }, { column: "name", ascending: true }],
    columns: [{ label: "Company", get: "company" }],
    flags: [
      { field: "show_in_hero", on: "In hero bubbles", off: "" },
      { field: "is_parent", on: "Centre bubble", off: "" },
    ],
    fields: [
      { name: "name", label: "Brand name", type: "text", required: true },
      { name: "slug", label: "Web address", type: "text", help: "Leave blank to create it from the name." },
      { name: "logo_url", label: "Logo", type: "image", folder: "brands", wide: true, help: "Square logo; it is shown inside a circle." },
      { name: "company", label: "Company", type: "text", defaultValue: "Marico Bangladesh" },
      { name: "description", label: "Description", type: "textarea", wide: true },
      { name: "sort_order", label: "Order", type: "number", defaultValue: 0, help: "Sets the bubble position in the hero, lowest first." },
      { name: "show_in_hero", label: "Show as a bubble in the hero", type: "checkbox", defaultValue: true },
      { name: "is_parent", label: "Use as the big centre bubble (parent company)", type: "checkbox", defaultValue: false },
    ],
  },
  categories: {
    key: "categories",
    table: "categories",
    title: "Product types",
    singular: "product type",
    nameField: "name",
    slugFrom: "name",
    order: [{ column: "sort_order", ascending: true }],
    columns: [{ label: "Web address", get: "slug" }],
    fields: [
      { name: "name", label: "Name", type: "text", required: true, placeholder: "Hair Oil" },
      { name: "slug", label: "Web address", type: "text", help: "Leave blank to create it from the name." },
      { name: "sort_order", label: "Order", type: "number", defaultValue: 0 },
    ],
  },
  team: {
    key: "team",
    table: "team_members",
    title: "Team",
    singular: "team member",
    nameField: "name",
    imageField: "photo_url",
    order: [{ column: "sort_order", ascending: true }, { column: "name", ascending: true }],
    columns: [
      { label: "Role", get: "role" },
      { label: "Phone", get: "phone" },
    ],
    flags: [{ field: "is_visible", on: "", off: "Hidden" }],
    fields: [
      { name: "name", label: "Full name", type: "text", required: true },
      { name: "role", label: "Role", type: "text", placeholder: "Distributor Sales Representative" },
      { name: "phone", label: "Mobile number", type: "tel", placeholder: "01XXX-XXXXXX", help: "Shown when visitors tap the card, with call and WhatsApp buttons." },
      { name: "photo_url", label: "Photo", type: "image", folder: "team", wide: true, help: "Head and shoulders, plain background. It is cropped to a landscape card." },
      { name: "sort_order", label: "Order", type: "number", defaultValue: 0 },
      { name: "is_visible", label: "Show on the website", type: "checkbox", defaultValue: true },
    ],
  },
  offers: {
    key: "offers",
    table: "offers",
    title: "Offers",
    singular: "offer",
    nameField: "title",
    imageField: "image_url",
    order: [{ column: "created_at", ascending: false }],
    select: "*, product:products(name)",
    columns: [
      { label: "Product", get: "product.name" },
      { label: "Starts", get: "starts_on" },
      { label: "Ends", get: "ends_on" },
    ],
    flags: [{ field: "is_active", on: "", off: "Paused" }],
    fields: [
      { name: "title", label: "Headline", type: "text", required: true, placeholder: "Buy 12 Parachute 200 ml, get 1 free" },
      { name: "body", label: "Details", type: "textarea", wide: true },
      { name: "product_id", label: "Linked product", type: "select", options: "products" },
      { name: "image_url", label: "Image (optional)", type: "image", folder: "offers" },
      { name: "starts_on", label: "Starts on", type: "date", help: "Blank = starts now." },
      { name: "ends_on", label: "Ends on", type: "date", help: "The offer disappears after this day." },
      { name: "is_active", label: "Active", type: "checkbox", defaultValue: true },
    ],
  },
};

export const SETTINGS_GROUPS: { title: string; fields: Field[] }[] = [
  {
    title: "Brand",
    fields: [
      { name: "company_name", label: "Company name", type: "text", required: true },
      { name: "logo_text", label: "Logo text", type: "text", help: "Shown in the script logo when no logo image is set." },
      { name: "logo_url", label: "Logo image (optional)", type: "image", folder: "site" },
    ],
  },
  {
    title: "Hero",
    fields: [
      { name: "hero_eyebrow", label: "Small heading", type: "text" },
      { name: "hero_title", label: "Headline", type: "textarea", help: "Press Enter for a new line." },
      { name: "hero_highlight", label: "Underlined words", type: "text", help: "Must match words at the end of the headline." },
      { name: "hero_image_url", label: "Background photo", type: "image", folder: "site", wide: true },
    ],
  },
  {
    title: "About",
    fields: [
      { name: "about_eyebrow", label: "Small heading", type: "text" },
      { name: "about_title", label: "Title", type: "text" },
      { name: "about_intro", label: "One-line intro", type: "text", wide: true },
      { name: "about_body", label: "Full story (About page)", type: "markdown", wide: true, help: "Use ## for a heading, - for a bullet and **bold**." },
      { name: "about_image_url", label: "Photo", type: "image", folder: "site", wide: true },
      { name: "founded_year", label: "Founded (year)", type: "number" },
      { name: "staff_count", label: "Total staff", type: "number" },
    ],
  },
  {
    title: "Section headings",
    fields: [
      { name: "products_eyebrow", label: "Products", type: "text" },
      { name: "team_eyebrow", label: "Team", type: "text" },
      { name: "contact_eyebrow", label: "Contact (small)", type: "text" },
      { name: "contact_title", label: "Contact (large)", type: "text" },
      { name: "contact_image_url", label: "Contact background", type: "image", folder: "site", wide: true },
    ],
  },
  {
    title: "Contact details",
    fields: [
      { name: "phone", label: "Phone", type: "tel" },
      { name: "whatsapp", label: "WhatsApp number", type: "tel", help: "With country code, e.g. 8801710454519." },
      { name: "email", label: "Email", type: "text" },
      { name: "address", label: "Address", type: "text", wide: true },
      { name: "map_url", label: "Google Maps link", type: "url", wide: true },
    ],
  },
  {
    title: "Social links",
    fields: [
      { name: "facebook_url", label: "Facebook", type: "url" },
      { name: "twitter_url", label: "X (Twitter)", type: "url" },
      { name: "youtube_url", label: "YouTube", type: "url" },
      { name: "linkedin_url", label: "LinkedIn", type: "url" },
    ],
  },
  {
    title: "Search engines",
    fields: [
      { name: "seo_title", label: "Page title", type: "text", wide: true },
      { name: "seo_description", label: "Description", type: "textarea", wide: true },
      { name: "footer_credit", label: "Footer note", type: "text", wide: true },
    ],
  },
];
