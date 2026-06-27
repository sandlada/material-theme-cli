import { Hct, Variant } from '@material/material-color-utilities'
import { parse as parseCsv } from 'csv-parse/sync'
import { XMLParser } from 'fast-xml-parser'
import { load as loadYaml } from 'js-yaml'
import { describe, expect, it } from 'vitest'
import { MaterialColorService } from './material-color.service'
import { SerializationService } from './serialization.service'

// Small deterministic theme with 2 tokens for focused format testing
const theme = MaterialColorService.create({
    sourceColor: Hct.fromInt(0xff6750a4),
    variant: Variant.NEUTRAL,
    contrast: 0,
    palettes: {},
    whiteList: ['primary', 'surface-tint'] as any,
})

const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseTagValue: false,
    parseAttributeValue: false,
})

describe('SerializationService', () => {
    describe('CSS', () => {
        it('wraps output in :root { } block', () => {
            const css = SerializationService.toCSS({ lightObject: theme.lightObject, darkObject: theme.darkObject })
            const trimmed = css.trim()
            expect(trimmed.startsWith(':root {')).toBe(true)
            expect(trimmed.endsWith('}')).toBe(true)
        })

        it('uses light-dark() for every theme token', () => {
            const css = SerializationService.toCSS({ lightObject: theme.lightObject, darkObject: theme.darkObject })
            const lines = css.split('\n').filter(l => l.includes('--md-sys-color-'))
            expect(lines.length).toBeGreaterThan(0)
            for (const line of lines) {
                expect(line).toMatch(/light-dark\(#[0-9a-fA-F]{6},\s*#[0-9a-fA-F]{6}\)/)
            }
        })

        it('palette tokens use bare key: value; (no light-dark wrapper)', () => {
            const css = SerializationService.toCSS({
                lightObject: theme.lightObject,
                darkObject: theme.darkObject,
                palettes: theme.palettes,
                paletteTones: [0],
            })
            expect(css).toContain('--md-sys-ref-')
            // Palette tokens should NOT use light-dark()
            expect(css).not.toMatch(/--md-sys-ref-.*light-dark\(/)
        })
    })

    describe('JSON', () => {
        it('has light, dark, scheme top-level keys for theme-only output', () => {
            const json = SerializationService.toJSON({ lightObject: theme.lightObject, darkObject: theme.darkObject })
            const parsed = JSON.parse(json)
            expect(Object.keys(parsed).sort()).toEqual(['dark', 'light', 'scheme'])
        })

        it('all three sections have identical sorted keys', () => {
            const json = SerializationService.toJSON({ lightObject: theme.lightObject, darkObject: theme.darkObject })
            const parsed = JSON.parse(json)
            const lightKeys = Object.keys(parsed.light).sort()
            expect(Object.keys(parsed.dark).sort()).toEqual(lightKeys)
            expect(Object.keys(parsed.scheme).sort()).toEqual(lightKeys)
        })

        it('adds palette key when palettes are provided', () => {
            const json = SerializationService.toJSON({
                lightObject: theme.lightObject,
                darkObject: theme.darkObject,
                palettes: theme.palettes,
                paletteTones: [0],
            })
            const parsed = JSON.parse(json)
            expect(Object.keys(parsed).sort()).toEqual(['dark', 'light', 'palette', 'scheme'])
        })

        it('suppresses light/dark/scheme when includeTheme is false', () => {
            const json = SerializationService.toJSON({
                lightObject: theme.lightObject,
                darkObject: theme.darkObject,
                includeTheme: false,
                palettes: theme.palettes,
                paletteTones: [0],
            })
            const parsed = JSON.parse(json)
            expect(Object.keys(parsed)).toEqual(['palette'])
        })
    })

    describe('XML', () => {
        it('produces valid XML with <?xml?> declaration and <resources> root', () => {
            const xml = SerializationService.toXML({ lightObject: theme.lightObject, darkObject: theme.darkObject })
            expect(xml).toMatch(/^<\?xml version="1\.0" encoding="utf-8"\?>/)
            expect(xml).toContain('<resources>')
            expect(xml).toContain('</resources>')
        })

        it('generates _light and _dark entries for each token', () => {
            const xml = SerializationService.toXML({ lightObject: theme.lightObject, darkObject: theme.darkObject })
            expect(xml).toContain('_light')
            expect(xml).toContain('_dark')
        })

        it('palette nodes use snake_case names without light/dark suffix', () => {
            const xml = SerializationService.toXML({
                lightObject: theme.lightObject,
                darkObject: theme.darkObject,
                palettes: theme.palettes,
                paletteTones: [0],
            })
            // Palette entries should be single <color> nodes (no _light/_dark)
            expect(xml).toContain('md_sys_ref_primary_0')
            expect(xml).not.toMatch(/md_sys_ref_primary_0.*_light/)
        })
    })

    describe('YAML', () => {
        it('matches JSON output structurally', () => {
            const json = SerializationService.toJSON({ lightObject: theme.lightObject, darkObject: theme.darkObject })
            const yaml = SerializationService.toYAML({ lightObject: theme.lightObject, darkObject: theme.darkObject })
            expect(loadYaml(yaml)).toEqual(JSON.parse(json))
        })
    })

    describe('JS / TS', () => {
        it('exports a const with PascalCase Light/Dark/Scheme suffixes', () => {
            const js = SerializationService.toJS({ lightObject: theme.lightObject, darkObject: theme.darkObject })
            expect(js).toContain('export const')
            expect(js).toMatch(/PrimaryLight/)
            expect(js).toMatch(/PrimaryDark/)
            expect(js).toMatch(/PrimaryScheme/)
        })

        it('JS and TS produce identical content', () => {
            const js = SerializationService.toJS({ lightObject: theme.lightObject, darkObject: theme.darkObject })
            const ts = SerializationService.toTS({ lightObject: theme.lightObject, darkObject: theme.darkObject })
            expect(js).toBe(ts)
        })

        it('includes MdSysPalette export when palettes are present', () => {
            const js = SerializationService.toJS({
                lightObject: theme.lightObject,
                darkObject: theme.darkObject,
                palettes: theme.palettes,
                paletteTones: [0],
            })
            expect(js).toContain('MdSysPalette')
        })
    })

    describe('CSV', () => {
        it('has correct header', () => {
            const csv = SerializationService.toCSV({ lightObject: theme.lightObject, darkObject: theme.darkObject })
            const lines = csv.trim().split('\n')
            expect(lines[0]).toBe('scheme,token-name,color-value')
        })

        it('generates 3 rows per token (light, dark, scheme)', () => {
            const csv = SerializationService.toCSV({ lightObject: theme.lightObject, darkObject: theme.darkObject })
            const rows = csv.trim().split('\n')
            expect(rows).toHaveLength(1 + Object.keys(theme.lightObject).length * 3)
        })

        it('adds palette rows when palettes are present', () => {
            const csv = SerializationService.toCSV({
                lightObject: theme.lightObject,
                darkObject: theme.darkObject,
                palettes: theme.palettes,
                paletteTones: [0],
            })
            const rows = parseCsv(csv, { skip_empty_lines: true }) as string[][]
            const paletteRows = rows.filter((r: string[]) => r[0] === 'palette')
            expect(paletteRows.length).toBeGreaterThan(0)
        })
    })

    describe('varPrefix', () => {
        it('changes default theme prefix to {prefix}- pattern in CSS (no infix)', () => {
            const css = SerializationService.toCSS({
                lightObject: theme.lightObject,
                darkObject: theme.darkObject,
                varPrefix: 'my-app',
            })
            expect(css).toContain('--my-app-')
            expect(css).not.toContain('--md-sys-color-')
            expect(css).not.toContain('--my-app-color-')
        })

        it('changes default palette prefix to {prefix}- pattern (no infix)', () => {
            const json = SerializationService.toJSON({
                lightObject: theme.lightObject,
                darkObject: theme.darkObject,
                palettes: theme.palettes,
                paletteTones: [0],
                varPrefix: 'my-app',
            })
            const parsed = JSON.parse(json)
            const paletteKeys = Object.keys(parsed.palette)
            expect(paletteKeys.every((k: string) => /^my-app-(primary|secondary|tertiary|error|neutral|neutral-variant)-0$/.test(k))).toBe(true)
            expect(paletteKeys.some((k: string) => k.startsWith('my-app-palette-'))).toBe(false)
        })

        it('custom palette mode uses bare {prefix}-{tone} (no family infix)', () => {
            // Per spec, custom palette (g p [prefix] [color]) emits bare
            // {prefix}-{tone} tokens with no family infix. The CLI passes
            // customPaletteName: "" to trigger the bare-tone path.
            const json = SerializationService.toJSON({
                lightObject: theme.lightObject,
                darkObject: theme.darkObject,
                palettes: theme.palettes,
                paletteTones: [0],
                varPrefix: 'custom',
                isCustomPalette: true,
                customPaletteName: '',
            })
            const parsed = JSON.parse(json)
            expect(Object.keys(parsed.palette)).toEqual(['custom-0'])
        })
    })

    describe('error handling', () => {
        it('throws on mismatched light/dark keys', () => {
            expect(() => SerializationService.toCSS({
                lightObject: { a: 0xff000000 },
                darkObject: { b: 0xffffffff },
            })).toThrow(/same normalized keys|mismatch/i)
        })

        it('throws on invalid ARGB color values', () => {
            expect(() => SerializationService.toJSON({
                lightObject: { token: Number.POSITIVE_INFINITY },
                darkObject: { token: 0xff000000 },
            })).toThrow(/integer|ARGB/i)
        })
    })

    describe('empty theme', () => {
        it('produces valid minimal output for all formats', () => {
            const empty = { lightObject: {}, darkObject: {} }
            expect(() => SerializationService.toCSS(empty)).not.toThrow()
            expect(() => SerializationService.toJSON(empty)).not.toThrow()
            expect(() => SerializationService.toXML(empty)).not.toThrow()
            expect(() => SerializationService.toYAML(empty)).not.toThrow()
            expect(() => SerializationService.toJS(empty)).not.toThrow()
            expect(() => SerializationService.toTS(empty)).not.toThrow()
            expect(() => SerializationService.toCSV(empty)).not.toThrow()
        })

        it('CSS empty theme is valid :root with no properties', () => {
            const css = SerializationService.toCSS({ lightObject: {}, darkObject: {} })
            expect(css.trim()).toBe(':root {\n}')
        })

        it('JSON empty theme has empty light/dark/scheme objects', () => {
            const json = SerializationService.toJSON({ lightObject: {}, darkObject: {} })
            const parsed = JSON.parse(json)
            expect(parsed).toEqual({ light: {}, dark: {}, scheme: {} })
        })
    })
})
