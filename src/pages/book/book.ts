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
    public navCtrl: NavController,
  ) {
  }

  ionViewDidLoad() {
    //console.log(this.api.issues, this.api.current.issue);
  }


  getAttachements() {
    // @ts-ignore
    return document.attachements
  }

  deleteIssue(issueId) {
    let _confirm = this.api.alert.create({
      title: "Delete Book",
      message: `Are you sure you want to delete book id <b>${issueId}</b>? 
                If you are the only user, the book will be removed permanently.
                Shared books remain active for all other members.`,
      buttons: [
        {
          text: 'Cancel',
          handler: data => {}
        },
        {
          text: 'Delete',
          handler: data => {
            this.api._call("/delete", `Deleted Book ${issueId}`, {issue: issueId}, false);
          }
        }
      ]
    });
    _confirm.present();
  }  


  shareIssue(issueId) {
    let _confirm = this.api.alert.create({
      title: "Share Book",
      message: "Please enter the access key user to invite:",
      inputs: [
        {
          name: "invite",
          placeholder: "xxxxxxxxxxxxx-xxxxxxxxxxxx"
        },
      ],
      buttons: [
        {
          text: 'Cancel',
          handler: data => {}
        },
        {
          text: 'Save',
          handler: data => {
            console.log(data.invite);
            this.api._call("/share", "You just shared a book.", {issue: issueId, invite: data.invite}, false);
          }
        }
      ]
    });
    _confirm.present();
  }

  addIssue() {
    this.api._call("/add", "There is a new issue in your booklist", {}, false);
  }

}
