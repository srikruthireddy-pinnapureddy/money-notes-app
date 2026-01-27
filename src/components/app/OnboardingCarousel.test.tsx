import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { fireEvent, waitFor } from "@testing-library/dom";
import { OnboardingCarousel } from "./OnboardingCarousel";

// Mock the toast hook
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock the demo data creation
vi.mock("@/utils/demoData", () => ({
  createDemoTransactions: vi.fn().mockResolvedValue(true),
}));

describe("OnboardingCarousel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window.localStorage.setItem as ReturnType<typeof vi.fn>).mockClear();
  });

  it("renders the first slide by default", () => {
    const onComplete = vi.fn();
    const { getByText } = render(<OnboardingCarousel onComplete={onComplete} />);

    expect(getByText("Track Expenses Easily")).toBeInTheDocument();
    expect(getByText(/Add expenses on the go/)).toBeInTheDocument();
  });

  it("renders all slide indicators", () => {
    const onComplete = vi.fn();
    const { getAllByRole } = render(<OnboardingCarousel onComplete={onComplete} />);

    const indicators = getAllByRole("button", { name: /Go to slide/i });
    expect(indicators).toHaveLength(3);
  });

  it("navigates to next slide when Next button is clicked", async () => {
    const onComplete = vi.fn();
    const { getByRole, findByText } = render(<OnboardingCarousel onComplete={onComplete} />);

    const nextButton = getByRole("button", { name: /next/i });
    fireEvent.click(nextButton);

    expect(await findByText("Split Bills with Friends")).toBeInTheDocument();
  });

  it("navigates to specific slide when indicator is clicked", async () => {
    const onComplete = vi.fn();
    const { getAllByRole, findByText } = render(<OnboardingCarousel onComplete={onComplete} />);

    const indicators = getAllByRole("button", { name: /Go to slide/i });
    fireEvent.click(indicators[2]); // Click third indicator

    expect(await findByText("Smart Settlements & Insights")).toBeInTheDocument();
  });

  it("shows Skip button on non-last slides", () => {
    const onComplete = vi.fn();
    const { getByRole } = render(<OnboardingCarousel onComplete={onComplete} />);

    expect(getByRole("button", { name: /skip/i })).toBeInTheDocument();
  });

  it("shows Get Started button on last slide", async () => {
    const onComplete = vi.fn();
    const { getAllByRole, getByRole, queryByRole, findByRole } = render(
      <OnboardingCarousel onComplete={onComplete} />
    );

    // Navigate to last slide
    const indicators = getAllByRole("button", { name: /Go to slide/i });
    fireEvent.click(indicators[2]);

    expect(await findByRole("button", { name: /get started/i })).toBeInTheDocument();
    expect(queryByRole("button", { name: /skip/i })).not.toBeInTheDocument();
    expect(queryByRole("button", { name: /next/i })).not.toBeInTheDocument();
  });

  it("sets localStorage and calls onComplete when finishing", async () => {
    const onComplete = vi.fn();
    const { getAllByRole, findByRole } = render(<OnboardingCarousel onComplete={onComplete} />);

    // Navigate to last slide and click Get Started
    const indicators = getAllByRole("button", { name: /Go to slide/i });
    fireEvent.click(indicators[2]);

    const getStartedButton = await findByRole("button", { name: /get started/i });
    fireEvent.click(getStartedButton);

    await waitFor(() => {
      expect(window.localStorage.setItem).toHaveBeenCalledWith("hasOnboarded", "true");
      expect(onComplete).toHaveBeenCalled();
    });
  });

  it("skips onboarding when Skip is clicked", async () => {
    const onComplete = vi.fn();
    const { getByRole } = render(<OnboardingCarousel onComplete={onComplete} />);

    const skipButton = getByRole("button", { name: /skip/i });
    fireEvent.click(skipButton);

    await waitFor(() => {
      expect(window.localStorage.setItem).toHaveBeenCalledWith("hasOnboarded", "true");
      expect(onComplete).toHaveBeenCalled();
    });
  });

  it("supports keyboard navigation with arrow keys", async () => {
    const onComplete = vi.fn();
    const { getByRole, findByText } = render(<OnboardingCarousel onComplete={onComplete} />);

    const container = getByRole("region", { name: /onboarding carousel/i });
    container.focus();

    fireEvent.keyDown(container, { key: "ArrowRight" });

    expect(await findByText("Split Bills with Friends")).toBeInTheDocument();
  });

  it("does not go before first slide with left arrow", () => {
    const onComplete = vi.fn();
    const { getByRole, getByText } = render(<OnboardingCarousel onComplete={onComplete} />);

    const container = getByRole("region", { name: /onboarding carousel/i });
    fireEvent.keyDown(container, { key: "ArrowLeft" });

    // Should still be on first slide
    expect(getByText("Track Expenses Easily")).toBeInTheDocument();
  });

  it("has proper accessibility attributes", () => {
    const onComplete = vi.fn();
    const { getByRole, container } = render(<OnboardingCarousel onComplete={onComplete} />);

    const region = getByRole("region", { name: /onboarding carousel/i });
    expect(region).toBeInTheDocument();

    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });

  it("renders micro-animation illustrations for each slide", async () => {
    const onComplete = vi.fn();
    const { getByText, getByRole, findByText } = render(
      <OnboardingCarousel onComplete={onComplete} />
    );

    // First slide should have card illustration
    expect(getByText("₹1,250")).toBeInTheDocument();

    // Navigate to second slide
    fireEvent.click(getByRole("button", { name: /next/i }));

    // Should show group avatars
    expect(await findByText("JD")).toBeInTheDocument();
    expect(getByText("AR")).toBeInTheDocument();
    expect(getByText("SK")).toBeInTheDocument();
  });
});
