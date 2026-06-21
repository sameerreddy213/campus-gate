import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders the title and description", () => {
    render(<EmptyState title="No data yet" description="Nothing to show here." />);
    expect(screen.getByText("No data yet")).toBeInTheDocument();
    expect(screen.getByText("Nothing to show here.")).toBeInTheDocument();
  });

  it("renders an action when provided", () => {
    render(
      <EmptyState
        title="Empty"
        description="desc"
        action={<button>Try again</button>}
      />
    );
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
