Brewed App


📌 Brewed Development Note

🔄 Build a Reusable Confirmation Modal Component

Status: ⏳ Deferred

Goal

Create a single reusable confirmation modal to replace every window.confirm() dialog throughout the app.

Initial Use Cases

Clear Cache

Reset to Defaults

Delete Account


Future Use Cases

Cancel Order

Remove Saved Address

Remove Saved Payment Method

Sign Out (optional)

Leave Checkout with unsaved changes


Component API

<ConfirmationModal
  isOpen={isOpen}
  title="Clear Cache"
  message="This will remove temporary cached data. Your account, orders and rewards won't be affected."
  confirmText="Clear Cache"
  cancelText="Cancel"
  danger={false}
  onConfirm={handleClearCache}
  onCancel={() => setIsOpen(false)}
/>

Design Requirements

Blur + dim background overlay

White rounded card (22px radius)

Playfair Display title

Inter body text

Responsive layout

Fade + slide animation

Escape key closes modal

Click outside closes modal

Focus trapped inside modal for accessibility


Benefits

One component reused across the app

Consistent user experience

Eliminates browser window.confirm()

Easier maintenance

Production-grade UI


Priority: High (implement after finishing the remaining Settings page functionality)

