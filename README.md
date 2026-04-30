# crud-query-app

An Expo React Native app that uses TanStack Query and JSONPlaceholder to manage blog posts with fetching, creating, updating, patching, deleting, and filtering by User ID.

## Description

This project demonstrates simple CRUD operations for blog posts in a mobile-friendly Expo app. TanStack Query is used for data fetching, caching, and mutations, while the UI shows clear feedback messages so each action is visible during a class demo.

## Tools

- Expo
- React Native
- Expo Router
- TanStack Query
- JSONPlaceholder API

## How to Run

```bash
npm install
npx expo start --localhost --clear
```

For the iOS simulator, press `i` after Expo starts.

## Features

- Fetch posts with `useQuery`
- Create posts with `useMutation`
- Update posts with `PUT`
- Patch post titles with `PATCH`
- Delete posts with `DELETE`
- Filter posts by User ID
- Show loading, success, warning, and error messages
- Keep the layout mobile-friendly with `StyleSheet`
- Wrap the app with `QueryClientProvider`

## Project Structure

```text
crud-query-app/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   └── index.tsx
│   └── _layout.tsx
├── assets/
│   └── images/
├── components/
│   ├── ui/
│   ├── haptic-tab.tsx
│   └── themed-text.tsx
├── hooks/
├── services/
│   └── posts.ts
├── constants/
│   └── theme.ts
├── app.json
├── eslint.config.js
├── package.json
├── tsconfig.json
└── README.md
```

Main files:

- `app/_layout.tsx` sets up the app root and `QueryClientProvider`
- `app/(tabs)/index.tsx` contains the main posts screen and CRUD UI
- `services/posts.ts` handles the JSONPlaceholder API requests

## Important Note

JSONPlaceholder does not permanently save changes. Because of that, the app updates the visible list and status messages locally so POST, PUT, PATCH, and DELETE actions can still be demonstrated clearly.

