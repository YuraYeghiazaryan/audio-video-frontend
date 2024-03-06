import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'values',
  standalone: true
})
export class ValuesPipe implements PipeTransform {

  public transform(map: object): any[] {
    return Object.values(map);
  }
}
