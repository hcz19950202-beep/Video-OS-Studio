import { expect, test } from "@playwright/test";

const PROJECT_NAME = "V2.5 C3 Selection Context";

test("C3 attaches precise context and shows stale references", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem("video-os-studio-locale", "en-US");
    localStorage.setItem("video-os-studio-theme", "dark");
    localStorage.removeItem("video-os-v2.1-workspace-layout");
  });

  const createResponse = await page.request.post("/api/projects", {
    data: { name: PROJECT_NAME, width: 1080, height: 1920, fps: 30 },
  });
  expect(createResponse.status()).toBe(201);
  const created = (await createResponse.json()) as {
    project: { project: { id: string; revision: number } };
  };
  const projectId = created.project.project.id;

  const addCaption = await page.request.post(
    `/api/projects/${encodeURIComponent(projectId)}/commands`,
    {
      data: {
        expectedRevision: 0,
        commandId: "c3-add-caption",
        command: {
          type: "add-clip",
          trackId: "captions-main",
          clip: {
            id: "c3-caption",
            type: "caption",
            text: "Alpha proof",
            enabled: true,
            layer: 4,
            startFrame: 10,
            durationInFrames: 40,
          },
        },
      },
    },
  );
  expect(addCaption.ok()).toBeTruthy();

  const setScript = await page.request.post(
    `/api/projects/${encodeURIComponent(projectId)}/commands`,
    {
      data: {
        expectedRevision: 1,
        commandId: "c3-set-script",
        command: {
          type: "set-script-document",
          script: {
            baseSourceRanges: [{ startFrame: 0, endFrame: 60 }],
            segments: [
              {
                id: "c3-segment",
                status: "active",
                semanticTags: [],
                words: [
                  { id: "word-alpha", text: "Alpha", startFrame: 0, endFrame: 10 },
                  { id: "word-proof", text: "proof", startFrame: 10, endFrame: 20 },
                ],
              },
            ],
          },
        },
      },
    },
  );
  expect(setScript.ok()).toBeTruthy();

  await page.goto("/");
  await page.getByTestId("open-projects").click();
  await page.locator(".os-recent-list button").filter({ hasText: PROJECT_NAME }).first().click();
  await expect(page.locator(".v21-project-title")).toContainText(PROJECT_NAME);

  await page.getByTestId("agent-surface-toggle").click();
  await expect(page.getByTestId("unified-agent-conversation")).toBeVisible();
  await page.getByTestId("context-selection-mode").click();
  await expect(page.getByTestId("context-selection-controller")).toBeVisible();

  await page.locator('[data-clip-id="c3-caption"]').click();
  await expect(page.getByTestId("agent-context-chips")).toContainText("@clip");
  await expect(page.getByTestId("agent-context-chips")).toContainText("Clip c3-caption");

  await page.getByRole("tab", { name: "Transcript", exact: true }).click();
  await page.getByTestId("select-transcript-context-word-alpha").click();
  await expect(page.getByTestId("agent-context-chips")).toContainText("@transcript-range");
  await expect(page.getByTestId("agent-context-chips")).toContainText("Transcript selection");

  const ruler = page.locator(".timeline-ruler");
  const rulerBox = await ruler.boundingBox();
  expect(rulerBox).not.toBeNull();
  await page.mouse.click(rulerBox!.x + rulerBox!.width * 0.4, rulerBox!.y + 8);
  await expect(page.getByTestId("agent-context-chips")).toContainText("@timeline-point");

  const viewer = page.locator(".player-shell");
  const viewerBox = await viewer.boundingBox();
  expect(viewerBox).not.toBeNull();
  await page.mouse.move(
    viewerBox!.x + viewerBox!.width * 0.2,
    viewerBox!.y + viewerBox!.height * 0.2,
  );
  await page.mouse.down();
  await page.mouse.move(
    viewerBox!.x + viewerBox!.width * 0.55,
    viewerBox!.y + viewerBox!.height * 0.55,
  );
  await page.mouse.up();
  await expect(page.getByTestId("agent-context-chips")).toContainText("@viewer-region");
  await expect(
    page.locator('[data-testid="agent-context-chips"] .a5-agent-context-chip'),
  ).toHaveCount(4);

  const composer = page.locator(".a4-agent-composer textarea");
  await composer.fill("Use the attached C3 context and only plan.");
  await composer.press("Enter");
  const messageContext = page.getByTestId("agent-message-context").last();
  await expect(messageContext).toBeVisible();
  await expect(messageContext).toContainText("@clip");
  await expect(messageContext).toContainText("@transcript-range");
  await expect(messageContext).toContainText("@timeline-point");
  await expect(messageContext).toContainText("@viewer-region");
  await expect(page.getByTestId("agent-context-chips")).toHaveCount(0);

  const addMarker = page.locator(".timeline-actions button").filter({ hasText: "◆ M" }).first();
  await addMarker.click();
  await expect(
    page.locator(
      '[data-testid="agent-message-context"] .a5-agent-context-chip[data-status="stale"]',
    ),
  ).toHaveCount(4);
  await expect(messageContext).toContainText("stale");
});
