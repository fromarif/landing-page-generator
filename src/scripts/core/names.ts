import { site } from '../../config/site';

// cls('loader', 'mark') -> 'app-loader__mark',  sel('loader') -> '.app-loader'
export function cls(block: string, element?: string): string {
  return `${site.prefix}-${block}${element ? `__${element}` : ''}`;
}

export function sel(block: string, element?: string): string {
  return `.${cls(block, element)}`;
}
