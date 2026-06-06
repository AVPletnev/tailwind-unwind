export type CliCommand = 'analyze' | 'generate' | 'apply' | 'init';

export interface CommandConfig {
  minOccurrences?: number;
  minSize?: number;
  maxSize?: number;
  top?: number;
  prefix?: string;
  output?: string;
  dedupeSubsets?: boolean;
  dryRun?: boolean;
  prettier?: boolean;
  fromReport?: string;
  extractableOnly?: boolean;
}

/** Keys are space-separated utility strings; values are base class names (without prefix). */
export type CustomNamesConfig = Record<string, string>;

export interface TailwindUnwindConfigFile extends CommandConfig {
  include?: string[];
  exclude?: string[];
  names?: CustomNamesConfig;
  analyze?: CommandConfig;
  generate?: CommandConfig;
  apply?: CommandConfig;
}

export interface TailwindUnwindConfig extends CommandConfig {
  include?: string[];
  exclude?: string[];
  names?: CustomNamesConfig;
}

export interface ScanOptions {
  include?: string[];
  exclude?: string[];
}

export interface ResolvedCommandOptions extends TailwindUnwindConfig {
  configPath?: string;
  changed?: boolean | string;
  force?: boolean;
}
