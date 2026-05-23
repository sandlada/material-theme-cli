import { DynamicScheme, Variant, type Hct, type Platform, type TonalPalette } from "@material/material-color-utilities";
import { StringUtil } from "../utils/string-util";

export type MaterialColorKebabCaseName
= 'primary-palette-key-color'
| 'secondary-palette-key-color'
| 'tertiary-palette-key-color'
| 'neutral-palette-key-color'
| 'neutral-variant-palette-key-color'
| 'error-palette-key-color'
| 'background'
| 'on-background'
| 'surface'
| 'surface-dim'
| 'surface-bright'
| 'surface-container-lowest'
| 'surface-container-low'
| 'surface-container'
| 'surface-container-high'
| 'surface-container-highest'
| 'on-surface'
| 'surface-variant'
| 'on-surface-variant'
| 'inverse-surface'
| 'inverse-on-surface'
| 'outline'
| 'outline-variant'
| 'shadow'
| 'scrim'
| 'surface-tint'
| 'primary'
| 'primary-dim'
| 'on-primary'
| 'primary-container'
| 'on-primary-container'
| 'primary-fixed'
| 'primary-fixed-dim'
| 'on-primary-fixed'
| 'on-primary-fixed-variant'
| 'inverse-primary'
| 'secondary'
| 'secondary-dim'
| 'on-secondary'
| 'secondary-container'
| 'on-secondary-container'
| 'secondary-fixed'
| 'secondary-fixed-dim'
| 'on-secondary-fixed'
| 'on-secondary-fixed-variant'
| 'tertiary'
| 'tertiary-dim'
| 'on-tertiary'
| 'tertiary-container'
| 'on-tertiary-container'
| 'tertiary-fixed'
| 'tertiary-fixed-dim'
| 'on-tertiary-fixed'
| 'on-tertiary-fixed-variant'
| 'error'
| 'error-dim'
| 'on-error'
| 'error-container'
| 'on-error-container'

const SchemePaletteNameArray = [
    "primaryPalette",
    "secondaryPalette",
    "tertiaryPalette",
    "errorPalette",
    "neutralPalette",
    "neutralVariantPalette",
] as const;

type SchemePaletteName = (typeof SchemePaletteNameArray)[number];
type CustomizedTonalPalette = {
    name:string
    kebabCasedName: string
    snakeCaseName: string
    hue: number
    chroma: number
    keyColor: Hct
    tone(tone: number): number
    getHct(tone: number): Hct
}
type ThemePalettes = Partial<Record<SchemePaletteName, CustomizedTonalPalette>>;
type CustomizedColor = {
    name: string
    kebabCasedName: string
    snakeCaseName: string
    hct: Hct
    palette: TonalPalette
};

interface Theme {
    light: CustomizedColor[];
    dark: CustomizedColor[];
    palettes: ThemePalettes;
    lightObject: Record<string, number>;
    darkObject: Record<string, number>;
}

export class MaterialColorService {
    private constructor() { }

    public static create(args: {
        sourceColor: Hct;
        contrast?: -1 | 0 | 1;
        variant?: Variant;
        platform?: Platform;
        specVersion?: "2021" | "2025";
        palettes?: Partial<Record<SchemePaletteName, TonalPalette>>;
        whiteList?: MaterialColorKebabCaseName[];
        blackList?: MaterialColorKebabCaseName[];
    }): Theme {
        const { blackList, contrast = 1, palettes = {}, platform = "phone", sourceColor, specVersion = "2025", variant = Variant.TONAL_SPOT, whiteList } = args;
        const normalizedWhiteList = this.normalizeNames(whiteList);
        const normalizedBlackList = this.normalizeNames(blackList);

        if (normalizedWhiteList.size > 0 && normalizedBlackList.size > 0) {
            throw new Error("MaterialColorService.create: whiteList and blackList are mutually exclusive.");
        }

        const lightScheme = this.createTemplateLightScheme(sourceColor, contrast, variant, platform, specVersion, palettes);
        const darkScheme = this.createTemplateDarkScheme(sourceColor, contrast, variant, platform, specVersion, palettes);

        const toCustomizedMaterialDynamicColors = (scheme: DynamicScheme): CustomizedColor[] => [
            ...scheme.colors.allColors,
            scheme.colors.scrim(),
            scheme.colors.shadow(),
            scheme.colors.surfaceTint(),
            scheme.colors.surfaceVariant(),
            scheme.colors.primaryPaletteKeyColor(),
            scheme.colors.secondaryPaletteKeyColor(),
            scheme.colors.tertiaryPaletteKeyColor(),
            scheme.colors.errorPaletteKeyColor(),
            scheme.colors.neutralPaletteKeyColor(),
            scheme.colors.neutralVariantPaletteKeyColor(),
        ].map((color) => ({
            name: color.name,
            snakeCaseName: StringUtil.toSnakeCase(color.name),
            kebabCasedName: StringUtil.toKebabCase(color.name),
            hct: color.getHct(scheme),
            palette: color.palette(scheme),
        })).sort((a, b) => a.name.localeCompare(b.name));

        const toCustomizedMaterialTonalPalette = (name: string, palette: TonalPalette): CustomizedTonalPalette => ({
            name: name,
            snakeCaseName: StringUtil.toSnakeCase(name),
            kebabCasedName: StringUtil.toKebabCase(name),
            getHct: (tone: number) => palette.getHct(tone),
            tone: (tone: number) => palette.tone(tone),
            keyColor: palette.keyColor,
            hue: palette.hue,
            chroma: palette.chroma
        })


        const theme: Theme = {
            light: toCustomizedMaterialDynamicColors(lightScheme),
            dark: toCustomizedMaterialDynamicColors(darkScheme),
            palettes: {
                primaryPalette: toCustomizedMaterialTonalPalette("primaryPalette", lightScheme.primaryPalette),
                secondaryPalette: toCustomizedMaterialTonalPalette("secondaryPalette", lightScheme.secondaryPalette),
                tertiaryPalette: toCustomizedMaterialTonalPalette("tertiaryPalette", lightScheme.tertiaryPalette),
                errorPalette: toCustomizedMaterialTonalPalette("errorPalette", lightScheme.errorPalette),
                neutralPalette: toCustomizedMaterialTonalPalette("neutralPalette", lightScheme.neutralPalette),
                neutralVariantPalette: toCustomizedMaterialTonalPalette("neutralVariantPalette", lightScheme.neutralVariantPalette),
            } as ThemePalettes,
            lightObject: {},
            darkObject: {},
        };

        const availableNames = this.createAvailableNameSet(theme);
        this.warnForUnknownNames(normalizedWhiteList, availableNames, "whiteList");
        this.warnForUnknownNames(normalizedBlackList, availableNames, "blackList");

        const light = this.filterCustomizedColors(theme.light, normalizedWhiteList, normalizedBlackList)
        const dark = this.filterCustomizedColors(theme.dark, normalizedWhiteList, normalizedBlackList)
        return {
            light,
            dark,
            lightObject: Object.fromEntries(light.map((color) => [color.kebabCasedName, color.hct.toInt()])),
            darkObject: Object.fromEntries(dark.map((color) => [color.kebabCasedName, color.hct.toInt()])),
            palettes: theme.palettes,
        };
    }

    private static normalizeNames(names?: string[]): Set<string> {
        return new Set((names ?? []).map((name) => StringUtil.toKebabCase(name)).filter((name) => name.length > 0));
    }

    private static createAvailableNameSet(theme: Theme): Set<string> {
        return new Set([
            ...theme.light.map((color) => StringUtil.toKebabCase(color.name)),
            ...theme.dark.map((color) => StringUtil.toKebabCase(color.name)),
            ...Object.keys(theme.palettes).map((name) => StringUtil.toKebabCase(name)),
        ]);
    }

    private static warnForUnknownNames(names: Set<string>, availableNames: Set<string>, label: "whiteList" | "blackList") {
        const unknownNames = [...names].filter((name) => !availableNames.has(name));

        if (unknownNames.length > 0) {
            console.warn(`MaterialColorService.create: unknown ${label} names ignored: ${unknownNames.join(", ")}`);
        }
    }

    private static filterCustomizedColors(colors: CustomizedColor[], whiteList: Set<string>, blackList: Set<string>): CustomizedColor[] {
        if (whiteList.size > 0) {
            return colors.filter((color) => whiteList.has(StringUtil.toKebabCase(color.name)));
        }

        if (blackList.size > 0) {
            return colors.filter((color) => !blackList.has(StringUtil.toKebabCase(color.name)));
        }

        return colors;
    }

    // private static filterPalettes(palettes: ThemePalettes, whiteList: Set<string>, blackList: Set<string>): ThemePalettes {
    //     if (whiteList.size === 0 && blackList.size === 0) {
    //         return palettes;
    //     }
    //     const filteredPalettes: ThemePalettes = {};
    //     for (const [name, palette] of Object.entries(palettes) as [SchemePaletteName, CustomizedTonalPalette][]) {
    //         const normalizedName = StringUtil.toKebabCase(name);
    //         if (whiteList.size > 0 && !whiteList.has(normalizedName)) {
    //             continue;
    //         }
    //         if (blackList.size > 0 && blackList.has(normalizedName)) {
    //             continue;
    //         }
    //         filteredPalettes[name] = palette;
    //     }
    //     return filteredPalettes;
    // }

    private static createTemplateDarkScheme(
        sourceColor: Hct,
        contrast: -1 | 0 | 1,
        variant: Variant,
        platform: Platform,
        specVersion: "2021" | "2025",
        palettes: Partial<Record<SchemePaletteName, TonalPalette>>,
    ) {
        return new DynamicScheme({
            sourceColorHct: sourceColor,
            contrastLevel: contrast,
            variant,
            isDark: true,
            specVersion,
            platform,
            ...(palettes.primaryPalette ? { primaryPalette: palettes.primaryPalette } : {}),
            ...(palettes.secondaryPalette ? { secondaryPalette: palettes.secondaryPalette } : {}),
            ...(palettes.tertiaryPalette ? { tertiaryPalette: palettes.tertiaryPalette } : {}),
            ...(palettes.errorPalette ? { errorPalette: palettes.errorPalette } : {}),
            ...(palettes.neutralPalette ? { neutralPalette: palettes.neutralPalette } : {}),
            ...(palettes.neutralVariantPalette ? { neutralVariantPalette: palettes.neutralVariantPalette } : {}),
        });
    }

    private static createTemplateLightScheme(
        sourceColor: Hct,
        contrast: -1 | 0 | 1,
        variant: Variant,
        platform: Platform,
        specVersion: "2021" | "2025",
        palettes: Partial<Record<SchemePaletteName, TonalPalette>>,
    ) {
        return new DynamicScheme({
            sourceColorHct: sourceColor,
            contrastLevel: contrast,
            variant,
            isDark: false,
            specVersion,
            platform,
            ...(palettes.primaryPalette ? { primaryPalette: palettes.primaryPalette } : {}),
            ...(palettes.secondaryPalette ? { secondaryPalette: palettes.secondaryPalette } : {}),
            ...(palettes.tertiaryPalette ? { tertiaryPalette: palettes.tertiaryPalette } : {}),
            ...(palettes.errorPalette ? { errorPalette: palettes.errorPalette } : {}),
            ...(palettes.neutralPalette ? { neutralPalette: palettes.neutralPalette } : {}),
            ...(palettes.neutralVariantPalette ? { neutralVariantPalette: palettes.neutralVariantPalette } : {}),
        });
    }
}
