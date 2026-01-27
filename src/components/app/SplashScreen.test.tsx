import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { SplashScreen } from "./SplashScreen";

describe("SplashScreen", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the logo", () => {
    const onFinish = vi.fn();
    const { container } = render(<SplashScreen onFinish={onFinish} />);
    
    // Check that the logo video element exists
    const video = container.querySelector("video");
    expect(video).toBeInTheDocument();
  });

  it("calls onFinish after default duration (2500ms)", () => {
    const onFinish = vi.fn();
    render(<SplashScreen onFinish={onFinish} />);

    expect(onFinish).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("calls onFinish after custom duration", () => {
    const onFinish = vi.fn();
    render(<SplashScreen durationMs={1000} onFinish={onFinish} />);

    expect(onFinish).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(onFinish).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("clears timeout on unmount", () => {
    const onFinish = vi.fn();
    const { unmount } = render(<SplashScreen onFinish={onFinish} />);

    unmount();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onFinish).not.toHaveBeenCalled();
  });

  it("has proper accessibility attributes", () => {
    const onFinish = vi.fn();
    const { container } = render(<SplashScreen onFinish={onFinish} />);

    const region = container.querySelector('[role="region"]');
    expect(region).toHaveAttribute("aria-label", "Loading ExpenX");
  });

  it("applies the gradient background", () => {
    const onFinish = vi.fn();
    const { container } = render(<SplashScreen onFinish={onFinish} />);

    const region = container.querySelector('[role="region"]');
    expect(region).toHaveClass("bg-gradient-to-br");
  });
});
