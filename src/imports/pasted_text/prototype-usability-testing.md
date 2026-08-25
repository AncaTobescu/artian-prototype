Turn the existing high-fidelity prototype into a functional usability-testing prototype.

IMPORTANT: Preserve the current visual design, layout, typography, colors, spacing, content hierarchy, product scenario and existing screen structure. Do not redesign the interface and do not create additional major screens unless required for a small modal, validation message or confirmation state.

This remains a conceptual master's dissertation prototype. Do not add a backend, database, authentication service, payment gateway or server-side functionality. All state can be stored locally in React for the current browser session.

The goal is to make the main customer journey realistically interactive enough for usability testing.

1. GLOBAL STATE

Move the main customer configuration to shared application-level state so that user choices persist when navigating between:

Product Details → Customize Options → References & Instructions → Configuration Review → Cart → Checkout → Confirmation → Order Status.

Persist at least:

size
material
frame
color palette
orientation
uploaded reference images
additional instructions
calculated estimated price
cart state
checkout information
selected delivery method

When the user goes Back or uses Edit, previously selected information must remain visible.

2. BROWSE PRODUCTS

Keep the existing search and filters.

Make all filters functional:

search by product title or creator
category
style
price

Filters should work together rather than independently.

Update the results count dynamically.

If no products match, show a simple “No products found” state with an option to clear the filters.

Keep Custom Portrait Painting by Elena Marsh as the main product used in the prototype flow.

Clicking this product should open Product Details.

Other sample product cards do not need complete product-detail flows.

3. PRODUCT DETAILS

Keep the existing image gallery interaction.

“Customize Product” must open the customization flow.

Make “Save to Wishlist” functional at prototype level:

clicking it toggles between saved and unsaved state;
provide subtle visual feedback such as “Saved to Wishlist”.

No account or database persistence is required.

4. CUSTOMIZE PRODUCT — OPTIONS

Make all product options selectable and store them in shared state:

Size
Material
Frame
Color Palette
Orientation

The selected state must be visually obvious.

Update the product configuration summary immediately when an option changes.

Implement a simple conceptual price calculation so the estimated price visibly changes when configuration options change.

Preserve the current default configuration:

40 × 50 cm
Stretched Canvas
Natural Wood
Warm
Portrait
estimated configured price €134

Use this as the default scenario. The pricing calculation is only for prototype simulation and does not represent a real commercial pricing engine.

Back must return to Product Details without losing selections.

Continue must go to References & Instructions.

5. REFERENCES & INSTRUCTIONS

Make reference-image upload functional at browser/prototype level only.

When the user clicks “Add photo”:

open a local file picker;
accept common image formats such as JPG and PNG;
display the selected image as a thumbnail;
allow up to 4 reference images;
allow each uploaded image to be removed.

Do not upload files to a server or external service.

Keep uploaded images only for the current browser session.

Additional Instructions must be editable and persist when navigating away and back.

Limit the field to 600 characters and update the character counter.

Add prototype-level validation:

at least one reference image is required;
if the user clicks Continue with no reference image, remain on the page and show a clear inline message near the upload area;
remove the error automatically after a valid image is added.

Continue goes to Configuration Review only when required information is valid.

6. CONFIGURATION REVIEW

Do not use hard-coded configuration values.

Display the actual selections stored by the user:

size
material
frame
color palette
orientation
actual number/thumbnails of uploaded references
actual additional instructions
current estimated price

All Edit actions must navigate back to the relevant customization step while preserving the current configuration.

“Add to Cart” should add the configured product to the cart and navigate to Cart.

Show subtle confirmation feedback if appropriate.

7. CART

Display the actual current configuration from shared state.

Make these actions functional:

Edit configuration
Remove
Continue Shopping
Proceed to Checkout

Quantity controls may be functional, but keep the prototype primarily optimized for one customized product.

If quantity is implemented:

minimum quantity is 1;
update subtotal and total dynamically.

If the item is removed:

show a simple empty-cart state;
disable checkout;
provide a “Browse Products” action.

Keep shipping calculation conceptual.

8. CHECKOUT

Make all checkout fields editable:

email
full name
address line 1
address line 2 optional
city
postal code
country

Make Standard Delivery and Express Delivery selectable.

Update shipping and total when the delivery method changes.

Keep payment conceptual. Do NOT add Stripe or any real payment functionality.

Before “Place Order” succeeds, validate required fields.

Use simple inline validation:

required fields cannot be empty;
email should use basic email-format validation;
errors should appear beside or below the relevant field;
focus or scroll to the first invalid field if appropriate.

Once the required fields are valid, “Place Order” should navigate to Order Confirmation.

9. ORDER CONFIRMATION

Display the order using the customer’s selected configuration and final total.

Keep order number #ART-20481 for prototype consistency.

“View Order” must navigate to Order Status.

“Continue Browsing” must return to Browse Products.

10. ORDER STATUS / PROGRESS

Keep the default scenario:

status: Awaiting Review
active stage: Review

Make “Approve Progress” functional:

clicking it opens a small confirmation dialog or confirmation state;
after confirmation, change the status to something such as “Progress Approved”;
disable or replace the approval/request-change actions with clear confirmation feedback.

Make “Request Changes” functional:

open a small modal or expandable form;
include a text area for requested changes;
require at least a short message;
submitting it should show confirmation such as “Change request sent”;
do not send anything to a real creator or external service.

These interactions are simulated prototype states only.

11. NAVIGATION AND FEEDBACK

Ensure all primary and secondary buttons that appear actionable actually respond.

Preserve sensible Back navigation and Edit navigation.

Scroll to the top when entering a new screen.

Use subtle visual feedback for:

selected options
hover/focus states
successful actions
validation errors

Do not add unnecessary animations.

12. USABILITY-TESTING REQUIREMENT

The prototype must support this complete test task without manual intervention:

Browse products
→ find and open Custom Portrait Painting
→ start customization
→ change at least one product option
→ observe the updated configuration/price
→ upload at least one reference image
→ add or edit instructions
→ continue to Review
→ verify and optionally edit the configuration
→ add the product to Cart
→ proceed to Checkout
→ complete required delivery information
→ place the conceptual order
→ reach Order Confirmation
→ open Order Status
→ approve the progress OR request a change.

A participant should be able to complete this entire sequence by interacting only with the visible interface.

13. TECHNICAL CONSTRAINTS

Use the existing React implementation.
Keep state client-side only.
Do not introduce a backend.
Do not implement real authentication.
Do not implement real payment processing.
Do not implement real email sending.
Do not implement real order submission.
Do not send uploaded images anywhere.
Do not change the overall visual design.
Do not replace the existing screen architecture.
Preserve the existing product scenario, branding and design language.

After implementation, test the complete customer journey yourself and fix any buttons, navigation paths, state-loss problems or validation issues that prevent the full usability-testing task from being completed.