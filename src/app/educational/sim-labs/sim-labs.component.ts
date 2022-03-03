import { Component } from '@angular/core';
import { DirectoryService } from 'src/app/services/directory.service';
import { simulationDocument, SimulationsService } from 'src/app/services/simulations.service';

export interface icons {
   ident: string;
   icon: string;
}

@Component({
  selector: 'app-sim-labs',
  templateUrl: './sim-labs2.component.html',
  styleUrls: ['./sim-labs2.component.scss']
})
export class SimLabsComponent {

   labData: simulationDocument[];
   imageIcons: icons[] = [
      {ident: "gdocs", icon: "gdocs.png"},
      {ident: "gsheets", icon: "gsheets.png"}
   ]
   classes = [
      { name: 'IB', classes: 'ib' },
      { name: 'AP', classes: 'ap' },
      { name: 'HS', classes: 'amhs' }
   ]

   constructor(private simulationsService: SimulationsService, public directoryService: DirectoryService) {
        this.simulationsService.simulationLoadedEmitter.subscribe(newData => {
            this.labData = newData;
        })
   }

   getImageFilename(ident: string): string {
      for(var i = 0; i < this.imageIcons.length; i++) {
         if(this.imageIcons[i].ident === ident) {
            return this.imageIcons[i].icon;
         }
      }
      return "file-generic.png";
   }

   getCourseStyle(courseName: string): string {
      for(var i = 0; i < this.classes.length; i++) {
         if(this.classes[i].name === courseName) {
            return this.classes[i].classes;
         }
      }
      return "";
   }

}
