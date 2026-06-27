import { hexFromArgb, type TonalPalette } from "@material/material-color-utilities";
import { XMLBuilder } from "fast-xml-parser";
import { dump as dumpYaml } from "js-yaml";
import { DefaultPaletteTones, MaterialPaletteService } from "./material-palette.service";
import { StringUtil } from "../utils/string-util";

export type SerializationFormat = "css" | "json" | "xml" | "yaml" | "js" | "ts" | "csv";

type ThemeObject = Record<string, unknown>;

type ThemePaletteName =
    | "primaryPalette"
    | "secondaryPalette"
    | "tertiaryPalette"
    | "errorPalette"
    | "neutralPalette"
    | "neutralVariantPalette";

export type PaletteSelectorFamilyName = "primary" | "secondary" | "tertiary" | "error" | "neutral" | "neutral-variant";

export type PaletteSelector = {
    family: PaletteSelectorFamilyName;
    tone?: number;
};

type ThemePalettes = Partial<Record<ThemePaletteName, Pick<TonalPalette, "tone">>>;

type ThemeEntry = {
    normalizedKey: string;
    jsonKey: string;
    cssKey: string;
    xmlLightKey: string;
    xmlDarkKey: string;
    moduleBaseName: string;
    lightValue: string;
    darkValue: string;
    schemeValue: string;
};

type PaletteEntry = {
    normalizedKey: string;
    jsonKey: string;
    cssKey: string;
    xmlKey: string;
    value: string;
};

type ThemeRecord = {
    light: Record<string, string>;
    dark: Record<string, string>;
    scheme: Record<string, string>;
    palette?: Record<string, string>;
};

const XmlDeclaration = '<?xml version="1.0" encoding="utf-8"?>\n';
const ModuleColorExportName = "MdSysColor";
const ModulePaletteExportName = "MdSysPalette";
const DefaultCssPrefix = "--md-sys-color-";
const DefaultCssPalettePrefix = "--md-sys-ref-";
const DefaultJsonPrefix = "md-sys-color-";
const DefaultJsonPalettePrefix = "md-sys-ref-";
const DefaultXmlPrefix = "md_sys_color_";
const DefaultXmlPalettePrefix = "md_sys_ref_";

type PrefixConfig = {
    theme: {
        css: string;
        json: string;
        xml: string;
    };
    palette: {
        css: string;
        json: string;
        xml: string;
    };
};

function resolvePrefixConfig(varPrefix?: string, isCustomPalette?: boolean): PrefixConfig {
    if (varPrefix === undefined || varPrefix.length === 0) {
        return {
            theme: {
                css: DefaultCssPrefix,
                json: DefaultJsonPrefix,
                xml: DefaultXmlPrefix,
            },
            palette: {
                css: DefaultCssPalettePrefix,
                json: DefaultJsonPalettePrefix,
                xml: DefaultXmlPalettePrefix,
            },
        };
    }

    const normalized = varPrefix.replace(/^-+/u, "").replace(/-+$/u, "");
    const prefix = normalized.length > 0 ? `${normalized}-` : "";
    const cssDashPrefix = `--${prefix}`;

    if (isCustomPalette) {
		// Custom palette (g p [prefix] [color]): bare {prefix}-{tone}, no family infix.
		// Theme tokens are not emitted in this mode, but keep a sensible fallback.
		return {
			theme: {
				css: `${cssDashPrefix}color-`,
				json: `${prefix}color-`,
				xml: `${prefix}color-`.replace(/-/gu, "_"),
			},
			palette: {
				css: cssDashPrefix,
				json: prefix,
				xml: prefix.replace(/-/gu, "_"),
			},
		};
	}

	// --var-prefix replaces the default prefix verbatim (no infix injection).
	// Per the design spec body:
	//   g c --var-prefix my-prefix  -> --my-prefix-{token}
	//   g p --var-prefix my-prefix  -> --my-prefix-{family}-{tone}
	return {
		theme: {
			css: cssDashPrefix,
			json: prefix,
			xml: prefix.replace(/-/gu, "_"),
		},
		palette: {
			css: cssDashPrefix,
			json: prefix,
			xml: prefix.replace(/-/gu, "_"),
		},
	};
}

const ThemePaletteOrder: ThemePaletteName[] = [
	"primaryPalette",
	"secondaryPalette",
	"tertiaryPalette",
	"errorPalette",
	"neutralPalette",
	"neutralVariantPalette",
];

const xmlBuilder = new XMLBuilder({
	ignoreAttributes: false,
	attributeNamePrefix: "@_",
	format: true,
	indentBy: "    ",
	suppressEmptyNode: true,
});

export class SerializationService {
    private constructor() { }

    public static serialize(args: {
        lightObject: ThemeObject;
        darkObject: ThemeObject;
        format: SerializationFormat;
        includeTheme?: boolean;
        palettes?: ThemePalettes;
        paletteWhiteList?: PaletteSelector[];
        paletteBlackList?: PaletteSelector[];
        paletteTones?: number[];
        varPrefix?: string;
        customPaletteName?: string;
        isCustomPalette?: boolean;
    }) {
        const includeTheme = args.includeTheme !== false;
        const prefix = resolvePrefixConfig(args.varPrefix, args.isCustomPalette);
        const themeEntries = this.normalizeThemeEntries(args.lightObject, args.darkObject, prefix);
        const paletteEntries = this.normalizePaletteEntries(args.palettes, args.paletteTones, args.paletteWhiteList, args.paletteBlackList, prefix, args.customPaletteName);

        if (args.format === "css") {
            return this.toCss(themeEntries, paletteEntries, includeTheme);
        }

        if (args.format === "json") {
            return this.toJson(themeEntries, paletteEntries, includeTheme);
        }

        if (args.format === "xml") {
            return this.toXml(themeEntries, paletteEntries, includeTheme);
        }

        if (args.format === "yaml") {
            return this.toYaml(themeEntries, paletteEntries, includeTheme);
        }

        if (args.format === "js") {
            return this.toModuleSource(themeEntries, paletteEntries, includeTheme);
        }

        if (args.format === "ts") {
            return this.toModuleSource(themeEntries, paletteEntries, includeTheme);
        }

        if (args.format === "csv") {
            return this.toCsv(themeEntries, paletteEntries, includeTheme);
        }

        throw new TypeError(`SerializationService.serialize: unsupported format "${args.format}".`);
    }

    public static toCSS(args: { lightObject: ThemeObject; darkObject: ThemeObject; includeTheme?: boolean; palettes?: ThemePalettes; paletteWhiteList?: PaletteSelector[]; paletteBlackList?: PaletteSelector[]; paletteTones?: number[]; varPrefix?: string; customPaletteName?: string; isCustomPalette?: boolean }) {
        return this.serialize({ ...args, format: "css" });
    }

    public static toJSON(args: { lightObject: ThemeObject; darkObject: ThemeObject; includeTheme?: boolean; palettes?: ThemePalettes; paletteWhiteList?: PaletteSelector[]; paletteBlackList?: PaletteSelector[]; paletteTones?: number[]; varPrefix?: string; customPaletteName?: string; isCustomPalette?: boolean }) {
        return this.serialize({ ...args, format: "json" });
    }

    public static toXML(args: { lightObject: ThemeObject; darkObject: ThemeObject; includeTheme?: boolean; palettes?: ThemePalettes; paletteWhiteList?: PaletteSelector[]; paletteBlackList?: PaletteSelector[]; paletteTones?: number[]; varPrefix?: string; customPaletteName?: string; isCustomPalette?: boolean }) {
        return this.serialize({ ...args, format: "xml" });
    }

    public static toYAML(args: { lightObject: ThemeObject; darkObject: ThemeObject; includeTheme?: boolean; palettes?: ThemePalettes; paletteWhiteList?: PaletteSelector[]; paletteBlackList?: PaletteSelector[]; paletteTones?: number[]; varPrefix?: string; customPaletteName?: string; isCustomPalette?: boolean }) {
        return this.serialize({ ...args, format: "yaml" });
    }

    public static toJS(args: { lightObject: ThemeObject; darkObject: ThemeObject; includeTheme?: boolean; palettes?: ThemePalettes; paletteWhiteList?: PaletteSelector[]; paletteBlackList?: PaletteSelector[]; paletteTones?: number[]; varPrefix?: string; customPaletteName?: string; isCustomPalette?: boolean }) {
        return this.serialize({ ...args, format: "js" });
    }

    public static toTS(args: { lightObject: ThemeObject; darkObject: ThemeObject; includeTheme?: boolean; palettes?: ThemePalettes; paletteWhiteList?: PaletteSelector[]; paletteBlackList?: PaletteSelector[]; paletteTones?: number[]; varPrefix?: string; customPaletteName?: string; isCustomPalette?: boolean }) {
        return this.serialize({ ...args, format: "ts" });
    }

    public static toCSV(args: { lightObject: ThemeObject; darkObject: ThemeObject; includeTheme?: boolean; palettes?: ThemePalettes; paletteWhiteList?: PaletteSelector[]; paletteBlackList?: PaletteSelector[]; paletteTones?: number[]; varPrefix?: string; customPaletteName?: string; isCustomPalette?: boolean }) {
        return this.serialize({ ...args, format: "csv" });
    }

    private static normalizeThemeEntries(lightObject: ThemeObject, darkObject: ThemeObject, prefix: PrefixConfig): ThemeEntry[] {
        const lightEntries = this.normalizeThemeObject(lightObject, "lightObject");
        const darkEntries = this.normalizeThemeObject(darkObject, "darkObject");

        if (lightEntries.size !== darkEntries.size) {
            throw new TypeError(this.buildKeyMismatchMessage(lightEntries, darkEntries));
        }

        const lightKeys = [...lightEntries.keys()];
        const darkKeys = new Set(darkEntries.keys());

        const missingInDark = lightKeys.filter((key) => !darkKeys.has(key));
        const missingInLight = [...darkEntries.keys()].filter((key) => !lightEntries.has(key));

        if (missingInDark.length > 0 || missingInLight.length > 0) {
            throw new TypeError(this.buildKeyMismatchMessage(lightEntries, darkEntries));
        }

        return lightKeys.map((normalizedKey) => {
            const lightValue = lightEntries.get(normalizedKey) as string;
            const darkValue = darkEntries.get(normalizedKey) as string;
            const moduleBaseName = StringUtil.toPascalCase(normalizedKey);

            return {
                normalizedKey,
                jsonKey: `${prefix.theme.json}${normalizedKey}`,
                cssKey: `${prefix.theme.css}${normalizedKey}`,
                xmlLightKey: `${prefix.theme.xml}${StringUtil.toSnakeCase(normalizedKey)}_light`,
                xmlDarkKey: `${prefix.theme.xml}${StringUtil.toSnakeCase(normalizedKey)}_dark`,
                moduleBaseName,
                lightValue,
                darkValue,
                schemeValue: `light-dark(${lightValue}, ${darkValue})`,
            };
        });
    }

    private static normalizePaletteEntries(palettes?: ThemePalettes, paletteTones?: number[], paletteWhiteList?: PaletteSelector[], paletteBlackList?: PaletteSelector[], prefix?: PrefixConfig, customPaletteName?: string) {
        if (palettes === undefined) {
            return [];
        }

        const tones = this.normalizePaletteTones(paletteTones);
        const whiteList = this.normalizePaletteSelectors(paletteWhiteList);
        const blackList = this.normalizePaletteSelectors(paletteBlackList);
        const paletteEntries: PaletteEntry[] = [];
        const palPrefix = prefix ?? resolvePrefixConfig();

        for (const paletteName of ThemePaletteOrder) {
            const palette = palettes[paletteName];

            if (palette === undefined) {
                continue;
            }

            const normalizedPaletteName = this.toPaletteTokenName(paletteName);

            for (const toneEntry of MaterialPaletteService.create({ palette, tones })) {
                if (whiteList !== undefined && customPaletteName === undefined && !whiteList.some((selector) => this.matchesPaletteSelector(selector, normalizedPaletteName, toneEntry.tone))) {
                    continue;
                }

                if (blackList !== undefined && customPaletteName === undefined && blackList.some((selector) => this.matchesPaletteSelector(selector, normalizedPaletteName, toneEntry.tone))) {
                    continue;
                }

                const normalizedKey = customPaletteName !== undefined
                    ? `${String(toneEntry.tone)}`
                    : `${normalizedPaletteName}-${toneEntry.tone}`;
                const value = hexFromArgb(toneEntry.color);

                paletteEntries.push({
                    normalizedKey,
                    jsonKey: `${palPrefix.palette.json}${normalizedKey}`,
                    cssKey: `${palPrefix.palette.css}${normalizedKey}`,
                    xmlKey: `${palPrefix.palette.xml}${StringUtil.toSnakeCase(normalizedKey)}`,
                    value,
                });
            }
        }

        return paletteEntries;
    }

    private static normalizePaletteSelectors(values?: PaletteSelector[]) {
        if (values === undefined || values.length === 0) {
            return undefined;
        }

        return values.map((value) => this.normalizePaletteSelector(value));
    }

    private static normalizePaletteSelector(selector: PaletteSelector): PaletteSelector {
        const family = this.normalizePaletteSelectorFamily(selector.family);

        if (selector.tone === undefined) {
            return { family };
        }

        return {
            family,
            tone: this.normalizePaletteTone(selector.tone),
        };
    }

    private static normalizePaletteSelectorFamily(value: string) {
        const normalizedValue = StringUtil.toKebabCase(value).replace(/^palette-/u, "");

        if (
            normalizedValue !== "primary" &&
            normalizedValue !== "secondary" &&
            normalizedValue !== "tertiary" &&
            normalizedValue !== "error" &&
            normalizedValue !== "neutral" &&
            normalizedValue !== "neutral-variant"
        ) {
            throw new TypeError(`SerializationService: unsupported palette family "${value}".`);
        }

        return normalizedValue as PaletteSelectorFamilyName;
    }

    private static matchesPaletteSelector(selector: PaletteSelector, family: string, tone: number) {
        return selector.family === family && (selector.tone === undefined || selector.tone === tone);
    }

    private static normalizePaletteTones(tones?: number[]) {
        if (tones === undefined) {
            return [...DefaultPaletteTones];
        }

        if (tones.length === 0) {
            throw new TypeError("SerializationService: paletteTones cannot be empty.");
        }

        const normalizedTones = [...new Set(tones.map((tone) => this.normalizePaletteTone(tone)))];

        return normalizedTones.sort((left, right) => left - right);
    }

    private static normalizePaletteTone(tone: number) {
        if (!Number.isFinite(tone) || !Number.isInteger(tone) || tone < 0 || tone > 100) {
            throw new TypeError("SerializationService: paletteTones must be integers between 0 and 100.");
        }

        return tone;
    }

    private static normalizeThemeObject(object: ThemeObject, label: "lightObject" | "darkObject") {
        if (!this.isPlainObject(object)) {
            throw new TypeError(`SerializationService: ${label} must be a plain object.`);
        }

        const symbolKeys = Object.getOwnPropertySymbols(object);

        if (symbolKeys.length > 0) {
            throw new TypeError(`SerializationService: ${label} cannot contain symbol keys.`);
        }

        const normalized = new Map<string, string>();

        for (const [key, value] of Object.entries(object)) {
            const normalizedKey = StringUtil.toKebabCase(key);

            if (!normalizedKey) {
                throw new TypeError(`SerializationService: ${label} key "${key}" normalizes to an empty name.`);
            }

            if (normalized.has(normalizedKey)) {
                throw new TypeError(`SerializationService: duplicate normalized key "${normalizedKey}".`);
            }

            normalized.set(normalizedKey, this.toColorValue(value, `${label} key "${key}"`));
        }

        return new Map([...normalized.entries()].sort(([left], [right]) => left.localeCompare(right)));
    }

    private static toPaletteTokenName(paletteName: ThemePaletteName) {
        return StringUtil.toKebabCase(paletteName.replace(/Palette$/u, ""));
    }

    private static toColorValue(value: unknown, context: string) {
        if (typeof value === "number") {
            if (!Number.isFinite(value) || !Number.isInteger(value)) {
                throw new TypeError(`SerializationService: ${context} must be an integer ARGB color value.`);
            }

            return hexFromArgb(value);
        }

        if (typeof value === "string") {
            const normalized = value.trim();

            if (normalized.length === 0) {
                throw new TypeError(`SerializationService: ${context} cannot be an empty string.`);
            }

            return normalized;
        }

        throw new TypeError(`SerializationService: ${context} must be a string or ARGB number.`);
    }

    private static isPlainObject(value: unknown): value is ThemeObject {
        if (value === null || typeof value !== "object" || Array.isArray(value)) {
            return false;
        }

        const prototype = Object.getPrototypeOf(value);

        return prototype === Object.prototype || prototype === null;
    }

    private static buildKeyMismatchMessage(lightEntries: Map<string, string>, darkEntries: Map<string, string>) {
        const missingInDark = [...lightEntries.keys()].filter((key) => !darkEntries.has(key));
        const missingInLight = [...darkEntries.keys()].filter((key) => !lightEntries.has(key));

        return `SerializationService: lightObject and darkObject must contain the same normalized keys. Missing in darkObject: ${missingInDark.length > 0 ? missingInDark.join(", ") : "none"}; missing in lightObject: ${missingInLight.length > 0 ? missingInLight.join(", ") : "none"}.`;
    }

    private static toCss(themeEntries: ThemeEntry[], paletteEntries: PaletteEntry[], includeTheme: boolean) {
        if (includeTheme && themeEntries.length === 0 && paletteEntries.length === 0) {
            return `:root {\n}\n`;
        }

        const declarations = [
            ...(includeTheme ? themeEntries.map((entry) => `    ${entry.cssKey}: light-dark(${entry.lightValue}, ${entry.darkValue});`) : []),
            ...paletteEntries.map((entry) => `    ${entry.cssKey}: ${entry.value};`),
        ];

        if (declarations.length === 0) {
            return `:root {\n}\n`;
        }

        return `:root {\n${declarations.join("\n")}\n}\n`;
    }

    private static toJson(themeEntries: ThemeEntry[], paletteEntries: PaletteEntry[], includeTheme: boolean) {
        const record = this.createOutputRecord(themeEntries, paletteEntries, includeTheme);

        return `${JSON.stringify(record, null, 4)}\n`;
    }

    private static toXml(themeEntries: ThemeEntry[], paletteEntries: PaletteEntry[], includeTheme: boolean) {
        const colors = [
            ...(includeTheme ? themeEntries.flatMap((entry) => [
                {
                    "@_name": entry.xmlLightKey,
                    "#text": entry.lightValue,
                },
                {
                    "@_name": entry.xmlDarkKey,
                    "#text": entry.darkValue,
                },
            ]) : []),
            ...paletteEntries.map((entry) => ({
                "@_name": entry.xmlKey,
                "#text": entry.value,
            })),
        ];

        const xml = xmlBuilder.build({
            resources: colors.length > 0 ? { color: colors } : {},
        });

        return `${XmlDeclaration}${xml.endsWith("\n") ? xml : `${xml}\n`}`;
    }

    private static toYaml(themeEntries: ThemeEntry[], paletteEntries: PaletteEntry[], includeTheme: boolean) {
        const record = this.createOutputRecord(themeEntries, paletteEntries, includeTheme);

        return dumpYaml(record, {
            noRefs: true,
            lineWidth: -1,
            sortKeys: false,
            indent: 4,
        });
    }

    private static toModuleSource(themeEntries: ThemeEntry[], paletteEntries: PaletteEntry[], includeTheme: boolean) {
        const sections: string[] = [];

        if (includeTheme) {
            sections.push(this.renderThemeModuleSource(themeEntries).trimEnd());
        }

        if (paletteEntries.length > 0 || !includeTheme) {
            sections.push(this.renderPaletteModuleSource(paletteEntries).trimEnd());
        }

        return `${sections.join("\n\n")}\n`;
    }

    private static toCsv(themeEntries: ThemeEntry[], paletteEntries: PaletteEntry[], includeTheme: boolean) {
        const rows = [
            "scheme,token-name,color-value",
            ...(includeTheme ? themeEntries.flatMap((entry) => [
                `light,${this.escapeCsvCell(entry.normalizedKey)},${this.escapeCsvCell(entry.lightValue)}`,
                `dark,${this.escapeCsvCell(entry.normalizedKey)},${this.escapeCsvCell(entry.darkValue)}`,
                `scheme,${this.escapeCsvCell(entry.normalizedKey)},${this.escapeCsvCell(entry.schemeValue)}`,
            ]) : []),
            ...paletteEntries.map((entry) => `palette,${this.escapeCsvCell(entry.normalizedKey)},${this.escapeCsvCell(entry.value)}`),
        ];

        return `${rows.join("\n")}\n`;
    }

    private static createThemeRecord(themeEntries: ThemeEntry[]): ThemeRecord {
        const light: Record<string, string> = {};
        const dark: Record<string, string> = {};
        const scheme: Record<string, string> = {};

        for (const entry of themeEntries) {
            light[entry.jsonKey] = entry.lightValue;
            dark[entry.jsonKey] = entry.darkValue;
            scheme[entry.jsonKey] = entry.schemeValue;
        }

        return {
            light,
            dark,
            scheme,
        };
    }

    private static createOutputRecord(themeEntries: ThemeEntry[], paletteEntries: PaletteEntry[], includeTheme: boolean) {
        const record: ThemeRecord = includeTheme ? this.createThemeRecord(themeEntries) : {} as ThemeRecord;

        if (includeTheme) {
            if (paletteEntries.length > 0) {
                record.palette = this.createPaletteRecord(paletteEntries);
            }

            return record;
        }

        record.palette = this.createPaletteRecord(paletteEntries);

        return record;
    }

    private static createPaletteRecord(paletteEntries: PaletteEntry[]) {
        const palette: Record<string, string> = {};

        for (const entry of paletteEntries) {
            palette[entry.jsonKey] = entry.value;
        }

        return palette;
    }

    private static renderThemeModuleSource(themeEntries: ThemeEntry[]) {
        if (themeEntries.length === 0) {
            return `export const ${ModuleColorExportName} = {\n};\n`;
        }

        const lines = themeEntries.flatMap((entry) => [
            `    ${this.formatModulePropertyName(entry.moduleBaseName, "Light")}: ${JSON.stringify(entry.lightValue)},`,
            `    ${this.formatModulePropertyName(entry.moduleBaseName, "Dark")}: ${JSON.stringify(entry.darkValue)},`,
            `    ${this.formatModulePropertyName(entry.moduleBaseName, "Scheme")}: ${JSON.stringify(entry.schemeValue)},`,
        ]);

        return `export const ${ModuleColorExportName} = {\n${lines.join("\n")}\n};\n`;
    }

    private static renderPaletteModuleSource(paletteEntries: PaletteEntry[]) {
        if (paletteEntries.length === 0) {
            return `export const ${ModulePaletteExportName} = {\n};\n`;
        }

        const lines = paletteEntries.map((entry) => `    ${JSON.stringify(entry.jsonKey)}: ${JSON.stringify(entry.value)},`);

        return `export const ${ModulePaletteExportName} = {\n${lines.join("\n")}\n};\n`;
    }

    private static formatModulePropertyName(baseName: string, suffix: "Light" | "Dark" | "Scheme") {
        const propertyName = `${baseName}${suffix}`;

        if (/^[$A-Z_a-z][$\w]*$/u.test(propertyName)) {
            return propertyName;
        }

        return JSON.stringify(propertyName);
    }

    private static escapeCsvCell(value: string) {
        if (value.length === 0) {
            return '""';
        }

        const shouldQuote = /[",\r\n]/.test(value) || /^\s|\s$/u.test(value);

        if (!shouldQuote) {
            return value;
        }

        return `"${value.replace(/"/g, '""')}"`;
    }
}
