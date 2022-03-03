import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UsersService } from './users.service';

@Injectable({
  providedIn: 'root'
})

export class HttpService {

   constructor(private http: HttpClient, private usersService: UsersService) { }

   httpRequest() {
   }

   postToDb(content: object, userData?: boolean, dateTime?: boolean) {

    }

    addTimeToSubmission(obj: object) {
        var today = new Date();
        var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
        var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
        var dateTime = { date: date+' '+time };
        return {...dateTime, ...obj};
    }

    takeFromApi(pageQuery: string) {
        return this.http.get(pageQuery, {responseType: 'json'});
                       //,catchError(errorResponse => { return throwError(errorResponse)});
    }

    getCSVFile(urlQuery: string) {
        return this.http.get(urlQuery, {responseType: 'text'});
    }

}
