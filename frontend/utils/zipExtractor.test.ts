import { describe, expect, it } from 'vitest'
import zlib from 'node:zlib'
import { extractZipArchive } from './zipExtractor'
import { ACCEPTED_EXTENSIONS } from '../components/FileDropzone'

function buildMockZipFile(entries: Array<{ name: string; data: string; method?: number }>, zipFileName = 'data_room.zip'): File {
    const fileRecords: Buffer[] = []
    const centralRecords: Buffer[] = []
    let offset = 0

    for (const entry of entries) {
        const method = entry.method ?? 8
        const nameBuf = Buffer.from(entry.name, 'utf-8')
        const dataBuf = Buffer.from(entry.data, 'utf-8')
        const compBuf = method === 8 ? zlib.deflateRawSync(dataBuf) : dataBuf

        const localHeader = Buffer.alloc(30)
        localHeader.writeUInt32LE(0x04034b50, 0)
        localHeader.writeUInt16LE(20, 4)
        localHeader.writeUInt16LE(0, 6)
        localHeader.writeUInt16LE(method, 8)
        localHeader.writeUInt16LE(0, 10)
        localHeader.writeUInt16LE(0, 12)
        localHeader.writeUInt32LE(0, 14) // CRC
        localHeader.writeUInt32LE(compBuf.length, 18)
        localHeader.writeUInt32LE(dataBuf.length, 22)
        localHeader.writeUInt16LE(nameBuf.length, 26)
        localHeader.writeUInt16LE(0, 28)

        fileRecords.push(localHeader, nameBuf, compBuf)

        const centralHeader = Buffer.alloc(46)
        centralHeader.writeUInt32LE(0x02014b50, 0)
        centralHeader.writeUInt16LE(20, 4)
        centralHeader.writeUInt16LE(20, 6)
        centralHeader.writeUInt16LE(0, 8)
        centralHeader.writeUInt16LE(method, 10)
        centralHeader.writeUInt16LE(0, 12)
        centralHeader.writeUInt16LE(0, 14)
        centralHeader.writeUInt32LE(0, 16)
        centralHeader.writeUInt32LE(compBuf.length, 20)
        centralHeader.writeUInt32LE(dataBuf.length, 24)
        centralHeader.writeUInt16LE(nameBuf.length, 28)
        centralHeader.writeUInt16LE(0, 30)
        centralHeader.writeUInt16LE(0, 32)
        centralHeader.writeUInt16LE(0, 34)
        centralHeader.writeUInt16LE(0, 36)
        centralHeader.writeUInt32LE(0, 38)
        centralHeader.writeUInt32LE(offset, 42)

        centralRecords.push(centralHeader, nameBuf)
        offset += localHeader.length + nameBuf.length + compBuf.length
    }

    const centralStart = offset
    const centralSize = centralRecords.reduce((acc, b) => acc + b.length, 0)

    const endOfCentral = Buffer.alloc(22)
    endOfCentral.writeUInt32LE(0x06054b50, 0)
    endOfCentral.writeUInt16LE(0, 4)
    endOfCentral.writeUInt16LE(0, 6)
    endOfCentral.writeUInt16LE(entries.length, 8)
    endOfCentral.writeUInt16LE(entries.length, 10)
    endOfCentral.writeUInt32LE(centralSize, 12)
    endOfCentral.writeUInt32LE(centralStart, 16)
    endOfCentral.writeUInt16LE(0, 20)

    const totalBuf = Buffer.concat([...fileRecords, ...centralRecords, endOfCentral])
    return new File([totalBuf], zipFileName, { type: 'application/zip' })
}

describe('zipExtractor', () => {
    it('extracts valid financial documents preserving relative directory path', async () => {
        const mockZip = buildMockZipFile([
            { name: '01_Financials/P&L.xlsx', data: 'Revenue, EBITDA' },
            { name: '02_Legal/Contract.pdf', data: '%PDF-1.4 Mock Contract' },
            { name: '03_Tax/Schedule_K1.png', data: 'PNG_MOCK_BYTES' },
        ])

        const result = await extractZipArchive(mockZip, ACCEPTED_EXTENSIONS)
        expect(result.files).toHaveLength(3)
        expect(result.files[0].name).toBe('P&L.xlsx')
        expect(result.files[0].webkitRelativePath).toBe('01_Financials/P&L.xlsx')
        expect(result.files[1].name).toBe('Contract.pdf')
        expect(result.files[2].name).toBe('Schedule_K1.png')
        expect(result.ignoredNoiseCount).toBe(0)
    })

    it('filters out macOS artifacts (__MACOSX, .DS_Store) and Windows desktop metadata', async () => {
        const mockZip = buildMockZipFile([
            { name: '__MACOSX/._P&L.xlsx', data: 'mac_meta' },
            { name: '01_Financials/.DS_Store', data: 'ds_store' },
            { name: '01_Financials/Thumbs.db', data: 'thumbs' },
            { name: '01_Financials/P&L.xlsx', data: 'Real Data' },
        ])

        const result = await extractZipArchive(mockZip, ACCEPTED_EXTENSIONS)
        expect(result.files).toHaveLength(1)
        expect(result.files[0].name).toBe('P&L.xlsx')
        expect(result.ignoredNoiseCount).toBe(3)
    })

    it('skips unsupported file types within the zip archive', async () => {
        const mockZip = buildMockZipFile([
            { name: 'scripts/installer.exe', data: 'EXE' },
            { name: 'database/backup.sql', data: 'SQL' },
            { name: '01_Financials/financial_model.xlsx', data: 'XLSX' },
        ])

        const result = await extractZipArchive(mockZip, ACCEPTED_EXTENSIONS)
        expect(result.files).toHaveLength(1)
        expect(result.files[0].name).toBe('financial_model.xlsx')
        expect(result.skippedUnsupportedCount).toBe(2)
    })
})
