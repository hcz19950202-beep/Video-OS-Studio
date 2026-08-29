import { expect, test, type APIRequestContext } from "@playwright/test";

const createProject = async (request: APIRequestContext, name: string) => {
  const response = await request.post("/api/projects", { data: { name } });
  expect(response.status()).toBe(201);
  const body = (await response.json()) as { project: { project: { id: string } } };
  return body.project.project.id;
};

const createMission = async (request: APIRequestContext, projectId: string, title: string) => {
  const response = await request.post(
    `/api/projects/${encodeURIComponent(projectId)}/missions`,
    {
      data: {
        title,
        brief: "B7 browser durable dashboard fixture.",
        autonomyPolicy: { mode: "full-production", finalReviewRequired: false },
      },
    },
  );
  expect(response.status()).toBe(201);
  const body = (await response.json()) as { mission: { id: string } };
  return body.mission.id;
};

test(
  "B7 Campaign dashboard reloads durable truth and isolates pending Mission cancellation",
  async ({ page, request }) => {
    const suffix = Date.now().toString(36);
    const projectA = await createProject(request, `B7 Campaign A ${suffix}`);
    const projectB = await createProject(request, `B7 Campaign B ${suffix}`);
    const missionA = await createMission(request, projectA, "B7 Mission A");
    const missionB = await createMission(request, projectB, "B7 Mission B");

    const create = await request.post("/api/campaigns", {
      data: {
        title: `B7 Browser Campaign ${suffix}`,
        maxConcurrency: 2,
        sharedReferences: {
          assetIds: ["asset.browser-proof"],
          policyIds: [],
          skillIds: [],
          exportTemplateIds: [],
        },
        missions: [
          { projectId: projectA, missionId: missionA },
          { projectId: projectB, missionId: missionB },
        ],
      },
    });
    expect(create.status()).toBe(201);
    const campaignId = ((await create.json()) as { campaign: { id: string } }).campaign.id;

    await page.goto(`/campaigns/${campaignId}`);
    await expect(
      page.getByRole("heading", { name: `B7 Browser Campaign ${suffix}` }),
    ).toBeVisible();
    await expect(page.getByText(projectA, { exact: true })).toBeVisible();
    await expect(page.getByText(projectB, { exact: true })).toBeVisible();
    await expect(page.getByText("draft", { exact: true }).first()).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole("heading", { name: `B7 Browser Campaign ${suffix}` }),
    ).toBeVisible();
    await expect(page.getByText("asset:asset.browser-proof", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Enqueue" }).click();
    await expect(page.getByText("queued", { exact: true }).first()).toBeVisible();

    const missionACard = page.locator("article").filter({ hasText: projectA });
    const missionBCard = page.locator("article").filter({ hasText: projectB });
    await missionACard.getByRole("button", { name: "Cancel Mission" }).click();
    await expect(missionACard.getByText("cancelled", { exact: true })).toBeVisible();
    await expect(missionBCard.getByText("pending", { exact: true })).toBeVisible();

    await page.reload();
    const reloadedA = page.locator("article").filter({ hasText: projectA });
    const reloadedB = page.locator("article").filter({ hasText: projectB });
    await expect(reloadedA.getByText("cancelled", { exact: true })).toBeVisible();
    await expect(reloadedB.getByText("pending", { exact: true })).toBeVisible();
  },
);
