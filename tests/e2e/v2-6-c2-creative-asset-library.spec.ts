import { test } from "@playwright/test";
import { runV26C2CreativeAssetLibraryBrowserAcceptance } from "../support/v2-6-c2-creative-asset-library-browser";

test("V2.6 C2 browses, searches and inspects Creative Assets", async ({ page }) => {
  await runV26C2CreativeAssetLibraryBrowserAcceptance(page);
});
