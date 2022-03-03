import { stringify } from '@angular/compiler/src/util';
import { Component, OnInit } from '@angular/core';
import { HttpService } from 'src/app/services/http.service';

@Component({
  selector: 'app-display-all-feedback',
  templateUrl: './display-all-feedback.component.html',
  styleUrls: ['./display-all-feedback.component.scss']
})
export class DisplayAllFeedbackComponent implements OnInit {

  constructor(private httpService: HttpService) { }

  userData;

  ngOnInit(): void {
        this.httpService.takeFromApi('http://20ct.sweeto.co.uk/API/get-student-feedback.php').subscribe(data => {

            this.userData = data;
            
            for(var i = 0 ; i < this.userData.length ; i++) {
                var totalComments = 0;

                if(this.userData[i].working_feedback_given !== null) {
                    this.userData[i].working_feedback_given = this.userData[i].working_feedback_given.split("----");
                    totalComments += this.userData[i].working_feedback_given.length;
                }
                if(this.userData[i].videonotes_feedback_given !== null) {
                    this.userData[i].videonotes_feedback_given = this.userData[i].videonotes_feedback_given.split("----");
                    totalComments += this.userData[i].videonotes_feedback_given.length;
                }
                if(this.userData[i].experiment_feedback_given !== null) {
                    this.userData[i].experiment_feedback_given = this.userData[i].experiment_feedback_given.split("----");
                    totalComments += this.userData[i].experiment_feedback_given.length;
                }
                if(this.userData[i].phetlab_feedback_given !== null) {
                    this.userData[i].phetlab_feedback_given = this.userData[i].phetlab_feedback_given.split("----");
                    totalComments += this.userData[i].phetlab_feedback_given.length;
                }

                this.userData[i].totalComments = totalComments;
            }
        })                               
  }

}
   