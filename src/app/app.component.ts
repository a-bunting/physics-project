import { Component, OnInit } from '@angular/core';

export interface countryData {
   country: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app2.component.scss', './styles/_variables.scss']
})

export class AppComponent implements OnInit {

  constructor() {
  }

  ngOnInit(): void {
  }

}
