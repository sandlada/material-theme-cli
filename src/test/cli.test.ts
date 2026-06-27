import { execFile, execSync } from 'node:child_process'
import { promisify } from 'node:util'
import { resolve } from 'node:path'
import { describe, expect, it, beforeAll } from 'vitest'

const exec = promisify(execFile)
const cliPath = resolve(import.meta.dirname, '..', '..', 'index.js')

interface CliResult {
    stdout: string
    stderr: string
}

async function run(...args: string[]): Promise<CliResult> {
    try {
        const { stdout, stderr } = await exec('node', [cliPath, ...args])
        return { stdout, stderr }
    } catch (error: any) {
        return {
            stdout: error.stdout ?? '',
            stderr: error.stderr ?? '',
        }
    }
}

// Build the CLI before running integration tests
beforeAll(() => {
    execSync('npm run build', { cwd: resolve(import.meta.dirname, '..', '..'), shell: process.env.ComSpec ?? '/bin/sh' })
}, 60_000)

// ---- Top-level command ----

describe('material-theme-cli (top-level)', () => {
    it('outputs color tokens in CSS format by default', async () => {
        const { stdout } = await run()
        expect(stdout).toContain(':root {')
        expect(stdout).toContain('--md-sys-color-')
        expect(stdout).toMatch(/light-dark\(#[0-9a-fA-F]{6},/i)
    })

    it('produces exactly 59 color tokens', async () => {
        const { stdout } = await run()
        const tokenLines = stdout.split('\n').filter(l => l.includes('--md-sys-color-'))
        expect(tokenLines).toHaveLength(59)
    })

    it('rejects unknown options passed to top-level command', async () => {
        // Top-level command does NOT accept any options; unknown option errors
        const { stderr } = await run('--format', 'json')
        expect(stderr).toContain('unknown option')
    })
})

// ---- g c command ----

describe('g c (generate colors)', () => {
    it('outputs CSS by default', async () => {
        const { stdout } = await run('g', 'c')
        expect(stdout).toContain(':root {')
        expect(stdout).toContain('--md-sys-color-')
    })

    it('accepts a color positional argument', async () => {
        const { stdout } = await run('g', 'c', '#ff6750a4')
        expect(stdout).toContain(':root {')
        const tokenLines = stdout.split('\n').filter(l => l.includes('--md-sys-color-'))
        expect(tokenLines).toHaveLength(59)
    })

    it('outputs JSON when --format json', async () => {
        const { stdout } = await run('g', 'c', 'hct(270, 75, 50)', '--format', 'json')
        const parsed = JSON.parse(stdout)
        expect(parsed).toHaveProperty('light')
        expect(parsed).toHaveProperty('dark')
        expect(parsed).toHaveProperty('scheme')
        expect(Object.keys(parsed.light)).toHaveLength(59)
    })

    it('outputs YAML when --format yaml', async () => {
        const { stdout } = await run('g', 'c', 'random', '--format', 'yaml')
        expect(stdout).toContain('light:')
        expect(stdout).toContain('dark:')
        expect(stdout).toContain('scheme:')
    })

    it('outputs XML when --format xml', async () => {
        const { stdout } = await run('g', 'c', 'rgb(15, 119, 74)', '--format', 'xml')
        expect(stdout).toContain('<?xml')
        expect(stdout).toContain('<resources>')
        expect(stdout).toContain('_light')
        expect(stdout).toContain('_dark')
    })

    it('outputs JavaScript module when --format js', async () => {
        const { stdout } = await run('g', 'c', 'argb(0xff0f774a)', '--format', 'js')
        expect(stdout).toContain('export const')
        expect(stdout).toMatch(/PrimaryLight/)
    })

    it('outputs TypeScript module when --format ts', async () => {
        const { stdout } = await run('g', 'c', 'lab(44.3, -15.2, 18.6)', '--format', 'ts')
        expect(stdout).toContain('export const')
    })

    it('outputs CSV when --format csv', async () => {
        const { stdout } = await run('g', 'c', 'random', '--format', 'csv')
        const lines = stdout.trim().split('\n')
        expect(lines[0]).toBe('scheme,token-name,color-value')
        // 1 header + 59*3 data rows
        expect(lines).toHaveLength(1 + 59 * 3)
    })

    it('supports --include to filter specific tokens', async () => {
        const { stdout } = await run('g', 'c', 'random', '--include', 'primary', 'surface-tint')
        const tokenLines = stdout.split('\n').filter(l => l.includes('--md-sys-color-'))
        expect(tokenLines).toHaveLength(2)
        expect(stdout).toContain('--md-sys-color-primary')
        expect(stdout).toContain('--md-sys-color-surface-tint')
    })

    it('supports --exclude to remove specific tokens', async () => {
        const { stdout } = await run('g', 'c', 'random', '--exclude', 'primary')
        // Use line-level check: no line should contain ': --md-sys-color-primary:'
        // Substring matches like --md-sys-color-primary-container are expected
        const exactPrimaryLines = stdout.split('\n').filter(l => l.includes('--md-sys-color-primary:'))
        expect(exactPrimaryLines).toHaveLength(0)
        expect(stdout).toContain('--md-sys-color-secondary')
    })

    it('supports --variant', async () => {
        const { stdout: v1 } = await run('g', 'c', 'random', '--variant', 'monochrome')
        const { stdout: v2 } = await run('g', 'c', 'random', '--variant', 'vibrant')
        // Different variants should produce different color values
        expect(v1).not.toBe(v2)
    })

    it('supports --var-prefix (no infix injection)', async () => {
        const { stdout } = await run('g', 'c', 'random', '--var-prefix', 'my-theme')
        expect(stdout).toContain('--my-theme-')
        expect(stdout).not.toContain('--md-sys-color-')
        expect(stdout).not.toContain('--my-theme-color-')
    })

    it('supports --spec-version', async () => {
        const { stdout } = await run('g', 'c', 'random', '--spec-version', '2021')
        const tokenLines = stdout.split('\n').filter(l => l.includes('--md-sys-color-'))
        expect(tokenLines).toHaveLength(59)
    })

    it('supports --contrast-level', async () => {
        const { stdout: normal } = await run('g', 'c', 'random', '--contrast-level', '0')
        const { stdout: high } = await run('g', 'c', 'random', '--contrast-level', '1')
        expect(normal).not.toBe(high)
    })

    it('supports palette overrides (--primary)', async () => {
        const { stdout } = await run('g', 'c', 'random', '--primary', '#ff0000')
        expect(stdout).toContain(':root {')
        const tokenLines = stdout.split('\n').filter(l => l.includes('--md-sys-color-'))
        expect(tokenLines).toHaveLength(59)
    })
})

// ---- g p (themed palettes) ----

describe('g p (themed palettes)', () => {
    it('outputs 606 palette tokens (6 families × 101 tones) in CSS', async () => {
        const { stdout } = await run('g', 'p')
        const tokenLines = stdout.split('\n').filter(l => l.includes('--md-sys-ref-'))
        expect(tokenLines).toHaveLength(606)
    })

    it('outputs palette as bare CSS properties (no light-dark wrapper)', async () => {
        const { stdout } = await run('g', 'p')
        expect(stdout).toContain('--md-sys-ref-primary-0')
        expect(stdout).toContain('--md-sys-ref-secondary-50')
        expect(stdout).toContain('--md-sys-ref-neutral-100')
        // Should not contain light-dark in palette values
        expect(stdout).not.toMatch(/--md-sys-ref-.*light-dark\(/)
    })

    it('accepts a color positional argument', async () => {
        const { stdout } = await run('g', 'p', 'hct(270, 75, 50)')
        const tokenLines = stdout.split('\n').filter(l => l.includes('--md-sys-ref-'))
        expect(tokenLines).toHaveLength(606)
    })

    it('supports --tones to restrict tone range', async () => {
        const { stdout } = await run('g', 'p', 'random', '--tones', '0, 50, 100')
        // 6 families × 3 tones = 18
        const tokenLines = stdout.split('\n').filter(l => l.includes('--md-sys-ref-'))
        expect(tokenLines).toHaveLength(18)
    })

    it('accepts --palette-tones as a deprecated alias of --tones', async () => {
        const { stdout } = await run('g', 'p', 'random', '--palette-tones', '0, 50, 100')
        const tokenLines = stdout.split('\n').filter(l => l.includes('--md-sys-ref-'))
        expect(tokenLines).toHaveLength(18)
    })

    it('supports --include for family filtering', async () => {
        const { stdout } = await run('g', 'p', 'random', '--include', 'primary')
        const tokenLines = stdout.split('\n').filter(l => l.includes('--md-sys-ref-'))
        // All 101 primary tokens
        expect(tokenLines).toHaveLength(101)
        expect(tokenLines.every((l: string) => l.includes('primary-'))).toBe(true)
    })

    it('supports --include with specific tone filter', async () => {
        const { stdout } = await run('g', 'p', 'random', '--include', 'primary-50')
        const tokenLines = stdout.split('\n').filter(l => l.includes('--md-sys-ref-'))
        expect(tokenLines).toHaveLength(1)
        expect(tokenLines[0]).toContain('primary-50')
    })

    it('supports JSON output', async () => {
        const { stdout } = await run('g', 'p', 'random', '--format', 'json')
        const parsed = JSON.parse(stdout)
        expect(parsed).toHaveProperty('palette')
        expect(Object.keys(parsed.palette)).toHaveLength(606)
    })

    it('supports --var-prefix (no infix injection)', async () => {
        const { stdout } = await run('g', 'p', 'random', '--var-prefix', 'my-theme')
        expect(stdout).not.toContain('--md-sys-ref-')
        expect(stdout).toContain('--my-theme-primary-')
        expect(stdout).not.toContain('--my-theme-palette-')
    })

    it('supports --exclude for family filtering', async () => {
        const { stdout } = await run('g', 'p', 'random', '--exclude', 'primary')
        const tokenLines = stdout.split('\n').filter(l => l.includes('--md-sys-ref-'))
        // 606 - 101 = 505
        expect(tokenLines).toHaveLength(505)
        expect(tokenLines.every((l: string) => !l.includes('primary-'))).toBe(true)
    })

    it('rejects --exclude and --include together', async () => {
        const { stderr } = await run('g', 'p', 'random', '--include', 'primary', '--exclude', 'secondary')
        expect(stderr.length).toBeGreaterThan(0)
        expect(stderr).toMatch(/mutually exclusive/i)
    })
})

// ---- g p (custom palette) ----

describe('g p prefix color (custom palette)', () => {
    it('outputs 101 palette tokens with bare prefix', async () => {
        const { stdout } = await run('g', 'p', 'my-color', '#6750a4')
        // Lines start with whitespace per CSS formatting; use includes
        const tokenLines = stdout.split('\n').filter(l => l.includes('--my-color-'))
        expect(tokenLines).toHaveLength(101)
    })

    it('uses bare --prefix-{tone} format without family infix', async () => {
        const { stdout } = await run('g', 'p', 'my-color', '#6750a4')
        expect(stdout).toContain('--my-color-0')
        expect(stdout).not.toContain('--my-color-palette-')
        expect(stdout).not.toContain('--my-color-primary-')
    })

    it('supports --format json', async () => {
        const { stdout } = await run('g', 'p', 'custom', 'hct(270, 75, 50)', '--format', 'json')
        const parsed = JSON.parse(stdout)
        expect(Object.keys(parsed)).toEqual(['palette'])
        expect(Object.keys(parsed.palette)).toHaveLength(101)
    })

    it('supports --include to filter specific tones', async () => {
        const { stdout } = await run('g', 'p', 'my-color', 'random', '--include', '50', '100')
        const tokenLines = stdout.split('\n').filter(l => l.includes('--my-color-'))
        expect(tokenLines).toHaveLength(2)
        expect(tokenLines[0]).toContain('my-color-50')
        expect(tokenLines[1]).toContain('my-color-100')
    })

    it('supports --exclude to filter out tones', async () => {
        const { stdout } = await run('g', 'p', 'my-color', '#0f774a', '--exclude', '0')
        const tokenLines = stdout.split('\n').filter(l => l.includes('--my-color-'))
        expect(tokenLines).toHaveLength(100)
        expect(tokenLines.every((l: string) => !l.includes('my-color-0'))).toBe(true)
    })
})

// ---- Error handling ----

describe('error handling', () => {
    it('rejects unsupported color syntax hls()', async () => {
        const { stderr } = await run('g', 'c', 'hsl(0, 100%, 50%)')
        expect(stderr.length).toBeGreaterThan(0)
    })

    it('rejects CSS named color', async () => {
        const { stderr } = await run('g', 'c', 'red')
        expect(stderr.length).toBeGreaterThan(0)
    })

    it('rejects --exclude and --include together on g c', async () => {
        const { stderr } = await run('g', 'c', 'random', '--include', 'primary', '--exclude', 'secondary')
        expect(stderr.length).toBeGreaterThan(0)
        expect(stderr).toMatch(/mutually exclusive/i)
    })
})
