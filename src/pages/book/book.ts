import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { Api } from '../../services/rfapi.component';

/*
  Generated class for the Book page.

  See http://ionicframework.com/docs/v2/components/#navigation for more info on
  Ionic pages and navigation.
*/
@Component({
  selector: 'page-book',
  templateUrl: 'book.html'
})
export class Book {

  constructor(
    public api:Api,
    public navCtrl: NavController
  ) {}

  ionViewDidLoad() {
    console.log(this.api.issues.Issues, this.api.current_issue);
  }


  deleteIssue(issueId) {
    console.log(issueId);
  }

}
