import { Hct, Variant, argbFromHex, argbFromRgb, argbFromLab, argbFromXyz } from '@material/material-color-utilities'
import { describe, expect, it } from 'vitest'
import {
    parseColorInput,
    parseContrastLevelOption,
    parseFormatOption,
    parsePlatformOption,
    parsePaletteToneListOption,
    parseSpecVersionOption,
    parseVariantOption,
} from '../main'

describe('parseColorInput', () => {
    // --- Supported syntaxes ---

    it('parses #hex (6-digit)', () => {
        expect(parseColorInput('#0f774a').toInt()).toBe(Hct.fromInt(argbFromHex('#0f774a')).toInt())
    })

    it('parses #hex (3-digit)', () => {
        expect(parseColorInput('#fff')).toBeInstanceOf(Hct)
    })

    it('parses hex without # when it contains letters', () => {
        expect(parseColorInput('ff0f774a').toInt()).toBe(Hct.fromInt(0xff0f774a).toInt())
    })

    it('parses 0x ARGB integer', () => {
        expect(parseColorInput('0xff0f774a').toInt()).toBe(Hct.fromInt(0xff0f774a).toInt())
    })

    it('parses argb(int)', () => {
        expect(parseColorInput('argb(0xff0f774a)').toInt()).toBe(Hct.fromInt(0xff0f774a).toInt())
    })

    it('parses rgb(r, g, b)', () => {
        expect(parseColorInput('rgb(15, 119, 74)').toInt()).toBe(Hct.fromInt(argbFromRgb(15, 119, 74)).toInt())
    })

    it('parses rgba(r, g, b, a) with alpha 1', () => {
        const result = parseColorInput('rgba(15, 119, 74, 1)')
        expect(result).toBeInstanceOf(Hct)
    })

    it('parses lab(l, a, b)', () => {
        expect(parseColorInput('lab(44.3, -15.2, 18.6)').toInt()).toBe(Hct.fromInt(argbFromLab(44.3, -15.2, 18.6)).toInt())
    })

    it('parses hct(h, c, t)', () => {
        expect(parseColorInput('hct(270, 75, 50)').toInt()).toBe(Hct.from(270, 75, 50).toInt())
    })

    it('parses xyz(x, y, z)', () => {
        const result = parseColorInput('xyz(0.41, 0.21, 0.05)')
        expect(result).toBeInstanceOf(Hct)
        expect(result.toInt()).toBe(Hct.fromInt(argbFromXyz(0.41, 0.21, 0.05)).toInt())
    })

    // --- Random ---

    it('accepts random (case-insensitive)', () => {
        expect(parseColorInput('random')).toBeInstanceOf(Hct)
        expect(parseColorInput('RANDOM')).toBeInstanceOf(Hct)
        expect(parseColorInput('Random')).toBeInstanceOf(Hct)
    })

    it('accepts random-color (case-insensitive)', () => {
        expect(parseColorInput('random-color')).toBeInstanceOf(Hct)
        expect(parseColorInput('RANDOM-COLOR')).toBeInstanceOf(Hct)
    })

    // --- Unsupported ---

    it('rejects hsl()', () => {
        expect(() => parseColorInput('hsl(0, 100%, 50%)')).toThrow()
    })

    it('rejects hsla()', () => {
        expect(() => parseColorInput('hsla(0, 100%, 50%, 1)')).toThrow()
    })

    it('rejects CSS named colors', () => {
        expect(() => parseColorInput('red')).toThrow()
        expect(() => parseColorInput('blue')).toThrow()
    })

    it('rejects ramdom (typo)', () => {
        expect(() => parseColorInput('ramdom')).toThrow()
    })

    it('rejects pure gibberish', () => {
        expect(() => parseColorInput('not-a-color')).toThrow()
    })

    it('rejects empty string', () => {
        expect(() => parseColorInput('')).toThrow()
    })
})

describe('option parsers', () => {
    describe('parseFormatOption', () => {
        it('accepts all 7 formats', () => {
            for (const f of ['css', 'json', 'xml', 'yaml', 'js', 'ts', 'csv']) {
                expect(parseFormatOption(f)).toBe(f)
            }
        })

        it('accepts yml as alias for yaml', () => {
            expect(parseFormatOption('yml')).toBe('yaml')
        })

        it('is case-insensitive', () => {
            expect(parseFormatOption('CSS')).toBe('css')
            expect(parseFormatOption('JSON')).toBe('json')
        })

        it('rejects unknown formats', () => {
            expect(() => parseFormatOption('markdown')).toThrow()
        })
    })

    describe('parseVariantOption', () => {
        it('accepts number aliases 0-8', () => {
            const expected = [
                Variant.MONOCHROME, Variant.NEUTRAL, Variant.TONAL_SPOT,
                Variant.VIBRANT, Variant.EXPRESSIVE, Variant.FIDELITY,
                Variant.CONTENT, Variant.RAINBOW, Variant.FRUIT_SALAD,
            ]
            for (let i = 0; i <= 8; i++) {
                expect(parseVariantOption(String(i))).toBe(expected[i])
            }
        })

        it('normalizes variant name aliases', () => {
            expect(parseVariantOption('tonalspot')).toBe(Variant.TONAL_SPOT)
            expect(parseVariantOption('tonal_spot')).toBe(Variant.TONAL_SPOT)
            expect(parseVariantOption('tonal-spot')).toBe(Variant.TONAL_SPOT)
            expect(parseVariantOption('fruit_salad')).toBe(Variant.FRUIT_SALAD)
            expect(parseVariantOption('fruitsalad')).toBe(Variant.FRUIT_SALAD)
        })

        it('is case-insensitive', () => {
            expect(parseVariantOption('NEUTRAL')).toBe(Variant.NEUTRAL)
            expect(parseVariantOption('neutral')).toBe(Variant.NEUTRAL)
        })

        it('rejects unknown variants', () => {
            expect(() => parseVariantOption('imaginary')).toThrow()
        })
    })

    describe('parsePlatformOption', () => {
        it('accepts phone and watch', () => {
            expect(parsePlatformOption('phone')).toBe('phone')
            expect(parsePlatformOption('watch')).toBe('watch')
        })

        it('is case-insensitive', () => {
            expect(parsePlatformOption('PHONE')).toBe('phone')
        })

        it('rejects unknown platforms', () => {
            expect(() => parsePlatformOption('desktop')).toThrow()
        })
    })

    describe('parseContrastLevelOption', () => {
        it('accepts -1, 0, 1', () => {
            expect(parseContrastLevelOption('-1')).toBe(-1)
            expect(parseContrastLevelOption('0')).toBe(0)
            expect(parseContrastLevelOption('1')).toBe(1)
        })

        it('rejects out-of-range values', () => {
            expect(() => parseContrastLevelOption('2')).toThrow()
            expect(() => parseContrastLevelOption('-2')).toThrow()
        })
    })

    describe('parseSpecVersionOption', () => {
        it('accepts 2021, 2025, 2026', () => {
            expect(parseSpecVersionOption('2021')).toBe('2021')
            expect(parseSpecVersionOption('2025')).toBe('2025')
            expect(parseSpecVersionOption('2026')).toBe('2026')
        })

        it('rejects unknown versions', () => {
            expect(() => parseSpecVersionOption('2024')).toThrow()
        })
    })

    describe('parsePaletteToneListOption', () => {
        it('parses comma-separated tones', () => {
            expect(parsePaletteToneListOption('0, 1, 2')).toEqual([0, 1, 2])
        })

        it('deduplicates and sorts', () => {
            expect(parsePaletteToneListOption('50, 10, 50, 10')).toEqual([10, 50])
        })

        it('rejects out-of-range tones', () => {
            expect(() => parsePaletteToneListOption('101')).toThrow()
        })
    })
})
