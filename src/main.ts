import {
	Hct,
	TonalPalette,
	Variant,
	argbFromHex,
	argbFromLab,
	argbFromRgb,
	type Platform,
} from "@material/material-color-utilities";
import { Command } from "commander";
import { randomInt } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { MakeJsService } from "./services/make-js.service";
import { MaterialColorService, type MaterialColorKebabCaseName } from "./services/material-color.service";
import { SerializationService, type SerializationFormat } from "./services/serialization.service";

export { MaterialColorService } from "./services/material-color.service";
export { SerializationService } from "./services/serialization.service";

type CliOutputTarget = "console" | "file";
type CliSpecVersion = "2021" | "2025";
type CliColorInput = {
	color: Hct;
	expression: string;
	usesRandomColor: boolean;
};
type CliPaletteOverrideKey =
	| "primaryPalette"
	| "secondaryPalette"
	| "tertiaryPalette"
	| "errorPalette"
	| "neutralPalette"
	| "neutralVariantPalette";

type CliPaletteOverrides = Partial<Record<CliPaletteOverrideKey, TonalPalette>>;
type CliPaletteExpressions = Partial<Record<CliPaletteOverrideKey, string>>;

type ResolvedPaletteOverrides = {
	palettes: CliPaletteOverrides;
	paletteExpressions: CliPaletteExpressions;
	usesRandomColor: boolean;
};

type ParsedCommandOptions = {
	format: SerializationFormat;
	output: CliOutputTarget;
	path?: string;
	makeJs?: string;
	input?: string;
	token?: string[];
	exclude?: string[];
	variant: Variant;
	contrastLevel: -1 | 0 | 1;
	specVersion: CliSpecVersion;
	platform: Platform;
	primary?: string;
	secondary?: string;
	tertiary?: string;
	error?: string;
	neutral?: string;
	neutralVariant?: string;
};

const RandomColorLiteral = "random-color";
const RandomColorRuntimeExpression = "createRandomColor()";

const VariantAliases = new Map<string, Variant>([
	["0", Variant.MONOCHROME],
	["1", Variant.NEUTRAL],
	["2", Variant.TONAL_SPOT],
	["3", Variant.VIBRANT],
	["4", Variant.EXPRESSIVE],
	["5", Variant.FIDELITY],
	["6", Variant.CONTENT],
	["7", Variant.RAINBOW],
	["8", Variant.FRUIT_SALAD],
	["MONOCHROME", Variant.MONOCHROME],
	["NEUTRAL", Variant.NEUTRAL],
	["TONAL_SPOT", Variant.TONAL_SPOT],
	["TONALSPOT", Variant.TONAL_SPOT],
	["VIBRANT", Variant.VIBRANT],
	["EXPRESSIVE", Variant.EXPRESSIVE],
	["FIDELITY", Variant.FIDELITY],
	["CONTENT", Variant.CONTENT],
	["RAINBOW", Variant.RAINBOW],
	["FRUIT_SALAD", Variant.FRUIT_SALAD],
	["FRUITSALAD", Variant.FRUIT_SALAD],
]);

const PlatformAliases = new Map<string, Platform>([
	["PHONE", "phone"],
	["WATCH", "watch"],
]);

const FormatAliases = new Map<string, SerializationFormat>([
	["CSS", "css"],
	["JSON", "json"],
	["XML", "xml"],
	["YAML", "yaml"],
	["YML", "yaml"],
	["JS", "js"],
	["TS", "ts"],
	["CSV", "csv"],
]);

const OutputAliases = new Map<string, CliOutputTarget>([
	["CONSOLE", "console"],
	["FILE", "file"],
]);

const PaletteOptionMap = [
	["primary", "primaryPalette"],
	["secondary", "secondaryPalette"],
	["tertiary", "tertiaryPalette"],
	["error", "errorPalette"],
	["neutral", "neutralPalette"],
	["neutralVariant", "neutralVariantPalette"],
] as const;

export async function runCli(argv: string[] = process.argv) {
	const command = createCommand();
	command.exitOverride();

	try {
		await command.parseAsync(argv);
	} catch (error) {
		if (isCommanderHelp(error)) {
			return;
		}

		reportCliError(error);
	}
}

export function parseColorInput(colorValue: string): Hct {
	const trimmedValue = colorValue.trim();

	if (trimmedValue.length === 0) {
		throw new Error("material-theme-cli: color value cannot be empty.");
	}

	if (isRandomColorLiteral(trimmedValue)) {
		return createRandomColorHct();
	}

	const functionMatch = trimmedValue.match(/^([a-z]+)\((.*)\)$/iu);

	if (functionMatch) {
		const functionName = functionMatch[1].toLowerCase();
		const argumentsText = functionMatch[2];
		const argumentsList = splitColorArguments(argumentsText);

		if (functionName === "hct") {
			return parseHctInput(argumentsList, trimmedValue);
		}

		if (functionName === "rgb" || functionName === "rgba") {
			return parseRgbInput(argumentsList, trimmedValue);
		}

		if (functionName === "lab") {
			return parseLabInput(argumentsList, trimmedValue);
		}

		if (functionName === "argb") {
			return parseArgbInput(argumentsList, trimmedValue);
		}

		throw new Error(
			`material-theme-cli: unsupported color function "${functionMatch[1]}". Expected hct(), rgb(), rgba(), lab(), or argb().`,
		);
	}

	if (isHexColorLiteral(trimmedValue)) {
		return Hct.fromInt(argbFromHex(trimmedValue));
	}

	if (isArgbIntegerLiteral(trimmedValue)) {
		return Hct.fromInt(parseArgbInteger(trimmedValue));
	}

	throw new Error(
		`material-theme-cli: unsupported color value "${colorValue}". Expected random-color, hct(...), hex, argb(...), rgb(...), or lab(...).`,
	);
}

export function parseVariantOption(value: string): Variant {
	const trimmedValue = value.trim();

	if (trimmedValue.length === 0) {
		throw new Error("material-theme-cli: variant cannot be empty.");
	}

	if (/^\d+$/.test(trimmedValue)) {
		const numericValue = Number(trimmedValue);

		if (!Number.isInteger(numericValue) || numericValue < 0 || numericValue > 8) {
			throw new Error(`material-theme-cli: unsupported variant "${value}". Expected 0-8 or a named variant.`);
		}

		return numericValue as Variant;
	}

	const normalizedValue = trimmedValue.replace(/[\s-]+/g, "_").toUpperCase();
	const variant = VariantAliases.get(normalizedValue);

	if (variant === undefined) {
		throw new Error(
			`material-theme-cli: unsupported variant "${value}". Expected MONOCHROME, NEUTRAL, TONAL_SPOT, VIBRANT, EXPRESSIVE, FIDELITY, CONTENT, RAINBOW, or FRUIT_SALAD.`,
		);
	}

	return variant;
}

export function parsePlatformOption(value: string): Platform {
	const normalizedValue = value.trim().replace(/[\s-]+/g, "_").toUpperCase();
	const platform = PlatformAliases.get(normalizedValue);

	if (platform === undefined) {
		throw new Error('material-theme-cli: unsupported platform "' + value + '". Expected phone or watch.');
	}

	return platform;
}

export function parseFormatOption(value: string): SerializationFormat {
	const normalizedValue = value.trim().toUpperCase();
	const format = FormatAliases.get(normalizedValue) ?? (normalizedValue.toLowerCase() as SerializationFormat);

	if (!isSerializationFormat(format)) {
		throw new Error(
			`material-theme-cli: unsupported format "${value}". Expected css, json, xml, yaml, js, ts, or csv.`,
		);
	}

	return format;
}

export function parseOutputTargetOption(value: string): CliOutputTarget {
	const normalizedValue = value.trim().toUpperCase();
	const output = OutputAliases.get(normalizedValue) ?? (normalizedValue.toLowerCase() as CliOutputTarget);

	if (output !== "console" && output !== "file") {
		throw new Error('material-theme-cli: unsupported output target "' + value + '". Expected console or file.');
	}

	return output;
}

export function parseContrastLevelOption(value: string): -1 | 0 | 1 {
	const trimmedValue = value.trim();

	if (!/^-?\d+$/.test(trimmedValue)) {
		throw new Error(`material-theme-cli: unsupported contrast level "${value}". Expected -1, 0, or 1.`);
	}

	const contrastLevel = Number(trimmedValue);

	if (contrastLevel !== -1 && contrastLevel !== 0 && contrastLevel !== 1) {
		throw new Error(`material-theme-cli: unsupported contrast level "${value}". Expected -1, 0, or 1.`);
	}

	return contrastLevel;
}

export function parseSpecVersionOption(value: string): CliSpecVersion {
	const trimmedValue = value.trim();

	if (trimmedValue !== "2021" && trimmedValue !== "2025") {
		throw new Error(`material-theme-cli: unsupported spec version "${value}". Expected 2021 or 2025.`);
	}

	return trimmedValue;
}

function createCommand() {
	const command = new Command();

	command
		.name("material-theme-cli")
		.description("Generate Material Design theme tokens from HCT, hex, ARGB, RGB, LAB, or random-color values.")
		.argument("[color]", "source color value or random-color")
		.option("--input <file-path>", "read the source color value from a file")
		.option("--format <format>", "serialization format", parseFormatOption, "css")
		.option("--output <target>", "output target", parseOutputTargetOption, "console")
		.option("--path <output-file-path>", "file path used when output is set to file")
		.option("--make-js <output-js-file-path>", "shortcut for --format js --output file")
		.option("--token <token-name...>", "token names to keep")
		.option("--exclude <token-name...>", "token names to exclude")
		.option("--variant <variant>", "dynamic scheme variant", parseVariantOption, Variant.TONAL_SPOT)
		.option("--contrast-level <contrast-level>", "contrast level", parseContrastLevelOption, 0)
		.option("--spec-version <spec-version>", "design spec version", parseSpecVersionOption, "2025")
		.option("--platform <platform>", "target platform", parsePlatformOption, "phone")
		.option("--primary <color>", "override the primary palette")
		.option("--secondary <color>", "override the secondary palette")
		.option("--tertiary <color>", "override the tertiary palette")
		.option("--error <color>", "override the error palette")
		.option("--neutral <color>", "override the neutral palette")
		.option("--neutral-variant <color>", "override the neutral-variant palette")
		.action(async (colorValue: string | undefined, options: ParsedCommandOptions) => {
			await executeCommand(command, colorValue, options);
		});

	return command;
}

async function executeCommand(command: Command, colorValue: string | undefined, options: ParsedCommandOptions) {
	const sourceColorValue = await resolveSourceColorValue(colorValue, options.input, command);

	if (!sourceColorValue) {
		return;
	}

	const sourceColorInput = resolveColorInput(sourceColorValue);
	const palettes = buildPaletteOverrides(options);
	const whiteList = normalizeColorNameList(options.token);
	const blackList = normalizeColorNameList(options.exclude);

	if (options.makeJs) {
		const generatedScript = MakeJsService.create({
			outputPath: options.makeJs,
			sourceColorExpression: sourceColorInput.expression,
			variant: options.variant,
			contrastLevel: options.contrastLevel,
			specVersion: options.specVersion,
			platform: options.platform,
			palettes: palettes.paletteExpressions,
			whiteList,
			blackList,
			format: options.format,
			output: options.output,
			path: options.path,
			usesRandomColor: sourceColorInput.usesRandomColor || palettes.usesRandomColor,
		});

		await writeFile(options.makeJs, generatedScript, "utf8");
		return;
	}

	const theme = MaterialColorService.create({
		sourceColor: sourceColorInput.color,
		variant: options.variant,
		contrast: options.contrastLevel,
		specVersion: options.specVersion,
		platform: options.platform,
		palettes: palettes.palettes,
		...(whiteList.length > 0 ? { whiteList: whiteList as MaterialColorKebabCaseName[] } : {}),
		...(blackList.length > 0 ? { blackList: blackList as MaterialColorKebabCaseName[] } : {}),
	});

	const serializedTheme = SerializationService.serialize({
		lightObject: theme.lightObject,
		darkObject: theme.darkObject,
		format: options.format,
	});

	if (options.output === "file") {
		const outputPath = resolveOutputPath(options.path, undefined, options.format);
		await mkdir(dirname(outputPath), { recursive: true });
		await writeFile(outputPath, serializedTheme, "utf8");
		return;
	}

	process.stdout.write(serializedTheme);
}

async function resolveSourceColorValue(colorValue: string | undefined, inputPath: string | undefined, command: Command) {
	if (inputPath) {
		const filePath = resolve(process.cwd(), inputPath);
		return (await readFile(filePath, "utf8")).trim();
	}

	if (colorValue) {
		return colorValue;
	}

	command.outputHelp();
	return undefined;
}

function buildPaletteOverrides(options: ParsedCommandOptions): ResolvedPaletteOverrides {
	const palettes: CliPaletteOverrides = {};
	const paletteExpressions: CliPaletteExpressions = {};
	let usesRandomColor = false;

	for (const [optionName, paletteName] of PaletteOptionMap) {
		const colorValue = options[optionName];

		if (!colorValue) {
			continue;
		}

		const resolvedColor = resolveColorInput(colorValue);
		palettes[paletteName] = TonalPalette.fromHct(resolvedColor.color);
		paletteExpressions[paletteName] = resolvedColor.expression;
		usesRandomColor ||= resolvedColor.usesRandomColor;
	}

	return { palettes, paletteExpressions, usesRandomColor };
}

function resolveOutputPath(pathOption: string | undefined, makeJsPath: string | undefined, format: SerializationFormat) {
	if (makeJsPath) {
		return resolve(process.cwd(), makeJsPath);
	}

	if (pathOption) {
		return resolve(process.cwd(), pathOption);
	}

	return resolve(process.cwd(), `./output.${format}`);
}

function normalizeColorNameList(values?: string[]) {
	return (values ?? [])
		.map((value) => value.trim())
		.filter((value) => value.length > 0);
}

function splitColorArguments(argumentText: string) {
	return argumentText
		.trim()
		.replace(/\//g, " ")
		.split(/[\s,]+/)
		.map((part) => part.trim())
		.filter((part) => part.length > 0);
}

function parseHctInput(argumentsList: string[], originalValue: string) {
	if (argumentsList.length !== 3) {
		throw new Error(`material-theme-cli: ${originalValue} must contain 3 HCT values: hct(hue, chroma, tone).`);
	}

	return Hct.from(
		parseFiniteNumber(argumentsList[0], `${originalValue} hue`),
		parseFiniteNumber(argumentsList[1], `${originalValue} chroma`),
		parseFiniteNumber(argumentsList[2], `${originalValue} tone`),
	);
}

function parseRgbInput(argumentsList: string[], originalValue: string) {
	if (argumentsList.length !== 3 && argumentsList.length !== 4) {
		throw new Error(`material-theme-cli: ${originalValue} must contain 3 RGB values: rgb(red, green, blue).`);
	}

	const red = parseRgbChannel(argumentsList[0], `${originalValue} red`);
	const green = parseRgbChannel(argumentsList[1], `${originalValue} green`);
	const blue = parseRgbChannel(argumentsList[2], `${originalValue} blue`);

	if (argumentsList.length === 4) {
		ensureOpaqueAlpha(argumentsList[3], `${originalValue} alpha`);
	}

	return Hct.fromInt(argbFromRgb(red, green, blue));
}

function parseLabInput(argumentsList: string[], originalValue: string) {
	if (argumentsList.length !== 3) {
		throw new Error(`material-theme-cli: ${originalValue} must contain 3 LAB values: lab(lightness, a, b).`);
	}

	return Hct.fromInt(
		argbFromLab(
			parseFiniteNumber(argumentsList[0], `${originalValue} lightness`),
			parseFiniteNumber(argumentsList[1], `${originalValue} a`),
			parseFiniteNumber(argumentsList[2], `${originalValue} b`),
		),
	);
}

function parseArgbInput(argumentsList: string[], originalValue: string) {
	if (argumentsList.length !== 1) {
		throw new Error(`material-theme-cli: ${originalValue} must contain a single ARGB integer value.`);
	}

	return Hct.fromInt(parseArgbInteger(argumentsList[0]));
}

function parseArgbInteger(value: string) {
	const normalizedValue = value.trim();

	if (!isArgbIntegerLiteral(normalizedValue)) {
		throw new Error(`material-theme-cli: unsupported ARGB integer "${value}". Expected a decimal or 0x-prefixed integer.`);
	}

	const numericValue = Number(normalizedValue);

	if (!Number.isSafeInteger(numericValue) || numericValue < -2147483648 || numericValue > 4294967295) {
		throw new Error(`material-theme-cli: unsupported ARGB integer "${value}". Expected a 32-bit integer.`);
	}

	return numericValue >>> 0;
}

function renderColorExpression(colorValue: string) {
	const trimmedValue = colorValue.trim();

	if (trimmedValue.length === 0) {
		throw new Error("material-theme-cli: color value cannot be empty.");
	}

	if (isRandomColorLiteral(trimmedValue)) {
		return RandomColorRuntimeExpression;
	}

	const functionMatch = trimmedValue.match(/^([a-z]+)\((.*)\)$/iu);

	if (functionMatch) {
		const functionName = functionMatch[1].toLowerCase();
		const argumentsText = functionMatch[2];
		const argumentsList = splitColorArguments(argumentsText);

		if (functionName === "hct") {
			return renderHctExpression(argumentsList, trimmedValue);
		}

		if (functionName === "rgb" || functionName === "rgba") {
			return renderRgbExpression(argumentsList, trimmedValue);
		}

		if (functionName === "lab") {
			return renderLabExpression(argumentsList, trimmedValue);
		}

		if (functionName === "argb") {
			return renderArgbExpression(argumentsList, trimmedValue);
		}

		throw new Error(
			`material-theme-cli: unsupported color function "${functionMatch[1]}". Expected hct(), rgb(), rgba(), lab(), or argb().`,
		);
	}

	if (isHexColorLiteral(trimmedValue)) {
		return `Hct.fromInt(argbFromHex(${JSON.stringify(trimmedValue)}))`;
	}

	if (isArgbIntegerLiteral(trimmedValue)) {
		return `Hct.fromInt(${renderArgbLiteral(parseArgbInteger(trimmedValue))})`;
	}

	throw new Error(
		`material-theme-cli: unsupported color value "${colorValue}". Expected random-color, hct(...), hex, argb(...), rgb(...), or lab(...).`,
	);
}

function renderHctExpression(argumentsList: string[], originalValue: string) {
	if (argumentsList.length !== 3) {
		throw new Error(`material-theme-cli: ${originalValue} must contain 3 HCT values: hct(hue, chroma, tone).`);
	}

	return `Hct.from(${parseFiniteNumber(argumentsList[0], `${originalValue} hue`)}, ${parseFiniteNumber(argumentsList[1], `${originalValue} chroma`)}, ${parseFiniteNumber(argumentsList[2], `${originalValue} tone`)})`;
}

function renderRgbExpression(argumentsList: string[], originalValue: string) {
	if (argumentsList.length !== 3 && argumentsList.length !== 4) {
		throw new Error(`material-theme-cli: ${originalValue} must contain 3 RGB values: rgb(red, green, blue).`);
	}

	const red = parseRgbChannel(argumentsList[0], `${originalValue} red`);
	const green = parseRgbChannel(argumentsList[1], `${originalValue} green`);
	const blue = parseRgbChannel(argumentsList[2], `${originalValue} blue`);

	if (argumentsList.length === 4) {
		ensureOpaqueAlpha(argumentsList[3], `${originalValue} alpha`);
	}

	return `Hct.fromInt(argbFromRgb(${red}, ${green}, ${blue}))`;
}

function renderLabExpression(argumentsList: string[], originalValue: string) {
	if (argumentsList.length !== 3) {
		throw new Error(`material-theme-cli: ${originalValue} must contain 3 LAB values: lab(lightness, a, b).`);
	}

	return `Hct.fromInt(argbFromLab(${parseFiniteNumber(argumentsList[0], `${originalValue} lightness`)}, ${parseFiniteNumber(argumentsList[1], `${originalValue} a`)}, ${parseFiniteNumber(argumentsList[2], `${originalValue} b`)}))`;
}

function renderArgbExpression(argumentsList: string[], originalValue: string) {
	if (argumentsList.length !== 1) {
		throw new Error(`material-theme-cli: ${originalValue} must contain a single ARGB integer value.`);
	}

	return `Hct.fromInt(${renderArgbLiteral(parseArgbInteger(argumentsList[0]))})`;
}

function renderArgbLiteral(value: number) {
	return `0x${(value >>> 0).toString(16).padStart(8, "0")}`;
}

function resolveColorInput(colorValue: string): CliColorInput {
	return {
		color: parseColorInput(colorValue),
		expression: renderColorExpression(colorValue),
		usesRandomColor: isRandomColorLiteral(colorValue),
	};
}

function isRandomColorLiteral(value: string) {
	return value.trim().toLowerCase() === RandomColorLiteral;
}

function createRandomColorHct() {
	return Hct.fromInt(argbFromRgb(randomInt(256), randomInt(256), randomInt(256)));
}

function parseFiniteNumber(value: string, context: string) {
	const numericValue = Number(value.trim());

	if (!Number.isFinite(numericValue)) {
		throw new Error(`material-theme-cli: ${context} must be a finite number.`);
	}

	return numericValue;
}

function parseRgbChannel(value: string, context: string) {
	const trimmedValue = value.trim();

	if (trimmedValue.endsWith("%")) {
		const percentageValue = parseFiniteNumber(trimmedValue.slice(0, -1), context);

		if (percentageValue < 0 || percentageValue > 100) {
			throw new Error(`material-theme-cli: ${context} must be between 0% and 100%.`);
		}

		return Math.round((percentageValue / 100) * 255);
	}

	const numericValue = parseFiniteNumber(trimmedValue, context);

	if (!Number.isInteger(numericValue) || numericValue < 0 || numericValue > 255) {
		throw new Error(`material-theme-cli: ${context} must be an integer between 0 and 255.`);
	}

	return numericValue;
}

function ensureOpaqueAlpha(value: string, context: string) {
	const trimmedValue = value.trim();

	if (trimmedValue.endsWith("%")) {
		const percentageValue = parseFiniteNumber(trimmedValue.slice(0, -1), context);

		if (percentageValue !== 100) {
			throw new Error(`material-theme-cli: ${context} is not supported unless it is 100% opaque.`);
		}

		return;
	}

	const numericValue = parseFiniteNumber(trimmedValue, context);

	if (numericValue !== 1) {
		throw new Error(`material-theme-cli: ${context} is not supported unless it is 1 or 100%.`);
	}
}

function isHexColorLiteral(value: string) {
	return /^#?[0-9a-fA-F]{3,8}$/.test(value) && (value.startsWith("#") || /[a-fA-F]/.test(value));
}

function isArgbIntegerLiteral(value: string) {
	return /^-?(?:0x[0-9a-fA-F]+|\d+)$/.test(value);
}

function isSerializationFormat(value: string): value is SerializationFormat {
	return value === "css" || value === "json" || value === "xml" || value === "yaml" || value === "js" || value === "ts" || value === "csv";
}

function isCommanderHelp(error: unknown) {
	return typeof error === "object" && error !== null && "code" in error && typeof (error as { code?: unknown }).code === "string" && ((error as { code: string }).code === "commander.helpDisplayed" || (error as { code: string }).code === "commander.version");
}

function reportCliError(error: unknown) {
	const message = error instanceof Error ? error.message : String(error);
	process.stderr.write(`${message}\n`);
	process.exitCode = 1;
}

const directExecutionPath = process.argv[1] !== undefined ? resolve(process.argv[1]) : undefined;

if (directExecutionPath !== undefined && fileURLToPath(import.meta.url) === directExecutionPath) {
	void runCli(process.argv);
}
