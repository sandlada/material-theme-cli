import type { TonalPalette } from "@material/material-color-utilities";

export const DefaultPaletteTones = Array.from({ length: 101 }, (_, tone) => tone);

export class MaterialPaletteService {
    private constructor() { }

    /**
     * @output
     * [{tone: number, color: argb_number}]
     */
    public static create(args: { palette: Pick<TonalPalette, "tone">; tones?: number[] }) {
        const { palette } = args;
        const tones = this.normalizeTones(args.tones);

        return tones.map((tone) => ({
            tone,
            color: palette.tone(tone),
        }));
    }


    private static normalizeTones(tones?: number[]) {
        if (tones === undefined) {
            return [...DefaultPaletteTones];
        }

        if (tones.length === 0) {
            throw new TypeError("MaterialPaletteService.create: tones cannot be empty.");
        }

        const normalizedTones = [...new Set(tones.map((tone) => this.normalizeTone(tone)))];

        return normalizedTones.sort((left, right) => left - right);
    }

    private static normalizeTone(tone: number) {
        if (!Number.isFinite(tone) || !Number.isInteger(tone) || tone < 0 || tone > 100) {
            throw new TypeError("MaterialPaletteService.create: tones must be integers between 0 and 100.");
        }

        return tone;
    }
}
