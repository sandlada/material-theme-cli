# @sandlada/material-theme-cli

![npm version](https://img.shields.io/npm/v/@sandlada/material-theme-cli?label=NPM%20Version&labelColor=%2300531f&color=%23a3f5aa)
![GitHub License](https://img.shields.io/github/license/sandlada/material-theme-cli?label=License&labelColor=%2300531f&color=%23a3f5aa)

A CLI based on the Material Design dynamic color system. Given a source color, it generates theme data and palette tokens that can be used directly in front-end projects, design tokens, script integrations, and bulk exports.

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

1. Pass a color directly to the CLI. By default, it prints CSS theme and palette tokens to the terminal:

```bash
material-theme-cli "#0f774a"
```

If you want a random theme, you can also use `random-color`:

```bash
material-theme-cli random-color
```

2. If you want to write the output to a file, switch to file output and specify a path:

```bash
material-theme-cli "#0f774a" --format css --output file --path ./theme.css
```

3. If the color is already stored in a text file, use `--input` to read it:

```text
# color.txt
#0f774a
```

```bash
material-theme-cli --input ./color.txt --format json --output file --path ./theme.json
```

## Usage Guide

The recommended flow is simple: choose the input color, then the output format, then decide whether you want a preview or a file.

1. Choose the input method.

You can pass `[color]` directly, or use `--input <file-path>` to read from a file. If both are provided, `--input` takes precedence.

2. Choose the output method.

The default is terminal output. To generate a file, use `--output file` and set the destination with `--path`. If `--path` is omitted, the CLI writes to `./output.<format>` in the current working directory.

3. Choose the format and theme parameters.

If you just want a quick preview, keep the defaults. If you are integrating with a design system or multi-platform theme, adjust `--variant`, `--contrast-level`, `--spec-version`, and `--platform`, override palettes with `--primary`, `--secondary`, and similar options, or control palette output with `--no-palette`, `--palette-tones`, and token selectors such as `palette-primary-50`.

4. Use a whitelist or blacklist when you need to filter tokens.

`--token` is a whitelist, and `--exclude` is a blacklist. The CLI normalizes names to kebab-case before matching, and the two options are mutually exclusive.

## Command Usage

```bash
material-theme-cli [color] \
  [--input <file-path>] \
  [--format <css|json|xml|yaml|js|ts|csv>] \
  [--output <console|file>] \
  [--path <output-file-path>] \
  [--make-js <output-js-file-path>] \
  [--no-palette] \
  [--palette-only] \
  [--palette-tones <tone-list>] \
  [--variant <0-8|MONOCHROME|NEUTRAL|TONAL_SPOT|TONALSPOT|VIBRANT|EXPRESSIVE|FIDELITY|CONTENT|RAINBOW|FRUIT_SALAD|FRUITSALAD>] \
  [--contrast-level <-1|0|1>] \
  [--spec-version <2021|2025>] \
  [--platform <phone|watch>] \
  [--primary <color>] \
  [--secondary <color>] \
  [--tertiary <color>] \
  [--error <color>] \
  [--neutral <color>] \
  [--neutral-variant <color>] \
  [--token <token-name...>] \
  [--exclude <token-name...>] \
  [--help]
```

Default behavior:

- `--format css`
- `--output console`
- palette output enabled by default
- `--palette-tones 0..100`
- `--variant TONAL_SPOT`
- `--contrast-level 0`
- `--spec-version 2025`
- `--platform phone`

## Color Input Formats

The CLI accepts the following color syntaxes:

| Syntax   | Example                      | Description                                                                                                                                 |
| -------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Hex      | `#0f774a`                    | Supports `#RGB`, `#RRGGBB`, `#RGBA`, and `#RRGGBBAA`. Pure hexadecimal values must keep the leading `#`, or they may be parsed as integers. |
| RGB      | `rgb(15, 119, 74)`           | Channels can be integers in the range `0-255`, or percentages from `0%-100%`.                                                               |
| RGBA     | `rgba(15, 119, 74, 1)`       | Only fully opaque alpha is accepted, meaning `1` or `100%`.                                                                                 |
| LAB      | `lab(44.3, -15.2, 18.6)`     | Converted directly from LAB values.                                                                                                         |
| HCT      | `hct(270, 75, 50)`           | Useful when you want to provide Material color model values directly.                                                                       |
| ARGB fn  | `argb(0xff0f774a)`           | Accepts a single ARGB integer.                                                                                                              |
| ARGB int | `0xff0f774a` or `4278851722` | Supports decimal and `0x`-prefixed integers.                                                                                                |
| Random   | `random-color`               | Generates an opaque random color.                                                                                                           |

If the input is empty or unsupported, the CLI exits with an error.

`random-color` can be used in the positional argument, in `--input` file contents, and in the palette override options `--primary`, `--secondary`, `--tertiary`, `--error`, `--neutral`, and `--neutral-variant`.

## Command Options

### Input and Output

| Option                            | Default             | Description                                                                                                                                                                                                                                     |
| --------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[color]`                         | none                | Positional argument for passing the color value directly.                                                                                                                                                                                       |
| `--input <file-path>`             | none                | Reads the source color text from a file, trimming leading and trailing whitespace. The path is resolved relative to the current working directory.                                                                                              |
| `--format <format>`               | `css`               | Output format. Supported values: `css`, `json`, `xml`, `yaml`, `js`, `ts`, and `csv`.                                                                                                                                                           |
| `--output <target>`               | `console`           | `console` prints to the terminal; `file` writes to disk.                                                                                                                                                                                        |
| `--path <output-file-path>`       | `./output.<format>` | Used when `--output file` is selected. The path is resolved relative to the current working directory.                                                                                                                                          |
| `--make-js <output-js-file-path>` | none                | Generates a reusable ESM wrapper script. It captures the current CLI configuration and calls `dist/index.js` at runtime. If the input uses `random-color`, the generated script re-randomizes at runtime. This is different from `--format js`. |
| `--help`                          | none                | Displays help information.                                                                                                                                                                                                                      |

### Theme and Palette

| Option                              | Default      | Description                                                                                                                                                                                                                                           |
| ----------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--variant <variant>`               | `TONAL_SPOT` | Dynamic scheme variant. Available values include: `0` = `MONOCHROME`, `1` = `NEUTRAL`, `2` = `TONAL_SPOT` / `TONALSPOT`, `3` = `VIBRANT`, `4` = `EXPRESSIVE`, `5` = `FIDELITY`, `6` = `CONTENT`, `7` = `RAINBOW`, `8` = `FRUIT_SALAD` / `FRUITSALAD`. |
| `--contrast-level <contrast-level>` | `1`          | Contrast level. Only `-1`, `0`, and `1` are accepted.                                                                                                                                                                                                 |
| `--spec-version <spec-version>`     | `2025`       | Design specification version. Only `2021` and `2025` are accepted.                                                                                                                                                                                    |
| `--platform <platform>`             | `phone`      | Target platform. Only `phone` and `watch` are accepted.                                                                                                                                                                                               |
| `--primary <color>`                 | none         | Overrides the primary palette.                                                                                                                                                                                                                        |
| `--secondary <color>`               | none         | Overrides the secondary palette.                                                                                                                                                                                                                      |
| `--tertiary <color>`                | none         | Overrides the tertiary palette.                                                                                                                                                                                                                       |
| `--error <color>`                   | none         | Overrides the error palette.                                                                                                                                                                                                                          |
| `--neutral <color>`                 | none         | Overrides the neutral palette.                                                                                                                                                                                                                        |
| `--neutral-variant <color>`         | none         | Overrides the neutral-variant palette.                                                                                                                                                                                                                |
| `--no-palette`                      | enabled      | Disables palette token output. Theme tokens still render normally.                                                                                                                                                                                    |
| `--palette-only`                    | off          | Emits palette tokens only and skips theme token output.                                                                                                                                                                                               |
| `--palette-tones <tone-list>`       | `0..100`     | Limits palette output to the selected tones. Accepts comma- or space-separated integers from `0` to `100`, such as `0, 1`.                                                                                                                            |

These palette override options accept the same syntax as the source color: Hex, RGB, RGBA, LAB, HCT, ARGB function, and ARGB integer.

### Filtering

| Option                      | Default | Description                                                   |
| --------------------------- | ------- | ------------------------------------------------------------- |
| `--token <token-name...>`   | none    | Whitelist. Keeps only these tokens. Supports multiple values. |
| `--exclude <token-name...>` | none    | Blacklist. Removes these tokens. Supports multiple values.    |

Notes:

- `--token` and `--exclude` are mutually exclusive.
- Names are normalized to kebab-case before matching, so `primaryContainer`, `PRIMARY_CONTAINER`, and `primary-container` are treated as the same token.
- Palette selectors use the `palette-` prefix. Use `palette-primary` or `palette-neutral-variant` to keep an entire family, or `palette-primary-50` to keep a single tone.
- Palette selectors can be combined with `--palette-only` and `--palette-tones` to narrow output to specific palette tokens.
- Unknown names are reported as warnings and ignored.

## Examples

### 1. Terminal preview with the default CSS output

```bash
material-theme-cli "#0f774a"
```

### 2. Write CSS to a file

```bash
material-theme-cli "#0f774a" --format css --output file --path ./theme.css
```

### 3. Write JSON to a file

```bash
material-theme-cli "#0f774a" --format json --output file --path ./theme.json
```

### 4. Read a color from a file

```bash
material-theme-cli --input ./color.txt --format yaml --output file --path ./theme.yaml
```

### 5. Generate a TypeScript module

`js` and `ts` produce the same serialized content, both generating module source like `export const MdSysColor = { ... }`.

```bash
material-theme-cli "#0f774a" --format ts --output file --path ./theme.ts
```

### 6. Use a token whitelist

```bash
material-theme-cli "#0f774a" --token primary surface-tint on-primary
```

### 7. Use a token blacklist

```bash
material-theme-cli "#0f774a" --exclude surface-tint outline shadow
```

### 8. Override palettes

```bash
material-theme-cli "#0f774a" --primary "#1d4ed8" --secondary "#14b8a6" --neutral "#111827"
```

### 9. Adjust variant, contrast, and platform

```bash
material-theme-cli "#0f774a" --variant FRUIT_SALAD --contrast-level 0 --spec-version 2025 --platform watch
```

### 10. Generate a reusable script

```bash
material-theme-cli "#0f774a" --make-js ./scripts/theme-generator.js --format css --output file --path ./theme.css
```

`--make-js` generates a runtime script that captures the current parameters. The script depends on the built artifact `dist/index.js`, so run it only after the repository has been built.

### 11. Skip palette output

```bash
material-theme-cli "#0f774a" --no-palette
```

### 12. Limit palette tones

```bash
material-theme-cli "#0f774a" --palette-tones "0, 1"
```

### 13. Keep a single palette tone

```bash
material-theme-cli "#0f774a" --palette-only --token palette-primary-50
```

## Protocol

### Output Protocol

The CLI first generates a pair of `lightObject` and `darkObject` values, then serializes them into the chosen format. To keep output stable, keys are normalized to kebab-case and sorted alphabetically.

- `css`: emits `:root` and `--md-sys-color-*` custom properties using `light-dark(light, dark)` values.
- `json` / `yaml`: emits a theme object with top-level `light`, `dark`, and `scheme` nodes.
- `xml`: emits a `resources` node, with color names using `md_sys_color_*_light` and `md_sys_color_*_dark`.
- `js` / `ts`: emits module source like `export const MdSysColor = { ... }`, where `Light`, `Dark`, and `Scheme` suffixes represent the light, dark, and combined values.
- `csv`: uses the fixed header `scheme,token-name,color-value`, and expands each token into three rows for `light`, `dark`, and `scheme`.

Palette output is included by default.

- `css`: adds `--md-sys-palette-*` custom properties with fixed hex values and no `light-dark()` wrapper.
- `json` / `yaml`: adds a top-level `palette` node with `md-sys-palette-*` keys.
- `xml`: adds `md_sys_palette_*` color entries under `resources`.
- `js` / `ts`: adds an `export const MdSysPalette = { ... }` object with fixed palette token values.
- `csv`: adds `palette` rows for each palette token tone.

If the normalized keys in `light` and `dark` do not match, serialization fails. This prevents incomplete theme files from being generated.

### License

This project is released under the MIT License. See [LICENSE](LICENSE) for details. Third-party dependencies are governed by their own license terms.
