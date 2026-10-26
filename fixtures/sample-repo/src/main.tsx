import React from "react";
import { createRoot } from "react-dom/client";
import { CheckoutPage } from "./pages/CheckoutPage";
export const routes = { "/checkout": CheckoutPage };
const Page = routes[window.location.pathname as keyof typeof routes];
createRoot(document.getElementById("root")!).render(Page ? <Page /> : <a href="/checkout">Open checkout</a>);
