# Large repository imports

Large public repositories use a commit-pinned GitHub file listing and bounded raw-source downloads rather than downloading the entire archive. Binary assets, dependency folders, unsafe paths and symlinks are excluded. The same fallback is used when the normal archive exceeds its download/expansion limit.

The selective path reads at most 150 supported files / 8 MB, with 8 concurrent fetches and a 40-second fetching budget. Manifests, security/API paths and application source are prioritized. Individual files retain the 256 KB limit, except package-lock.json at 2 MB. Gemma still receives at most 16 excerpts / 45,000 characters.

This supports large repositories as input, not exhaustive audits of their entire contents. Reports disclose selective import, skipped files and incomplete coverage. If GitHub truncates the file listing, totals are explicitly lower bounds. No repository code is executed.

Verification on 26 October: 103 unit/contract tests passed and the production build passed. A live import of the public BugLens repository returned 141 source files (713,636 bytes) through the selective path and disclosed partial coverage.
