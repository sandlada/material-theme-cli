# @sandlada/material-theme-cli

![npm version](https://img.shields.io/npm/v/@sandlada/material-theme-cli?label=NPM%20Version&labelColor=%2300531f&color=%23a3f5aa)
![GitHub License](https://img.shields.io/github/license/sandlada/material-theme-cli?label=License&labelColor=%2300531f&color=%23a3f5aa)

一个基于 Material Design 动态色彩系统的 CLI。输入一个源色，它会生成可直接用于前端工程、设计令牌、脚本集成和批量导出的主题数据。

运行环境：Node.js 22+，并且项目使用 ESM。

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

1. 直接把一个颜色传给 CLI，默认会在终端输出 CSS：

```bash
material-theme-cli "#0f774a"
```

2. 如果你想写入文件，切换到 `file` 输出并指定路径：

```bash
material-theme-cli "#0f774a" --format css --output file --path ./theme.css
```

3. 如果颜色已经放在文本文件里，可以用 `--input` 读取：

```text
# color.txt
#0f774a
```

```bash
material-theme-cli --input ./color.txt --format json --output file --path ./theme.json
```

## 使用教程

推荐的使用顺序很简单：先确定输入颜色，再选输出格式，最后决定是预览还是落盘。

1. 选择输入方式。

你可以直接传入 `[color]`，也可以使用 `--input <file-path>` 从文件读取。若同时提供两者，`--input` 会优先。

2. 选择输出方式。

默认输出到终端。如果要生成文件，使用 `--output file`，并用 `--path` 指定目标位置。若省略 `--path`，默认写到当前工作目录下的 `./output.<format>`。

3. 选择格式和主题参数。

如果你只是想快速看效果，保持默认值即可。如果你要接入设计系统或多平台主题，再调整 `--variant`、`--contrast-level`、`--spec-version`、`--platform`，或者用 `--primary`、`--secondary` 等参数覆盖配色盘。

4. 需要筛选 token 时使用白名单或黑名单。

`--token` 是白名单，`--exclude` 是黑名单。它们先把名字归一化为 kebab-case，再进行匹配，并且互斥。

## 命令用法

```bash
material-theme-cli [color] \
  [--input <file-path>] \
  [--format <css|json|xml|yaml|js|ts|csv>] \
  [--output <console|file>] \
  [--path <output-file-path>] \
  [--make-js <output-js-file-path>] \
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

默认行为：

- `--format css`
- `--output console`
- `--variant TONAL_SPOT`
- `--contrast-level 0`
- `--spec-version 2025`
- `--platform phone`

## 颜色输入格式

CLI 接受的颜色语法如下：

| 语法      | 示例                         | 说明                                                                                                       |
| --------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Hex       | `#0f774a`                    | 支持 `#RGB`、`#RRGGBB`、`#RGBA`、`#RRGGBBAA`。纯数字的十六进制值必须保留前导 `#`，否则可能被当成整数解析。 |
| RGB       | `rgb(15, 119, 74)`           | 通道可写成 `0-255` 的整数，或 `0%-100%` 的百分比。                                                         |
| RGBA      | `rgba(15, 119, 74, 1)`       | 只接受完全不透明的 alpha，也就是 `1` 或 `100%`。                                                           |
| LAB       | `lab(44.3, -15.2, 18.6)`     | 直接按 LAB 值转换。                                                                                        |
| HCT       | `hct(270, 75, 50)`           | 适合直接输入 Material 色彩模型参数。                                                                       |
| ARGB 函数 | `argb(0xff0f774a)`           | 只接受一个 ARGB 整数。                                                                                     |
| ARGB 整数 | `0xff0f774a` 或 `4278851722` | 支持十进制或 `0x` 前缀形式。                                                                               |

如果输入为空或格式不支持，CLI 会直接报错并退出。

## 命令选项文档

### 输入与输出

| 选项                              | 默认值              | 说明                                                                                                                          |
| --------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `[color]`                         | 无                  | 位置参数，直接传入颜色值。                                                                                                    |
| `--input <file-path>`             | 无                  | 从文件读取源色文本，读取后会去掉首尾空白。路径按当前工作目录解析。                                                            |
| `--format <format>`               | `css`               | 输出格式，支持 `css`、`json`、`xml`、`yaml`、`js`、`ts`、`csv`。                                                              |
| `--output <target>`               | `console`           | `console` 直接打印到终端；`file` 写入文件。                                                                                   |
| `--path <output-file-path>`       | `./output.<format>` | 当 `--output file` 时使用。路径按当前工作目录解析。                                                                           |
| `--make-js <output-js-file-path>` | 无                  | 生成一个可复用的 ESM 包装脚本。它会把当前 CLI 配置固化进去，并在运行时调用 `dist/index.js`。它和 `--format js` 不是同一件事。 |
| `--help`                          | 无                  | 显示帮助信息。                                                                                                                |

### 主题与配色

| 选项                                | 默认值       | 说明                                                                                                                                                                                                                           |
| ----------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--variant <variant>`               | `TONAL_SPOT` | 动态方案变体。可用值包括：`0` = `MONOCHROME`，`1` = `NEUTRAL`，`2` = `TONAL_SPOT` / `TONALSPOT`，`3` = `VIBRANT`，`4` = `EXPRESSIVE`，`5` = `FIDELITY`，`6` = `CONTENT`，`7` = `RAINBOW`，`8` = `FRUIT_SALAD` / `FRUITSALAD`。 |
| `--contrast-level <contrast-level>` | `1`          | 对比度级别，只接受 `-1`、`0`、`1`。                                                                                                                                                                                            |
| `--spec-version <spec-version>`     | `2025`       | 设计规范版本，只接受 `2021` 或 `2025`。                                                                                                                                                                                        |
| `--platform <platform>`             | `phone`      | 目标平台，只接受 `phone` 或 `watch`。                                                                                                                                                                                          |
| `--primary <color>`                 | 无           | 覆盖 primary 配色盘。                                                                                                                                                                                                          |
| `--secondary <color>`               | 无           | 覆盖 secondary 配色盘。                                                                                                                                                                                                        |
| `--tertiary <color>`                | 无           | 覆盖 tertiary 配色盘。                                                                                                                                                                                                         |
| `--error <color>`                   | 无           | 覆盖 error 配色盘。                                                                                                                                                                                                            |
| `--neutral <color>`                 | 无           | 覆盖 neutral 配色盘。                                                                                                                                                                                                          |
| `--neutral-variant <color>`         | 无           | 覆盖 neutral-variant 配色盘。                                                                                                                                                                                                  |

这些颜色覆盖参数接受和源色相同的语法，也就是 Hex、RGB、RGBA、LAB、HCT、ARGB 函数和 ARGB 整数。

### 过滤

| 选项                        | 默认值 | 说明                                         |
| --------------------------- | ------ | -------------------------------------------- |
| `--token <token-name...>`   | 无     | 白名单，只保留这些 token。支持一次传多个值。 |
| `--exclude <token-name...>` | 无     | 黑名单，排除这些 token。支持一次传多个值。   |

注意事项：

- `--token` 和 `--exclude` 互斥，不能同时使用。
- 参与匹配的名称会先归一化为 kebab-case，所以 `primaryContainer`、`PRIMARY_CONTAINER`、`primary-container` 会被视为同一个名字。
- 未识别的名称会发出警告，然后被忽略。

## 使用案例

### 1. 终端预览，默认输出 CSS

```bash
material-theme-cli "#0f774a"
```

### 2. 输出 CSS 文件

```bash
material-theme-cli "#0f774a" --format css --output file --path ./theme.css
```

### 3. 输出 JSON 文件

```bash
material-theme-cli "#0f774a" --format json --output file --path ./theme.json
```

### 4. 从文件读取颜色

```bash
material-theme-cli --input ./color.txt --format yaml --output file --path ./theme.yaml
```

### 5. 生成 TypeScript 模块

`js` 和 `ts` 的序列化内容一致，都会生成 `export const MdSysColor = { ... }` 这种模块源码。

```bash
material-theme-cli "#0f774a" --format ts --output file --path ./theme.ts
```

### 6. 使用 token 白名单

```bash
material-theme-cli "#0f774a" --token primary surface-tint on-primary
```

### 7. 使用 token 黑名单

```bash
material-theme-cli "#0f774a" --exclude surface-tint outline shadow
```

### 8. 覆盖配色盘

```bash
material-theme-cli "#0f774a" --primary "#1d4ed8" --secondary "#14b8a6" --neutral "#111827"
```

### 9. 调整方案、对比度和平台

```bash
material-theme-cli "#0f774a" --variant FRUIT_SALAD --contrast-level 0 --spec-version 2025 --platform watch
```

### 10. 生成可复用脚本

```bash
material-theme-cli "#0f774a" --make-js ./scripts/theme-generator.js --format css --output file --path ./theme.css
```

`--make-js` 会生成一个运行时脚本，把当前参数固化进去。该脚本依赖构建产物 `dist/index.js`，因此要在仓库构建完成后再执行它。

## 协议说明

### 输出协议

CLI 内部会先生成一组 `lightObject` 和 `darkObject`，再把它们序列化成不同格式。为了保证输出稳定，键会先归一化为 kebab-case，再按字母顺序排序。

- `css`：输出 `:root` 和 `--md-sys-color-*` 自定义属性，值使用 `light-dark(light, dark)`。
- `json` / `yaml`：输出包含 `light`、`dark`、`scheme` 三个顶层节点的主题对象。
- `xml`：输出 `resources` 节点，颜色名使用 `md_sys_color_*_light` 和 `md_sys_color_*_dark`。
- `js` / `ts`：输出 `export const MdSysColor = { ... }` 模块源码，`Light`、`Dark`、`Scheme` 后缀分别表示浅色、深色和组合值。
- `csv`：表头固定为 `scheme,token-name,color-value`，每个 token 会展开为三行，分别对应 `light`、`dark` 和 `scheme`。

如果 `light` 和 `dark` 的归一化键不一致，序列化会失败，这能避免生成不完整的主题文件。

### 开源协议

本项目采用 MIT License 发布，详见 [LICENSE](LICENSE)。第三方依赖的许可条款分别以各自项目为准。
