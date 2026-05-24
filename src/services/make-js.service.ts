import { Variant, type Platform } from "@material/material-color-utilities";
import { dirname, relative, resolve } from "node:path";
import type { SerializationFormat } from "./serialization.service";

type MakeJsPaletteName =
    | "primaryPalette"
    | "secondaryPalette"
    | "tertiaryPalette"
    | "errorPalette"
    | "neutralPalette"
    | "neutralVariantPalette";

type MakeJsPaletteExpressions = Partial<Record<MakeJsPaletteName, string>>;

export type MakeJsGenerationOptions = {
    outputPath: string;
    sourceColorExpression: string;
    variant: Variant;
    contrastLevel: -1 | 0 | 1;
    specVersion: "2021" | "2025";
    platform: Platform;
    palettes: MakeJsPaletteExpressions;
    whiteList: string[];
    blackList: string[];
    format: SerializationFormat;
    output: "console" | "file";
    path?: string;
    usesRandomColor?: boolean;
};

export class MakeJsService {
    private constructor() { }

    public static create(args: MakeJsGenerationOptions) {
        const bundleImportPath = this.resolveBundleImportPath(args.outputPath);
        const paletteSource = this.renderPaletteOverrides(args.palettes);
        const runtimePath = args.output === "file" ? JSON.stringify(args.path ?? `./output.${args.format}`) : "undefined";
        const variantExpression = `Variant.${Variant[args.variant]}`;
        const randomSupportLines = args.usesRandomColor
            ? [
                'import { randomInt } from "node:crypto";',
                "",
                "function createRandomColor() {",
                "    return Hct.fromInt(argbFromRgb(randomInt(256), randomInt(256), randomInt(256)));",
                "}",
                "",
            ]
            : [];
        const configLines = [
            "const config = {",
            "    sourceColor,",
            `    variant: ${variantExpression},`,
            `    contrast: ${args.contrastLevel},`,
            `    specVersion: ${JSON.stringify(args.specVersion)},`,
            `    platform: ${JSON.stringify(args.platform)},`,
            "    palettes,",
            `    whiteList: ${JSON.stringify(args.whiteList)},`,
            `    blackList: ${JSON.stringify(args.blackList)},`,
            `    format: ${JSON.stringify(args.format)},`,
            `    output: ${JSON.stringify(args.output)},`,
        ];

        if (args.output === "file") {
            configLines.push(`    path: ${runtimePath},`);
        }

        configLines.push("};");

        const lines = [
            "#!/usr/bin/env node",
            "",
            ...randomSupportLines,
            'import { Hct, TonalPalette, Variant, argbFromHex, argbFromLab, argbFromRgb } from "@material/material-color-utilities";',
            `import { MaterialColorService, SerializationService } from ${JSON.stringify(bundleImportPath)};`,
            'import { mkdir, writeFile } from "node:fs/promises";',
            'import { dirname, resolve } from "node:path";',
            'import { fileURLToPath } from "node:url";',
            "",
            `const sourceColor = ${args.sourceColorExpression};`,
            `const palettes = ${paletteSource};`,
            ...configLines,
            "",
            "export function generateTheme() {",
            "    const theme = MaterialColorService.create(config);",
            "    return SerializationService.serialize({",
            "        lightObject: theme.lightObject,",
            "        darkObject: theme.darkObject,",
            "        format: config.format,",
            "    });",
            "}",
            "",
            "export async function main() {",
            "    const serializedTheme = generateTheme();",
            "",
            "    if (config.output === 'file') {",
            "        const outputPath = resolve(process.cwd(), config.path ?? `./output.${config.format}`);",
            "        await mkdir(dirname(outputPath), { recursive: true });",
            "        await writeFile(outputPath, serializedTheme, 'utf8');",
            "        return serializedTheme;",
            "    }",
            "",
            "    process.stdout.write(serializedTheme);",
            "    return serializedTheme;",
            "}",
            "",
            "export { config };",
            "",
            "const isMain = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1]);",
            "",
            "if (isMain) {",
            "    await main();",
            "}",
            "",
        ];

        return lines.join("\n");
    }

    private static resolveBundleImportPath(outputPath: string) {
        const normalizedOutputPath = resolve(outputPath);
        const bundlePath = resolve(process.cwd(), "dist/index.js");
        const relativePath = relative(dirname(normalizedOutputPath), bundlePath).replace(/\\/g, "/");

        if (relativePath.startsWith(".")) {
            return relativePath;
        }

        return `./${relativePath}`;
    }

    private static renderPaletteOverrides(palettes: MakeJsPaletteExpressions) {
        const entries = Object.entries(palettes) as [MakeJsPaletteName, string][];

        if (entries.length === 0) {
            return "{}";
        }

        const lines = entries.map(([name, expression]) => `    ${name}: TonalPalette.fromHct(${expression}),`);

        return "{\n" + lines.join("\n") + "\n}";
    }
}
