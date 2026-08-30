import { test } from "@playwright/test";
import { runB7CampaignDashboardBrowserAcceptance } from "../support/b7-campaign-dashboard-browser";

test("B7 Campaign dashboard durability and cancellation isolation", async ({ page, request }) => {
  await runB7CampaignDashboardBrowserAcceptance(page, request);
});
