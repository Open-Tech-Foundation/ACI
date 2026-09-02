# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Removed

- Everything. The engine (`src/`), the terminal client (`bin/`), the taught
  data (`data/`), the demo's code, and `SPEC.md` were deleted so the model can
  be rebuilt from nothing.
- The specification went with the code because it described the same design.
  Understanding was a flat word-to-kind dictionary with no recognition steps,
  and solving was a JavaScript branch per question shape, so neither survived
  the requirement that the system understand any input and derive its own
  answers.

Only the toolchain remains: `package.json`, `tsconfig.json`, `tasks.toml` and
the demo's configuration.

[Unreleased]: https://github.com/Thanga-Ganapathy/ACI/commits/main
