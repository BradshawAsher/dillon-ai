import { describe, it, expect } from 'vitest'
import React from 'react'
import { DillonLogo } from './DillonLogo'

describe('DillonLogo component', () => {
    it('should be defined and exportable', () => {
        expect(DillonLogo).toBeDefined()
        expect(typeof DillonLogo).toBe('function')
    })
})
