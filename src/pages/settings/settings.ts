import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { Api } from '../../services/rfapi.component';

@Component({
  selector: 'page-settings',
  templateUrl: 'settings.html'
})
export class Settings {

  errorMessage: any;

  constructor(
    public navCtrl: NavController,
    public api:Api
  )
  {
  }

  ngOnInit() {
  }


}
