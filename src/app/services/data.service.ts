import { EventEmitter, Injectable, Output } from '@angular/core';

export interface DataCollection {
    simulationId: string;
    iv: Variable;
    dv: Variable;
    control: [];
    data: DataUnit[];
}

export interface DataUnit {
    iv: number,
    dv: number[]
}

export interface ControlVariable {
    name: string;
    value: number;
}
export interface Variable {
    name: string;
    unit: string;
}
export interface Variable {
    name: string;
    unit: string;
}

@Injectable({
    providedIn: 'root'
})

export class DataService {

    @Output() dataUpdated: EventEmitter<DataCollection> = new EventEmitter();

    constructor() { }

    dataStore: Array<DataCollection> = [];

    addNewDataStore(simulationId: string, iv: Variable, dv: Variable, controlled): number  {
        // locate the current data store for the simulation if it exists...
        for(var i = 0; i < this.dataStore.length; i++) {
            if(this.dataStore[i].simulationId === simulationId && this.dataStore[i].iv === iv && this.dataStore[i].dv === dv) {
                return this.clearEmptyDataStores(i);
            }
        }
        // no current data store for this so add it to the end...
        this.dataStore.push({simulationId: simulationId, iv: iv, dv: dv, control: controlled, data: []});
        return this.clearEmptyDataStores(this.dataStore.length-1);
    }

    clearEmptyDataStores(id: number): number {
        var newId = id;
        for(var i = 0; i < this.dataStore.length; i++) {
            if(this.dataStore[i].data.length === 0) {
                if(i !== id) {
                    this.dataStore.splice(i, 1);
                }
                if(id > i) {
                    newId = id - 1;
                }
            }
        }
        return newId;
    }

    collectData(dataStoreID: number, ivData: number, dvData: number) {   
        if(this.dataStore[dataStoreID].data.length > 0) {
            var index = null;
            for(var i = 0; i < this.dataStore[dataStoreID].data.length; i++) {
                if(this.dataStore[dataStoreID].data[i].iv === ivData) {
                    index = i;
                    break;
                }
            }
            if(index !== null) {
                this.dataStore[dataStoreID].data[index].dv.push(dvData);
            } else {
                this.dataStore[dataStoreID].data.push({iv: ivData, dv: [dvData]});
            }

        } else {
            this.dataStore[dataStoreID].data.push({iv: ivData, dv: [dvData]});
        }        
        this.dataUpdated.emit(this.dataStore[dataStoreID]);
    }

    getData(dataStoreID: number) {
        return this.dataStore[dataStoreID].data;
    }

}
