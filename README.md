# @sandlada/material-theme-cli

![npm version](https://img.shields.io/npm/v/@sandlada/material-theme-cli?label=NPM%20Version&labelColor=%2300531f&color=%23a3f5aa)
![GitHub License](https://img.shields.io/github/license/sandlada/material-theme-cli?label=License&labelColor=%2300531f&color=%23a3f5aa)

A CLI based on the Material Design dynamic color system. Given a source color, it generates theme data and palette tokens and prints them to the terminal.

Runtime requirements: Node.js 22+ and ESM.

For the Simplified Chinese version, see [README.zh-CN.md](docs/README.zh-CN.md).

## Installation

### Global install

```bash
npm i -g @sandlada/material-theme-cli
```

### Run locally in the repository

```bash
npm install
npm start -- "#0f774a"
```

`npm start` runs the build first and then launches the CLI entry point. For local development and verification, this is the most direct workflow.

## Quick Start

The CLI has two main commands: `g c` (generate colors) and `g p` (generate palettes).

### Generate Colors

```bash
material-theme-cli g c "#0f774a"
```

This prints CSS custom properties for all 59 Material Design color tokens to the terminal.

### Generate Palettes (themed)

Generate all 6 Material palette families from a source color:

```bash
material-theme-cli g p "#0f774a"
```

### Generate a Custom Palette

Create a single custom palette with your own prefix:

```bash
material-theme-cli g p my-brand "#0f774a"
```

## Usage Guide

### `g c` — Generate Colors

```
material-theme-cli g c [color] [options...]
```

Generates 59 Material Design color tokens (light + dark schemes). Each token emits a `light-dark()` value in CSS, or equivalent in other formats.

### `g p` — Generate Palettes

Two modes depending on the number of arguments:

**Themed palettes** (1 argument): Generates all 6 palette families — `primary`, `secondary`, `tertiary`, `error`, `neutral`, `neutral-variant`.

```
material-theme-cli g p [color] [options...]
```

**Custom palette** (2 arguments): Generates a single palette with a custom prefix.

```
material-theme-cli g p [prefix] [color] [options...]
```

### Backward compatibility: bare `[color]`

Running the CLI without a subcommand (e.g. `material-theme-cli "#0f774a"`) is equivalent to `g c`. This is kept for backward compatibility.

## Color Input Formats

The CLI accepts the following color syntaxes:

| Syntax   | Example                      | Description                                                                                                                                 |
| -------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Hex      | `#0f774a`                    | Supports `#RGB`, `#RRGGBB`, `#RGBA`, and `#RRGGBBAA`. Pure hexadecimal values must keep the leading `#`, or they may be parsed as integers. |
| RGB      | `rgb(15, 119, 74)`           | Channels can be integers in the range `0-255`, or percentages from `0%-100%`.                                                               |
| RGBA     | `rgba(15, 119, 74, 1)`       | Only fully opaque alpha is accepted, meaning `1` or `100%`.                                                                                 |
| LAB      | `lab(44.3, -15.2, 18.6)`     | Converted directly from LAB values.                                                                                                         |
| HCT      | `hct(270, 75, 50)`           | Useful when you want to provide Material color model values directly.                                                                       |
| XYZ      | `xyz(0.41, 0.21, 0.05)`      | CIE XYZ (D65 white point) with normalized values (typically 0-1).                                                                           |
| ARGB fn  | `argb(0xff0f774a)`           | Accepts a single ARGB integer.                                                                                                              |
| ARGB int | `0xff0f774a` or `4278851722` | Supports decimal and `0x`-prefixed integers.                                                                                                |
| Random   | `random`                     | Generates an opaque random color. `random-color` is also accepted for backward compatibility.                                               |

If the input is empty or unsupported, the CLI exits with an error.

`random` can be used in the positional argument and in the palette override options `--primary`, `--secondary`, `--tertiary`, `--error`, `--neutral`, and `--neutral-variant`.

## Command Options

### Common Options (all commands)

These options apply to `g c`, `g p` (both modes), and the bare `[color]` form.

| Option                              | Default   | Description                                                                                                                                                                                                                                                                            |
| ----------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--format <format>`                 | `css`     | Output format. Supported values: `css`, `json`, `xml`, `yaml`, `js`, `ts`, and `csv`.                                                                                                                                                                                                  |
| `--variant <variant>`               | `neutral` | Dynamic scheme variant. Accepts numeric `0`–`8` or named: `MONOCHROME`, `NEUTRAL`, `TONAL_SPOT` / `TONALSPOT`, `VIBRANT`, `EXPRESSIVE`, `FIDELITY`, `CONTENT`, `RAINBOW`, `FRUIT_SALAD` / `FRUITSALAD`. Case-insensitive, underscores optional.                                        |
| `--contrast-level <contrast-level>` | `0`       | Contrast level. Only `-1`, `0`, and `1` are accepted.                                                                                                                                                                                                                                  |
| `--spec-version <spec-version>`     | `2025`    | Design specification version. `2021`, `2025`, and `2026` are accepted. `2026` is mapped to the `2025` spec.                                                                                                                                                                            |
| `--platform <platform>`             | `phone`   | Target platform. Only `phone` and `watch` are accepted.                                                                                                                                                                                                                                |
| `--primary <color>`                 | none      | Overrides the primary palette.                                                                                                                                                                                                                                                         |
| `--secondary <color>`               | none      | Overrides the secondary palette.                                                                                                                                                                                                                                                       |
| `--tertiary <color>`                | none      | Overrides the tertiary palette.                                                                                                                                                                                                                                                        |
| `--error <color>`                   | none      | Overrides the error palette.                                                                                                                                                                                                                                                           |
| `--neutral <color>`                 | none      | Overrides the neutral palette.                                                                                                                                                                                                                                                         |
| `--neutral-variant <color>`         | none      | Overrides the neutral-variant palette.                                                                                                                                                                                                                                                 |
| `--var-prefix <prefix>`             | auto\*    | Custom prefix for CSS variable / JSON / XML key names. Default: `md-sys-color-` for colors, `md-sys-ref-` for palettes. When provided, replaces the default verbatim — no infix is injected. On `g p` (custom), this option is ignored; the prefix comes from the positional argument. |
| `--help`                            | none      | Displays help information.                                                                                                                                                                                                                                                             |

\* The actual default prefix depends on the command: `g c` defaults to `md-sys-color`, `g p` (themed) defaults to `md-sys-ref`. On `g p` (custom), the prefix is taken from the positional argument, and `--var-prefix` is ignored.

These palette override options accept the same syntax as the source color: Hex, RGB, RGBA, LAB, HCT, XYZ, ARGB function, and ARGB integer.

### `g c` — Filtering Options

| Option                      | Default | Description                                                                              |
| --------------------------- | ------- | ---------------------------------------------------------------------------------------- |
| `--include <token-name...>` | none    | Whitelist. Keeps only the listed color tokens (e.g. `primary`, `on-primary`, `surface`). |
| `--exclude <token-name...>` | none    | Blacklist. Removes the listed color tokens.                                              |

Notes:

- `--include` and `--exclude` are mutually exclusive.
- Names are normalized to kebab-case before matching (`primaryContainer` → `primary-container`).
- Unknown names are reported as warnings and ignored.

### `g p` (themed) — Palette Filtering Options

| Option                      | Default  | Description                                                                                                                                                                   |
| --------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--include <token-name...>` | none     | Keep only these palette families or specific tones (e.g. `primary`, `secondary-50`).                                                                                          |
| `--exclude <token-name...>` | none     | Remove these palette families or specific tones. Mutually exclusive with `--include`.                                                                                         |
| `--tones <tone-list>`       | `0..100` | Comma- or space-separated integer tones from `0` to `100` (e.g. `0, 10, 50, 100`). Limits all 6 families to these tones. `--palette-tones` is accepted as a deprecated alias. |

### `g p` (custom) — Palette Filtering Options

| Option                      | Default  | Description                                                                                                                                        |
| --------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--include <token-name...>` | none     | Keep only these tones from the custom palette (e.g. `my-prefix-10`, `my-prefix-50`, or plain `10`, `50`).                                          |
| `--exclude <token-name...>` | none     | Remove these tones from the custom palette. Mutually exclusive with `--include`.                                                                   |
| `--tones <tone-list>`       | `0..100` | Comma- or space-separated integer tones from `0` to `100`. Controls the default set of tones. `--palette-tones` is accepted as a deprecated alias. |

For custom palettes, `--include` and `--exclude` extract the numeric tone from the token name. Plain numbers like `10` are also accepted. `--include` overrides `--tones` when both are provided.

## Examples

### Generate Colors (`g c`)

```bash
# Default CSS output
material-theme-cli g c "#0f774a"

# JSON output
material-theme-cli g c "#0f774a" --format json

# Only show primary and error tokens
material-theme-cli g c "#0f774a" --include primary error

# Exclude surface tokens
material-theme-cli g c "#0f774a" --exclude surface surface-dim surface-bright

# Custom variant and contrast
material-theme-cli g c "#0f774a" --variant FRUIT_SALAD --contrast-level 1

# Custom CSS variable prefix
material-theme-cli g c "#0f774a" --var-prefix my-app

# Override individual palette sources
material-theme-cli g c "#0f774a" --primary "#1d4ed8" --secondary "#14b8a6"
```

### Generate Themed Palettes (`g p [color]`)

```bash
# Default: all 6 families × 101 tones = 606 tokens (CSS)
material-theme-cli g p "#0f774a"

# JSON output with selected tones
material-theme-cli g p "#0f774a" --format json --tones "0, 10, 50, 100"

# Limit to specific families
material-theme-cli g p "#0f774a" --include primary secondary

# Exclude neutral families
material-theme-cli g p "#0f774a" --exclude neutral neutral-variant

# Custom prefix
material-theme-cli g p "#0f774a" --var-prefix my-theme
```

### Generate Custom Palette (`g p [prefix] [color]`)

```bash
# Single custom palette, all 101 tones
material-theme-cli g p my-brand "#0f774a"

# With specific tones
material-theme-cli g p my-brand "#0f774a" --tones "0, 50, 100"

# Include only specific tones
material-theme-cli g p my-brand "#0f774a" --include "10" --include "50"

# Exclude specific tones
material-theme-cli g p my-brand "#0f774a" --exclude my-brand-0 --exclude my-brand-100
```

### Backward Compatibility (bare `[color]`)

```bash
# Equivalent to `g c`
material-theme-cli "#0f774a"
material-theme-cli random
material-theme-cli "#0f774a" --format json --include primary
```

## Output Protocol

The CLI sends all output to stdout (the terminal). To save to a file, use shell redirection:

```bash
material-theme-cli g c "#0f774a" --format json > theme.json
```

### Format Details

- **CSS**: emits `:root { ... }` with `--{prefix}-*` custom properties using `light-dark(light, dark)` values. Default prefix: `--md-sys-color-` for color tokens, `--md-sys-ref-` for palette tokens. Custom `--var-prefix` replaces the default verbatim (no infix injection).
- **JSON** / **YAML**: color output has top-level `light`, `dark`, `scheme` objects. Palette output has a top-level `palette` object.
- **XML**: emits `<?xml?>` with `<resources>` containing `<color>` entries. Color names use `_light` / `_dark` suffixes.
- **JS** / **TS**: emits ESM `export const` declarations with `PascalCase` + `Light`/`Dark`/`Scheme` suffixes.
- **CSV**: header `scheme,token-name,color-value` with rows for each light/dark/scheme combination (colors) or each palette tone (palettes).

Keys are normalized to kebab-case (CSS, JSON), snake_case (XML), or PascalCase (JS/TS) and sorted alphabetically for deterministic output.

### License

This project is released under the MIT License. See [LICENSE](LICENSE) for details. Third-party dependencies are governed by their own license terms.
