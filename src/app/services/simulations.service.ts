import { EventEmitter, Injectable, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { setupVariableItem, simParamArray } from '../simulations/motion-ramp/motion-ramp.component';

export interface simulationDocument {
   path: string; type: string; simulation: string;
   arguments: string; name: string; description: string; levels: Array<Level>;
}

export interface Level {
   name: string;
}

@Injectable({
    providedIn: 'root'
})

export class SimulationsService {

   constructor() { }

   @Output() simulationLoadedEmitter: EventEmitter<simulationDocument[]> = new EventEmitter();

   loadNewLab(simDocData: simulationDocument[]) {
      this.simulationLoadedEmitter.emit(simDocData);
   }

}
