# SecondChance

A community-sharing capstone application based on the official IBM Skills Network [Node.js starter](https://github.com/ibm-developer-skills-network/kjriu-backend-nodejs-capstone).

**Author:** Ramazan Utegen  
**Deployed landing page and sample catalog:** https://ramazanutegen583-pixel.github.io/secondchance-capstone/

## What runs where

- The deployed GitHub Pages site contains the landing page and a searchable, read-only sample catalog of the 16 original IBM items.
- The Express/MongoDB application provides real registration, login, profile updates, image uploads and item CRUD. It serves the same frontend when run locally or on a Node.js host.
- The MongoDB APIs are integration-tested locally and in GitHub Actions. GitHub Pages is static hosting; it does not host Express or MongoDB. Account and upload controls appear when the frontend is served by the API.

## Quick start

Install Node.js 24 and pnpm 11.25.0, then run from the repository root:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

The development command downloads and starts a real MongoDB 8.0.15 process in the ignored `.runtime/` directory, imports the 16 original documents if needed, and starts:

- Web app/API: http://localhost:3060
- Sentiment service: http://localhost:3061/sentiment

The first run downloads the MongoDB distribution. No cloud account is needed for local development.

## Use an existing MongoDB server

Copy `.env.example` to `.env`, set `MONGO_URL`, `MONGO_DB` and a random `JWT_SECRET`, then run:

```bash
pnpm seed
pnpm start
```

Do not commit `.env` or real credentials. Start the independent sentiment service with `node sentiment/index.js`.

## API

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | /api/secondchanceitems | List all items |
| GET | /api/secondchanceitems/:id | Item details |
| POST | /api/secondchanceitems | Create an owned item; multipart field `file` accepts an image |
| PUT | /api/secondchanceitems/:id | Update your own item |
| DELETE | /api/secondchanceitems/:id | Delete your own item |
| GET | /api/secondchance/search | Filter by name, category, condition and maximum age_years |
| POST | /api/auth/register | Register firstName, lastName, email and password |
| POST | /api/auth/login | Sign in and receive a one-hour JWT |
| GET | /api/auth/me | Read your own profile |
| PUT | /api/auth/update | Update your own firstName and lastName |
| POST | /sentiment (port 3061) | Analyze a sentence with Natural |

The alternate item prefix `/api/secondchance/items` is also supported. Item writes and profile operations require `Authorization: Bearer <token>`. Passwords are hashed; one member cannot modify another member's item. Uploaded JPEG/PNG/WebP files have random names and a 2 MB limit.

## Validation and deployment

```bash
pnpm check
pnpm test
pnpm build
```

The integration suite checks a real MongoDB import, all 16 items, detail lookup, combined filters, registration validation/duplicate rejection, password hashing, login, protected profile updates, multipart image upload, item ownership, update/delete and sentiment analysis.

The GitHub Actions CI/CD workflow starts a MongoDB service, installs the locked dependencies, checks source files, imports the dataset, runs the integration suite, builds the frontend, uploads a Pages artifact and deploys it to GitHub Pages.

## Planning

The user-story template is in [.github/ISSUE_TEMPLATE/user-story.md](.github/ISSUE_TEMPLATE/user-story.md). Eight public user stories are available in [Issues](https://github.com/ramazanutegen583-pixel/secondchance-capstone/issues), labeled new, backlog, icebox or technical debt.

## Attribution and license

The original dataset, photographs and starter history come from IBM Skills Network. They are sample data, not live community listings. See [LICENSE](LICENSE) for the Apache 2.0 license.
