import { Hct, hexFromArgb } from '@material/material-color-utilities'
import { parse as parseCsv } from 'csv-parse/sync'
import { XMLParser } from 'fast-xml-parser'
import { load as loadYaml } from 'js-yaml'
import { describe, expect, it } from 'vitest'
import { MaterialColorService } from './material-color.service'
import { MaterialPaletteService } from './material-palette.service'
import { SerializationService } from './serialization.service'
import { StringUtil } from '../utils/string-util'

const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseTagValue: false,
    parseAttributeValue: false,
})

const theme = MaterialColorService.create({
    sourceColor: Hct.fromInt(0xff6750a4),
    whiteList: ['surface-tint', 'primary'],
})

const sortedKeys = ['primary', 'surface-tint'] as const

const expectedValues = sortedKeys.map((key) => ({
    key,
    light: hexFromArgb(theme.lightObject[key]),
    dark: hexFromArgb(theme.darkObject[key]),
}))

const expectedRecords = {
    light: Object.fromEntries(expectedValues.map((entry) => [`md-sys-color-${entry.key}`, entry.light])),
    dark: Object.fromEntries(expectedValues.map((entry) => [`md-sys-color-${entry.key}`, entry.dark])),
    scheme: Object.fromEntries(expectedValues.map((entry) => [`md-sys-color-${entry.key}`, `light-dark(${entry.light}, ${entry.dark})`])),
}

const cssOutput = [
    ':root {',
    ...expectedValues.map((entry) => `    --md-sys-color-${entry.key}: light-dark(${entry.light}, ${entry.dark});`),
    '}',
    '',
].join('\n')

const jsonOutput = `${JSON.stringify(expectedRecords, null, 4)}\n`

const jsOutput = [
    'export const MdSysColor = {',
    ...expectedValues.flatMap((entry) => [
        `    ${formatModulePropertyName(entry.key, 'Light')}: ${JSON.stringify(entry.light)},`,
        `    ${formatModulePropertyName(entry.key, 'Dark')}: ${JSON.stringify(entry.dark)},`,
        `    ${formatModulePropertyName(entry.key, 'Scheme')}: ${JSON.stringify(`light-dark(${entry.light}, ${entry.dark})`)},`,
    ]),
    '};',
    '',
].join('\n')

const csvOutput = [
    'scheme,token-name,color-value',
    ...expectedValues.flatMap((entry) => [
        `light,${entry.key},${entry.light}`,
        `dark,${entry.key},${entry.dark}`,
        `scheme,${entry.key},${escapeCsvCell(`light-dark(${entry.light}, ${entry.dark})`)}`,
    ]),
    '',
].join('\n')

const paletteOrder = [
    ['primaryPalette', 'primary'],
    ['secondaryPalette', 'secondary'],
    ['tertiaryPalette', 'tertiary'],
    ['errorPalette', 'error'],
    ['neutralPalette', 'neutral'],
    ['neutralVariantPalette', 'neutral-variant'],
] as const

const xmlOutput = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<resources>',
    ...expectedValues.flatMap((entry) => [
        `    <color name="md_sys_color_${StringUtil.toSnakeCase(entry.key)}_light">${entry.light}</color>`,
        `    <color name="md_sys_color_${StringUtil.toSnakeCase(entry.key)}_dark">${entry.dark}</color>`,
    ]),
    '</resources>',
    '',
].join('\n')

describe('SerializationService', () => {
    it('serializes a theme to CSS, JSON, JS, TS, and CSV', () => {
        expect(SerializationService.toCSS({ lightObject: theme.lightObject, darkObject: theme.darkObject })).toBe(cssOutput)
        expect(SerializationService.toJSON({ lightObject: theme.lightObject, darkObject: theme.darkObject })).toBe(jsonOutput)
        expect(SerializationService.toJS({ lightObject: theme.lightObject, darkObject: theme.darkObject })).toBe(jsOutput)
        expect(SerializationService.toTS({ lightObject: theme.lightObject, darkObject: theme.darkObject })).toBe(jsOutput)
        expect(SerializationService.toCSV({ lightObject: theme.lightObject, darkObject: theme.darkObject })).toBe(csvOutput)

        expect(parseCsv(SerializationService.toCSV({ lightObject: theme.lightObject, darkObject: theme.darkObject }), { skip_empty_lines: true })).toEqual([
            ['scheme', 'token-name', 'color-value'],
            ['light', 'primary', expectedValues[0].light],
            ['dark', 'primary', expectedValues[0].dark],
            ['scheme', 'primary', `light-dark(${expectedValues[0].light}, ${expectedValues[0].dark})`],
            ['light', 'surface-tint', expectedValues[1].light],
            ['dark', 'surface-tint', expectedValues[1].dark],
            ['scheme', 'surface-tint', `light-dark(${expectedValues[1].light}, ${expectedValues[1].dark})`],
        ])
    })

    it('serializes a theme to YAML and XML with the documented structure', () => {
        const yamlOutput = SerializationService.toYAML({ lightObject: theme.lightObject, darkObject: theme.darkObject })
        const actualXml = SerializationService.toXML({ lightObject: theme.lightObject, darkObject: theme.darkObject })
        const xmlKeys = expectedValues.map((entry) => StringUtil.toSnakeCase(entry.key))

        expect(loadYaml(yamlOutput)).toEqual(expectedRecords)
        expect(actualXml).toBe(xmlOutput)
        expect(xmlParser.parse(actualXml)).toEqual({
            '?xml': {
                '@_encoding': 'utf-8',
                '@_version': '1.0',
            },
            resources: {
                color: [
                    {
                        '#text': expectedValues[0].light,
                        '@_name': `md_sys_color_${xmlKeys[0]}_light`,
                    },
                    {
                        '#text': expectedValues[0].dark,
                        '@_name': `md_sys_color_${xmlKeys[0]}_dark`,
                    },
                    {
                        '#text': expectedValues[1].light,
                        '@_name': `md_sys_color_${xmlKeys[1]}_light`,
                    },
                    {
                        '#text': expectedValues[1].dark,
                        '@_name': `md_sys_color_${xmlKeys[1]}_dark`,
                    },
                ],
            },
        })
    })

    it('serializes fixed palette tones without light-dark wrappers when palette output is enabled', () => {
        const paletteTones = [0, 1]
        const expectedPalette = buildExpectedPaletteRecord(paletteTones)
        const xmlKeys = expectedValues.map((entry) => StringUtil.toSnakeCase(entry.key))

        const cssOutputWithPalette = SerializationService.toCSS({
            lightObject: theme.lightObject,
            darkObject: theme.darkObject,
            palettes: theme.palettes,
            paletteTones,
        })
        const jsonOutputWithPalette = SerializationService.toJSON({
            lightObject: theme.lightObject,
            darkObject: theme.darkObject,
            palettes: theme.palettes,
            paletteTones,
        })
        const yamlOutputWithPalette = SerializationService.toYAML({
            lightObject: theme.lightObject,
            darkObject: theme.darkObject,
            palettes: theme.palettes,
            paletteTones,
        })
        const xmlOutputWithPalette = SerializationService.toXML({
            lightObject: theme.lightObject,
            darkObject: theme.darkObject,
            palettes: theme.palettes,
            paletteTones,
        })
        const jsOutputWithPalette = SerializationService.toJS({
            lightObject: theme.lightObject,
            darkObject: theme.darkObject,
            palettes: theme.palettes,
            paletteTones,
        })
        const tsOutputWithPalette = SerializationService.toTS({
            lightObject: theme.lightObject,
            darkObject: theme.darkObject,
            palettes: theme.palettes,
            paletteTones,
        })
        const csvOutputWithPalette = SerializationService.toCSV({
            lightObject: theme.lightObject,
            darkObject: theme.darkObject,
            palettes: theme.palettes,
            paletteTones,
        })

        expect(cssOutputWithPalette).toContain(`--md-sys-palette-primary-0: ${expectedPalette['md-sys-palette-primary-0']};`)
        expect(cssOutputWithPalette).toContain(`--md-sys-palette-primary-1: ${expectedPalette['md-sys-palette-primary-1']};`)
        expect(cssOutputWithPalette).not.toContain('--md-sys-palette-primary-0: light-dark(')
        expect((cssOutputWithPalette.match(/--md-sys-palette-/g) ?? []).length).toBe(12)

        expect(JSON.parse(jsonOutputWithPalette)).toEqual({
            light: expectedRecords.light,
            dark: expectedRecords.dark,
            scheme: expectedRecords.scheme,
            palette: expectedPalette,
        })
        expect(loadYaml(yamlOutputWithPalette)).toEqual({
            light: expectedRecords.light,
            dark: expectedRecords.dark,
            scheme: expectedRecords.scheme,
            palette: expectedPalette,
        })

        expect(xmlParser.parse(xmlOutputWithPalette)).toEqual({
            '?xml': {
                '@_encoding': 'utf-8',
                '@_version': '1.0',
            },
            resources: {
                color: [
                    {
                        '#text': expectedValues[0].light,
                        '@_name': `md_sys_color_${xmlKeys[0]}_light`,
                    },
                    {
                        '#text': expectedValues[0].dark,
                        '@_name': `md_sys_color_${xmlKeys[0]}_dark`,
                    },
                    {
                        '#text': expectedValues[1].light,
                        '@_name': `md_sys_color_${xmlKeys[1]}_light`,
                    },
                    {
                        '#text': expectedValues[1].dark,
                        '@_name': `md_sys_color_${xmlKeys[1]}_dark`,
                    },
                    ...paletteOrder.flatMap(([sourceName, tokenName]) =>
                        MaterialPaletteService.create({ palette: theme.palettes[sourceName]!, tones: paletteTones }).map((entry) => ({
                            '#text': expectedPalette[`md-sys-palette-${tokenName}-${entry.tone}`],
                            '@_name': `md_sys_palette_${tokenName.replace(/-/g, '_')}_${entry.tone}`,
                        })),
                    ),
                ],
            },
        })

        expect(jsOutputWithPalette).toContain('export const MdSysPalette = {')
        expect(jsOutputWithPalette).toContain(JSON.stringify('md-sys-palette-primary-0'))
        expect(tsOutputWithPalette).toBe(jsOutputWithPalette)
        expect(parseCsv(csvOutputWithPalette, { skip_empty_lines: true })).toContainEqual(['palette', 'primary-0', expectedPalette['md-sys-palette-primary-0']])
        expect(parseCsv(csvOutputWithPalette, { skip_empty_lines: true })).toContainEqual(['palette', 'neutral-variant-1', expectedPalette['md-sys-palette-neutral-variant-1']])
    })

    it('serializes palette-only output with palette family filtering', () => {
        const paletteTones = [1]
        const expectedPalette = Object.fromEntries(
            MaterialPaletteService.create({ palette: theme.palettes.primaryPalette!, tones: paletteTones }).map((entry) => [
                `md-sys-palette-primary-${entry.tone}`,
                hexFromArgb(entry.color),
            ]),
        )

        const jsonOutput = SerializationService.toJSON({
            lightObject: theme.lightObject,
            darkObject: theme.darkObject,
            includeTheme: false,
            palettes: theme.palettes,
            paletteWhiteList: [{ family: 'primary' }],
            paletteTones,
        })

        expect(JSON.parse(jsonOutput)).toEqual({
            palette: expectedPalette,
        })
    })

    it('serializes palette-only output with palette family exclusion', () => {
        const paletteTones = [1]
        const jsonOutput = SerializationService.toJSON({
            lightObject: theme.lightObject,
            darkObject: theme.darkObject,
            includeTheme: false,
            palettes: theme.palettes,
            paletteBlackList: [{ family: 'secondary' }],
            paletteTones,
        })

        expect(jsonOutput).toContain('"md-sys-palette-primary-1"')
        expect(jsonOutput).not.toContain('"md-sys-palette-secondary-1"')
        expect(jsonOutput).not.toContain('"light"')
        expect(jsonOutput).not.toContain('"dark"')
        expect(jsonOutput).not.toContain('"scheme"')
    })

    it('serializes palette-only output with palette tone filtering', () => {
        const paletteTones = [49, 50, 51]
        const expectedPalette = Object.fromEntries(
            MaterialPaletteService.create({ palette: theme.palettes.primaryPalette!, tones: paletteTones })
                .filter((entry) => entry.tone === 50)
                .map((entry) => [
                    `md-sys-palette-primary-${entry.tone}`,
                    hexFromArgb(entry.color),
                ]),
        )

        const jsonOutput = SerializationService.toJSON({
            lightObject: theme.lightObject,
            darkObject: theme.darkObject,
            includeTheme: false,
            palettes: theme.palettes,
            paletteWhiteList: [{ family: 'primary', tone: 50 }],
            paletteTones,
        })

        expect(JSON.parse(jsonOutput)).toEqual({
            palette: expectedPalette,
        })
    })

    it('rejects mismatched theme keys and invalid color values', () => {
        expect(() => SerializationService.toCSS({ lightObject: { token: 0xff000000 }, darkObject: { otherToken: 0xffffffff } })).toThrow('same normalized keys')
        expect(() => SerializationService.toJSON({ lightObject: { token: Number.POSITIVE_INFINITY }, darkObject: { token: 0xff000000 } })).toThrow('integer ARGB color value')
        expect(() => SerializationService.toJSON({ lightObject: { token: {} }, darkObject: { token: 0xff000000 } })).toThrow('must be a string or ARGB number')
    })

    it('serializes an empty theme deterministically', () => {
        expect(SerializationService.toCSS({ lightObject: {}, darkObject: {} })).toBe(`:root {\n}\n`)
        expect(SerializationService.toJSON({ lightObject: {}, darkObject: {} })).toBe(`{\n    "light": {},\n    "dark": {},\n    "scheme": {}\n}\n`)
        expect(loadYaml(SerializationService.toYAML({ lightObject: {}, darkObject: {} }))).toEqual({ light: {}, dark: {}, scheme: {} })
        expect(SerializationService.toXML({ lightObject: {}, darkObject: {} })).toBe(`<?xml version="1.0" encoding="utf-8"?>\n<resources/>\n`)
        expect(SerializationService.toJS({ lightObject: {}, darkObject: {} })).toBe(`export const MdSysColor = {\n};\n`)
        expect(SerializationService.toCSV({ lightObject: {}, darkObject: {} })).toBe(`scheme,token-name,color-value\n`)
    })
})

function formatModulePropertyName(baseName: string, suffix: 'Light' | 'Dark' | 'Scheme') {
    const propertyName = `${StringUtil.toPascalCase(baseName)}${suffix}`

    if (/^[$A-Z_a-z][$\w]*$/u.test(propertyName)) {
        return propertyName
    }

    return JSON.stringify(propertyName)
}

function escapeCsvCell(value: string) {
    if (value.length === 0) {
        return '""'
    }

    const shouldQuote = /[",\r\n]/.test(value) || /^\s|\s$/u.test(value)

    if (!shouldQuote) {
        return value
    }

    return `"${value.replace(/"/g, '""')}"`
}

function buildExpectedPaletteRecord(paletteTones: number[]) {
    const record: Record<string, string> = {}

    for (const [sourceName, tokenName] of paletteOrder) {
        const palette = theme.palettes[sourceName]!
        const entries = MaterialPaletteService.create({ palette, tones: paletteTones })

        for (const entry of entries) {
            record[`md-sys-palette-${tokenName}-${entry.tone}`] = hexFromArgb(entry.color)
        }
    }

    return record
}
