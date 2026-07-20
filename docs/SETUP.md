# Veiron Documentation Website Setup

Copy the files from this package into the repository's existing `docs/` directory.

Expected structure:

```text
docs/
├── index.html
├── .nojekyll
├── _coverpage.md
├── _navbar.md
├── _sidebar.md
├── _404.md
└── assets/
    └── docs.css
```

Do not replace the existing Markdown documentation files.

## Commit from VS Code

```bash
git switch main
git pull origin main

git add docs/index.html docs/.nojekyll docs/_coverpage.md docs/_navbar.md docs/_sidebar.md docs/_404.md docs/assets/docs.css
git commit -m "docs: add GitHub Pages documentation website"
git push origin main
```

## Enable GitHub Pages

Open the repository on GitHub and go to:

```text
Settings → Pages
```

Choose:

```text
Source: Deploy from a branch
Branch: main
Folder: /docs
```

Save the configuration.

The public website should use:

```text
https://andreidohot.github.io/Veiron-Network-Main/
```

## Local preview

From the repository root, run:

```bash
npx serve docs
```

Then open the local address displayed by the command.

The site uses Docsify and renders the Markdown documents directly. No documentation build step is required.
