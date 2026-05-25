import { Variant } from "@material/material-color-utilities";
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
                primaryPalette: 'Hct.fromInt(0xff0f774a)',
            },
            themeWhiteList: ["primary", "surface-tint"],
            themeBlackList: [],
            paletteWhiteList: [{ family: "primary", tone: 50 }],
            paletteBlackList: [],
            includePalette: true,
            paletteOnly: false,
            paletteTones: [0, 1, 50],
            format: "css",
            output: "console",
        });

        expect(script).toContain('#!/usr/bin/env node');
        expect(script).toContain('import { Hct, TonalPalette, Variant, argbFromHex, argbFromLab, argbFromRgb } from "@material/material-color-utilities";');
        expect(script).toContain('import { MaterialColorService, SerializationService } from "./dist/index.js";');
        expect(script).toContain('const sourceColor = Hct.fromInt(argbFromRgb(15, 119, 74));');
        expect(script).toContain('primaryPalette: TonalPalette.fromHct(Hct.fromInt(0xff0f774a))');
        expect(script).toContain('includePalette: true,');
        expect(script).toContain('paletteOnly: false,');
        expect(script).toContain('paletteTones: [0,1,50],');
        expect(script).toContain('themeWhiteList: ["primary","surface-tint"],');
        expect(script).toContain('paletteWhiteList: [{"family":"primary","tone":50}],');
        expect(script).toContain('variant: Variant.TONAL_SPOT,');
        expect(script).toContain('format: "css",');
        expect(script).toContain('output: "console",');
        expect(script).toContain('export function generateTheme()');
        expect(script).toContain('if (isMain) {');
    });

    it("adds runtime random-color support when requested", () => {
        const script = MakeJsService.create({
            outputPath: "E:/projects/sandlada/material-theme-cli/generated/theme.js",
            sourceColorExpression: "createRandomColor()",
            variant: Variant.TONAL_SPOT,
            contrastLevel: 1,
            specVersion: "2025",
            platform: "phone",
            palettes: {
                primaryPalette: "createRandomColor()",
            },
            themeWhiteList: [],
            themeBlackList: [],
            paletteWhiteList: [{ family: "primary" }],
            paletteBlackList: [],
            includePalette: true,
            paletteOnly: true,
            paletteTones: undefined,
            format: "css",
            output: "file",
            path: "./theme.css",
            usesRandomColor: true,
        });

        expect(script).toContain('import { randomInt } from "node:crypto";');
        expect(script).toContain('function createRandomColor() {');
        expect(script).toContain('return Hct.fromInt(argbFromRgb(randomInt(256), randomInt(256), randomInt(256)));');
        expect(script).toContain('const sourceColor = createRandomColor();');
        expect(script).toContain('primaryPalette: TonalPalette.fromHct(createRandomColor())');
        expect(script).toContain('includePalette: true,');
        expect(script).toContain('paletteOnly: true,');
        expect(script).toContain('paletteTones: undefined,');
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
            themeWhiteList: [],
            themeBlackList: [],
            paletteWhiteList: [],
            paletteBlackList: [],
            includePalette: false,
            paletteOnly: false,
            paletteTones: undefined,
            format: "css",
            output: "file",
            path: "./theme.css",
        });

        expect(script).toContain('import { MaterialColorService, SerializationService } from "../dist/index.js";');
        expect(script).toContain('path: "./theme.css",');
        expect(script).toContain('output: "file",');
    });
});
