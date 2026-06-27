import {
	Hct,
	TonalPalette,
	Variant,
	argbFromHex,
	argbFromLab,
	argbFromRgb,
	argbFromXyz,
	type Platform,
} from "@material/material-color-utilities";
import { Command } from "commander";
import { randomInt } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { MaterialColorService, type MaterialColorKebabCaseName } from "./services/material-color.service";
import { SerializationService, type SerializationFormat } from "./services/serialization.service";
import { StringUtil } from "./utils/string-util";

export { MaterialColorService } from "./services/material-color.service";
export { SerializationService } from "./services/serialization.service";

type CliSpecVersion = "2021" | "2025" | "2026";
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

type CliFilterSplit = {
	names: MaterialColorKebabCaseName[];
	unknownNames: string[];
};

type ResolvedPaletteOverrides = {
	palettes: CliPaletteOverrides;
	paletteExpressions: CliPaletteExpressions;
	usesRandomColor: boolean;
};

type ParsedCommandOptions = {
	format: SerializationFormat;
	include?: string[];
	exclude?: string[];
	tones?: number[];
	paletteTones?: number[];
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
	varPrefix?: string;
};

const RandomColorLiteral = "random";
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

		if (functionName === "xyz") {
			return parseXyzInput(argumentsList, trimmedValue);
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
			`material-theme-cli: unsupported color function "${functionMatch[1]}". Expected hct(), xyz(), rgb(), rgba(), lab(), or argb().`,
		);
	}

	if (isHexColorLiteral(trimmedValue)) {
		return Hct.fromInt(argbFromHex(trimmedValue));
	}

	if (isArgbIntegerLiteral(trimmedValue)) {
		return Hct.fromInt(parseArgbInteger(trimmedValue));
	}

	throw new Error(
		`material-theme-cli: unsupported color value "${colorValue}". Expected random, hct(...), xyz(...), hex, argb(...), rgb(...), or lab(...).`,
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

export function parsePaletteToneListOption(value: string): number[] {
	const trimmedValue = value.trim();

	if (trimmedValue.length === 0) {
		throw new Error("material-theme-cli: palette tones cannot be empty.");
	}

	const toneValues = trimmedValue
		.split(/[\s,]+/)
		.map((part) => part.trim())
		.filter((part) => part.length > 0);

	if (toneValues.length === 0) {
		throw new Error("material-theme-cli: palette tones cannot be empty.");
	}

	const tones = toneValues.map((toneValue) => parsePaletteToneValue(toneValue));

	return [...new Set(tones)].sort((left, right) => left - right);
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

	if (trimmedValue !== "2021" && trimmedValue !== "2025" && trimmedValue !== "2026") {
		throw new Error(`material-theme-cli: unsupported spec version "${value}". Expected 2021, 2025, or 2026.`);
	}

	return trimmedValue as CliSpecVersion;
}

function createCommand() {
	const command = new Command();

	command
		.name("material-theme-cli")
		.description("Generate Material Design theme and palette tokens from HCT, hex, ARGB, RGB, LAB, or random values.")
		.argument("[color]", "source color value or random")
		.action(async (colorValue: string | undefined) => {
			await executeCommand(colorValue, {});
		});

	// g subcommand (generate)
	const gCommand = command.command("g")
		.description("generate theme tokens");

	// g c subcommand (generate colors)
	addColorOptions(
		gCommand.command("c")
			.description("generate color tokens")
			.argument("[color]", "source color value or random"),
	).action(async (colorValue: string | undefined, options: ParsedCommandOptions) => {
		await executeCommand(colorValue, options);
	});

	// g p subcommand (generate palettes)
	addPaletteOptions(
		gCommand.command("p")
			.description("generate palette tokens")
			.argument("[args...]", "var-prefix and color, or just color"),
	).action(async (args: string[] | undefined, options: ParsedCommandOptions) => {
		const flatArgs = args ?? [];
		await executePaletteCommand(flatArgs, options);
	});

	return command;
}

function getDefaultOptions(): ParsedCommandOptions {
	return {
		format: "css",
		variant: Variant.NEUTRAL,
		contrastLevel: 0,
		specVersion: "2025",
		platform: "phone",
	} as ParsedCommandOptions;
}

function mergeOptions(partial: Partial<ParsedCommandOptions>): ParsedCommandOptions {
	const { tones, paletteTones, ...rest } = partial;
	// --tones is the canonical option; --palette-tones is a deprecated alias.
	// --tones takes precedence when both are supplied.
	const resolvedTones = tones ?? paletteTones;
	return {
		...getDefaultOptions(),
		...rest,
		...(resolvedTones !== undefined ? { paletteTones: resolvedTones } : {}),
	};
}

/**
 * Enforces the design-spec invariant that --include and --exclude are mutually
 * exclusive. When both are supplied with at least one value each, the CLI must
 * report an error and exit with a non-zero status code.
 */
function ensureIncludeExcludeMutuallyExclusive(options: ParsedCommandOptions) {
	const hasInclude = options.include !== undefined && options.include.length > 0;
	const hasExclude = options.exclude !== undefined && options.exclude.length > 0;

	if (hasInclude && hasExclude) {
		throw new Error(
			"material-theme-cli: --include and --exclude are mutually exclusive. Provide only one of them.",
		);
	}
}

function addColorOptions(cmd: Command) {
	return cmd
		.option("--format <format>", "serialization format", parseFormatOption, "css")
		.option("--include <token-name...>", "token names to keep")
		.option("--exclude <token-name...>", "token names to exclude")
		.option("--variant <variant>", "dynamic scheme variant", parseVariantOption, Variant.NEUTRAL)
		.option("--contrast-level <contrast-level>", "contrast level", parseContrastLevelOption, 0)
		.option("--spec-version <spec-version>", "design spec version", parseSpecVersionOption, "2025")
		.option("--platform <platform>", "target platform", parsePlatformOption, "phone")
		.option("--primary <color>", "override the primary palette")
		.option("--secondary <color>", "override the secondary palette")
		.option("--tertiary <color>", "override the tertiary palette")
		.option("--error <color>", "override the error palette")
		.option("--neutral <color>", "override the neutral palette")
		.option("--neutral-variant <color>", "override the neutral-variant palette")
		.option("--var-prefix <prefix>", "custom CSS/key variable prefix");
}

function addPaletteOptions(cmd: Command) {
	return cmd
		.option("--format <format>", "serialization format", parseFormatOption, "css")
		.option("--include <token-name...>", "palette families/tokens to keep (e.g. primary, secondary-50)")
		.option("--exclude <token-name...>", "palette families/tokens to exclude")
		.option("--tones <tone-list>", "palette tones to generate, such as 0,1,2", parsePaletteToneListOption)
		.option("--palette-tones <tone-list>", "alias of --tones (deprecated)", parsePaletteToneListOption)
		.option("--variant <variant>", "dynamic scheme variant", parseVariantOption, Variant.NEUTRAL)
		.option("--contrast-level <contrast-level>", "contrast level", parseContrastLevelOption, 0)
		.option("--spec-version <spec-version>", "design spec version", parseSpecVersionOption, "2025")
		.option("--platform <platform>", "target platform", parsePlatformOption, "phone")
		.option("--primary <color>", "override the primary palette")
		.option("--secondary <color>", "override the secondary palette")
		.option("--tertiary <color>", "override the tertiary palette")
		.option("--error <color>", "override the error palette")
		.option("--neutral <color>", "override the neutral palette")
		.option("--neutral-variant <color>", "override the neutral-variant palette")
		.option("--var-prefix <prefix>", "custom CSS/key variable prefix");
}

async function executeCommand(colorValue: string | undefined, options: Partial<ParsedCommandOptions>) {
	const merged = mergeOptions(options);
	ensureIncludeExcludeMutuallyExclusive(merged);
	const sourceColorValue = colorValue ?? "random";
	const sourceColorInput = resolveColorInput(sourceColorValue);
	const palettes = buildPaletteOverrides(merged);
	const includeFilters = splitFilterNames(merged.include);
	const excludeFilters = splitFilterNames(merged.exclude);

	if (includeFilters.unknownNames.length > 0) {
		console.warn(`material-theme-cli: unknown include names ignored: ${includeFilters.unknownNames.join(", ")}`);
	}

	if (excludeFilters.unknownNames.length > 0) {
		console.warn(`material-theme-cli: unknown exclude names ignored: ${excludeFilters.unknownNames.join(", ")}`);
	}

	const theme = MaterialColorService.create({
		sourceColor: sourceColorInput.color,
		variant: merged.variant,
		contrast: merged.contrastLevel,
		specVersion: merged.specVersion === "2026" ? "2025" : merged.specVersion,
		platform: merged.platform,
		palettes: palettes.palettes,
		whiteList: includeFilters.names.length > 0 ? includeFilters.names : undefined,
		blackList: excludeFilters.names.length > 0 ? excludeFilters.names : undefined,
	});

	const serializedTheme = SerializationService.serialize({
		lightObject: theme.lightObject,
		darkObject: theme.darkObject,
		format: merged.format,
		varPrefix: merged.varPrefix,
	});

	process.stdout.write(serializedTheme);
}

async function executePaletteCommand(args: string[], options: Partial<ParsedCommandOptions>) {
	const merged = mergeOptions(options);
	ensureIncludeExcludeMutuallyExclusive(merged);
	// Two modes:
	//   g p [color]          — themed palettes (all theme palettes)
	//   g p [prefix] [color] — custom palette with given prefix
	if (args.length >= 2) {
		await executeCustomPalette(args[0], args[1], merged);
	} else {
		const colorValue = args.length === 1 ? args[0] : "random";
		await executeThemedPalettes(colorValue, merged);
	}
}

async function executeCustomPalette(prefix: string, colorValue: string, options: ParsedCommandOptions) {
	const sourceColorInput = resolveColorInput(colorValue);
	const tonalPalette = TonalPalette.fromHct(sourceColorInput.color);
	const palettes = { primaryPalette: tonalPalette };
	let paletteTones = options.paletteTones;

	// Apply --include / --exclude tone filtering for custom palettes.
	// Values are normalized to kebab-case, then the last numeric segment
	// (if present) is extracted as a tone number.
	if (options.include !== undefined && options.include.length > 0) {
		const tones = parseCustomPaletteToneFilters(options.include, prefix);
		if (tones !== undefined) {
			paletteTones = tones;
		}
	} else if (options.exclude !== undefined && options.exclude.length > 0) {
		const excludeTones = parseCustomPaletteToneFilters(options.exclude, prefix);
		if (excludeTones !== undefined && excludeTones.length > 0) {
			const defaultTones = paletteTones ?? Array.from({ length: 101 }, (_, i) => i);
			const excludeSet = new Set(excludeTones);
			paletteTones = defaultTones.filter((t) => !excludeSet.has(t));
		}
	}

	const serialized = SerializationService.serialize({
		lightObject: {},
		darkObject: {},
		palettes,
		paletteTones,
		format: options.format,
		varPrefix: prefix,
		customPaletteName: "",
		isCustomPalette: true,
		includeTheme: false,
	});

	process.stdout.write(serialized);
}

/**
 * Extract tone numbers from --include / --exclude values for a custom palette.
 *
 * Each value is normalized to kebab-case and the last numeric segment is
 * treated as a tone.  Values like `"10"`, `"my-color-10"`, or `"My Color 10"`
 * all resolve to tone 10.  Non-numeric segments are silently ignored (they
 * have no meaning for custom single-family palettes).
 */
function parseCustomPaletteToneFilters(values: string[], _prefix: string): number[] | undefined {
	const tones = new Set<number>();

	for (const raw of normalizeColorNameList(values)) {
		const normalized = StringUtil.toKebabCase(raw);
		if (normalized.length === 0) {
			continue;
		}

		// Try the whole string first (plain numbers like "10")
		const wholeAsNumber = Number(normalized);
		if (Number.isInteger(wholeAsNumber) && /^\d+$/.test(normalized)) {
			if (wholeAsNumber >= 0 && wholeAsNumber <= 100) {
				tones.add(wholeAsNumber);
			}
			continue;
		}

		// Otherwise extract the last hyphen-separated segment
		const parts = normalized.split("-");
		const lastPart = parts[parts.length - 1];
		if (/^\d+$/.test(lastPart)) {
			const tone = Number(lastPart);
			if (tone >= 0 && tone <= 100) {
				tones.add(tone);
			}
		}
	}

	return tones.size > 0 ? [...tones].sort((a, b) => a - b) : undefined;
}

async function executeThemedPalettes(colorValue: string, options: ParsedCommandOptions) {
	const sourceColorInput = resolveColorInput(colorValue);
	const palettes = buildPaletteOverrides(options);
	const paletteSelectors = splitPaletteSelectors(options.include ?? []);
	const paletteExcludeSelectors = splitPaletteSelectors(options.exclude ?? []);
	const paletteTones = options.paletteTones;

	const theme = MaterialColorService.create({
		sourceColor: sourceColorInput.color,
		variant: options.variant,
		contrast: options.contrastLevel,
		specVersion: options.specVersion === "2026" ? "2025" : options.specVersion,
		platform: options.platform,
		palettes: palettes.palettes,
	});

	const serialized = SerializationService.serialize({
		lightObject: theme.lightObject,
		darkObject: theme.darkObject,
		palettes: theme.palettes,
		paletteTones,
		paletteWhiteList: paletteSelectors.length > 0 ? paletteSelectors : undefined,
		paletteBlackList: paletteExcludeSelectors.length > 0 ? paletteExcludeSelectors : undefined,
		format: options.format,
		varPrefix: options.varPrefix,
		includeTheme: false,
	});

	process.stdout.write(serialized);
}

function splitPaletteSelectors(values: string[]) {
	const selectors: import("./services/serialization.service").PaletteSelector[] = [];
	const seen = new Set<string>();

	for (const value of normalizeColorNameList(values)) {
		const trimmed = value.trim();
		if (trimmed.length === 0 || seen.has(trimmed)) {
			continue;
		}
		seen.add(trimmed);

		const parts = trimmed.split("-");
		// The last part may be a tone number
		const lastPart = parts[parts.length - 1];
		const tone = /^\d+$/.test(lastPart) ? Number(lastPart) : undefined;

		if (tone !== undefined) {
			const family = parts.slice(0, -1).join("-");
			if (family.length > 0) {
				selectors.push({ family: family as import("./services/serialization.service").PaletteSelectorFamilyName, tone });
			}
		} else {
			selectors.push({ family: trimmed as import("./services/serialization.service").PaletteSelectorFamilyName });
		}
	}

	return selectors;
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

function normalizeColorNameList(values?: string[]) {
	return (values ?? [])
		.map((value) => value.trim())
		.filter((value) => value.length > 0);
}

function splitFilterNames(values?: string[]): CliFilterSplit {
	const names: MaterialColorKebabCaseName[] = [];
	const unknownNames: string[] = [];
	const seen = new Set<string>();

	for (const value of normalizeColorNameList(values)) {
		const normalizedValue = StringUtil.toKebabCase(value);

		if (normalizedValue.length === 0 || seen.has(normalizedValue)) {
			continue;
		}

		seen.add(normalizedValue);
		names.push(normalizedValue as MaterialColorKebabCaseName);
	}

	return { names, unknownNames };
}

function parsePaletteToneValue(value: string) {
	if (!/^(?:100|[1-9]?\d)$/u.test(value)) {
		throw new Error(`material-theme-cli: unsupported palette tone "${value}". Expected integers between 0 and 100.`);
	}

	const tone = Number(value);

	if (!Number.isInteger(tone) || tone < 0 || tone > 100) {
		throw new Error(`material-theme-cli: unsupported palette tone "${value}". Expected integers between 0 and 100.`);
	}

	return tone;
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

function parseXyzInput(argumentsList: string[], originalValue: string) {
	if (argumentsList.length !== 3) {
		throw new Error(`material-theme-cli: ${originalValue} must contain 3 XYZ values: xyz(x, y, z).`);
	}

	return Hct.fromInt(
		argbFromXyz(
			parseFiniteNumber(argumentsList[0], `${originalValue} x`),
			parseFiniteNumber(argumentsList[1], `${originalValue} y`),
			parseFiniteNumber(argumentsList[2], `${originalValue} z`),
		),
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

		if (functionName === "xyz") {
			return renderXyzExpression(argumentsList, trimmedValue);
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
			`material-theme-cli: unsupported color function "${functionMatch[1]}". Expected hct(), xyz(), rgb(), rgba(), lab(), or argb().`,
		);
	}

	if (isHexColorLiteral(trimmedValue)) {
		return `Hct.fromInt(argbFromHex(${JSON.stringify(trimmedValue)}))`;
	}

	if (isArgbIntegerLiteral(trimmedValue)) {
		return `Hct.fromInt(${renderArgbLiteral(parseArgbInteger(trimmedValue))})`;
	}

	throw new Error(
		`material-theme-cli: unsupported color value "${colorValue}". Expected random, hct(...), xyz(...), hex, argb(...), rgb(...), or lab(...).`,
	);
}

function renderHctExpression(argumentsList: string[], originalValue: string) {
	if (argumentsList.length !== 3) {
		throw new Error(`material-theme-cli: ${originalValue} must contain 3 HCT values: hct(hue, chroma, tone).`);
	}

	return `Hct.from(${parseFiniteNumber(argumentsList[0], `${originalValue} hue`)}, ${parseFiniteNumber(argumentsList[1], `${originalValue} chroma`)}, ${parseFiniteNumber(argumentsList[2], `${originalValue} tone`)})`;
}

function renderXyzExpression(argumentsList: string[], originalValue: string) {
	if (argumentsList.length !== 3) {
		throw new Error(`material-theme-cli: ${originalValue} must contain 3 XYZ values: xyz(x, y, z).`);
	}

	return `Hct.fromInt(argbFromXyz(${parseFiniteNumber(argumentsList[0], `${originalValue} x`)}, ${parseFiniteNumber(argumentsList[1], `${originalValue} y`)}, ${parseFiniteNumber(argumentsList[2], `${originalValue} z`)}))`;
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
	const normalized = value.trim().toLowerCase();
	return normalized === RandomColorLiteral || normalized === "random-color";
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
