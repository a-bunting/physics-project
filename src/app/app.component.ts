import { Component } from '@angular/core';
import { HttpService } from './services/http.service';
import { DirectoryService, menuCategory } from './services/directory.service';
import { Router } from '@angular/router';

export interface countryData {
   country: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app2.component.scss', './styles/_variables.scss']
})

export class AppComponent {

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

   menuHidden: boolean = false;

   hideMenu(): void {
    //    if(this.menuHidden === false) {
    //        document.getElementById('header').classList.add('header__hidden');
    //        document.getElementById('footer').classList.add('header__hidden');
    //        document.getElementById('header__hide--icon').classList.add('header__rotate');
    //        document.getElementById('grid-container').style.gridTemplateColumns = "0 1fr";
    //     } else {
    //         document.getElementById('header').classList.remove('header__hidden');
    //         document.getElementById('footer').classList.remove('header__hidden');
    //         document.getElementById('header__hide--icon').classList.remove('header__rotate');
    //         document.getElementById('grid-container').style.gridTemplateColumns = "30rem 1fr";
    //    }
    //    this.menuHidden = !this.menuHidden;
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
