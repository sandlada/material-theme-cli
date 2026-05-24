import {
    Hct,
    Variant,
    argbFromHex,
    argbFromLab,
    argbFromRgb,
} from "@material/material-color-utilities"
import { describe, expect, it } from "vitest"
import {
    parseColorInput,
    parseContrastLevelOption,
    parseFormatOption,
    parsePlatformOption,
    parseSpecVersionOption,
    parseVariantOption,
} from "../main"

describe("CLI parsing", () => {
    it("parses the supported color syntaxes through the material-color-utilities converters", () => {
        expect(parseColorInput("#0f774a").toInt()).toBe(Hct.fromInt(argbFromHex("#0f774a")).toInt())
        expect(parseColorInput("0xff0f774a").toInt()).toBe(Hct.fromInt(0xff0f774a).toInt())
        expect(parseColorInput("argb(0xff0f774a)").toInt()).toBe(Hct.fromInt(0xff0f774a).toInt())
        expect(parseColorInput("rgb(15, 119, 74)").toInt()).toBe(Hct.fromInt(argbFromRgb(15, 119, 74)).toInt())
        expect(parseColorInput("lab(44.3, -15.2, 18.6)").toInt()).toBe(Hct.fromInt(argbFromLab(44.3, -15.2, 18.6)).toInt())
        expect(parseColorInput("hct(270, 75, 50)").toInt()).toBe(Hct.from(270, 75, 50).toInt())
    })

    it("generates a random HCT color when random-color is requested", () => {
        expect(parseColorInput("random-color")).toBeInstanceOf(Hct)
        expect(parseColorInput("RANDOM-COLOR")).toBeInstanceOf(Hct)
    })

    it("normalizes the common CLI option aliases", () => {
        expect(parseFormatOption("CSS")).toBe("css")
        expect(parseVariantOption("tonalspot")).toBe(Variant.TONAL_SPOT)
        expect(parseVariantOption("fruit-salad")).toBe(Variant.FRUIT_SALAD)
        expect(parsePlatformOption("WATCH")).toBe("watch")
        expect(parseContrastLevelOption("1")).toBe(1)
        expect(parseSpecVersionOption("2025")).toBe("2025")
    })

    it("rejects invalid CLI values early", () => {
        expect(() => parseColorInput("not-a-color")).toThrow("unsupported color value")
        expect(() => parseVariantOption("unknown")).toThrow("unsupported variant")
        expect(() => parseFormatOption("markdown")).toThrow("unsupported format")
    })
})
