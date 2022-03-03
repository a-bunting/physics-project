import { Component, Input, OnInit } from '@angular/core';
import { DataCollection, DataService } from 'src/app/services/data.service';

@Component({
  selector: 'app-data-display',
  templateUrl: './data-display.component.html',
  styleUrls: ['./data-display.component.scss']
})
export class DataDisplayComponent implements OnInit {

    dataServer;
    dataBases: DataCollection;
    dataId: string;

    constructor(private dataService: DataService) { 
        this.dataServer = this.dataService.dataUpdated.subscribe(data => {
            this.dataBases = data;
            this.processDataIntoTable();
        })
    }

    ngOnInit(): void {}

    processDataIntoTable() {

    }

}
