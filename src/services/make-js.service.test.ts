import { Hct, TonalPalette, Variant } from "@material/material-color-utilities";
import { describe, expect, it } from "vitest";
import { MakeJsService } from "./make-js.service";

describe("MakeJsService", () => {
    it("creates a runnable ESM script with embedded configuration", () => {
        const script = MakeJsService.create({
            outputPath: "E:/projects/sandlada/material-theme-cli/theme.js",
            sourceColorExpression: 'Hct.fromInt(argbFromRgb(15, 119, 74))',
            variant: Variant.TONAL_SPOT,
            contrastLevel: 1,
            specVersion: "2025",
            platform: "phone",
            palettes: {
                primaryPalette: TonalPalette.fromHct(Hct.fromInt(0xff0f774a)),
            },
            whiteList: ["primary", "surface-tint"],
            blackList: [],
            format: "css",
            output: "console",
        });

        expect(script).toContain('#!/usr/bin/env node');
        expect(script).toContain('import { Hct, TonalPalette, Variant, argbFromHex, argbFromLab, argbFromRgb } from "@material/material-color-utilities";');
        expect(script).toContain('import { MaterialColorService, SerializationService } from "./dist/index.js";');
        expect(script).toContain('const sourceColor = Hct.fromInt(argbFromRgb(15, 119, 74));');
        expect(script).toContain('primaryPalette: TonalPalette.fromHct(Hct.fromInt(0xff0f774a))');
        expect(script).toContain('variant: Variant.TONAL_SPOT,');
        expect(script).toContain('format: "css",');
        expect(script).toContain('output: "console",');
        expect(script).toContain('export function generateTheme()');
        expect(script).toContain('if (isMain) {');
    });

    it("resolves the bundle import path relative to the generated file location", () => {
        const script = MakeJsService.create({
            outputPath: "E:/projects/sandlada/material-theme-cli/generated/theme.js",
            sourceColorExpression: 'Hct.from(270, 75, 50)',
            variant: Variant.TONAL_SPOT,
            contrastLevel: 1,
            specVersion: "2025",
            platform: "phone",
            palettes: {},
            whiteList: [],
            blackList: [],
            format: "css",
            output: "file",
            path: "./theme.css",
        });

        expect(script).toContain('import { MaterialColorService, SerializationService } from "../dist/index.js";');
        expect(script).toContain('path: "./theme.css",');
        expect(script).toContain('output: "file",');
    });
});
