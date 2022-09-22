import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'SigFigPipe'
})
export class SigFigPipePipe implements PipeTransform {

  transform(value: number, sf: number): string {
    return value.toPrecision(sf);
  }

}
