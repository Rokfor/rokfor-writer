import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { Http, Headers } from '@angular/http';
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
    private http: Http
  ) {
    this.http = http;
  }

  ionViewDidLoad() {
    console.log(this.api.issues, this.api.current.issue);
  }

  async _call(url, message, postdata) {
    postdata = postdata || {};
    try {
      let _headers = new Headers({'Content-Type': 'application/json'});
      let _res = await this.http.post(
        this.api.credentials.server + url, 
        JSON.stringify({
          credentials: this.api.credentials,
          data: postdata}),
          {headers: _headers}).toPromise();
      if (_res.ok === true && _res.json().state === "ok") {
        this.api.showAlert("OK", message, null);
      }
      if (_res.json().state === "error") {
        this.api.showAlert("Error", _res.json().message, null);
      }
    } catch (err) {
      console.log(err);
      this.api.showAlert(`Error ${err.status||""}`, `${err.statusText||""}<br>${err.url||""}`, null);
    }
  }


  deleteIssue(issueId) {
    this._call("/delete", `Deleted Book ${issueId}`, {issue: issueId});
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
            this._call("/share", "You just shared a book.", {issue: issueId, invite: data.invite});
          }
        }
      ]
    });
    _confirm.present();
  }

  addIssue() {
    this._call("/add", "There is a new issue in your booklist", {});
  }

}
