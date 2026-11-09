
# SpendWise - Expense Management System

A modern expense tracking and budgeting application built with React and Node.js.

This contains everything you need to run the app locally.

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Production Build & Start

1. Build frontend + backend:
   `npm run build`
2. Start production server:
   `npm run start`

## Optional API Base URL

- By default, frontend API calls use same-origin `/api/*`.
- Set `VITE_API_BASE_URL` only when frontend and API are on different origins.

## Link PHP Programs With This Project

You can route API calls through the PHP backend while still serving the React app with the Node dev server.

1. Start PHP API server from project root:
   `php -S 127.0.0.1:8000 -t php`
2. In another terminal, start app with PHP bridge enabled:
   `API_BACKEND=php PHP_API_BASE_URL=http://127.0.0.1:8000/php npm run dev`

How it works:
- Requests to `/api/*` are sent to PHP first.
- If a PHP endpoint returns `404`, the request falls back to the existing Node/Prisma API.

## Feedback & Support

Have suggestions or found a bug? We'd love to hear from you!

- **GitHub**: [@Rohit4programme](https://github.com/Rohit4programme)
- **Email**: [kratos4all@gmail.com](mailto:kratos4all@gmail.com)

Feel free to open an issue or reach out directly.
