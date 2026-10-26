import React from "react";
import { CheckoutActions } from "../components/CheckoutActions";
import "../styles/checkout.css";
export function CheckoutPage() {
  return <main className="checkout"><p className="eyebrow">SYNTHETIC CHECKOUT / DEMO</p><h1>One last step.</h1><p>Review your order before continuing.</p><section className="order"><div className="product">◫</div><div><h2>Everyday notebook</h2><p>Sand / A5 / Quantity 1</p></div><strong>$24</strong></section><div className="total"><span>Total</span><strong>$24.00</strong></div><h2>Your order is ready</h2><p>Shipping and payment come next.</p><CheckoutActions /><p className="note">Fictional store. No payment is taken.</p></main>;
}
