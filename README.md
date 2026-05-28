# Nutrition Planner Frontend

Angular frontend for the Nutrition Planner application.

## Scope

Current implemented frontend scope:

- Keycloak login with JWT-based access to secured backend endpoints
- user profile page connected to `/user-profile/me`
- food products page connected to `/food-products` — search, category filtering, A–Z / Z–A sorting, create, update, delete
- meals page connected to `/meals` — create meals from food product ingredients, view per-serving nutrition totals, edit and delete meals
- meal plan page connected to `/meal-plans` — create multi-day plans, activate/deactivate a plan, add meal or food product entries per day and meal type (breakfast / lunch / dinner / snack), daily macro totals vs. profile targets with progress bars, plan summary with average per-day values
- finances page connected to `/shopping-list` and `/meal-plans` — manual shopping cart (add product / meal / plan), fridge inventory management, value analysis (kcal/€ ranking), micronutrient leaders, plan cost overview
- premium-only AI assistant page connected to `/ai/chats` and `/ai/autofill` — persistent chat sessions, per-product AI nutrition autofill (PREMIUM_USER / ADMIN only)

## Architecture

The frontend is organized in the style of the `FSA-angular` template:

- `src/app/core` for auth, guards and app-level infrastructure
- `src/app/entities` for API clients and domain models
- `src/app/pages` for route-level screens
- `src/app/shared` for shared UI building blocks

## Pages

| Route | Page | Auth | Description |
|---|---|---|---|
| `/meal-plan` | Meal Plan | USER+ | Multi-day meal planner with daily KBJU dashboard |
| `/food` | Food | USER+ | Products and meals library |
| `/finances` | Finances | USER+ | Shopping cart, fridge inventory, spending analysis |
| `/ai-assistant` | AI Assistant | PREMIUM_USER+ | Persistent chat sessions with AI |
| `/profile` | Profile | USER+ | Biometrics, activity level, fitness goal, macro targets |

## Run

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm start
```

Open:

```text
http://localhost:4200
```

## Backend requirements

The frontend expects:

- backend API on `http://localhost:8080`
- Keycloak on `http://localhost:8081`
- Angular dev proxy configured through `proxy.conf.json`

## Demo users

Use the Keycloak demo users prepared by the backend bootstrap:

- `planner@nutrition.local / planner123`
- `user@nutrition.local / user123`
- `premium@nutrition.local / premium123` — unlocks AI assistant and AI autofill
- `admin@nutrition.local / admin123`

## Build

```bash
npm run build
```

## Assignment note

The assignment requirement "one screen must be connected to REST API including JWT tokens" is covered by:

- `Food products`
- `Profile`

The main demonstration flow is the `Food products` page.
