import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-simulations',
  templateUrl: './simulations.component.html',
  styleUrls: ['./simulations.component.scss']
})
export class SimulationsComponent implements OnInit {

   searchTags: string = "simulation";

   constructor() { }

   ngOnInit(): void {
   }

}
