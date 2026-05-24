import { describe, expect, it, vi } from 'vitest'
import { Hct, Variant } from '@material/material-color-utilities'
import { MaterialColorService, type MaterialColorKebabCaseName } from './material-color.service'
import { StringUtil } from '../utils/string-util';

const sourceColor = Hct.fromInt(0xff6750a4)

const allColorNames: string[] = [
    'primaryPaletteKeyColor',
    'secondaryPaletteKeyColor',
    'tertiaryPaletteKeyColor',
    'neutralPaletteKeyColor',
    'neutralVariantPaletteKeyColor',
    'errorPaletteKeyColor',
    'background',
    'onBackground',
    'surface',
    'surfaceDim',
    'surfaceBright',
    'surfaceContainerLowest',
    'surfaceContainerLow',
    'surfaceContainer',
    'surfaceContainerHigh',
    'surfaceContainerHighest',
    'onSurface',
    'surfaceVariant',
    'onSurfaceVariant',
    'outline',
    'outlineVariant',
    'inverseSurface',
    'inverseOnSurface',
    'shadow',
    'scrim',
    'surfaceTint',
    'primary',
    'primaryDim',
    'onPrimary',
    'primaryContainer',
    'onPrimaryContainer',
    'inversePrimary',
    'primaryFixed',
    'primaryFixedDim',
    'onPrimaryFixed',
    'onPrimaryFixedVariant',
    'secondary',
    'secondaryDim',
    'onSecondary',
    'secondaryContainer',
    'onSecondaryContainer',
    'secondaryFixed',
    'secondaryFixedDim',
    'onSecondaryFixed',
    'onSecondaryFixedVariant',
    'tertiary',
    'tertiaryDim',
    'onTertiary',
    'tertiaryContainer',
    'onTertiaryContainer',
    'tertiaryFixed',
    'tertiaryFixedDim',
    'onTertiaryFixed',
    'onTertiaryFixedVariant',
    'error',
    'errorDim',
    'onError',
    'errorContainer',
    'onErrorContainer',
].map(e => StringUtil.toKebabCase(e)).sort()

const allPaletteNames: string[] = [
    'primaryPalette',
    'secondaryPalette',
    'tertiaryPalette',
    'errorPalette',
    'neutralPalette',
    'neutralVariantPalette',
].map(e => StringUtil.toKebabCase(e)).sort()

describe('MaterialColorService', () => {

    it('returns the full color and palette set when no filter is provided', () => {
        const theme = MaterialColorService.create({
            sourceColor,
            variant: Variant.TONAL_SPOT,
            palettes: {},
        })
        expect(theme.light.map((color) => color.kebabCasedName).sort()).toStrictEqual(allColorNames)
        expect(theme.dark.map((color) => color.kebabCasedName)).toEqual(allColorNames)
        expect(Object.values(theme.palettes).map(e => e.kebabCasedName).sort()).toEqual(allPaletteNames)
    })

    it('applies whitelist filtering after normalizing names and warns about unknown entries', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        const whiteList = ['PrimaryContainer', 'primaryPalette', 'missingToken'] as unknown as MaterialColorKebabCaseName[]

        const theme = MaterialColorService.create({
            sourceColor,
            variant: Variant.TONAL_SPOT,
            palettes: {},
            whiteList,
        })

        expect(theme.light.map((color) => color.kebabCasedName)).toEqual(['primary-container'])
        expect(theme.dark.map((color) => color.kebabCasedName)).toEqual(['primary-container'])
        expect(Object.values(theme.palettes).map(e => e.kebabCasedName).sort()).toEqual(allPaletteNames)

        expect(warnSpy).toHaveBeenCalledTimes(1)
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unknown whiteList names ignored'))
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('missing-token'))
    })

    it('applies blacklist filtering after normalizing names and warns about unknown entries', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        const blackList = ['surfaceVariant', 'neutralPalette', 'missingToken'] as unknown as MaterialColorKebabCaseName[]

        const theme = MaterialColorService.create({
            sourceColor,
            variant: Variant.TONAL_SPOT,
            palettes: {},
            blackList,
        })

        expect(theme.light.map((color) => color.kebabCasedName).sort()).toEqual(allColorNames.filter((name) => name !== 'surface-variant').sort())
        expect(theme.dark.map((color) => color.kebabCasedName).sort()).toEqual(allColorNames.filter((name) => name !== 'surface-variant').sort())
        expect(Object.values(theme.palettes).map(e => e.kebabCasedName).sort()).toEqual(allPaletteNames)
        expect(warnSpy).toHaveBeenCalledTimes(1)
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unknown blackList names ignored'))
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('missing-token'))
    })

    it('rejects simultaneous whitelist and blacklist values', () => {
        expect(() =>
            MaterialColorService.create({
                sourceColor,
                variant: Variant.TONAL_SPOT,
                palettes: {},
                whiteList: ['primary'],
                blackList: ['secondary'],
            }),
        ).toThrow('whiteList and blackList are mutually exclusive')
    })
})
