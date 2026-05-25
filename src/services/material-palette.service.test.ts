import { describe, expect, it, vi } from 'vitest'
import type { TonalPalette } from '@material/material-color-utilities'
import { MaterialPaletteService } from './material-palette.service'

describe('MaterialPaletteService', () => {
    it('maps each tone to its generated color', () => {
        const tone = vi.fn((value: number) => value * 10)
        const palette = { tone } as unknown as TonalPalette

        expect(MaterialPaletteService.create({ palette, tones: [10, 20, 30] })).toEqual([
            { tone: 10, color: 100 },
            { tone: 20, color: 200 },
            { tone: 30, color: 300 },
        ])
        expect(tone).toHaveBeenCalledTimes(3)
        expect(tone).toHaveBeenNthCalledWith(1, 10)
        expect(tone).toHaveBeenNthCalledWith(2, 20)
        expect(tone).toHaveBeenNthCalledWith(3, 30)
    })

    it('defaults to the full 0 to 100 tone range when tones are omitted', () => {
        const tone = vi.fn((value: number) => value * 10)
        const palette = { tone } as unknown as TonalPalette

        const entries = MaterialPaletteService.create({ palette })

        expect(entries).toHaveLength(101)
        expect(entries[0]).toEqual({ tone: 0, color: 0 })
        expect(entries[100]).toEqual({ tone: 100, color: 1000 })
        expect(tone).toHaveBeenCalledTimes(101)
        expect(tone).toHaveBeenNthCalledWith(1, 0)
        expect(tone).toHaveBeenNthCalledWith(101, 100)
    })
})
