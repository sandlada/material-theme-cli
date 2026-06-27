import { describe, expect, it } from 'vitest'
import { StringUtil } from './string-util'

describe('StringUtil', () => {
    describe('toKebabCase', () => {
        it('converts PascalCase to kebab-case', () => {
            expect(StringUtil.toKebabCase('primaryContainer')).toBe('primary-container')
        })

        it('converts SCREAMING_SNAKE_CASE to kebab-case', () => {
            expect(StringUtil.toKebabCase('PRIMARY_CONTAINER')).toBe('primary-container')
        })

        it('converts mixed separators to kebab-case', () => {
            expect(StringUtil.toKebabCase('primary.container value')).toBe('primary-container-value')
        })

        it('preserves already kebab-case strings', () => {
            expect(StringUtil.toKebabCase('primary-container-value')).toBe('primary-container-value')
        })

        it('collapses consecutive hyphens', () => {
            expect(StringUtil.toKebabCase('primary--container')).toBe('primary-container')
        })

        it('trims leading and trailing hyphens', () => {
            expect(StringUtil.toKebabCase('-primary-container-')).toBe('primary-container')
        })

        it('handles empty string', () => {
            expect(StringUtil.toKebabCase('')).toBe('')
        })
    })

    describe('toSnakeCase', () => {
        it('converts PascalCase to snake_case', () => {
            expect(StringUtil.toSnakeCase('primaryContainer')).toBe('primary_container')
        })

        it('converts kebab-case to snake_case', () => {
            expect(StringUtil.toSnakeCase('primary-container')).toBe('primary_container')
        })

        it('handles empty string', () => {
            expect(StringUtil.toSnakeCase('')).toBe('')
        })
    })

    describe('toPascalCase', () => {
        it('converts kebab-case to PascalCase', () => {
            expect(StringUtil.toPascalCase('primary-container')).toBe('PrimaryContainer')
        })

        it('converts snake_case to PascalCase', () => {
            expect(StringUtil.toPascalCase('primary_container')).toBe('PrimaryContainer')
        })

        it('handles empty string', () => {
            expect(StringUtil.toPascalCase('')).toBe('')
        })
    })
})
