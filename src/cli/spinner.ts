import {
  scanProject,
  type ScanProjectOptions,
  type ScanProjectResult,
} from '../core/scanProject.js';

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'] as const;

export interface Spinner {
  start: (message: string) => void;
  update: (message: string) => void;
  stop: (finalMessage?: string) => void;
  readonly enabled: boolean;
}

export interface SpinnerOptions {
  enabled?: boolean;
  stream?: NodeJS.WriteStream;
}

export function isInteractiveTerminal(
  stream: NodeJS.WriteStream = process.stdout,
): boolean {
  return stream.isTTY === true && process.env.CI !== 'true';
}

export function createSpinner(options: SpinnerOptions = {}): Spinner {
  const stream = options.stream ?? process.stdout;
  const enabled = options.enabled ?? isInteractiveTerminal(stream);
  let frame = 0;
  let message = '';
  let timer: ReturnType<typeof setInterval> | null = null;
  let active = false;

  function clearLine(): void {
    stream.write('\r\x1b[K');
  }

  function render(): void {
    if (!active || !enabled) {
      return;
    }

    clearLine();
    const frameChar = FRAMES[frame % FRAMES.length];
    stream.write(`${frameChar} ${message}`);
    frame += 1;
  }

  return {
    enabled,
    start(text: string) {
      if (!enabled) {
        return;
      }

      message = text;
      active = true;
      frame = 0;
      render();
      timer = setInterval(render, 80);
    },
    update(text: string) {
      message = text;
      if (enabled && active) {
        render();
      }
    },
    stop(finalMessage?: string) {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }

      if (enabled && active) {
        clearLine();
        if (finalMessage) {
          stream.write(`${finalMessage}\n`);
        }
      }

      active = false;
    },
  };
}

export interface ParseProgress {
  current: number;
  total: number;
  filePath: string;
}

export function createScanProgressHandler(
  spinner: Spinner,
  label: string,
): (progress: ParseProgress) => void {
  let parsingDone = false;

  return ({ current, total, filePath }) => {
    if (filePath === '' && current === total) {
      parsingDone = true;
      spinner.update('Computing patterns...');
      return;
    }

    if (parsingDone) {
      return;
    }

    spinner.update(`${label}... ${current}/${total}`);
  };
}

export interface ProgressDisplayOptions {
  format?: string;
  noProgress?: boolean;
  quiet?: boolean;
}

export function shouldShowProgress(
  options: ProgressDisplayOptions = {},
): boolean {
  return (
    options.format !== 'json' &&
    !options.noProgress &&
    !options.quiet &&
    isInteractiveTerminal()
  );
}

export async function runWithSpinner<T>(
  showProgress: boolean,
  label: string,
  task: (update: (message: string) => void) => Promise<T>,
): Promise<T> {
  const spinner = createSpinner({ enabled: showProgress });
  spinner.start(label);

  try {
    return await task((message) => {
      spinner.update(message);
    });
  } finally {
    spinner.stop();
  }
}

export async function scanProjectWithSpinner(
  scanOptions: ScanProjectOptions,
  options: {
    label?: string;
    showProgress: boolean;
    onParseProgress?: ScanProjectOptions['onParseProgress'];
  },
): Promise<ScanProjectResult> {
  const label = options.label ?? 'Scanning source files';

  if (!options.showProgress) {
    return scanProject({
      ...scanOptions,
      onParseProgress: options.onParseProgress,
    });
  }

  const spinner = createSpinner({ enabled: true });
  spinner.start(label);

  try {
    return await scanProject({
      ...scanOptions,
      onParseProgress: createScanProgressHandler(spinner, label),
    });
  } finally {
    spinner.stop();
  }
}
