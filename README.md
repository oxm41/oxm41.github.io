# pwn notes · oxm41

a searchable library for [oxm41.github.io](https://oxm41.github.io/). search note titles, markdown, code, and the text of three reference PDFs. press `Ctrl+K` or `⌘K` to search from any page.

## run locally

with Node.js 20 or later, run this from `oxm41-website`:

```powershell
node scripts/serve.mjs
```

open [http://127.0.0.1:4173/](http://127.0.0.1:4173/). this command builds the static files in `dist/` and starts the preview server. restart it after changing the source files.

## update notes

- add or edit markdown in `content/`. keep images in `public/image/` or `public/kernel/attachments/`. the site supports Obsidian links like `[[note name]]` and `![[image.png]]`.
- edit titles, tags, and topics in `src/metadata.mjs` or in a note's frontmatter:

  ```yaml
  ---
  title: function calling conventions
  topic: assembly & abi
  tags: ["assembly", "calling-convention"]
  arch: amd64
  ---
  ```

- set `draft: true` to omit a note from the build. in a public repository, any file you commit is visible, including draft source files.
- run `node scripts/sync.mjs` to import changes from the parent Obsidian vault. it replaces matching notes, preserves the four English editions listed in the sync script, and keeps files removed from the vault. update `content/references.json` when replacing a reference PDF so its searchable text matches.
- run `node scripts/build.mjs` and `node scripts/check.mjs` to check the build. `dist/build-report.json` lists skipped notes and unresolved Obsidian links.

## publish to GitHub Pages

place the contents of this folder at the root of `oxm41/oxm41.github.io` on the `main` branch. under **Settings → Pages**, select **GitHub Actions** as the source. `.github/workflows/deploy.yml` builds, checks, and deploys the site on push.

for a project site hosted under a repository path, set `base` in `site.config.mjs` to `/repository-name/`.
