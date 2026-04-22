# Nutrition Planner Frontend

Angular frontend for the Nutrition Planner application.

## Scope

Current implemented frontend scope:

- Keycloak login with JWT-based access to secured backend endpoints
- user profile page connected to `/user-profile/me`
- food products page connected to `/food-products`
- product search, category filtering, sorting, create, update and delete
- premium-only `AI assistant` route on the frontend

The pages `Meal plan`, `Finances` and `AI assistant` are currently UI placeholders. The main fully implemented page for the assignment is `Food products`.

## Architecture

The frontend is organized in the style of the `FSA-angular` template:

- `src/app/core` for auth, guards and app-level infrastructure
- `src/app/entities` for API clients and domain models
- `src/app/pages` for route-level screens
- `src/app/shared` for shared UI building blocks

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
- `premium@nutrition.local / premium123`
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
