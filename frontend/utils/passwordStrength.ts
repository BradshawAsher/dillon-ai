export type PasswordStrengthLabel = 'Too short' | 'Weak' | 'Fair' | 'Good' | 'Strong'

export type PasswordStrength = {
    score: 0 | 1 | 2 | 3 | 4
    label: PasswordStrengthLabel
    percent: number
}

const LABELS: PasswordStrengthLabel[] = ['Too short', 'Weak', 'Fair', 'Good', 'Strong']
const PERCENTS = [15, 30, 50, 75, 100] as const

/**
 * Scores a password for the signup form. The account API requires 6+
 * characters; anything shorter is "Too short" so the meter matches the
 * validation message. Extra length, mixed case, digits, and symbols
 * each raise the score by one, capped at Strong.
 */
export function assessPasswordStrength(password: string): PasswordStrength {
    if (password.length < 6) {
        return { score: 0, label: LABELS[0], percent: PERCENTS[0] }
    }

    let score = 1
    if (password.length >= 10) score += 1
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1
    if (/\d/.test(password)) score += 1
    if (/[^A-Za-z0-9]/.test(password)) score += 1

    const clamped = Math.min(4, score) as 0 | 1 | 2 | 3 | 4
    return { score: clamped, label: LABELS[clamped], percent: PERCENTS[clamped] }
}
