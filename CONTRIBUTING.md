# Contribution Guidelines

When contributing to `uploadjoy`, whether on GitHub or in other community spaces:

- Be respectful, civil, and open-minded.
- Before opening a new pull request, try searching through the [issue tracker](https://github.com/Uploadjoy/uploadjoy/issues) for known issues or fixes.
- If you want to make code changes based on your personal opinion(s), make sure you open an issue first describing the changes you want to make, and open a pull request only when your suggestions get approved by maintainers.

## How to Contribute

### Prerequisites

In order to not waste your time implementing a change that has already been declined, or is generally not needed, start by [opening an issue](https://github.com/Uploadjoy/uploadjoy/issues/new/choose) describing the problem you would like to solve.

### Setup your environment locally

_Some commands will assume you have the Github CLI installed, if you haven't, consider [installing it](https://github.com/cli/cli#installation), but you can always use the Web UI if you prefer that instead._

In order to contribute to this project, you will need to fork the repository:

```bash
gh repo fork Uploadjoy/uploadjoy
```

then, clone it to your local machine:

```bash
gh repo clone <your-github-name>/uploadjoy
```

This project uses [pnpm](https://pnpm.io) as its package manager. Install it if you haven't already:

```bash
npm install -g pnpm
```

Then, install the project's dependencies:

```bash
pnpm install
```

### Implement your changes

This project is a [Turborepo](https://turborepo.org/) monorepo. Now you're all setup and can start implementing your changes.

Quick overview of where things are in this repo:

- `docs` - documentation website
- `examples` - example apps that integrate Uploadjoy packages
- `packages/api-client` - Uploadjoy API client
- `packages/core` - core client/server logic for integrating Uploadjoy
- `packages/mime-types` - internal fork of [mime-types](https://github.com/jshttp/mime-types)
- `packages/react` - React components
- `packages/shared` - internal utilities shared by packages and Uploadjoy's backend

Here are some useful scripts for when you are developing:

| Command           | Description                                             |
| ----------------- | ------------------------------------------------------- |
| `pnpm dev:docs`   | Starts the development server for the docs with HMR     |
| `pnpm build:docs` | Builds the docs                                         |
| `pnpm build`      | Builds packages and docs                                |
| `pnpm format`     | Formats the code                                        |
| `pnpm lint`       | Lints the code                                          |
| `pnpm clean`      | cleans repo of any node_modules and builds              |
| `pnpm check`      | Checks your code for typeerrors, formatting and linting |

When making commits, make sure to follow the [conventional commit](https://www.conventionalcommits.org/en/v1.0.0/) guidelines, i.e. prepending the message with `feat:`, `fix:`, `chore:`, `docs:`, etc... You can use `git status` to double check which files have not yet been staged for commit:

```bash
git add <file> && git commit -m "feat/fix/chore/docs: commit message"
```

### When you're done

Check that your code follows the project's style guidelines by running:

```bash
pnpm check
```

Please also make a manual, functional test of your changes.

If your change should appear in the changelog, i.e. it changes some behavior of any of the NPM packages, it must be captured by `changeset` which is done by running

```bash
pnpm changeset
```

and filling out the form with the appropriate information. Then, add the generated changeset to git:

```bash
git add .changeset/*.md && git commit -m "chore: add changeset"
```

When all that's done, it's time to file a pull request to upstream:

**NOTE**: All pull requests should target the `main` branch.

```bash
gh pr create --web
```

and fill out the title and body appropriately. Again, make sure to follow the [conventional commit](https://www.conventionalcommits.org/en/v1.0.0/) guidelines for your title.

## Credits

This documented was inspired by the contributing guidelines for [cloudflare/wrangler2](https://github.com/cloudflare/wrangler2/blob/main/CONTRIBUTING.md).
