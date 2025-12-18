// @ts-nocheck
import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// Example student schema (adjust based on actual schema)
const studentSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  father_name: z.string().min(1, 'Father name is required'),
  gender: z.enum(['male', 'female']),
  birth_year: z.number().min(1900).max(new Date().getFullYear()),
  guardian_phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
})

describe('Student Validation Schema', () => {
  it('validates correct student data', () => {
    const validData = {
      full_name: 'Ahmad Khan',
      father_name: 'Mohammad Khan',
      gender: 'male',
      birth_year: 2010,
    }

    const result = studentSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('rejects empty full name', () => {
    const invalidData = {
      full_name: '',
      father_name: 'Mohammad Khan',
      gender: 'male',
      birth_year: 2010,
    }

    const result = studentSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('required')
    }
  })

  it('rejects invalid gender', () => {
    const invalidData = {
      full_name: 'Ahmad Khan',
      father_name: 'Mohammad Khan',
      gender: 'other',
      birth_year: 2010,
    }

    const result = studentSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('validates birth year range', () => {
    const invalidData = {
      full_name: 'Ahmad Khan',
      father_name: 'Mohammad Khan',
      gender: 'male',
      birth_year: 1800, // Too old
    }

    const result = studentSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('accepts optional email', () => {
    const validData = {
      full_name: 'Ahmad Khan',
      father_name: 'Mohammad Khan',
      gender: 'male',
      birth_year: 2010,
      email: '',
    }

    const result = studentSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('validates email format when provided', () => {
    const invalidData = {
      full_name: 'Ahmad Khan',
      father_name: 'Mohammad Khan',
      gender: 'male',
      birth_year: 2010,
      email: 'invalid-email',
    }

    const result = studentSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })
})
