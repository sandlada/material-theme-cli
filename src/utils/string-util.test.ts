import { describe, expect, it } from 'vitest'
import { StringUtil } from './string-util'

describe('StringUtil', () => {
    it('normalizes mixed casing and separators to kebab-case', () => {
        expect(StringUtil.toKebabCase('primaryContainer')).toBe('primary-container')
        expect(StringUtil.toKebabCase('PRIMARY_CONTAINER')).toBe('primary-container')
        expect(StringUtil.toKebabCase('primary.container value')).toBe('primary-container-value')
        expect(StringUtil.toKebabCase('primary-container-value')).toBe('primary-container-value')
        expect(StringUtil.toKebabCase('')).toBe('')
    })

    it('keeps the legacy helper in sync', () => {
        expect(StringUtil.toKebabCase('surfaceVariant')).toBe('surface-variant')
    })

    it('normalizes mixed casing and separators to snake-case', () => {
        expect(StringUtil.toSnakeCase('primaryContainer')).toBe('primary_container')
        expect(StringUtil.toSnakeCase('PRIMARY_CONTAINER')).toBe('primary_container')
        expect(StringUtil.toSnakeCase('primary.container value')).toBe('primary_container_value')
        expect(StringUtil.toSnakeCase('primary-container-value')).toBe('primary_container_value')
        expect(StringUtil.toSnakeCase('')).toBe('')
    })

    it('normalizes mixed casing and separators to pascal-case', () => {
        expect(StringUtil.toPascalCase('primaryContainer')).toBe('PrimaryContainer')
        expect(StringUtil.toPascalCase('PRIMARY_CONTAINER')).toBe('PrimaryContainer')
        expect(StringUtil.toPascalCase('primary.container value')).toBe('PrimaryContainerValue')
        expect(StringUtil.toPascalCase('primary-container-value')).toBe('PrimaryContainerValue')
        expect(StringUtil.toPascalCase('')).toBe('')
    })
})
