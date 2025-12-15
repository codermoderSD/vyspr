# VYSPR

![VYSPR Logo](/logo.svg)

Secure, private, self-destructing chat rooms built with Next.js and Elysia.

- **Status:** Development
- **Stack:** Next.js · React · Elysia · Upstash Redis · TypeScript

## Features

- Create short-lived, self-destructing chat rooms
- Ephemeral metadata stored in Redis with automatic TTL
- Simple, privacy-first UI for secure conversation

## Quickstart

Get running locally:

```bash
# install
npm install

# run dev server
npm run dev
# or with bun
# bun dev
```

Open http://localhost:3000 in your browser. Click "Create Secure Room" to generate a short-lived room (API: `POST /api/room/create`).

## Development

- The client API is generated with `@elysiajs/eden` and the local API is mounted at `/api`.
- The Redis client uses Upstash; set your environment variables if you want to connect to a remote Redis instance.

Recommended scripts:

- `npm run dev` — run development server
- `npm run build` — build production bundle
- `npm run start` — start built app
- `npm run lint` — run ESLint

## API

- `POST /api/room/create` — creates a new room and returns `{ roomId }`

## Contributing

Contributions are welcome. Open an issue or send a pull request with a concise description of the change.

## License

Add a license to this repository (e.g., MIT) if you intend to make it open source.

---

If you'd like, I can also add a color/brand guide, favicon, or SVG variants (monochrome, inverted). What would you like next?
