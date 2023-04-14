import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { countryData } from 'src/app/app.component';
import { DirectoryService, menuCategory } from 'src/app/services/directory.service';
import { HttpService } from 'src/app/services/http.service';

@Component({
  selector: 'app-web',
  templateUrl: './web.component.html',
  styleUrls: ['./web.component.scss']
})
export class WebComponent {

  searchTerms: string;
  countryCode: string;
  showDonateButton: boolean = false;
  menuList: menuCategory[] = [];
  pastSearches: string[] = [];

 constructor(private http: HttpService, private directory: DirectoryService, private router: Router) {
    http.takeFromApi("https://ipinfo.io?token=b51ebfae93970e").subscribe((dataReturned: countryData) => {
       this.countryCode = dataReturned.country;
       if(this.countryCode !== "QA") {
          this.showDonateButton = true;
       } else {
          this.showDonateButton = false;
       }
    });

    this.menuList.push(directory.getAllQuestions());
    this.menuList.push(directory.getAllProblems());
    this.menuList.push(directory.getAllSimulations());

    directory.menuEmitter.subscribe((menu: menuCategory[]) => {
        this.menuList = menu;
    })
 }

 getClasses(tag: string) {
    if(this.directory.tagStyles.filter(x => x.name === tag).length > 0) {
       return this.directory.tagStyles.find(x => x.name === tag).classes;
    }
    return "";
 }

 searchButtonPush(event?: KeyboardEvent): void {
      if(event === null || event.code === 'Enter') {
         this.router.navigate(['/search', this.searchTerms]);


          // keep the last five searches stroed to display back to the user.
          // stored here as we are only interested in searches from the search bar.
          this.pastSearches.push(this.searchTerms);
          if(this.pastSearches.length > 5) {
              this.pastSearches.shift();
          }
      }
 }
}
