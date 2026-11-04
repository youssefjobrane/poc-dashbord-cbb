import { Pipe, PipeTransform } from '@angular/core';
import { format, FormatKind } from './format';

/** `{{ value | num: 'pct1' }}` — fr-FR formatting shared with the mock API. */
@Pipe({ name: 'num' })
export class NumPipe implements PipeTransform {
  transform(value: number | null | undefined, kind: FormatKind): string {
    return format(value, kind);
  }
}
