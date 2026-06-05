import { describe, expect, it } from 'vitest';
import { suggestClassName } from '../src/analyzer/suggestions.js';

describe('suggestClassName', () => {
  it('names flex header patterns as toolbar', () => {
    expect(
      suggestClassName([
        'flex',
        'items-center',
        'justify-between',
        'p-4',
      ]),
    ).toBe('page-header');
  });

  it('names image utilities as media-cover', () => {
    expect(
      suggestClassName([
        'w-full',
        'h-auto',
        'object-cover',
        'rounded-lg',
      ]),
    ).toBe('media-cover');
  });

  it('names grid layouts as photo-grid or card-grid', () => {
    expect(suggestClassName(['grid', 'grid-cols-3', 'gap-4'])).toBe('card-grid');
    expect(
      suggestClassName(['grid', 'grid-cols-4', 'gap-2', 'object-cover']),
    ).toBe('photo-grid');
  });

  it('names caption and label text', () => {
    expect(suggestClassName(['text-sm', 'font-bold'])).toBe('caption');
    expect(suggestClassName(['text-sm', 'font-medium'])).toBe('label');
  });

  it('prefers semantic names over utility concatenation', () => {
    const name = suggestClassName(['flex', 'items-center', 'gap-2']);
    expect(name).not.toContain('flex-items-center');
    expect(name).toBe('aligned-row');
  });

  it('names badges, inputs, and buttons', () => {
    expect(suggestClassName(['rounded-full', 'px-2', 'py-1', 'text-xs'])).toBe(
      'badge',
    );
    expect(
      suggestClassName(['border', 'rounded-md', 'px-3', 'py-2']),
    ).toBe('input');
    expect(
      suggestClassName(['bg-blue-500', 'text-white', 'px-4', 'py-2', 'rounded-lg']),
    ).toBe('primary-button');
  });

  it('names page containers and overlays', () => {
    expect(suggestClassName(['mx-auto', 'max-w-7xl', 'px-4'])).toBe(
      'page-container',
    );
    expect(
      suggestClassName(['fixed', 'inset-0', 'bg-black/50']),
    ).toBe('backdrop');
  });

  it('names navigation and layout patterns', () => {
    expect(
      suggestClassName(['flex', 'flex-col', 'h-full', 'gap-2']),
    ).toBe('sidebar');
    expect(
      suggestClassName(['sticky', 'top-0', 'z-50', 'bg-white']),
    ).toBe('sticky-header');
    expect(suggestClassName(['aspect-video', 'w-full'])).toBe('aspect-video');
  });

  it('names states and effects', () => {
    expect(suggestClassName(['animate-pulse', 'bg-gray-200', 'rounded'])).toBe(
      'skeleton',
    );
    expect(suggestClassName(['opacity-50', 'cursor-not-allowed'])).toBe(
      'disabled',
    );
  });

  it('uses compositional fallback for unknown patterns', () => {
    expect(suggestClassName(['hidden', 'md:block'])).toBe('block');
  });
});
