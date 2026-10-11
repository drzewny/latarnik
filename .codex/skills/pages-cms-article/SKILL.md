---
name: pages-cms-article
description: Create or update articles from supplied source text in this repository’s Pages CMS collection, preserving the article’s wording and structure.
---

# Pages CMS Articles

Use this skill when the user asks to transfer, create, or update an article in this repository’s Pages CMS content. Treat the supplied article as authoritative source material.

## Preserve the source

- Keep the title, headings, wording, punctuation, paragraph order, and list items unchanged. Do not copyedit, summarize, or add transitions to the article body.
- Store the opening paragraphs before the first source heading in a block with an empty heading when the CMS schema permits it. Keep each source heading and its following text in order. Preserve paragraph and list boundaries in the text fields.
- Make the body recoverable from the CMS fields without losing text. Compare the transferred title, headings, and body against the source before finishing.
- A summary is separate CMS metadata. Prefer an exact opening sentence or paragraph from the source rather than rewriting it.

## Follow the current repository schema

Before editing, inspect `.pages.yml`, existing files in `content/articles/`, and the article rendering in `scripts/generate.ts`. Follow the current required fields, filename pattern, asset paths, and rendering behavior; do not assume this skill’s prior runs left the repository in a particular state.

Create the article JSON in `content/articles/` using the configured collection fields. Use **Jakub Wolski** as the author unless the user specifies another author. Choose a concise, descriptive slug, a relevant existing image under `public/assets/`, and suitable category, date, order, summary, and publication state based on the request and repository conventions.

If the existing schema cannot represent the supplied article without losing its structure, make the smallest compatible schema and rendering changes needed to preserve it—for example, allowing an optional section heading for an unheaded introduction and rendering paragraphs and lists from text fields. Add author metadata to the CMS schema when it is missing. Keep article-specific rendering changes focused and escape supplied text when generating HTML.

Do not change the article’s actual wording to fit the schema. Report any CMS limitation that cannot be resolved without changing its content.
