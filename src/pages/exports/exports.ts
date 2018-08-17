import { Component } from '@angular/core';
import { NavController, ModalController, NavParams, Events, LoadingController } from 'ionic-angular';
import { Api } from '../../services/rfapi.component';
import { PopoverPage } from './exports-popover';
import { DocumentViewer, DocumentViewerOptions } from '@ionic-native/document-viewer';

import { FileTransfer, FileTransferObject } from '@ionic-native/file-transfer';
import { File } from '@ionic-native/file';

/*
  Generated class for the Book page.

  See http://ionicframework.com/docs/v2/components/#navigation for more info on
  Ionic pages and navigation.
*/

@Component({
  selector: 'page-exports',
  templateUrl: 'exports.html',
  providers: [
    DocumentViewer,
    FileTransfer,
    File,
    FileTransferObject
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
    private document: DocumentViewer,
    private transfer: FileTransfer, 
    private file: File
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
      const fileTransfer: FileTransferObject = this.transfer.create();
      this.api.showLoadingCtrl('Downloading PDF...');
      fileTransfer.download(data.Url, this.file.dataDirectory + 'file.pdf').then((entry) => {
        console.log('download complete: ' + entry.toURL());
        this.api.hideLoadingCtrl();
        this.document.viewDocument(entry.toURL(), 'application/pdf', options)
      }, (error) => {
        this.api.hideLoadingCtrl();
        console.log('download error');
      });
      const options: DocumentViewerOptions = {
        title: 'My PDF'
      }
      
    }
    else {
      let modal = this.modalCtrl.create(PopoverPage, data, {showBackdrop: true});
      modal.present();
    }
  }
}
