/** Curated catering visuals — paths under /public/images */

export const SITE_IMAGES = {
  hero: "/images/hero-feast.jpg",
  storyKitchen: "/images/rasa-kitchen.jpg",
  royalKitchen: "/images/rasa-kitchen.jpg",
  promiseChef: "/images/promise-chef.jpg",
  whyKitchen: "/images/why-kitchen.jpg",
  howService: "/images/how-service.jpg",
  contactSetup: "/images/contact-setup.jpg",
  chaat: "/images/addon-chaat.jpg",
  mithai: "/images/addon-mithai.jpg",
  live: "/images/addon-live.jpg",
  packages: {
    "rasa-arambh-699": "/images/pkg-aarambh.jpg",
    "rasa-utsav-799": "/images/pkg-utsav.jpg",
    "rasa-vaibhav-949": "/images/pkg-vaibhav.jpg",
    "rasa-mahotsav-1199": "/images/pkg-mahotsav.jpg",
    "rasa-rajasi-1499": "/images/pkg-rajsi.jpg",
  } as Record<string, string>,
  gallery: [
    { src: "/images/addon-chaat.jpg", alt: "Live Chaat Counter — Rasa by Narayanam", label: "Live Chaat Counter" },
    { src: "/images/pkg-rajsi.jpg", alt: "The Royal Thali — Rasa by Narayanam", label: "The Royal Thali" },
    { src: "/images/addon-mithai.jpg", alt: "Mithai Studio — Rasa by Narayanam", label: "Mithai Studio" },
    { src: "/images/addon-live.jpg", alt: "Global Live Stations — Rasa by Narayanam", label: "Global Live Stations" },
  ],
} as const;

export function packageImage(id: string, index = 0): string {
  return (
    SITE_IMAGES.packages[id] ||
    [
      SITE_IMAGES.packages["rasa-arambh-699"],
      SITE_IMAGES.packages["rasa-utsav-799"],
      SITE_IMAGES.packages["rasa-vaibhav-949"],
      SITE_IMAGES.packages["rasa-mahotsav-1199"],
      SITE_IMAGES.packages["rasa-rajasi-1499"],
    ][index % 5]
  );
}

/** Pick a mood image for an add-on category label */
export function addonCategoryImage(category: string): string {
  const c = category.toLowerCase();
  if (c.includes("chaat") || c.includes("snack")) return SITE_IMAGES.chaat;
  if (c.includes("mithai") || c.includes("sweet") || c.includes("dessert") || c.includes("frozen")) return SITE_IMAGES.mithai;
  if (c.includes("live") || c.includes("global") || c.includes("station") || c.includes("continental") || c.includes("asian"))
    return SITE_IMAGES.live;
  if (c.includes("thali") || c.includes("regional")) return SITE_IMAGES.packages["rasa-rajasi-1499"];
  if (c.includes("mansahari") || c.includes("non")) return SITE_IMAGES.packages["rasa-mahotsav-1199"];
  return SITE_IMAGES.hero;
}
