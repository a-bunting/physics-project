import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DirectoryService, menuCategory } from 'src/app/services/directory.service';
import { HttpService } from 'src/app/services/http.service';
import { menuItem } from 'src/app/services/directory.service';

@Component({
  selector: 'app-search',
  templateUrl: './search3.component.html',
  styleUrls: ['./search3.component.scss', '../../styles/_variables.scss']
})
export class SearchComponent implements OnInit {

//    @Input() searchTags: string = "";
    @Input() titleDisplay: boolean = false;
    searchTerms: string = "";
    searchResults: menuCategory = { title: "No Results", route: "", items: []};

    constructor(private directory: DirectoryService, private router: ActivatedRoute) { }
  
    ngOnInit(): void {
        this.searchTerms = this.router.snapshot.paramMap.get('searchTags');
        this.searchResults = this.directory.searchAllMenuItems(this.searchTerms);
    
        this.router.params.subscribe(params => {
            this.searchTerms = this.router.snapshot.paramMap.get('searchTags');
            this.performSearch(this.searchTerms);
        })
    }

    performSearch(searchTerms: string): void {
        var menuItems: menuItem[] = [];
        this.searchResults = this.directory.searchAllMenuItems(searchTerms);
    }

    getTagClass(tagName: string): string {
        return this.directory.getTagStyles(tagName);
    }

//    parameterDecoder(params: string): object {
//         if(params !== "") {
//             var parameterArray = params.split("&");
//             var newObj = "{";
//             parameterArray.forEach(key => {
//                 var param = key.split("=");
//                 var obj = "\"" + param[0] + "\" : \"" + param[1] + "\", ";
//                 newObj = newObj + obj;
//             });
//             newObj = newObj.substring(0, newObj.length - 2) + "}"; 
//             return JSON.parse(newObj);
//         }
//         return null;
//     }
}
