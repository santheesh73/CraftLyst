# Usage dashboard for Tallyhouse

Tallyhouse is a fictional metered-billing SaaS. All figures below are illustrative sample
data, hard-coded so the page renders without a backend.

## Who it is for

Finance and engineering leads at customer companies who check usage weekly and need to
spot cost spikes before the invoice lands.

## What to build

A static dashboard page, `index.html` with CSS and minimal vanilla JS, no build step.

## Content

- Top bar: workspace switcher showing "Northwind Ops", a date range control (Last 30 days,
  Last 90 days, This quarter), and a user menu.
- Four summary figures for the selected range: API calls (4.82 M), Compute hours (1,236),
  Storage (2.4 TB), Projected invoice ($18,940). Each with change vs. the previous period
  (+12%, -3%, +0.4%, +9%).
- A daily usage chart for API calls over 30 days (inline SVG or CSS is fine; generate a
  plausible illustrative series deterministically).
- A table of the top 8 projects by spend with columns: project, owner, calls, compute
  hours, spend, trend. Sortable by spend and by calls.
- An alert banner: "Compute hours for project `etl-nightly` are 38% above the 30-day
  average."
- An empty state for when a filter returns no projects.

## Constraints

- Dense but legible: the table is the main tool; numbers align and use tabular figures.
- Works from 375px (the table scrolls inside its container or reflows into cards) to 1920px.
- The chart has a text alternative or an equivalent data table.
- Light and dark themes via `prefers-color-scheme`.
