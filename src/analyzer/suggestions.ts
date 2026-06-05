const BREAKPOINT_PREFIX = /^(sm|md|lg|xl|2xl):/;

function baseClass(cls: string): string {
  return cls.replace(BREAKPOINT_PREFIX, '');
}

function has(classes: string[], name: string): boolean {
  return classes.some((cls) => baseClass(cls) === name);
}

function hasPrefix(classes: string[], prefix: string): boolean {
  return classes.some((cls) => baseClass(cls).startsWith(prefix));
}

function hasAll(classes: string[], names: string[]): boolean {
  return names.every((name) => has(classes, name));
}

function hasAny(classes: string[], names: string[]): boolean {
  return names.some((name) => has(classes, name));
}

function hasAnyPrefix(classes: string[], prefixes: string[]): boolean {
  return prefixes.some((prefix) => hasPrefix(classes, prefix));
}

function hasPadding(classes: string[]): boolean {
  return hasAnyPrefix(classes, ['p-', 'px-', 'py-', 'pt-', 'pb-', 'pl-', 'pr-']);
}

function hasMargin(classes: string[]): boolean {
  return hasAnyPrefix(classes, ['m-', 'mx-', 'my-', 'mt-', 'mb-', 'ml-', 'mr-']);
}

function hasGap(classes: string[]): boolean {
  return hasPrefix(classes, 'gap-') || hasPrefix(classes, 'gap-x-') || hasPrefix(classes, 'gap-y-');
}

function hasShadow(classes: string[]): boolean {
  return hasPrefix(classes, 'shadow-');
}

function hasRing(classes: string[]): boolean {
  return hasPrefix(classes, 'ring-');
}

function isFullWidth(classes: string[]): boolean {
  return has(classes, 'w-full');
}

function gridColumnCount(classes: string[]): string | null {
  const colClass = classes.find((cls) => baseClass(cls).startsWith('grid-cols-'));
  if (!colClass) return null;
  return baseClass(colClass).replace('grid-cols-', '');
}

function iconSize(classes: string[]): boolean {
  return hasAny(classes, ['w-4', 'h-4', 'w-5', 'h-5', 'w-6', 'h-6', 'size-4', 'size-5', 'size-6']);
}

interface NamingRule {
  name: string;
  match: (classes: string[]) => boolean;
}

/**
 * Ordered from most specific to general — first match wins.
 * Names describe UI intent, not utility lists.
 */
const SEMANTIC_RULES: NamingRule[] = [
  // ── Navigation & chrome ──────────────────────────────────────────
  {
    name: 'page-header',
    match: (c) =>
      hasAll(c, ['flex', 'items-center', 'justify-between']) &&
      (hasPadding(c) || hasPrefix(c, 'border-b')),
  },
  {
    name: 'toolbar',
    match: (c) => hasAll(c, ['flex', 'items-center', 'justify-between']),
  },
  {
    name: 'footer-bar',
    match: (c) =>
      has(c, 'flex') && hasPrefix(c, 'border-t') && hasPadding(c),
  },
  {
    name: 'action-bar',
    match: (c) =>
      hasAll(c, ['flex', 'items-center', 'justify-end']) && hasPadding(c),
  },
  {
    name: 'breadcrumb',
    match: (c) =>
      hasAll(c, ['flex', 'items-center']) &&
      hasGap(c) &&
      hasAny(c, ['text-sm', 'text-xs']),
  },
  {
    name: 'nav-item',
    match: (c) =>
      hasAll(c, ['flex', 'items-center']) && hasGap(c) && hasPadding(c),
  },
  {
    name: 'sidebar',
    match: (c) =>
      hasAll(c, ['flex', 'flex-col']) &&
      (has(c, 'h-full') || has(c, 'h-screen') || hasPrefix(c, 'w-')),
  },
  {
    name: 'tab-bar',
    match: (c) =>
      has(c, 'flex') && hasPrefix(c, 'border-b') && hasGap(c),
  },

  // ── Flex layout ──────────────────────────────────────────────────
  {
    name: 'centered-row',
    match: (c) => hasAll(c, ['flex', 'items-center', 'justify-center']),
  },
  {
    name: 'spread-row',
    match: (c) => has(c, 'flex') && has(c, 'justify-between'),
  },
  {
    name: 'aligned-row',
    match: (c) => hasAll(c, ['flex', 'items-center']),
  },
  {
    name: 'inline-actions',
    match: (c) => has(c, 'inline-flex') && has(c, 'items-center'),
  },
  {
    name: 'wrap-row',
    match: (c) => has(c, 'flex') && has(c, 'flex-wrap'),
  },
  {
    name: 'form-row',
    match: (c) => hasAll(c, ['flex', 'flex-col']) && hasGap(c),
  },
  {
    name: 'stack',
    match: (c) => hasAll(c, ['flex', 'flex-col']),
  },
  {
    name: 'row',
    match: (c) => has(c, 'flex'),
  },

  // ── Grid layout ──────────────────────────────────────────────────
  {
    name: 'photo-grid',
    match: (c) => has(c, 'grid') && hasPrefix(c, 'grid-cols-') && has(c, 'object-cover'),
  },
  {
    name: 'card-grid',
    match: (c) => has(c, 'grid') && hasGap(c) && hasPrefix(c, 'grid-cols-'),
  },
  {
    name: 'grid',
    match: (c) => has(c, 'grid'),
  },

  // ── Media & images ───────────────────────────────────────────────
  {
    name: 'media-cover',
    match: (c) => has(c, 'object-cover') && isFullWidth(c),
  },
  {
    name: 'media-contain',
    match: (c) => has(c, 'object-contain') && isFullWidth(c),
  },
  {
    name: 'aspect-video',
    match: (c) => has(c, 'aspect-video'),
  },
  {
    name: 'aspect-square',
    match: (c) => has(c, 'aspect-square'),
  },
  {
    name: 'avatar',
    match: (c) =>
      has(c, 'rounded-full') &&
      (hasPrefix(c, 'w-') || hasPrefix(c, 'h-') || hasPrefix(c, 'size-')) &&
      hasPrefix(c, 'object-'),
  },
  {
    name: 'thumbnail',
    match: (c) =>
      has(c, 'object-cover') &&
      hasAnyPrefix(c, ['w-16', 'w-12', 'w-20', 'h-16', 'h-12', 'h-20']),
  },
  {
    name: 'icon',
    match: (c) => iconSize(c) && !has(c, 'flex'),
  },
  {
    name: 'logo',
    match: (c) => hasAny(c, ['h-8', 'h-6', 'h-10']) && has(c, 'w-auto'),
  },
  {
    name: 'media-frame',
    match: (c) => isFullWidth(c) && has(c, 'h-auto'),
  },

  // ── Interactive (before surfaces — shares bg-/rounded-/px-) ─────
  {
    name: 'badge',
    match: (c) =>
      has(c, 'rounded-full') &&
      hasAnyPrefix(c, ['px-', 'py-']) &&
      hasAny(c, ['text-xs', 'text-sm']),
  },
  {
    name: 'chip',
    match: (c) =>
      hasAnyPrefix(c, ['px-', 'py-']) &&
      !has(c, 'rounded-full') &&
      hasPrefix(c, 'rounded-') &&
      hasAny(c, ['text-xs', 'text-sm']),
  },
  {
    name: 'tag',
    match: (c) =>
      hasAnyPrefix(c, ['px-2', 'px-3']) &&
      hasAnyPrefix(c, ['py-0', 'py-1']) &&
      hasPrefix(c, 'rounded-md'),
  },
  {
    name: 'icon-button',
    match: (c) =>
      hasAnyPrefix(c, ['p-1', 'p-1.5', 'p-2', 'p-3']) &&
      hasPrefix(c, 'rounded-') &&
      !hasAnyPrefix(c, ['px-4', 'px-5', 'px-6', 'px-8']),
  },
  {
    name: 'primary-button',
    match: (c) =>
      hasAnyPrefix(c, ['px-', 'py-']) &&
      hasPrefix(c, 'rounded-') &&
      hasAnyPrefix(c, ['bg-blue', 'bg-indigo', 'bg-primary', 'bg-violet']),
  },
  {
    name: 'danger-button',
    match: (c) =>
      hasAnyPrefix(c, ['px-', 'py-']) &&
      hasPrefix(c, 'rounded-') &&
      hasAnyPrefix(c, ['bg-red', 'bg-rose', 'bg-destructive']),
  },
  {
    name: 'ghost-button',
    match: (c) =>
      hasAnyPrefix(c, ['px-', 'py-']) &&
      hasPrefix(c, 'rounded-') &&
      hasAnyPrefix(c, ['hover:bg-', 'bg-transparent']),
  },
  {
    name: 'input',
    match: (c) =>
      hasAnyPrefix(c, ['px-', 'py-']) &&
      hasPrefix(c, 'border') &&
      hasPrefix(c, 'rounded-'),
  },
  {
    name: 'textarea',
    match: (c) =>
      hasPrefix(c, 'border') &&
      hasPrefix(c, 'rounded-') &&
      hasAny(c, ['resize-none', 'min-h-']),
  },
  {
    name: 'select',
    match: (c) =>
      hasPrefix(c, 'border') &&
      hasPrefix(c, 'rounded-') &&
      has(c, 'appearance-none'),
  },
  {
    name: 'checkbox-row',
    match: (c) =>
      hasAll(c, ['flex', 'items-center']) && hasGap(c) && hasAny(c, ['text-sm', 'text-base']),
  },
  {
    name: 'button',
    match: (c) =>
      hasAnyPrefix(c, ['px-', 'py-']) && hasPrefix(c, 'rounded-'),
  },

  // ── Surfaces & containers ────────────────────────────────────────
  {
    name: 'page-container',
    match: (c) => has(c, 'mx-auto') && hasPrefix(c, 'max-w-'),
  },
  {
    name: 'section',
    match: (c) => hasPadding(c) && hasMargin(c) && !has(c, 'flex') && !has(c, 'grid'),
  },
  {
    name: 'hero',
    match: (c) =>
      hasPadding(c) &&
      hasAny(c, ['text-center', 'justify-center']) &&
      hasAnyPrefix(c, ['text-3xl', 'text-4xl', 'text-5xl']),
  },
  {
    name: 'alert',
    match: (c) =>
      hasAnyPrefix(c, ['border-l-4', 'border-l-2']) &&
      hasPadding(c) &&
      hasPrefix(c, 'bg-'),
  },
  {
    name: 'callout',
    match: (c) =>
      hasPrefix(c, 'bg-') && hasPadding(c) && hasPrefix(c, 'border') && hasPrefix(c, 'rounded-'),
  },
  {
    name: 'panel',
    match: (c) =>
      hasPrefix(c, 'rounded-') && hasPadding(c) && hasPrefix(c, 'border'),
  },
  {
    name: 'card',
    match: (c) =>
      hasPrefix(c, 'rounded-') && hasPadding(c) && hasPrefix(c, 'bg-'),
  },
  {
    name: 'elevated-card',
    match: (c) =>
      hasShadow(c) && hasPrefix(c, 'rounded-') && hasPadding(c),
  },
  {
    name: 'surface',
    match: (c) => hasPrefix(c, 'bg-') && hasPadding(c),
  },

  // ── Overlays & positioning ───────────────────────────────────────
  {
    name: 'backdrop',
    match: (c) =>
      has(c, 'fixed') && has(c, 'inset-0') && hasAnyPrefix(c, ['bg-black', 'bg-white', 'bg-gray']),
  },
  {
    name: 'overlay',
    match: (c) => has(c, 'fixed') && has(c, 'inset-0'),
  },
  {
    name: 'modal-shell',
    match: (c) =>
      has(c, 'fixed') && hasAll(c, ['flex', 'items-center', 'justify-center']),
  },
  {
    name: 'drawer',
    match: (c) =>
      has(c, 'fixed') &&
      hasAny(c, ['inset-y-0', 'top-0', 'bottom-0']) &&
      hasPrefix(c, 'w-'),
  },
  {
    name: 'sticky-header',
    match: (c) =>
      has(c, 'sticky') && hasPrefix(c, 'top-') && hasPrefix(c, 'z-'),
  },
  {
    name: 'dropdown',
    match: (c) =>
      has(c, 'absolute') && hasPrefix(c, 'z-') && hasPrefix(c, 'rounded-') && hasShadow(c),
  },

  // ── Typography ───────────────────────────────────────────────────
  {
    name: 'prose',
    match: (c) => hasPrefix(c, 'prose'),
  },
  {
    name: 'heading',
    match: (c) =>
      hasAnyPrefix(c, ['text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl']) &&
      hasPrefix(c, 'font-'),
  },
  {
    name: 'title',
    match: (c) =>
      hasAnyPrefix(c, ['text-lg', 'text-xl', 'text-2xl']) && hasPrefix(c, 'font-semibold'),
  },
  {
    name: 'subtitle',
    match: (c) =>
      hasAnyPrefix(c, ['text-base', 'text-lg']) && hasPrefix(c, 'text-gray'),
  },
  {
    name: 'label',
    match: (c) =>
      hasAny(c, ['text-xs', 'text-sm']) && hasAnyPrefix(c, ['font-medium', 'font-semibold']),
  },
  {
    name: 'caption',
    match: (c) =>
      hasAny(c, ['text-sm', 'text-xs']) &&
      hasPrefix(c, 'font-') &&
      !hasAnyPrefix(c, ['font-medium', 'font-semibold']),
  },
  {
    name: 'muted',
    match: (c) =>
      hasAnyPrefix(c, ['text-gray', 'text-slate', 'text-zinc', 'text-neutral']),
  },
  {
    name: 'error-text',
    match: (c) => hasAnyPrefix(c, ['text-red', 'text-rose', 'text-destructive']),
  },
  {
    name: 'link',
    match: (c) =>
      has(c, 'underline') ||
      hasAnyPrefix(c, ['text-blue', 'text-indigo', 'text-primary']),
  },
  {
    name: 'truncate',
    match: (c) => has(c, 'truncate') || has(c, 'line-clamp-1'),
  },

  // ── Lists & tables ───────────────────────────────────────────────
  {
    name: 'table-header',
    match: (c) =>
      hasAnyPrefix(c, ['text-xs', 'uppercase']) &&
      hasAnyPrefix(c, ['font-medium', 'font-semibold', 'tracking-']),
  },
  {
    name: 'table-row',
    match: (c) => hasPrefix(c, 'border-b') && hasAll(c, ['flex', 'items-center']),
  },
  {
    name: 'list-item',
    match: (c) =>
      hasAll(c, ['flex', 'items-center']) && hasGap(c) && hasPadding(c),
  },
  {
    name: 'menu-item',
    match: (c) =>
      hasAll(c, ['flex', 'items-center']) &&
      hasGap(c) &&
      hasAnyPrefix(c, ['px-', 'py-']) &&
      hasAnyPrefix(c, ['hover:bg-', 'rounded-']),
  },
  {
    name: 'divider',
    match: (c) =>
      hasPrefix(c, 'border-') && (isFullWidth(c) || hasMargin(c)),
  },

  // ── States & effects ─────────────────────────────────────────────
  {
    name: 'skeleton',
    match: (c) => has(c, 'animate-pulse') && hasPrefix(c, 'bg-'),
  },
  {
    name: 'loading',
    match: (c) => has(c, 'animate-spin') || has(c, 'animate-pulse'),
  },
  {
    name: 'disabled',
    match: (c) => has(c, 'opacity-50') || has(c, 'cursor-not-allowed'),
  },
  {
    name: 'focus-ring',
    match: (c) => hasRing(c) || hasAnyPrefix(c, ['focus:ring-', 'focus-visible:ring-']),
  },
  {
    name: 'hover-lift',
    match: (c) =>
      hasAnyPrefix(c, ['hover:shadow-', 'hover:-translate-y-']) && hasPrefix(c, 'transition'),
  },

  // ── Scroll & overflow ────────────────────────────────────────────
  {
    name: 'scroll-panel',
    match: (c) =>
      hasAny(c, ['overflow-y-auto', 'overflow-auto', 'overflow-x-auto', 'overflow-hidden']),
  },

  // ── Visual fallbacks ─────────────────────────────────────────────
  {
    name: 'shadow-box',
    match: (c) => hasShadow(c) && hasPrefix(c, 'rounded-'),
  },
  {
    name: 'bordered',
    match: (c) => hasPrefix(c, 'border') && hasPadding(c),
  },
  {
    name: 'rounded-box',
    match: (c) => hasPrefix(c, 'rounded-'),
  },
  {
    name: 'padded',
    match: (c) => hasPadding(c),
  },
];

/** Build a short compositional name from layout + traits. */
function buildCompositionalName(classes: string[]): string {
  const parts: string[] = [];

  if (has(classes, 'flex')) {
    if (has(classes, 'flex-col')) parts.push('stack');
    else if (has(classes, 'flex-wrap')) parts.push('wrap');
    else if (has(classes, 'justify-between')) parts.push('between');
    else if (has(classes, 'justify-center')) parts.push('centered');
    else if (has(classes, 'items-center')) parts.push('aligned');
    else parts.push('row');
  } else if (has(classes, 'grid')) {
    const cols = gridColumnCount(classes);
    parts.push(cols ? `grid-${cols}` : 'grid');
  } else if (has(classes, 'inline-flex')) {
    parts.push('inline-row');
  } else if (has(classes, 'inline-block')) {
    parts.push('inline');
  } else if (has(classes, 'block')) {
    parts.push('block');
  }

  if (has(classes, 'fixed')) parts.push('fixed');
  else if (has(classes, 'absolute')) parts.push('absolute');
  else if (has(classes, 'sticky')) parts.push('sticky');
  else if (has(classes, 'relative')) parts.push('relative');

  if (has(classes, 'object-cover')) parts.push('cover');
  else if (has(classes, 'object-contain')) parts.push('contain');
  else if (has(classes, 'aspect-video')) parts.push('video');
  else if (has(classes, 'rounded-full')) parts.push('circle');
  else if (hasPrefix(classes, 'rounded-')) parts.push('rounded');

  if (hasShadow(classes)) parts.push('shadow');
  else if (hasRing(classes)) parts.push('ring');
  else if (hasPrefix(classes, 'border')) parts.push('bordered');

  if (hasPrefix(classes, 'bg-')) parts.push('surface');
  else if (hasPrefix(classes, 'text-')) parts.push('text');

  if (has(classes, 'truncate')) parts.push('truncate');
  if (has(classes, 'animate-pulse')) parts.push('pulse');
  if (has(classes, 'transition')) parts.push('transition');

  if (parts.length === 0 && hasPadding(classes)) parts.push('padded');
  if (parts.length === 0 && hasMargin(classes)) parts.push('spaced');

  const unique = [...new Set(parts)];
  return unique.slice(0, 2).join('-') || 'component';
}

/**
 * Suggest a short, human-readable component class name from a utility list.
 * Prefers semantic names (toolbar, media-cover) over utility concatenation.
 */
export function suggestClassName(classes: string[]): string {
  if (classes.length === 0) {
    return 'component';
  }

  for (const rule of SEMANTIC_RULES) {
    if (rule.match(classes)) {
      return rule.name;
    }
  }

  return buildCompositionalName(classes);
}
