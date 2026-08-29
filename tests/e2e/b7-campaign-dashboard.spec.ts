import { test } from "@playwright/test";
import { runB7CampaignDashboardBrowserAcceptance } from "../support/b7-campaign-dashboard-browser";

test(
  "B7 Campaign dashboard reloads durable truth and isolates pending Mission cancellation",
  async ({ page, request }) => {
    await runB7CampaignDashboardBrowserAcceptance(page, request);
  },
);
