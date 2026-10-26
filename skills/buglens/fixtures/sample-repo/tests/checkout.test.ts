import { expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { CheckoutActions } from "../src/components/CheckoutActions";
test("checkout action labels are present", () => {
  const markup = renderToStaticMarkup(createElement(CheckoutActions));
  expect(markup).toContain("Back to cart"); expect(markup).toContain("Continue");
});
