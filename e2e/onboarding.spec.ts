import { test, expect } from "@playwright/test";

test.describe("Onboarding Flow", () => {
  test.beforeEach(async ({ context }) => {
    // Clear localStorage before each test to ensure fresh state
    await context.addInitScript(() => {
      localStorage.clear();
    });
  });

  test("shows splash screen on app load", async ({ page }) => {
    await page.goto("/");

    // Splash screen should be visible with the logo
    const splashRegion = page.locator('[role="region"][aria-label="Loading ExpenX"]');
    await expect(splashRegion).toBeVisible();

    // Should show the ExpenX text
    await expect(page.getByRole("heading", { name: "ExpenX" })).toBeVisible();
  });

  test("transitions from splash to onboarding for first-time users", async ({ page }) => {
    await page.goto("/");

    // Wait for splash to finish (2.5s + buffer)
    await page.waitForTimeout(3000);

    // Should now be on onboarding
    const onboardingRegion = page.locator('[role="region"][aria-label="Onboarding carousel"]');
    await expect(onboardingRegion).toBeVisible({ timeout: 5000 });

    // First slide should be visible
    await expect(page.getByRole("heading", { name: "Track Expenses Easily" })).toBeVisible();
  });

  test("completes full onboarding flow with Next buttons", async ({ page }) => {
    await page.goto("/");

    // Wait for splash to complete
    await page.waitForTimeout(3000);

    // Slide 1: Track Expenses Easily
    await expect(page.getByRole("heading", { name: "Track Expenses Easily" })).toBeVisible();
    await page.getByRole("button", { name: /next/i }).click();

    // Slide 2: Split Bills with Friends
    await expect(page.getByRole("heading", { name: "Split Bills with Friends" })).toBeVisible({ timeout: 2000 });
    await page.getByRole("button", { name: /next/i }).click();

    // Slide 3: Smart Settlements & Insights (last slide)
    await expect(page.getByRole("heading", { name: "Smart Settlements & Insights" })).toBeVisible({ timeout: 2000 });

    // Should show Get Started button instead of Next
    await expect(page.getByRole("button", { name: /get started/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /next/i })).not.toBeVisible();

    // Click Get Started to complete onboarding
    await page.getByRole("button", { name: /get started/i }).click();

    // Should navigate to dashboard or auth
    await expect(page).toHaveURL(/\/(dashboard|auth)/, { timeout: 10000 });
  });

  test("can skip onboarding", async ({ page }) => {
    await page.goto("/");

    // Wait for splash to complete
    await page.waitForTimeout(3000);

    // Click Skip button
    await page.getByRole("button", { name: /skip/i }).click();

    // Should navigate away from onboarding
    await expect(page).toHaveURL(/\/(dashboard|auth)/, { timeout: 10000 });
  });

  test("navigates slides using keyboard arrows", async ({ page }) => {
    await page.goto("/");

    // Wait for splash to complete
    await page.waitForTimeout(3000);

    // Focus the onboarding region
    const onboardingRegion = page.locator('[role="region"][aria-label="Onboarding carousel"]');
    await onboardingRegion.focus();

    // Press right arrow to go to next slide
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("heading", { name: "Split Bills with Friends" })).toBeVisible({ timeout: 2000 });

    // Press right arrow again
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("heading", { name: "Smart Settlements & Insights" })).toBeVisible({ timeout: 2000 });

    // Press left arrow to go back
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByRole("heading", { name: "Split Bills with Friends" })).toBeVisible({ timeout: 2000 });
  });

  test("can navigate using slide indicators", async ({ page }) => {
    await page.goto("/");

    // Wait for splash to complete
    await page.waitForTimeout(3000);

    // Click on the third indicator
    const indicators = page.getByRole("button", { name: /go to slide/i });
    await indicators.nth(2).click();

    // Should be on the last slide
    await expect(page.getByRole("heading", { name: "Smart Settlements & Insights" })).toBeVisible({ timeout: 2000 });

    // Click on the first indicator
    await indicators.nth(0).click();

    // Should be back on the first slide
    await expect(page.getByRole("heading", { name: "Track Expenses Easily" })).toBeVisible({ timeout: 2000 });
  });

  test("skips onboarding on subsequent visits", async ({ page, context }) => {
    // Set hasOnboarded flag before visiting
    await context.addInitScript(() => {
      localStorage.setItem("hasOnboarded", "true");
    });

    await page.goto("/");

    // Wait for splash to complete
    await page.waitForTimeout(3000);

    // Should go directly to dashboard or auth, not onboarding
    await expect(page).toHaveURL(/\/(dashboard|auth)/, { timeout: 10000 });

    // Onboarding should NOT be visible
    const onboardingRegion = page.locator('[role="region"][aria-label="Onboarding carousel"]');
    await expect(onboardingRegion).not.toBeVisible();
  });

  test("persists onboarding completion across page reload", async ({ page }) => {
    await page.goto("/");

    // Wait for splash to complete
    await page.waitForTimeout(3000);

    // Complete onboarding by skipping
    await page.getByRole("button", { name: /skip/i }).click();

    // Wait for navigation
    await expect(page).toHaveURL(/\/(dashboard|auth)/, { timeout: 10000 });

    // Reload the page
    await page.reload();

    // Wait for splash again
    await page.waitForTimeout(3000);

    // Should skip onboarding and go directly to dashboard/auth
    await expect(page).toHaveURL(/\/(dashboard|auth)/, { timeout: 10000 });

    // Onboarding should NOT appear
    const onboardingRegion = page.locator('[role="region"][aria-label="Onboarding carousel"]');
    await expect(onboardingRegion).not.toBeVisible();
  });
});

test.describe("Onboarding Flow - Mobile", () => {
  test.use({ ...test.info().project.use, viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      localStorage.clear();
    });
  });

  test("onboarding is responsive on mobile viewport", async ({ page }) => {
    await page.goto("/");

    // Wait for splash to complete
    await page.waitForTimeout(3000);

    // Onboarding should be visible
    const onboardingRegion = page.locator('[role="region"][aria-label="Onboarding carousel"]');
    await expect(onboardingRegion).toBeVisible({ timeout: 5000 });

    // Content should be properly displayed
    await expect(page.getByRole("heading", { name: "Track Expenses Easily" })).toBeVisible();

    // Buttons should be visible and clickable
    await expect(page.getByRole("button", { name: /next/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /skip/i })).toBeVisible();
  });
});
