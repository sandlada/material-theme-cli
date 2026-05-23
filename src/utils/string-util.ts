export class StringUtil {
    private constructor() { }

    public static toKebabCase<S extends string>(str: S) {
        if (!str) return ''
        return str
            .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
            .replace(/[\s_.]+/g, '-')
            .toLowerCase()
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
    }

    public static toSnakeCase(str: string) {
        if (!str) return ''
        return str
            .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
            .replace(/[\s.-]+/g, '_')
            .toLowerCase()
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '')
    }

    public static toPascalCase(str: string) {
        if (!str) return ''

        const kebabCase = this.toKebabCase(str)

        if (!kebabCase) return ''

        return kebabCase
            .split('-')
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join('')
    }
}
