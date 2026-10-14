# Product page for the Fenwick 2 pour-over kettle

Fenwick is a fictional small kitchenware brand. Prices and specs are illustrative.

## Who it is for

Home coffee enthusiasts comparing kettles on their phone, often from a social link, who
need to understand the product and buy in under two minutes.

## What to build

A static product detail page, `index.html` with CSS and a little vanilla JS, no build step.

## Content

- Product name: Fenwick 2 Gooseneck Kettle. Price: $89. Colors: Matte Black, Brushed
  Steel, Sage (Sage is sold out).
- Gallery: four images. Use simple CSS or SVG illustrations, or neutral blocks labelled
  with what the photo would show (no stock photos, no external image URLs).
- Key specs: 0.9 L capacity, 1200 W, temperature hold 40-100 °C in 1 °C steps, 3 mm
  spout, 2-year warranty.
- Variant picker (color) and quantity stepper; Add to cart button with a visible
  confirmation that does not navigate away.
- Shipping note: "Ships in 1-2 business days. Free returns within 30 days."
- Accordion sections: What's in the box; Care; Shipping and returns.
- Reviews section with no reviews yet: an honest empty state inviting the first review.
  Do not invent reviews or ratings.

## Constraints

- Mobile first: the buy controls must be reachable without hunting on a 375px screen.
- Sold-out variant must be clearly unavailable to sighted and screen-reader users.
- Accessible accordion and picker (keyboard, correct roles/states).
- Works up to 1440px with a two-column layout.
