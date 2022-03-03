import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-questions-generator',
  templateUrl: './questions-generator.component.html',
  styleUrls: ['./questions-generator.component.scss']
})
export class QuestionsGeneratorComponent implements OnInit {

  searchTags: string = "questions";

  constructor() { }

  ngOnInit(): void {
  }

}
