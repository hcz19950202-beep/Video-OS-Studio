import { describe, it } from "vitest";
import { runB7WindowsCampaignAcceptance } from "../support/b7-windows-campaign-acceptance";

const windowsB7It = process.env.B7_WINDOWS_CAMPAIGN_ACCEPTANCE === "1" ? it : it.skip;

describe("V2.4 B7 Windows real batch acceptance", () => {
  windowsB7It(
    "renders two isolated real videos through bounded Campaign resources",
    async () => {
      await runB7WindowsCampaignAcceptance();
    },
    20 * 60 * 1000,
  );
});
