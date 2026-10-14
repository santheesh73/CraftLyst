# Habit tracker web app: Tend

Tend is a fictional habit tracker. The habits listed are sample data stored locally.

## Who it is for

People who check in once or twice a day on their phone, one-handed, often outdoors.

## What to build

A mobile-first static web app, `index.html` with CSS and vanilla JS, no build step, with
data in `localStorage`.

## Content

- Today view: habits ("Walk 20 minutes", "Read 10 pages", "No phone after 22:00", "Drink
  water"), each with a large check-in control and a 7-day streak strip.
- Add habit sheet: name, schedule (daily, weekdays, or custom days), reminder time.
- Week view: a grid of habits by day.
- Bottom navigation with three tabs: Today, Week, Settings.
- Settings: theme (system, light, dark), export data as JSON (download), reset all.

## Constraints

- Designed for 360-430px wide screens first; still looks intentional at 1280px.
- Touch targets at least 44 by 44 px; primary actions in the thumb zone.
- Respects safe-area insets and reduced motion.
- Check-in state is not conveyed by colour alone.
