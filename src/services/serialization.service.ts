import { hexFromArgb } from "@material/material-color-utilities";
import { XMLBuilder } from "fast-xml-parser";
import { dump as dumpYaml } from "js-yaml";
import { StringUtil } from "../utils/string-util";

export type SerializationFormat = "css" | "json" | "xml" | "yaml" | "js" | "ts" | "csv";

type ThemeObject = Record<string, unknown>;

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

const XmlDeclaration = '<?xml version="1.0" encoding="utf-8"?>\n';
const ModuleExportName = "MdSysColor";
const CssPrefix = "--md-sys-color-";
const JsonPrefix = "md-sys-color-";
const XmlPrefix = "md_sys_color_";

const xmlBuilder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    format: true,
    indentBy: "    ",
    suppressEmptyNode: true,
});

export class SerializationService {
    private constructor() { }

    public static serialize(args: { lightObject: ThemeObject; darkObject: ThemeObject; format: SerializationFormat }) {
        const themeEntries = this.normalizeThemeEntries(args.lightObject, args.darkObject);

        if (args.format === "css") {
            return this.toCss(themeEntries);
        }

        if (args.format === "json") {
            return this.toJson(themeEntries);
        }

        if (args.format === "xml") {
            return this.toXml(themeEntries);
        }

        if (args.format === "yaml") {
            return this.toYaml(themeEntries);
        }

        if (args.format === "js") {
            return this.toModuleSource(themeEntries);
        }

        if (args.format === "ts") {
            return this.toModuleSource(themeEntries);
        }

        if (args.format === "csv") {
            return this.toCsv(themeEntries);
        }

        throw new TypeError(`SerializationService.serialize: unsupported format "${args.format}".`);
    }

    public static toCSS(args: { lightObject: ThemeObject; darkObject: ThemeObject }) {
        return this.serialize({ lightObject: args.lightObject, darkObject: args.darkObject, format: "css" });
    }

    public static toJSON(args: { lightObject: ThemeObject; darkObject: ThemeObject }) {
        return this.serialize({ lightObject: args.lightObject, darkObject: args.darkObject, format: "json" });
    }

    public static toXML(args: { lightObject: ThemeObject; darkObject: ThemeObject }) {
        return this.serialize({ lightObject: args.lightObject, darkObject: args.darkObject, format: "xml" });
    }

    public static toYAML(args: { lightObject: ThemeObject; darkObject: ThemeObject }) {
        return this.serialize({ lightObject: args.lightObject, darkObject: args.darkObject, format: "yaml" });
    }

    public static toJS(args: { lightObject: ThemeObject; darkObject: ThemeObject }) {
        return this.serialize({ lightObject: args.lightObject, darkObject: args.darkObject, format: "js" });
    }

    public static toTS(args: { lightObject: ThemeObject; darkObject: ThemeObject }) {
        return this.serialize({ lightObject: args.lightObject, darkObject: args.darkObject, format: "ts" });
    }

    public static toCSV(args: { lightObject: ThemeObject; darkObject: ThemeObject }) {
        return this.serialize({ lightObject: args.lightObject, darkObject: args.darkObject, format: "csv" });
    }

    private static normalizeThemeEntries(lightObject: ThemeObject, darkObject: ThemeObject): ThemeEntry[] {
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
                jsonKey: `${JsonPrefix}${normalizedKey}`,
                cssKey: `${CssPrefix}${normalizedKey}`,
                xmlLightKey: `${XmlPrefix}${StringUtil.toSnakeCase(normalizedKey)}_light`,
                xmlDarkKey: `${XmlPrefix}${StringUtil.toSnakeCase(normalizedKey)}_dark`,
                moduleBaseName,
                lightValue,
                darkValue,
                schemeValue: `light-dark(${lightValue}, ${darkValue})`,
            };
        });
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

        return `SerializationService.toCSS: lightObject and darkObject must contain the same normalized keys. Missing in darkObject: ${missingInDark.length > 0 ? missingInDark.join(", ") : "none"}; missing in lightObject: ${missingInLight.length > 0 ? missingInLight.join(", ") : "none"}.`;
    }

    private static toCss(themeEntries: ThemeEntry[]) {
        if (themeEntries.length === 0) {
            return `:root {\n}\n`;
        }

        const declarations = themeEntries.map((entry) => `    ${entry.cssKey}: light-dark(${entry.lightValue}, ${entry.darkValue});`);

        return `:root {\n${declarations.join("\n")}\n}\n`;
    }

    private static toJson(themeEntries: ThemeEntry[]) {
        const record = this.createThemeRecord(themeEntries);

        return `${JSON.stringify(record, null, 4)}\n`;
    }

    private static toXml(themeEntries: ThemeEntry[]) {
        const colors = themeEntries.flatMap((entry) => [
            {
                "@_name": entry.xmlLightKey,
                "#text": entry.lightValue,
            },
            {
                "@_name": entry.xmlDarkKey,
                "#text": entry.darkValue,
            },
        ]);

        const xml = xmlBuilder.build({
            resources: colors.length > 0 ? { color: colors } : {},
        });

        return `${XmlDeclaration}${xml.endsWith("\n") ? xml : `${xml}\n`}`;
    }

    private static toYaml(themeEntries: ThemeEntry[]) {
        const record = this.createThemeRecord(themeEntries);

        return dumpYaml(record, {
            noRefs: true,
            lineWidth: -1,
            sortKeys: false,
            indent: 4,
        });
    }

    private static toModuleSource(themeEntries: ThemeEntry[]) {
        if (themeEntries.length === 0) {
            return `export const ${ModuleExportName} = {\n};\n`;
        }

        const lines = themeEntries.flatMap((entry) => [
            `    ${this.formatModulePropertyName(entry.moduleBaseName, "Light")}: ${JSON.stringify(entry.lightValue)},`,
            `    ${this.formatModulePropertyName(entry.moduleBaseName, "Dark")}: ${JSON.stringify(entry.darkValue)},`,
            `    ${this.formatModulePropertyName(entry.moduleBaseName, "Scheme")}: ${JSON.stringify(entry.schemeValue)},`,
        ]);

        return `export const ${ModuleExportName} = {\n${lines.join("\n")}\n};\n`;
    }

    private static toCsv(themeEntries: ThemeEntry[]) {
        const rows = [
            "scheme,token-name,color-value",
            ...themeEntries.flatMap((entry) => [
                `light,${this.escapeCsvCell(entry.normalizedKey)},${this.escapeCsvCell(entry.lightValue)}`,
                `dark,${this.escapeCsvCell(entry.normalizedKey)},${this.escapeCsvCell(entry.darkValue)}`,
                `scheme,${this.escapeCsvCell(entry.normalizedKey)},${this.escapeCsvCell(entry.schemeValue)}`,
            ]),
        ];

        return `${rows.join("\n")}\n`;
    }

    private static createThemeRecord(themeEntries: ThemeEntry[]) {
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
