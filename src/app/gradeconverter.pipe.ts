import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'gradeconversion'
})
export class GradeConversion implements PipeTransform {

   scalechoice: number = 1;

   gradescales = [
      {
         id: 0,
         name: 'proficiency',
         scale: [
                     {
                        'grade':'No Evidence', 'percent': 20, 'shorthand':'NE'
                     },
                     {
                        'grade':'Limited Proficiency', 'percent': 40, 'shorthand':'LP'
                     },
                     {
                        'grade':'Approaching Proficient', 'percent': 60, 'shorthand':'AP'
                     },
                     {
                        'grade':'Proficient', 'percent': 80, 'shorthand':'P'
                     },
                     {
                        'grade':'Mastery', 'percent': 100, 'shorthand':'M'
                     }
               ]
      },{
         id: 1,
         name: 'atof',
         scale: [
                     {
                        'grade':'F', 'percent': 60, 'shorthand':'F'
                     },
                     {
                        'grade':'D-', 'percent': 64, 'shorthand':'D-'
                     },
                     {
                        'grade':'D', 'percent': 67, 'shorthand':'D'
                     },
                     {
                        'grade':'D+', 'percent': 70, 'shorthand':'D+'
                     },
                     {
                        'grade':'C-', 'percent': 74, 'shorthand':'C-'
                     },
                     {
                        'grade':'C', 'percent': 77, 'shorthand':'C'
                     },
                     {
                        'grade':'C+', 'percent': 80, 'shorthand':'C+'
                     },
                     {
                        'grade':'B-', 'percent': 84, 'shorthand':'B-'
                     },
                     {
                        'grade':'B', 'percent': 87, 'shorthand':'B'
                     },
                     {
                        'grade':'B+', 'percent': 90, 'shorthand':'B+'
                     },
                     {
                        'grade':'A-', 'percent': 94, 'shorthand':'A-'
                     },
                     {
                        'grade':'A', 'percent': 97, 'shorthand':'A'
                     },
                     {
                        'grade':'A+', 'percent': 100, 'shorthand':'A+'
                     }
               ]
      }

   ]
    transform(value: any, shorten: string, scalechoice?: string): string {
        
      var scaleToUse: number;

      if(scalechoice) {
         this.gradescales.forEach(scale => {
            if(scale.name === scalechoice) {
               scaleToUse = scale.id;
            }
         });
         if(scaleToUse === undefined) {
            scaleToUse = this.scalechoice;
         }
      } else {
         scaleToUse = this.scalechoice;
      }

      for(var i = 0 ; i < this.gradescales[scaleToUse].scale.length ; i++) {
         if(value <= this.gradescales[scaleToUse].scale[i].percent) {
             if(shorten === 'short') {
                 return this.gradescales[scaleToUse].scale[i].shorthand;
             } else {
                 return this.gradescales[scaleToUse].scale[i].grade;
             }
             
         }
     }

      console.log(value);
      return "Unknown..";

    }

}
