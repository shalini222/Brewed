import React from "react";
import { useCart } from "../context/CartContext";

export default function CartPage({ setPage }) {
  const {
    cart,
    updateQty,
    removeFromCart,
    total,
    clearCart,
  } = useCart();

  const formatCustomizations = (item) => {
    const modifications = [];

    if (item.size) {
      modifications.push(`Size: ${item.size}`);
    }

    if (item.milk) {
      modifications.push(`Milk: ${item.milk}`);
    }

    if (item.temperature) {
      modifications.push(`Temp: ${item.temperature}`);
    }

    if (
      item.iceLevel &&
      item.temperature !== "Hot"
    ) {
      modifications.push(`Ice: ${item.iceLevel}`);
    }

    if (item.sweetness !== undefined) {
      modifications.push(
        `Sweetness: ${item.sweetness}%`
      );
    }

    if (item.toppings?.length) {
      modifications.push(
        `Toppings: ${item.toppings.join(", ")}`
      );
    }

    if (item.extras?.length) {
      modifications.push(
        `Extras: ${item.extras
          .map((extra) => extra.name || extra)
          .join(", ")}`
      );
    }

    if (item.instructions) {
      modifications.push(
        `Note: ${item.instructions}`
      );
    }

    return modifications.join(" | ");
  };

  const handleClearCart = () => {
    clearCart();
  };

  return (
    <main className="cart-page">
      <div className="cart-page-container">

        {/* Header */}
        <header className="cart-page-header">
          <h1 className="cart-page-title">
            Your Shopping Cart
          </h1>

          <p className="cart-page-subtitle">
            Review your selections before checkout.
          </p>
        </header>

        {cart.length === 0 ? (
          /* Empty Cart */
          <section className="cart-empty-card">
            <div className="cart-empty-icon" aria-hidden="true">
              ☕
            </div>

            <h2 className="cart-empty-title">
              Your cart feels a bit light
            </h2>

            <p className="cart-empty-text">
              Let's find some delicious coffee.
            </p>

            <button
              type="button"
              className="cart-primary-btn"
              onClick={() => setPage("menu")}
            >
              Browse Menu
            </button>
          </section>
        ) : (
          <div className="cart-layout">

            {/* Items */}
            <section className="cart-items-section">

              <div className="cart-list-header">
                <div>
                  <span className="cart-list-label">
                    Items
                  </span>

                  <span className="cart-item-count">
                    {cart.length}{" "}
                    {cart.length === 1
                      ? "item"
                      : "items"}
                  </span>
                </div>

                <button
                  type="button"
                  className="cart-clear-btn"
                  onClick={handleClearCart}
                >
                  Clear All
                </button>
              </div>

              <div className="cart-items-list">
                {cart.map((item, index) => (
                  <article
                    key={`${item.id}-${index}`}
                    className="cart-item-card"
                  >
                    <img
                      src={
                        item.image ||
                        item.img ||
                        "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=300"
                      }
                      alt={item.name}
                      className="cart-item-image"
                    />

                    <div className="cart-item-content">

                      <div className="cart-item-main">
                        <h2 className="cart-item-name">
                          {item.name}
                        </h2>

                        {formatCustomizations(item) && (
                          <p className="cart-item-customizations">
                            {formatCustomizations(item)}
                          </p>
                        )}

                        {item.instructions && (
                          <p className="cart-item-note">
                            <span aria-hidden="true">
                              ⚠️
                            </span>{" "}
                            Note: "{item.instructions}"
                          </p>
                        )}

                        <p className="cart-item-price">
                          ₹
                          {Math.round(
                            item.price * item.qty
                          )}
                        </p>
                      </div>

                      <div className="cart-item-actions">

                        <div
                          className="cart-quantity-control"
                          aria-label={`Quantity for ${item.name}`}
                        >
                          <button
                            type="button"
                            className="cart-quantity-btn"
                            onClick={() =>
                              updateQty(
                                item,
                                item.qty - 1
                              )
                            }
                            aria-label={`Decrease quantity of ${item.name}`}
                          >
                            −
                          </button>

                          <span
                            className="cart-quantity-value"
                            aria-live="polite"
                          >
                            {item.qty}
                          </span>

                          <button
                            type="button"
                            className="cart-quantity-btn"
                            onClick={() =>
                              updateQty(
                                item,
                                item.qty + 1
                              )
                            }
                            aria-label={`Increase quantity of ${item.name}`}
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          className="cart-remove-btn"
                          onClick={() =>
                            removeFromCart(item)
                          }
                        >
                          Remove
                        </button>

                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* Order Summary */}
            <aside className="cart-summary-column">
              <div className="cart-summary-card">

                <div className="cart-summary-header">
                  <h2 className="cart-summary-title">
                    Order Summary
                  </h2>
                </div>

                <div className="cart-summary-body">

                  <div className="cart-summary-row">
                    <span>Subtotal</span>
                    <span>
                      ₹{Math.round(total)}
                    </span>
                  </div>

                  <div className="cart-summary-row">
                    <span>
                      Estimated Tax (8%)
                    </span>

                    <span>
                      ₹
                      {Math.round(
                        total * 0.08
                      )}
                    </span>
                  </div>

                  <div className="cart-summary-divider" />

                  <div className="cart-summary-total">
                    <span>
                      Estimated Total
                    </span>

                    <strong>
                      ₹
                      {Math.round(
                        total * 1.08
                      )}
                    </strong>
                  </div>

                  <button
                    type="button"
                    className="cart-checkout-btn"
                    onClick={() =>
                      setPage("checkout")
                    }
                  >
                    Proceed to Checkout
                  </button>

                  <button
                    type="button"
                    className="cart-continue-btn"
                    onClick={() =>
                      setPage("menu")
                    }
                  >
                    Continue Shopping
                  </button>

                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
