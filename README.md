# stock-front

Frontend for the **Product Management System**: React + TypeScript + Vite, shadcn/ui, Redux Toolkit, react-hook-form + zod, Docker.

Planning for this repo (specs, changes, product docs and agent skills) lives in the OpenSpec store **[stock-store](https://github.com/carodevtodt/stock-store)**. This repo only points to it through `openspec/config.yaml` (`store: store`).

## Setup (once per machine)

Requires Node.js 20.19+ and the OpenSpec CLI: `npm install -g @fission-ai/openspec`.

1. Clone the three repos side by side. The folder names matter, because the store expects `../backend` and `../frontend`:

   ```bash
   mkdir multi-repo && cd multi-repo
   git clone https://github.com/carodevtodt/stock-store.git store
   git clone https://github.com/carodevtodt/stock-back.git  backend
   git clone https://github.com/carodevtodt/stock-front.git frontend
   ```

   ```
   multi-repo/
   ├── store/     ← stock-store: specs, changes, docs, agent skills
   ├── backend/   ← stock-back:  openspec/config.yaml → store: store
   └── frontend/  ← stock-front: openspec/config.yaml → store: store
   ```

2. Register the store from this repo:

   ```bash
   cd frontend
   openspec store register ../store
   ```

3. Verify:

   ```bash
   openspec doctor   # should print: Using OpenSpec root: store (<path>/multi-repo/store)
   ```

The registration is saved locally on your machine, not in git, so each teammate runs it once.

## Working on this repo

- Plan and implement from the store: open Claude Code or OpenCode in `../store` and use `/opsx:propose`, `/opsx:apply` and `/opsx:archive`. `/opsx:apply` writes the code here for tasks prefixed `[frontend]`.
- Code is written test-first (Red → Green → Refactor). Test commands and rules are in [`docs/test.md`](https://github.com/carodevtodt/stock-store/blob/main/docs/test.md) in the store.
- Branches: `<type>/<change-name>` (e.g. `feat/create-product`), with the same name as the branch in the store and in [stock-back](https://github.com/carodevtodt/stock-back). Never commit on `main`.
- Commits: Conventional Commits scoped to the change, e.g. `feat(create-product): ...`.

Relevant store docs: `docs/architecture-frontend.md`, `docs/design-system.md`, `docs/api.md`. Relevant skills: `shadcn-ui`, `redux-toolkit` and `multi-stage-dockerfile`.

See the [stock-store README](https://github.com/carodevtodt/stock-store#readme) for the full workflow.
