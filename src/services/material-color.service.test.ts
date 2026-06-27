import { describe, expect, it, vi } from 'vitest'
import { Hct, Variant } from '@material/material-color-utilities'
import { MaterialColorService, type MaterialColorKebabCaseName } from './material-color.service'
import { StringUtil } from '../utils/string-util'

const sourceColor = Hct.fromInt(0xff6750a4)

// Per spec: default variant is NEUTRAL, default contrast is 0
const SPEC_DEFAULTS = { variant: Variant.NEUTRAL, contrast: 0 as const }

const ALL_COLOR_NAMES = [
    'primaryPaletteKeyColor', 'secondaryPaletteKeyColor', 'tertiaryPaletteKeyColor',
    'neutralPaletteKeyColor', 'neutralVariantPaletteKeyColor', 'errorPaletteKeyColor',
    'background', 'onBackground', 'surface', 'surfaceDim', 'surfaceBright',
    'surfaceContainerLowest', 'surfaceContainerLow', 'surfaceContainer',
    'surfaceContainerHigh', 'surfaceContainerHighest', 'onSurface',
    'surfaceVariant', 'onSurfaceVariant', 'outline', 'outlineVariant',
    'inverseSurface', 'inverseOnSurface', 'shadow', 'scrim', 'surfaceTint',
    'primary', 'primaryDim', 'onPrimary', 'primaryContainer', 'onPrimaryContainer',
    'inversePrimary', 'primaryFixed', 'primaryFixedDim', 'onPrimaryFixed',
    'onPrimaryFixedVariant', 'secondary', 'secondaryDim', 'onSecondary',
    'secondaryContainer', 'onSecondaryContainer', 'secondaryFixed',
    'secondaryFixedDim', 'onSecondaryFixed', 'onSecondaryFixedVariant',
    'tertiary', 'tertiaryDim', 'onTertiary', 'tertiaryContainer',
    'onTertiaryContainer', 'tertiaryFixed', 'tertiaryFixedDim',
    'onTertiaryFixed', 'onTertiaryFixedVariant', 'error', 'errorDim',
    'onError', 'errorContainer', 'onErrorContainer',
]

const ALL_KEBAB_NAMES = ALL_COLOR_NAMES.map(s => StringUtil.toKebabCase(s)).sort()
const EXPECTED_TOKEN_COUNT = ALL_KEBAB_NAMES.length // 59

describe('MaterialColorService', () => {
    it('returns exactly 59 light and 59 dark tokens with no filters', () => {
        const theme = MaterialColorService.create({
            sourceColor,
            ...SPEC_DEFAULTS,
            palettes: {},
        })
        expect(theme.light).toHaveLength(EXPECTED_TOKEN_COUNT)
        expect(theme.dark).toHaveLength(EXPECTED_TOKEN_COUNT)
        const lightNames = theme.light.map(c => c.kebabCasedName).sort()
        expect(lightNames).toEqual(ALL_KEBAB_NAMES)
    })

    it('light and dark tokens have the same names', () => {
        const theme = MaterialColorService.create({
            sourceColor,
            ...SPEC_DEFAULTS,
            palettes: {},
        })
        const lightNames = theme.light.map(c => c.kebabCasedName).sort()
        const darkNames = theme.dark.map(c => c.kebabCasedName).sort()
        expect(lightNames).toEqual(darkNames)
    })

    it('returns all 6 palette families', () => {
        const theme = MaterialColorService.create({
            sourceColor,
            ...SPEC_DEFAULTS,
            palettes: {},
        })
        const paletteNames = Object.values(theme.palettes).map(p => p.kebabCasedName).sort()
        // NOTE: the actual kebabCasedName includes '-palette' suffix
        expect(paletteNames).toEqual([
            'error-palette', 'neutral-palette', 'neutral-variant-palette',
            'primary-palette', 'secondary-palette', 'tertiary-palette',
        ])
    })

    it('whiteList filters to only specified tokens (exact kebab-case match)', () => {
        const theme = MaterialColorService.create({
            sourceColor,
            ...SPEC_DEFAULTS,
            palettes: {},
            whiteList: ['primary', 'surface-tint'] as MaterialColorKebabCaseName[],
        })
        expect(theme.light.map(c => c.kebabCasedName).sort()).toEqual(['primary', 'surface-tint'])
    })

    it('blackList removes specified tokens', () => {
        const theme = MaterialColorService.create({
            sourceColor,
            ...SPEC_DEFAULTS,
            palettes: {},
            blackList: ['primary', 'secondary'] as MaterialColorKebabCaseName[],
        })
        const names = theme.light.map(c => c.kebabCasedName)
        expect(names).not.toContain('primary')
        expect(names).not.toContain('secondary')
        expect(names).toContain('tertiary')
    })

    it('rejects simultaneous whiteList and blackList', () => {
        expect(() => MaterialColorService.create({
            sourceColor,
            ...SPEC_DEFAULTS,
            palettes: {},
            whiteList: ['primary'] as MaterialColorKebabCaseName[],
            blackList: ['secondary'] as MaterialColorKebabCaseName[],
        })).toThrow(/whiteList.*blackList|mutually exclusive/i)
    })

    it('warns about unknown whiteList names via console.warn', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const theme = MaterialColorService.create({
            sourceColor,
            ...SPEC_DEFAULTS,
            palettes: {},
            whiteList: ['primary', 'nonexistent-token'] as MaterialColorKebabCaseName[],
        })
        expect(theme.light.map(c => c.kebabCasedName)).toEqual(['primary'])
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unknown'))
        warnSpy.mockRestore()
    })

    it('warns about unknown blackList names via console.warn', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const theme = MaterialColorService.create({
            sourceColor,
            ...SPEC_DEFAULTS,
            palettes: {},
            blackList: ['primary', 'nonexistent-token'] as MaterialColorKebabCaseName[],
        })
        expect(theme.light.map(c => c.kebabCasedName)).not.toContain('primary')
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unknown'))
        warnSpy.mockRestore()
    })

    it('lightObject and darkObject contain all tokens as kebab-case → ARGB maps', () => {
        const theme = MaterialColorService.create({
            sourceColor,
            ...SPEC_DEFAULTS,
            palettes: {},
        })
        const lightKeys = Object.keys(theme.lightObject).sort()
        const darkKeys = Object.keys(theme.darkObject).sort()
        expect(lightKeys).toEqual(ALL_KEBAB_NAMES)
        expect(darkKeys).toEqual(ALL_KEBAB_NAMES)
    })
})
