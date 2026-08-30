// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { StudentNameWithFather } from '@/components/students/StudentNameWithFather';

describe('StudentNameWithFather', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders student name and father name when both are provided', () => {
    render(
      <StudentNameWithFather
        fullName="Ahmad"
        fatherName="Mohammad"
        fatherLabel="Father"
      />
    );

    expect(screen.getByText('Ahmad')).toBeInTheDocument();
    expect(screen.getByText('Father: Mohammad')).toBeInTheDocument();
  });

  it('renders fallback name when full name is empty', () => {
    render(
      <StudentNameWithFather
        fullName=""
        fatherName="Mohammad"
        fatherLabel="Father"
        fallbackName="Unknown"
      />
    );

    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('hides father line when father name is null', () => {
    render(
      <StudentNameWithFather fullName="Ahmad" fatherName={null} fatherLabel="Father" />
    );

    expect(screen.queryByText(/Father:/)).not.toBeInTheDocument();
  });

  it('hides father line when father name is whitespace', () => {
    render(
      <StudentNameWithFather fullName="Ahmad" fatherName="   " fatherLabel="Father" />
    );

    expect(screen.queryByText(/Father:/)).not.toBeInTheDocument();
  });
});
