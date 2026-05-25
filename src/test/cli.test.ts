import { Hct, Variant, argbFromHex } from "@material/material-color-utilities"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it, vi } from "vitest"
import { MaterialColorService, SerializationService, runCli } from "../main"

async function runCliAndCapture(argv: string[]) {
    let stdout = ""
    let stderr = ""

    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation((chunk: any) => {
        stdout += String(chunk)
        return true
    })

    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation((chunk: any) => {
        stderr += String(chunk)
        return true
    })

    const previousExitCode = process.exitCode
    process.exitCode = undefined

    try {
        await runCli(argv)

        return {
            stdout,
            stderr,
            exitCode: process.exitCode,
        }
    } finally {
        stdoutSpy.mockRestore()
        stderrSpy.mockRestore()
        process.exitCode = previousExitCode
    }
}

describe("CLI integration", () => {
    it("prints the default theme output for a direct color argument", async () => {
        const { stdout, stderr, exitCode } = await runCliAndCapture(["node", "material-theme-cli", "#0f774a"])

        const expectedTheme = MaterialColorService.create({
            sourceColor: Hct.fromInt(argbFromHex("#0f774a")),
            variant: Variant.TONAL_SPOT,
            contrast: 0,
            specVersion: "2025",
            platform: "phone",
        })

        expect(exitCode).toBeUndefined()
        expect(stderr).toBe("")
        expect(stdout).toBe(SerializationService.toCSS({
            lightObject: expectedTheme.lightObject,
            darkObject: expectedTheme.darkObject,
            palettes: expectedTheme.palettes,
        }))
    })

    it("accepts random-color as a direct CLI input", async () => {
        const { stdout, stderr, exitCode } = await runCliAndCapture(["node", "material-theme-cli", "random-color"])

        expect(exitCode).toBeUndefined()
        expect(stderr).toBe("")
        expect(stdout).toContain(":root {")
        expect(stdout).toContain("--md-sys-color-")
        expect(stdout).toContain("--md-sys-palette-")
    })

    it("can skip palette output when requested", async () => {
        const { stdout, stderr, exitCode } = await runCliAndCapture(["node", "material-theme-cli", "#0f774a", "--no-palette"])

        const expectedTheme = MaterialColorService.create({
            sourceColor: Hct.fromInt(argbFromHex("#0f774a")),
            variant: Variant.TONAL_SPOT,
            contrast: 0,
            specVersion: "2025",
            platform: "phone",
        })

        expect(exitCode).toBeUndefined()
        expect(stderr).toBe("")
        expect(stdout).toBe(SerializationService.toCSS({
            lightObject: expectedTheme.lightObject,
            darkObject: expectedTheme.darkObject,
        }))
        expect(stdout).not.toContain("--md-sys-palette-")
    })

    it("limits palette tones when requested", async () => {
        const { stdout, stderr, exitCode } = await runCliAndCapture(["node", "material-theme-cli", "#0f774a", "--palette-tones", "0, 1"])

        expect(exitCode).toBeUndefined()
        expect(stderr).toBe("")
        expect(stdout).toContain("--md-sys-palette-primary-0")
        expect(stdout).toContain("--md-sys-palette-primary-1")
        expect(stdout).not.toContain("--md-sys-palette-primary-2")
    })

    it("emits only the selected palette family in palette-only mode", async () => {
        const { stdout, stderr, exitCode } = await runCliAndCapture([
            "node",
            "material-theme-cli",
            "#0f774a",
            "--palette-only",
            "--token",
            "palette-primary",
            "--palette-tones",
            "1",
        ])

        expect(exitCode).toBeUndefined()
        expect(stderr).toBe("")
        expect(stdout).toContain("--md-sys-palette-primary-1")
        expect(stdout).not.toContain("--md-sys-palette-primary-0")
        expect(stdout).not.toContain("--md-sys-palette-secondary-")
        expect(stdout).not.toContain("--md-sys-color-")
        expect(stdout).not.toContain("light-dark(")
    })

    it("emits only the selected palette tone in palette-only mode", async () => {
        const { stdout, stderr, exitCode } = await runCliAndCapture([
            "node",
            "material-theme-cli",
            "#0f774a",
            "--palette-only",
            "--token",
            "palette-primary-50",
        ])

        expect(exitCode).toBeUndefined()
        expect(stderr).toBe("")
        expect(stdout).toContain("--md-sys-palette-primary-50")
        expect(stdout).not.toContain("--md-sys-palette-primary-49")
        expect(stdout).not.toContain("--md-sys-palette-primary-51")
        expect(stdout).not.toContain("--md-sys-palette-secondary-")
        expect(stdout).not.toContain("--md-sys-color-")
        expect(stdout).not.toContain("light-dark(")
    })

    it("reads the source color from a file and writes JSON output to disk", async () => {
        const tempDir = await mkdtemp(join(tmpdir(), "material-theme-cli-"))

        try {
            const inputPath = join(tempDir, "color.txt")
            const outputPath = join(tempDir, "theme.json")

            await writeFile(inputPath, "#0f774a\n", "utf8")

            const { stdout, stderr, exitCode } = await runCliAndCapture([
                "node",
                "material-theme-cli",
                "--input",
                inputPath,
                "--format",
                "json",
                "--output",
                "file",
                "--path",
                outputPath,
            ])

            const expectedTheme = MaterialColorService.create({
                sourceColor: Hct.fromInt(argbFromHex("#0f774a")),
                variant: Variant.TONAL_SPOT,
                contrast: 0,
                specVersion: "2025",
                platform: "phone",
            })

            expect(exitCode).toBeUndefined()
            expect(stdout).toBe("")
            expect(stderr).toBe("")
            expect(await readFile(outputPath, "utf8")).toBe(SerializationService.toJSON({
                lightObject: expectedTheme.lightObject,
                darkObject: expectedTheme.darkObject,
                palettes: expectedTheme.palettes,
            }))
        } finally {
            await rm(tempDir, { recursive: true, force: true })
        }
    })

    it("generates a runtime random-color helper in make-js output", async () => {
        const tempDir = await mkdtemp(join(tmpdir(), "material-theme-cli-"))

        try {
            const scriptPath = join(tempDir, "theme-generator.js")
            const themePath = join(tempDir, "theme.css")

            const { stdout, stderr, exitCode } = await runCliAndCapture([
                "node",
                "material-theme-cli",
                "random-color",
                "--make-js",
                scriptPath,
                "--format",
                "css",
                "--output",
                "file",
                "--path",
                themePath,
            ])

            const generatedScript = await readFile(scriptPath, "utf8")

            expect(exitCode).toBeUndefined()
            expect(stdout).toBe("")
            expect(stderr).toBe("")
            expect(generatedScript).toContain("function createRandomColor() {")
            expect(generatedScript).toContain("const sourceColor = createRandomColor();")
            expect(generatedScript).toContain("randomInt(256)")
            expect(generatedScript).toContain('format: "css",')
            expect(generatedScript).toContain('output: "file",')
        } finally {
            await rm(tempDir, { recursive: true, force: true })
        }
    })
})
