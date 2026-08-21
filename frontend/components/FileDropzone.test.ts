import { describe, expect, it } from 'vitest'
import { ACCEPTED_EXTENSIONS, MAX_FILE_SIZE_BYTES } from './FileDropzone'

describe('FileDropzone extension and size validation', () => {
    it('accepts standard financial document extensions', () => {
        expect(ACCEPTED_EXTENSIONS.has('.pdf')).toBe(true)
        expect(ACCEPTED_EXTENSIONS.has('.docx')).toBe(true)
        expect(ACCEPTED_EXTENSIONS.has('.xlsx')).toBe(true)
        expect(ACCEPTED_EXTENSIONS.has('.csv')).toBe(true)
        expect(ACCEPTED_EXTENSIONS.has('.pptx')).toBe(true)
    })

    it('accepts image formats for scans and chart screenshots', () => {
        expect(ACCEPTED_EXTENSIONS.has('.png')).toBe(true)
        expect(ACCEPTED_EXTENSIONS.has('.jpg')).toBe(true)
        expect(ACCEPTED_EXTENSIONS.has('.jpeg')).toBe(true)
        expect(ACCEPTED_EXTENSIONS.has('.tiff')).toBe(true)
        expect(ACCEPTED_EXTENSIONS.has('.tif')).toBe(true)
        expect(ACCEPTED_EXTENSIONS.has('.webp')).toBe(true)
    })

    it('accepts PE binary spreadsheets and TSV tables', () => {
        expect(ACCEPTED_EXTENSIONS.has('.xlsb')).toBe(true)
        expect(ACCEPTED_EXTENSIONS.has('.tsv')).toBe(true)
        expect(ACCEPTED_EXTENSIONS.has('.xlsm')).toBe(true)
    })

    it('accepts Tier 4 legal, email correspondence, and presentation formats', () => {
        expect(ACCEPTED_EXTENSIONS.has('.rtf')).toBe(true)
        expect(ACCEPTED_EXTENSIONS.has('.odt')).toBe(true)
        expect(ACCEPTED_EXTENSIONS.has('.key')).toBe(true)
        expect(ACCEPTED_EXTENSIONS.has('.eml')).toBe(true)
        expect(ACCEPTED_EXTENSIONS.has('.msg')).toBe(true)
    })

    it('accepts Tier 3 management presentation video and audio recordings', () => {
        expect(ACCEPTED_EXTENSIONS.has('.mov')).toBe(true)
        expect(ACCEPTED_EXTENSIONS.has('.mp4')).toBe(true)
        expect(ACCEPTED_EXTENSIONS.has('.m4v')).toBe(true)
        expect(ACCEPTED_EXTENSIONS.has('.webm')).toBe(true)
        expect(ACCEPTED_EXTENSIONS.has('.mp3')).toBe(true)
        expect(ACCEPTED_EXTENSIONS.has('.m4a')).toBe(true)
        expect(ACCEPTED_EXTENSIONS.has('.wav')).toBe(true)
        expect(ACCEPTED_EXTENSIONS.has('.aac')).toBe(true)
    })

    it('rejects unsupported or raw filesystem formats', () => {
        expect(ACCEPTED_EXTENSIONS.has('.img')).toBe(false)
        expect(ACCEPTED_EXTENSIONS.has('.iso')).toBe(false)
        expect(ACCEPTED_EXTENSIONS.has('.exe')).toBe(false)
        expect(ACCEPTED_EXTENSIONS.has('.numbers')).toBe(false)
    })

    it('enforces a 50MB file size ceiling', () => {
        expect(MAX_FILE_SIZE_BYTES).toBe(50 * 1024 * 1024)
    })
})
