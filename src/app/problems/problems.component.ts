import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-problems',
  templateUrl: './problems.component.html',
  styleUrls: ['./problems.component.css']
})
export class ProblemsComponent implements OnInit {

    searchTags: string = "problems";

    constructor() { }

    ngOnInit(): void {
    }

}
