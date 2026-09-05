import { expect, type Page } from "@playwright/test";
import type { CreativeAssetLibraryItem } from "@/lib/creative-assets/library-view";

const createdAt = "2026-09-05T00:00:00.000Z";

type FixtureInput = {
  name: string;
  kind: "motion_graphic" | "brand_element";
  tags: string[];
  searchText: string;
  text: string;
};

const itemFixture = (id: string, input: FixtureInput): CreativeAssetLibraryItem => ({
  id,
  name: input.name,
  kind: input.kind,
  engine: "hyperframes",
  editable: true,
  tags: input.tags,
  lifecycle: "active",
  latestVersionId: "version-1",
  recommendedVersionId: "version-1",
  createdAt,
  updatedAt: createdAt,
  versions: [
    {
      id: "version-1",
      state: "READY",
      engine: "hyperframes",
      engineVersion: "0.8.10",
      origin: "created",
      parameterValues: { text: input.text },
      artifacts: [
        {
          id: `${id}-final`,
          role: "final",
          state: "ready",
          profile: {
            id: "final-1080p",
            width: 1920,
            height: 1080,
            fps: 30,
            durationInFrames: 90,
            codec: "vp9",
            container: "webm",
          },
          readyAt: createdAt,
        },
      ],
      createdAt,
      acceptedAt: createdAt,
    },
  ],
  actions: {
    addToTimeline: {
      enabled: false,
      availableIn: "C5",
      reason: "Project materialization and timeline placement arrive in V2.6 C5.",
    },
    duplicateAndEdit: {
      enabled: false,
      availableIn: "C7",
      reason: "Immutable clone and variant editing arrive in V2.6 C7.",
    },
  },
});

const fixtures = [
  itemFixture("c2-price-highlight", {
    name: "C2 Price Highlight",
    kind: "motion_graphic",
    tags: ["price", "cta"],
    searchText: "price offer conversion",
    text: "$49,900",
  }),
  itemFixture("c2-brand-mark", {
    name: "C2 Brand Mark",
    kind: "brand_element",
    tags: ["brand"],
    searchText: "identity logo brand",
    text: "VIDEO OS",
  }),
];

const searchTextById = new Map([
  ["c2-price-highlight", "price offer conversion"],
  ["c2-brand-mark", "identity logo brand"],
]);

export const runV26C2CreativeAssetLibraryBrowserAcceptance = async (page: Page) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.addInitScript(() => {
    localStorage.setItem("video-os-studio-locale", "en-US");
    localStorage.setItem("video-os-studio-theme", "dark");
  });
  await page.route("**/api/creative-assets**", async (route) => {
    const url = new URL(route.request().url());
    const query = (url.searchParams.get("q") ?? "").trim().toLocaleLowerCase();
    const kind = (url.searchParams.get("kind") ?? "").trim().toLocaleLowerCase();
    const tag = (url.searchParams.get("tag") ?? "").trim().toLocaleLowerCase();
    const items = fixtures.filter((item) => {
      const searchable =
        `${item.name} ${item.tags.join(" ")} ${searchTextById.get(item.id) ?? ""}`.toLocaleLowerCase();
      if (query && !searchable.includes(query)) return false;
      if (kind && item.kind.toLocaleLowerCase() !== kind) return false;
      if (tag && !item.tags.some((value) => value.toLocaleLowerCase() === tag)) return false;
      return true;
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "Cache-Control": "no-store" },
      body: JSON.stringify({
        items,
        filters: {
          kinds: [...new Set(items.map((item) => item.kind))].sort(),
          tags: [...new Set(items.flatMap((item) => item.tags))].sort(),
        },
      }),
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Library", exact: true }).click();
  const library = page.getByTestId("creative-asset-library");
  await expect(library).toBeVisible();
  await expect(page.getByTestId("creative-asset-card-c2-price-highlight")).toBeVisible();
  await expect(page.getByTestId("creative-asset-card-c2-brand-mark")).toBeVisible();

  const search = page.getByLabel("Search creative assets");
  await search.fill("conversion");
  await expect(page.getByTestId("creative-asset-card-c2-price-highlight")).toBeVisible();
  await expect(page.getByTestId("creative-asset-card-c2-brand-mark")).toHaveCount(0);
  await search.fill("");
  await expect(page.getByTestId("creative-asset-card-c2-brand-mark")).toBeVisible();

  await page.getByLabel("Asset kind").selectOption("brand_element");
  await expect(page.getByTestId("creative-asset-card-c2-brand-mark")).toBeVisible();
  await expect(page.getByTestId("creative-asset-card-c2-price-highlight")).toHaveCount(0);
  await page.getByLabel("Asset kind").selectOption("");
  await expect(page.getByTestId("creative-asset-card-c2-price-highlight")).toBeVisible();

  await page.getByTestId("creative-asset-card-c2-price-highlight").click();
  const detail = page.getByTestId("creative-asset-detail");
  await expect(detail).toContainText("C2 Price Highlight");
  await expect(detail).toContainText("1920×1080");
  await expect(detail).toContainText("30 fps");
  await expect(detail).toContainText("90f");
  await expect(page.getByTestId("creative-asset-parameters")).toContainText("$49,900");
  await expect(page.getByRole("button", { name: /Add to Timeline/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: /Duplicate & Edit/ })).toBeDisabled();
};
