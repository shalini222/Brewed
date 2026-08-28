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

    if (item.size) modifications.push(`Size: ${item.size}`);
    if (item.milk) modifications.push(`Milk: ${item.milk}`);
    if (item.temperature)
      modifications.push(`Temp: ${item.temperature}`);

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
          .map((e) => e.name || e)
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

  return (
    <main className="cart-container">
      <div className="cart-page-inner">

        {/* Header */}

        <header className="cart-page-header">
          <h1 className="cart-page-title">
            Your Shopping Cart
          </h1>
        </header>

        {/* Empty Cart */}

        {cart.length === 0 ? (
          <section className="cart-empty">
            <div className="cart-empty-content">
              <p className="cart-empty-text">
                Your cart feels a bit light! Let's find
                some delicious coffee.
              </p>

              <button
                type="button"
                className="cart-primary-btn"
                onClick={() => setPage("menu")}
              >
                Browse Menu
              </button>
            </div>
          </section>
        ) : (
          <div className="cart-layout">

            {/* Items */}

            <section className="cart-items-column">
              <div className="cart-list-header">
                <span>Items</span>

                <button
                  type="button"
                  className="cart-clear-btn"
                  onClick={clearCart}
                >
                  Clear All
                </button>
              </div>

              <div className="cart-items-list">
                {cart.map((item, index) => (
                  <article
                    key={`${item.id}-${index}`}
                    className="cart-item"
                  >
                    <img
                      src={
                        item.image ||
                        item.img ||
                        "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=150"
                      }
                      alt={item.name}
                      className="cart-item-image"
                    />

                    <div className="cart-item-details">
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
                          ⚠️ Note: "{item.instructions}"
                        </p>
                      )}

                      <span className="cart-item-price">
                        ₹{Math.round(item.price * item.qty)}
                      </span>
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
                          aria-label={`Decrease ${item.name} quantity`}
                        >
                          −
                        </button>

                        <span className="cart-quantity-value">
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
                          aria-label={`Increase ${item.name} quantity`}
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
                  </article>
                ))}
              </div>
            </section>

            {/* Order Summary */}

            <aside className="cart-summary-column">
              <div className="cart-summary-card">

                <h2 className="cart-summary-title">
                  Order Summary
                </h2>

                <div className="cart-summary-row">
                  <span>Subtotal</span>
                  <span>
                    ₹{Math.round(total)}
                  </span>
                </div>

                <div className="cart-summary-row">
                  <span>Estimated Tax (8%)</span>
                  <span>
                    ₹{Math.round(total * 0.08)}
                  </span>
                </div>

                <hr className="cart-summary-divider" />

                <div className="cart-summary-row cart-total-row">
                  <span>Estimated Total</span>

                  <strong>
                    ₹{Math.round(total * 1.08)}
                  </strong>
                </div>

                <button
                  type="button"
                  className="cart-checkout-btn"
                  onClick={() => setPage("checkout")}
                >
                  Proceed to Checkout
                </button>

                <button
                  type="button"
                  className="cart-continue-btn"
                  onClick={() => setPage("menu")}
                >
                  Continue Shopping
                </button>

              </div>
            </aside>

          </div>
        )}
      </div>
    </main>
  );
}
