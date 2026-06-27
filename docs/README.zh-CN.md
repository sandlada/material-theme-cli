# @sandlada/material-theme-cli

![npm version](https://img.shields.io/npm/v/@sandlada/material-theme-cli?label=NPM%20Version&labelColor=%2300531f&color=%23a3f5aa)
![GitHub License](https://img.shields.io/github/license/sandlada/material-theme-cli?label=License&labelColor=%2300531f&color=%23a3f5aa)

一个基于 Material Design 动态色彩系统的 CLI。给定一个源色，它会生成主题数据和 palette 令牌并输出到终端。

运行环境：Node.js 22+，且项目使用 ESM。

## 安装

### 全局安装

```bash
npm i -g @sandlada/material-theme-cli
```

### 在仓库中本地运行

```bash
npm install
npm start -- "#0f774a"
```

`npm start` 会先执行构建，再运行 CLI 入口。对于本地开发和验证，这是最直接的方式。

## 快速开始

CLI 有两个主要命令：`g c`（生成颜色 tokens）和 `g p`（生成 palette tokens）。

### 生成颜色

```bash
material-theme-cli g c "#0f774a"
```

在终端输出全部 59 个 Material Design 颜色 tokens 的 CSS 自定义属性。

### 生成主题化 Palettes

从源色生成全部 6 个 Material palette family：

```bash
material-theme-cli g p "#0f774a"
```

### 生成自定义 Palette

用自定义前缀创建单个 palette：

```bash
material-theme-cli g p my-brand "#0f774a"
```

## 使用指南

### `g c` — 生成颜色

```
material-theme-cli g c [color] [options...]
```

生成 59 个 Material Design 颜色 tokens（亮色 + 暗色方案）。CSS 模式下每个 token 输出 `light-dark()` 值，其他格式输出对应表达。

### `g p` — 生成 Palettes

根据参数个数区分两种模式：

**主题化 palette**（1 个参数）：生成全部 6 个 palette family — `primary`、`secondary`、`tertiary`、`error`、`neutral`、`neutral-variant`。

```
material-theme-cli g p [color] [options...]
```

**自定义 palette**（2 个参数）：生成单个 palette，使用自定义前缀。

```
material-theme-cli g p [prefix] [color] [options...]
```

### 向后兼容：裸 `[color]`

不带子命令运行时（如 `material-theme-cli "#0f774a"`）等同于 `g c`。这是为了向后兼容。

## 颜色输入格式

CLI 接受以下颜色语法：

| 语法      | 示例                         | 说明                                                                                                       |
| --------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Hex       | `#0f774a`                    | 支持 `#RGB`、`#RRGGBB`、`#RGBA`、`#RRGGBBAA`。纯数字的十六进制值必须保留前导 `#`，否则可能被当成整数解析。 |
| RGB       | `rgb(15, 119, 74)`           | 通道可写成 `0-255` 的整数，或 `0%-100%` 的百分比。                                                         |
| RGBA      | `rgba(15, 119, 74, 1)`       | 只接受完全不透明的 alpha，即 `1` 或 `100%`。                                                               |
| LAB       | `lab(44.3, -15.2, 18.6)`     | 直接按 LAB 值转换。                                                                                        |
| HCT       | `hct(270, 75, 50)`           | 适合直接输入 Material 色彩模型参数。                                                                       |
| XYZ       | `xyz(0.41, 0.21, 0.05)`      | CIE XYZ（D65 白点），标准化值（通常 0-1）。                                                                |
| ARGB 函数 | `argb(0xff0f774a)`           | 接受一个 ARGB 整数。                                                                                       |
| ARGB 整数 | `0xff0f774a` 或 `4278851722` | 支持十进制或 `0x` 前缀形式。                                                                               |
| 随机颜色  | `random`                     | 生成一个不透明随机颜色。`random-color` 作为向后兼容的别名也被支持。                                        |

如果输入为空或格式不支持，CLI 会报错退出。

`random` 可用于位置参数，以及 `--primary`、`--secondary`、`--tertiary`、`--error`、`--neutral`、`--neutral-variant` 这些颜色覆盖选项。

## 命令选项

### 公共选项（所有命令）

以下选项适用于 `g c`、`g p`（两种模式）以及裸 `[color]` 形式。

| 选项                                | 默认值    | 说明                                                                                                                                                                                                              |
| ----------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--format <format>`                 | `css`     | 输出格式。支持的值：`css`、`json`、`xml`、`yaml`、`js`、`ts`、`csv`。                                                                                                                                             |
| `--variant <variant>`               | `neutral` | 动态方案变体。接受数字 `0`–`8` 或命名值：`MONOCHROME`、`NEUTRAL`、`TONAL_SPOT` / `TONALSPOT`、`VIBRANT`、`EXPRESSIVE`、`FIDELITY`、`CONTENT`、`RAINBOW`、`FRUIT_SALAD` / `FRUITSALAD`。大小写不敏感，下划线可选。 |
| `--contrast-level <contrast-level>` | `0`       | 对比度级别。只接受 `-1`、`0`、`1`。                                                                                                                                                                               |
| `--spec-version <spec-version>`     | `2025`    | 设计规范版本。接受 `2021`、`2025`、`2026`。`2026` 会被映射到 `2025` 规范。                                                                                                                                        |
| `--platform <platform>`             | `phone`   | 目标平台。只接受 `phone` 和 `watch`。                                                                                                                                                                             |
| `--primary <color>`                 | 无        | 覆盖 primary palette 源色。                                                                                                                                                                                       |
| `--secondary <color>`               | 无        | 覆盖 secondary palette 源色。                                                                                                                                                                                     |
| `--tertiary <color>`                | 无        | 覆盖 tertiary palette 源色。                                                                                                                                                                                      |
| `--error <color>`                   | 无        | 覆盖 error palette 源色。                                                                                                                                                                                         |
| `--neutral <color>`                 | 无        | 覆盖 neutral palette 源色。                                                                                                                                                                                       |
| `--neutral-variant <color>`         | 无        | 覆盖 neutral-variant palette 源色。                                                                                                                                                                               |
| `--var-prefix <prefix>`             | auto\*    | CSS 变量/JSON/XML 键名的自定义前缀。默认：颜色用 `md-sys-color-`，palette 用 `md-sys-ref-`。提供时直接替换默认值，**不注入中缀**。在 `g p`（自定义）模式下忽略，前缀来自位置参数。                                |
| `--help`                            | 无        | 显示帮助信息。                                                                                                                                                                                                    |

\* 实际默认前缀取决于命令：`g c` 默认 `md-sys-color`，`g p`（主题化）默认 `md-sys-ref`。`g p`（自定义）模式下前缀来自位置参数，`--var-prefix` 被忽略。

这些颜色覆盖选项接受与源色相同的语法：Hex、RGB、RGBA、LAB、HCT、XYZ、ARGB 函数和 ARGB 整数。

### `g c` — 过滤选项

| 选项                        | 默认值 | 说明                                                        |
| --------------------------- | ------ | ----------------------------------------------------------- |
| `--include <token-name...>` | 无     | 白名单，只保留列出的颜色 token（如 `primary`、`surface`）。 |
| `--exclude <token-name...>` | 无     | 黑名单，移除列出的颜色 token。                              |

注意事项：

- `--include` 和 `--exclude` 互斥，不能同时使用。
- 名称会先归一化为 kebab-case 再匹配（`primaryContainer` → `primary-container`）。
- 未识别的名称会发出警告，然后被忽略。

### `g p`（主题化）— 过滤选项

| 选项                        | 默认值   | 说明                                                                                                                                               |
| --------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--include <token-name...>` | 无       | 只保留这些 palette family 或具体 tone（如 `primary`、`secondary-50`）。                                                                            |
| `--exclude <token-name...>` | 无       | 移除这些 palette family 或具体 tone。与 `--include` 互斥。                                                                                         |
| `--tones <tone-list>`       | `0..100` | 逗号或空格分隔的整数 tone（如 `0, 10, 50, 100`），范围 `0`–`100`。限制全部 6 个 family 只输出这些 tone。`--palette-tones` 作为已弃用的别名被接受。 |

### `g p`（自定义）— 过滤选项

| 选项                        | 默认值   | 说明                                                                                                             |
| --------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `--include <token-name...>` | 无       | 只保留这些 tone（接受裸数字 `10` 或可提取数字的 token 名 `my-prefix-10`）。                                      |
| `--exclude <token-name...>` | 无       | 移除这些 tone。与 `--include` 互斥。                                                                             |
| `--tones <tone-list>`       | `0..100` | 逗号或空格分隔的整数 tone（如 `0, 10, 50, 100`）。控制默认 tone 集合。`--palette-tones` 作为已弃用的别名被接受。 |

对于自定义 palette，`--include` 和 `--exclude` 从 token 名中提取数字 tone。裸数字如 `10` 也被接受。`--include` 非空时覆盖 `--tones` 的选择。

## 示例

### 生成颜色 (`g c`)

```bash
# 默认 CSS 输出
material-theme-cli g c "#0f774a"

# JSON 输出
material-theme-cli g c "#0f774a" --format json

# 仅显示 primary 和 error 的 token
material-theme-cli g c "#0f774a" --include primary error

# 排除 surface 相关 token
material-theme-cli g c "#0f774a" --exclude surface surface-dim surface-bright

# 自定义 variant 和对比度
material-theme-cli g c "#0f774a" --variant FRUIT_SALAD --contrast-level 1

# 自定义 CSS 变量前缀
material-theme-cli g c "#0f774a" --var-prefix my-app

# 覆盖单个 palette 源色
material-theme-cli g c "#0f774a" --primary "#1d4ed8" --secondary "#14b8a6"
```

### 生成主题化 Palettes (`g p [color]`)

```bash
# 默认：6 个 family × 101 个 tone = 606 个 token（CSS）
material-theme-cli g p "#0f774a"

# JSON 输出 + 选定 tone
material-theme-cli g p "#0f774a" --format json --tones "0, 10, 50, 100"

# 仅限特定 family
material-theme-cli g p "#0f774a" --include primary secondary

# 排除 neutral 相关 family
material-theme-cli g p "#0f774a" --exclude neutral neutral-variant

# 自定义前缀
material-theme-cli g p "#0f774a" --var-prefix my-theme
```

### 生成自定义 Palette (`g p [prefix] [color]`)

```bash
# 单个自定义 palette，全部 101 个 tone
material-theme-cli g p my-brand "#0f774a"

# 指定 tone
material-theme-cli g p my-brand "#0f774a" --tones "0, 50, 100"

# 仅保留指定 tone
material-theme-cli g p my-brand "#0f774a" --include "10" --include "50"

# 排除指定 tone
material-theme-cli g p my-brand "#0f774a" --exclude my-brand-0 --exclude my-brand-100
```

### 向后兼容（裸 `[color]`）

```bash
# 等同于 `g c`
material-theme-cli "#0f774a"
material-theme-cli random
material-theme-cli "#0f774a" --format json --include primary
```

## 输出协议

CLI 将所有输出发送到 stdout（终端）。如需保存到文件，使用 Shell 重定向：

```bash
material-theme-cli g c "#0f774a" --format json > theme.json
```

### 格式详情

- **CSS**：输出 `:root { ... }`，包含 `--{prefix}-*` 自定义属性，值使用 `light-dark(light, dark)`。默认前缀：颜色 token 用 `--md-sys-color-`，palette token 用 `--md-sys-ref-`。自定义 `--var-prefix` 直接替换默认值（无中缀注入）。
- **JSON** / **YAML**：颜色输出包含顶层 `light`、`dark`、`scheme` 对象。Palette 输出含顶层 `palette` 对象。
- **XML**：输出 `<?xml?>` 和 `<resources>`，包含 `<color>` 节点。颜色名使用 `_light` / `_dark` 后缀。
- **JS** / **TS**：输出 ESM `export const` 声明，使用 `PascalCase` + `Light`/`Dark`/`Scheme` 后缀。
- **CSV**：表头 `scheme,token-name,color-value`。颜色 token 每个产生 3 行（light/dark/scheme），palette token 每个产生 1 行（palette）。

键会归一化为 kebab-case（CSS、JSON）、snake_case（XML）或 PascalCase（JS/TS），并按字母排序以保证确定性输出。

### 开源协议

本项目采用 MIT License 发布，详见 [LICENSE](LICENSE)。第三方依赖的许可条款分别以各自项目为准。
