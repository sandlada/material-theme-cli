# Use Case

> **文档状态**：本文档为 material-theme-cli **v2.0.0 设计规范**。主体描述设计意图（命令、选项、语义、输出格式）；末尾附录「设计与实现的偏差」记录当前代码与设计不一致之处，作为代码侧 TODO 清单。阅读主体可了解目标行为，阅读附录可了解实现现状与待修复项。

## Intro

command name:

```shell
material-theme-cli
```

通过 material-theme-cli 生成精美的且富含多种格式化输出的 CLI。（CLI 原生不提供 output to file，因为操作系统自带 `>>` 等重定向功能，例如 `echo hello >> file.txt`）

## 前置说明

| Option             | Is Optional | Default Value                                                      | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| :----------------- | :---------- | :----------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `<color>`          | No          | `random`                                                           | 表示颜色值，支持 `#hex`（3-8 位）、`0x` ARGB 整数、`argb(int)`、`rgb(r,g,b)`、`rgba(r,g,b,a)`（alpha 仅允许 `1` 或 `100%`）、`hct(h,c,t)`、`lab(l,a,b)`、`xyz(x,y,z)`，以及特殊值 `random` / `random-color`（大小写不敏感）。**不支持** `hsl()`/`hsla()`、CSS 命名色、`ramdom`（拼写错误）。                                                                                                                                                                  |
| `<variant>`        | Yes         | `neutral`                                                          | 表示变体，参数包含数字 `0` 到 `8`，或者是字符串 `MONOCHROME`、`NEUTRAL`、`TONAL_SPOT`/`TONALSPOT`、`VIBRANT`、`EXPRESSIVE`、`FIDELITY`、`CONTENT`、`RAINBOW`、`FRUIT_SALAD`/`FRUITSALAD`（可全大写也可全小写也可任意大小写，其中 `Fruit_Salad` 和 `Tonal_Spot` 的下划线可省略，连字符 `-` 与空格也会被规范化）。数字映射：`0`→MONOCHROME, `1`→NEUTRAL, `2`→TONAL_SPOT, `3`→VIBRANT, `4`→EXPRESSIVE, `5`→FIDELITY, `6`→CONTENT, `7`→RAINBOW, `8`→FRUIT_SALAD。 |
| `<spec-version>`   | Yes         | `2025`                                                             | 表示实现版本，取值包含 `2021`、`2025`、`2026`，也可传递为字符串 `"2021"`、`"2025"`、`"2026"`。三个版本在设计上各自独立。                                                                                                                                                                                                                                                                                                                                      |
| `<contrast-level>` | Yes         | `0`                                                                | 表示对比度，取值包含 `-1`、`0`、`1`，也可以是字符串 `"-1"`、`"0"`、`"1"`。                                                                                                                                                                                                                                                                                                                                                                                    |
| `<format>`         | Yes         | `css`                                                              | 表示 CLI 输出结果的格式，取值包含 `css`、`json`、`xml`、`yaml`、`js`、`ts`、`csv`，也可传递为字符串。大小写不敏感；`yml` 作为 `yaml` 的别名被接受。                                                                                                                                                                                                                                                                                                           |
| `<platform>`       | Yes         | `phone`                                                            | 表示目标平台，取值仅包含 `phone` 和 `watch`，可传递为字符串，大小写不敏感。                                                                                                                                                                                                                                                                                                                                                                                   |
| `<tone-list>`      | Yes         | `[0, 1, 2, ..., 100]`                                              | 表示 Tone 的层级，从 `0` 到 `100` 的整数。可传入为逗号或空格分隔的字符串，例如 `"0, 1"`、`"0 50 100"`。值会去重并升序排列。                                                                                                                                                                                                                                                                                                                                   |
| `<var-prefix>`     | Yes         | 生成 color 时默认 `md-sys-color`，生成 palette 时默认 `md-sys-ref` | 用于自定义生成结果的变量前缀。以生成 color + css format + `my-prefix` 为例，输出结果的 `primary` 取值是 `var(--my-prefix-primary, ...)`。详见 [前缀与命名规则](#前缀与命名规则)。                                                                                                                                                                                                                                                                             |

## 命令总览

CLI 提供三种命令形式：

| 命令                                      | 说明                                                                                                                                   |
| :---------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------- |
| `material-theme-cli [color]`              | **顶层向后兼容命令**。仅接受可选的 `[color]` 位置参数，**不接受任何选项**。使用全部默认值生成 color tokens（前缀 `--md-sys-color-`）。 |
| `material-theme-cli g c [color]`          | 生成 color tokens。接受完整 color 选项集。                                                                                             |
| `material-theme-cli g p [color]`          | 生成主题化 palette（6 个 family × 全部 tone）。接受完整 palette 选项集。                                                               |
| `material-theme-cli g p [prefix] [color]` | 生成自定义 palette（单个 family，使用给定 `prefix`）。接受完整 palette 选项集。                                                        |

### `g p` 消歧规则

`g p` 通过**位置参数个数**区分两种模式，不做内容校验：

| 参数个数 | 模式   | 第一个参数         | 第二个参数   |
| :------- | :----- | :----------------- | :----------- |
| `0`      | 主题化 | —（使用 `random`） | —            |
| `1`      | 主题化 | 视为 `color`       | —            |
| `≥2`     | 自定义 | 视为 `prefix`      | 视为 `color` |

> 注意：`g p foo bar` 中 `foo` 会被当作 `prefix`，即使它不是合法颜色值——消歧纯按位置，不校验内容。超出第二个的额外参数被静默忽略。

## Generate Colors

```shell
material-theme-cli g c [color] \
    可选项 ...
```

有效可选项（共 14 个）：

| Option Name         |             Option | Description                                                               |
| :------------------ | -----------------: | :------------------------------------------------------------------------ |
| `--format`          |         `<format>` |                                                                           |
| `--include`         |  `<token-name...>` | 限定需要输出的结果，例如 `surface`、`on-primary`。与 `--exclude` 互斥。   |
| `--exclude`         |  `<token-name...>` | 限定不需要输出的结果，例如 `surface`、`on-primary`。与 `--include` 互斥。 |
| `--variant`         |        `<variant>` |                                                                           |
| `--contrast-level`  | `<contrast-level>` |                                                                           |
| `--spec-version`    |   `<spec-version>` |                                                                           |
| `--platform`        |       `<platform>` |                                                                           |
| `--primary`         |          `<color>` | 覆盖 primary palette 源色。                                               |
| `--secondary`       |          `<color>` | 覆盖 secondary palette 源色。                                             |
| `--tertiary`        |          `<color>` | 覆盖 tertiary palette 源色。                                              |
| `--error`           |          `<color>` | 覆盖 error palette 源色。                                                 |
| `--neutral`         |          `<color>` | 覆盖 neutral palette 源色。                                               |
| `--neutral-variant` |          `<color>` | 覆盖 neutral-variant palette 源色。                                       |
| `--var-prefix`      |     `<var-prefix>` |                                                                           |

> `--tones`（tone-list）**不接受**于 `g c`，仅在 `g p` 上有效；在 `g c` 上传入会被拒绝。

## Generate Palettes

### 生成一批主题化 palette

```bash
material-theme-cli g p [color] \
    可选项 ...
```

有效可选项（共 15 个，比 `g c` 多 `--tones`）：

| Option Name         |             Option | Description                                                                               |
| :------------------ | -----------------: | :---------------------------------------------------------------------------------------- |
| `--format`          |         `<format>` |                                                                                           |
| `--tones`           |      `<tone-list>` | 限定生成的 tone 层级。                                                                    |
| `--include`         |  `<token-name...>` | 限定需要输出的 family 或具体 token，例如 `primary`、`secondary-50`。与 `--exclude` 互斥。 |
| `--exclude`         |  `<token-name...>` | 限定不需要输出的 family 或具体 token。与 `--include` 互斥。                               |
| `--variant`         |        `<variant>` |                                                                                           |
| `--contrast-level`  | `<contrast-level>` |                                                                                           |
| `--spec-version`    |   `<spec-version>` |                                                                                           |
| `--platform`        |       `<platform>` |                                                                                           |
| `--primary`         |          `<color>` | 覆盖 primary palette 源色。                                                               |
| `--secondary`       |          `<color>` | 覆盖 secondary palette 源色。                                                             |
| `--tertiary`        |          `<color>` | 覆盖 tertiary palette 源色。                                                              |
| `--error`           |          `<color>` | 覆盖 error palette 源色。                                                                 |
| `--neutral`         |          `<color>` | 覆盖 neutral palette 源色。                                                               |
| `--neutral-variant` |          `<color>` | 覆盖 neutral-variant palette 源色。                                                       |
| `--var-prefix`      |     `<var-prefix>` |                                                                                           |

### 生成一个自定义 palette

```bash
material-theme-cli g p [var-prefix] [color] \
    可选项 ...
```

有效可选项（共 14 个；`--var-prefix` 在此模式下被忽略，前缀来自位置参数 `[var-prefix]`）：

| Option Name         |             Option | Description                                                                                                     |
| :------------------ | -----------------: | :-------------------------------------------------------------------------------------------------------------- |
| `--format`          |         `<format>` |                                                                                                                 |
| `--tones`           |      `<tone-list>` | 限定生成的 tone 层级。                                                                                          |
| `--include`         |  `<token-name...>` | 限定需要输出的 tone，接受裸 tone 数字（`50`）或可提取数字段的 token 名（`my-prefix-10`）。与 `--exclude` 互斥。 |
| `--exclude`         |  `<token-name...>` | 限定不需要输出的 tone。与 `--include` 互斥。                                                                    |
| `--variant`         |        `<variant>` |                                                                                                                 |
| `--contrast-level`  | `<contrast-level>` |                                                                                                                 |
| `--spec-version`    |   `<spec-version>` |                                                                                                                 |
| `--platform`        |       `<platform>` |                                                                                                                 |
| `--primary`         |          `<color>` | 覆盖 primary palette 源色。                                                                                     |
| `--secondary`       |          `<color>` | 覆盖 secondary palette 源色。                                                                                   |
| `--tertiary`        |          `<color>` | 覆盖 tertiary palette 源色。                                                                                    |
| `--error`           |          `<color>` | 覆盖 error palette 源色。                                                                                       |
| `--neutral`         |          `<color>` | 覆盖 neutral palette 源色。                                                                                     |
| `--neutral-variant` |          `<color>` | 覆盖 neutral-variant palette 源色。                                                                             |

## 输出格式规范

支持 7 种格式，控制台与文件输出结构一致（CLI 仅控制台输出，文件写入依赖操作系统重定向）。

### Token 数量不变量

| 命令                             | 输出 token 数 | 说明                           |
| :------------------------------- | ------------: | :----------------------------- |
| `g c [color]`                    |            59 | Material 库 color token 不变量 |
| `g p [color]`（主题化）          |           606 | 6 family × 101 tone            |
| `g p [prefix] [color]`（自定义） |           101 | 1 family × 101 tone            |

6 个 palette family：`primary`、`secondary`、`tertiary`、`error`、`neutral`、`neutral-variant`。

### 各格式结构

| 格式   | 结构说明                                                                                                                                                                                          |
| :----- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `css`  | 包裹于 `:root { ... }`；每个 theme token 用 `light-dark(#light, #dark)` 包裹；palette token 为普通 `key: value;`。                                                                                |
| `json` | `JSON.stringify(record, null, 4)`；record 顶层键：`light`、`dark`、`scheme`（含 theme 时）、`palette`（含 palette 时）。                                                                          |
| `xml`  | `<?xml ...?>` + `<resources>`；每个 theme token 拆为两个 `<color>` 节点，键名加 `_light`/`_dark` 后缀；palette token 为单个 `<color>` 节点。                                                      |
| `yaml` | 与 JSON 结构相同（`js-yaml` dump，缩进 4，`lineWidth: -1`）。                                                                                                                                     |
| `js`   | `export const MdSysColor = { PrimaryLight: "...", PrimaryDark: "...", PrimaryScheme: "..." }`（PascalCase + Light/Dark/Scheme 后缀）；palette 为 `export const MdSysPalette = { "key": value }`。 |
| `ts`   | 与 `js` 字节相同（同样调用 `toModuleSource`，不添加类型注解）。                                                                                                                                   |
| `csv`  | 表头 `scheme,token-name,color-value`；theme token 每个产生 3 行（`light`、`dark`、`scheme`）；palette token 每个产生 1 行（`palette`）。                                                          |

## 前缀与命名规则

前缀由 `--var-prefix` 或默认值决定，并随命令模式产生不同的中缀规则。

| 命令模式                             | 前缀来源            | theme token 模式         | palette token 模式                    |
| :----------------------------------- | :------------------ | :----------------------- | :------------------------------------ |
| `g c`（默认）                        | 默认                | `--md-sys-color-{token}` | —（不输出 palette）                   |
| `g c --var-prefix my-prefix`         | `--var-prefix`      | `--my-prefix-{token}`    | —                                     |
| `g p [color]`（主题化，默认）        | 默认                | —（不输出 theme）        | `--md-sys-ref-{family}-{tone}`        |
| `g p [color] --var-prefix my-prefix` | `--var-prefix`      | —                        | `--my-prefix-{family}-{tone}`         |
| `g p [prefix] [color]`（自定义）     | 位置参数 `[prefix]` | —                        | `--{prefix}-{tone}`（裸前缀，无中缀） |

> 设计意图：`--var-prefix` 直接替换默认前缀，不注入 `-color-` 或 `-palette-` 中缀。自定义 palette 模式下 `--var-prefix` 被忽略，前缀来自位置参数。

## 过滤语义

`--include` 与 `--exclude` 在三种命令下语义不同，但都遵循**精确匹配**（非子串）与**互斥**原则（同时传入两者应报错）。

| 命令                             | `--include` / `--exclude` 匹配对象         | 示例                                                                               |
| :------------------------------- | :----------------------------------------- | :--------------------------------------------------------------------------------- |
| `g c`                            | 精确 kebab-case color token 名             | `--include primary` 仅保留 `primary`，不包含 `primary-container`                   |
| `g p [color]`（主题化）          | family 名，可带 tone                       | `--include primary` 保留整个 primary family；`--include primary-50` 仅保留 tone 50 |
| `g p [prefix] [color]`（自定义） | tone 数字（从裸数字或 token 名提取数字段） | `--include 50` 或 `--include my-prefix-50` 均保留 tone 50；非数值项静默忽略        |

**互斥行为（设计意图）**：`--include` 与 `--exclude` 同时传入时，CLI 应报错并退出（非零退出码）。在自定义 palette 模式下，`--include` 优先于 `--tones`（`--include` 非空时覆盖 `--tones` 的选择）。

## 颜色输入语法

`<color>` 支持以下语法（按求值顺序）：

| 语法                      | 示例                          | 说明                                                                      |
| :------------------------ | :---------------------------- | :------------------------------------------------------------------------ |
| `random` / `random-color` | `random`、`RANDOM-COLOR`      | 大小写不敏感，生成随机 HCT 颜色。                                         |
| `hct(h, c, t)`            | `hct(270, 75, 50)`            | 3 个数值参数，分隔符可用逗号、空格或 `/`。                                |
| `xyz(x, y, z)`            | `xyz(0.41, 0.21, 0.05)`       | 3 个数值参数，CIE XYZ（D65 白点），标准化值（通常 0-1）。                 |
| `rgb(r, g, b)`            | `rgb(15, 119, 74)`            | 通道 0-255 或 `0%`-`100%`。                                               |
| `rgba(r, g, b, a)`        | `rgba(15, 119, 74, 1)`        | alpha 仅允许 `1` 或 `100%`（不透明），否则报错。                          |
| `lab(l, a, b)`            | `lab(44.3, -15.2, 18.6)`      | 3 个数值参数。                                                            |
| `argb(int)`               | `argb(0xff0f774a)`            | 1 个整数（十进制或 `0x` 十六进制），32 位范围。                           |
| `#hex`                    | `#0f774a`、`#fff`、`ff0f774a` | 3-8 位十六进制，可选 `#`；纯数字串（无 `#` 且无字母）会被当作 ARGB 整数。 |
| ARGB 整数                 | `0xff0f774a`、`-2147483648`   | 十进制或 `0x` 前缀，可选负号，范围 `-2147483648` 到 `4294967295`。        |

**不支持**：`hsl()`、`hsla()`、CSS 命名色（`red`、`blue`）、`ramdom`（拼写错误）。
