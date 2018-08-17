import { Component } from '@angular/core';
import { Http, Headers } from '@angular/http';
import { NavController } from 'ionic-angular';
import { Api } from '../../services/rfapi.component';

@Component({
  selector: 'page-settings',
  templateUrl: 'settings.html'
})
export class Settings {

  errorMessage: any;

  signup: any =  {
    email: "",
    sent: false,
    error: false,
    message: "",
    emit: async function() {
      try {
        let _headers = new Headers({'Content-Type': 'application/json'});
        let _res = await this.http.post(
          this.api.credentials.server + "/signup", 
          JSON.stringify({email: this.signup.email}),
          {headers: _headers}).toPromise();
        this.signup.sent = _res.ok === true && _res.json().state === "ok";
        this.signup.error = _res.json().state === "error"
        this.signup.message = _res.json().message;
      } catch (err) {
        this.api.showAlert("Connection Failed", "Check the server url or enable your internet connection.");
      }
      
    }.bind(this)
  }

  constructor(
    public navCtrl: NavController,
    public api:Api,
    private http: Http
  )
  {
    this.http = http;
  }

  ngOnInit() {
  }


}
