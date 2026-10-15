# Arabic landing page for Sahla, a neighbourhood grocery delivery service

Sahla is a fictional delivery service. Write the page in Modern Standard Arabic. Any figures
are illustrative.

## Who it is for

Arabic-speaking residents of a mid-sized city who order groceries on their phones.

## What to build

A static right-to-left landing page, `index.html` with CSS, no build step, with `lang="ar"`
and `dir="rtl"` on the document.

## Content (translate faithfully; keep the structure)

- Hero: "Your neighbourhood shop, at your door within the hour." with a primary button
  "Start shopping" and a secondary link "How it works".
- How it works: three steps (choose your shop, fill your basket, receive your order).
- Delivery areas: four fictional districts with delivery hours 08:00-23:00.
- Pricing: delivery fee 5 SAR, free on orders over 150 SAR.
- FAQ: four questions and answers in an accessible disclosure pattern.
- Footer: contact phone shown as `+000 000 0000` (a placeholder, clearly not real) and
  links to `#`.

## Constraints

- Use logical CSS properties so the layout mirrors correctly; icons that imply direction
  (arrows) flip, others do not.
- Choose a font stack with good Arabic support; never letter-space Arabic text.
- Numbers and phone numbers render readably inside right-to-left text.
- Works from 320px to 1440px.
