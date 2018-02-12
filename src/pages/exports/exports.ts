import { Component } from '@angular/core';
import { NavController, ModalController, NavParams } from 'ionic-angular';
import { Api } from '../../services/rfapi.component';
import { PopoverPage } from './exports-popover';

/*
  Generated class for the Book page.

  See http://ionicframework.com/docs/v2/components/#navigation for more info on
  Ionic pages and navigation.
*/

@Component({
  selector: 'page-exports',
  templateUrl: 'exports.html'
})
export class Exports {
  exporters: any;
  activeExporter: any;
  constructor(
    public api:Api,
    public navCtrl: NavController,
    private modalCtrl: ModalController
  ) {
    this.exporters = [];
    this.activeExporter = false;
  }
  async ionViewDidLoad() {
    let _data = await this.api._call("/exporters", "", {}, true);
    this.exporters = _data.exporters;
    console.log(this.exporters);
    if (this.exporters == null) {
      this.api.showAlert("No Connection", "Exporting a book requires a internet connection", null);
    }
  }
  async export() {
    let _payload = {
      exporterId: this.activeExporter, 
      issueId: this.api.current.issue
    };
    let _data = await this.api._call("/export", `Started export for «${this.api.current.issue_options.Name}»`, _payload, false);
  }



  openModal(data) {
   let modal = this.modalCtrl.create(PopoverPage, data, {showBackdrop: true});
   modal.present();
  }
}
