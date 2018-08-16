import { Component } from '@angular/core';
import { NavController, ModalController, NavParams, Events, LoadingController } from 'ionic-angular';
import { Api } from '../../services/rfapi.component';
import { PopoverPage } from './exports-popover';
import { DocumentViewer, DocumentViewerOptions } from '@ionic-native/document-viewer';

/*
  Generated class for the Book page.

  See http://ionicframework.com/docs/v2/components/#navigation for more info on
  Ionic pages and navigation.
*/

@Component({
  selector: 'page-exports',
  templateUrl: 'exports.html',
  providers: [
    DocumentViewer
  ]
})

export class Exports {
  exporters: any;
  activeExporter: any;
  events: Events;

  constructor(
    public api:Api,
    public navCtrl: NavController,
    private modalCtrl: ModalController,
    public event: Events,
    public loadingCtrl: LoadingController,
    private document: DocumentViewer
  ) {
    this.exporters = [];
    this.activeExporter = false;
    this.events = event;    
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
    let loader = this.loadingCtrl.create({content: "Please wait..."});
    loader.present();
    let _data = await this.api._call("/export", "", _payload, true);
    this.events.publish('export:started');    
    loader.dismiss();
  }



  openModal(data) {
    if (this.api.state.on_device) {
      console.log(data);
      const options: DocumentViewerOptions = {
        title: 'My PDF'
      }
      this.document.viewDocument(data.Url, 'application/pdf', options)
    }
    else {
      let modal = this.modalCtrl.create(PopoverPage, data, {showBackdrop: true});
      modal.present();
    }
  }
}
