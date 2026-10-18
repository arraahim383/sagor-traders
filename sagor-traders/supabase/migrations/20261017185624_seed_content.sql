insert into public.site_settings (
  id, company_name, logo_text, hero_eyebrow, hero_title, hero_highlight, hero_image_url,
  about_eyebrow, about_title, about_intro, about_body, about_image_url, stats,
  products_eyebrow, team_eyebrow, contact_eyebrow, contact_title, contact_image_url,
  phone, whatsapp, email, address, founded_year, staff_count, seo_title, seo_description
) values (
  1, 'M/S Sagor Traders', 'Sagor Traders', 'M/S Sagor Traders', 'Trusted FMCG Brands Near You', 'Near You', '/media/site/hero.webp',
  'About Us', 'M/S Sagor Traders',
  'A dynamic FMCG distribution company serving Ullapara, Sirajganj since 2019.',
  $about$M/S Sagor Traders is a growing and dedicated distribution company that has been serving the fast-moving consumer goods (FMCG) sector in Ullapara, Sirajganj since 2019. Established with a clear vision to bridge manufacturers and end consumers efficiently, the company specializes in the distribution of everyday essential products, including food items, personal care goods, household necessities, and other high-turnover consumer products that form the backbone of daily life in urban and semi-urban areas.

## Team and logistics strength
The company operates with a compact yet highly effective team of 22 members. This dedicated workforce includes sales representatives, delivery personnel, drivers, warehouse staff, accounts and administrative professionals, and management. The company operates with a compact yet effective fleet of pickup and delivery vans, used to deliver orders to retail points across assigned territories, enabling quick turnaround times and frequent replenishment.

## Key strengths
- **Efficient supply chain:** prompt delivery and stock availability help retailers minimize out-of-stock situations.
- **Wide coverage:** serving general trade outlets (small shops), convenience stores and emerging modern retail channels.
- **Relationship-driven:** long-term ties with retailers through consistent service, competitive pricing and trade promotions.
- **Adaptability:** navigating transportation logistics, seasonal demand and market competition in a dynamic industry.

In a market where FMCG distribution is highly fragmented and competitive, M/S Sagor Traders stands out through its commitment to service quality and operational discipline.$about$,
  '/media/site/about.webp',
  '[{"icon":"truck","value":"","label":"Trusted Distribution"},{"icon":"users","value":"22+","label":"Team Members"},{"icon":"map-pin","value":"","label":"Urban & Semi-Urban"}]'::jsonb,
  'Our Products', 'Our Team', 'Contact Us', 'Get in Touch', '/media/site/contact.webp',
  '01710454519', '8801710454519', 'info@omar-faruqe.com', 'Ullapara, Sirajganj, Bangladesh', 2019, 22,
  'M/S Sagor Traders | Marico distributor in Ullapara, Sirajganj',
  'M/S Sagor Traders distributes Marico brands including Parachute, Saffola, Nihar and Livon to retailers across Ullapara, Sirajganj.'
);

insert into public.brands (name, slug, logo_url, is_parent, show_in_hero, sort_order) values
  ('Marico', 'marico', '/media/brands/marico.png', true, true, 0),
  ('Set Wet', 'set-wet', '/media/brands/set-wet.png', false, true, 1),
  ('Saffola Active', 'saffola-active', '/media/brands/saffola-active.png', false, true, 2),
  ('Livon', 'livon', '/media/brands/livon.png', false, true, 3),
  ('Parachute Advansed', 'parachute-advansed', '/media/brands/parachute-advansed.png', false, true, 4),
  ('Parachute Gold', 'parachute-gold', '/media/brands/parachute-gold.png', false, true, 5),
  ('Hair & Care', 'hair-and-care', '/media/brands/hair-and-care.png', false, true, 6),
  ('Parachute', 'parachute', '/media/brands/parachute.png', false, true, 7),
  ('Nihar Naturals', 'nihar-naturals', '/media/brands/nihar-naturals.png', false, true, 8),
  ('Fiancée', 'fiancee', '/media/brands/fiancee.png', false, true, 9),
  ('Caivil', 'caivil', '/media/brands/caivil.png', false, true, 10),
  ('Hair Code', 'hair-code', '/media/brands/hair-code.png', false, true, 11),
  ('Black Chic', 'black-chic', '/media/brands/black-chic.png', false, true, 12),
  ('X-Men', 'x-men', '/media/brands/x-men.png', false, true, 13);

insert into public.categories (name, slug, sort_order) values
  ('Hair Oil', 'hair-oil', 1),
  ('Skin Care', 'skin-care', 2),
  ('Hair Colour', 'hair-colour', 3),
  ('Edible Oil', 'edible-oil', 4),
  ('Styling & Grooming', 'styling-grooming', 5);

insert into public.products (brand_id, category_id, name, slug, summary, image_url, sort_order)
select b.id, c.id, v.name, v.slug, v.summary, v.image_url, v.sort_order
from (values
  ('parachute', 'skin-care', 'Aloe Vera Gel', 'aloe-vera-gel', 'Parachute SkinPure aloe vera gel for everyday skin care.', '/media/products/aloe-vera-gel.webp', 1),
  ('parachute-advansed', 'hair-oil', 'Aloe Vera Hair Oil', 'aloe-vera-hair-oil', 'Parachute Advansed light hair oil enriched with aloe vera.', '/media/products/aloe-vera-hair-oil.webp', 2),
  ('parachute', 'hair-oil', 'Parachute Extra Care', 'parachute-extra-care', 'Anti-hairfall hair oil with a comb applicator.', '/media/products/parachute-extra-care.webp', 3),
  ('hair-code', 'hair-colour', 'Hair Color Shampoo', 'hair-color-shampoo', 'Hair Code shampoo hair colour that works in five minutes.', '/media/products/hair-color-shampoo.webp', 4),
  ('parachute', 'skin-care', 'Olive Oil', 'olive-oil', 'Parachute SkinPure beauty olive oil for skin and hair.', '/media/products/olive-oil.webp', 5)
) as v(brand_slug, category_slug, name, slug, summary, image_url, sort_order)
join public.brands b on b.slug = v.brand_slug
join public.categories c on c.slug = v.category_slug;

insert into public.team_members (name, role, phone, photo_url, sort_order) values
  ('Md. Omar Faruqe (Sagor)', 'Managing Director', '01710-454519', '/media/team/omar-faruqe.webp', 1),
  ('Md. Musa Karim', 'Territory Manager, Marico Bangladesh Ltd', '01313-796454', '/media/team/musa-karim.webp', 2),
  ('Md. Atik Hasan', 'Operation Manager', '01764-239259', '/media/team/atik-hasan.webp', 3),
  ('Md. Nasir Uddin', 'Distributor Sales Representative', '01409-997694', '/media/team/nasir-uddin.webp', 4),
  ('Md. Shihab Ali', 'Distributor Sales Representative', '01611-911534', '/media/team/shihab-ali.webp', 5),
  ('Md. Korban Ali', 'Distributor Sales Representative', '01746-210215', '/media/team/korban-ali.webp', 6),
  ('Md. Rezaul Karim', 'Distributor Sales Representative', '01736-147812', '/media/team/rezaul-karim.webp', 7),
  ('Md. Mamun Islam', 'Distributor Sales Representative', '01972-996065', '/media/team/mamun-islam.webp', 8),
  ('Md. Tarikul Islam', 'Distributor Sales Representative', '01734-207579', '/media/team/tarikul-islam.webp', 9),
  ('Md. AL Mobarok', 'Distributor Sales Representative', '01600-060709', '/media/team/al-mobarok.webp', 10),
  ('Md. Rokon Ali', 'Computer Operator', '01750-401511', '/media/team/rokon-ali.webp', 11);
