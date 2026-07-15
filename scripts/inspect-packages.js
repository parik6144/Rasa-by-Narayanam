const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  const pkgs = await p.package.findMany({
    orderBy: { displayOrder: "asc" },
    include: {
      menuSections: {
        orderBy: { displayOrder: "asc" },
        include: { dishes: true },
      },
    },
  });
  for (const pkg of pkgs) {
    console.log(
      "\n===",
      pkg.slug,
      "|",
      pkg.name,
      "| menuSections=",
      pkg.menuSections.length,
      "| sectionsJSON=",
      (pkg.sections || "").length
    );
    for (const s of pkg.menuSections) {
      console.log(" -", s.name, "|", s.selectionRule, "| dishes=", s.dishes.length);
    }
    if (pkg.menuSections.length <= 1) {
      try {
        const legacy = JSON.parse(pkg.sections || "[]");
        console.log("LEGACY section count:", legacy.length);
        legacy.slice(0, 15).forEach((s) =>
          console.log("   L:", s.selection, s.section, "dishes=", (s.dishes || []).length)
        );
      } catch (e) {
        console.log("LEGACY parse fail", e.message);
      }
    }
  }
  await p.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
  process.exit(1);
});
