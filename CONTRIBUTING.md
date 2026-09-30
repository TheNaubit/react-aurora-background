# Contributing

Contributions of any kind (pull requests, bug reports, feature requests, documentation, design) are more than welcome! Keep changes small and focused.

## Setup

You need Node.js `^22.14.0 || >=24.10.0` (run `nvm use` for the version in `.nvmrc`) and npm `>=10.9.0`.

```bash
git clone git@github.com:TheNaubit/react-aurora-background.git
cd react-aurora-background
npm install
npm run dev
```

`npm run dev` starts the demo with hot reload. Before opening a pull request:

```bash
npm run lint
npm run typecheck
npm run test:coverage
npm run build
npm run build:demo
```

## Rules

- Write the failing test first. Every bug fix needs a regression test.
- Check rendering changes in a real browser, on desktop and on a phone, and keep an eye on performance (see [AGENTS.md](./AGENTS.md)).
- Use [Conventional Commits](https://www.conventionalcommits.org): `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`. A git hook checks the messages, and another one runs the linter, the type check and the tests before each commit.
- Do not bump `version` by hand. Releases are automated with semantic-release: every push to `main` runs `.github/workflows/release.yml`, which computes the version, updates `CHANGELOG.md`, tags, creates the GitHub release and publishes to npm with [trusted publishing](https://docs.npmjs.com/trusted-publishers).
