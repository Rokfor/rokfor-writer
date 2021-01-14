import { Component } from '@angular/core';
import { NavParams, ViewController } from 'ionic-angular';
//import { FileTransfer, FileUploadOptions, FileTransferObject } from '@ionic-native/file-transfer';
import { File } from '@ionic-native/file';

@Component({
  template: `
  <ion-header>
    <ion-navbar>
      <ion-buttons start>
        <button ion-button (click)="dismiss()">Close</button>
      </ion-buttons>
      <ion-title>Files for {{i.name}}</ion-title>
    </ion-navbar>
  </ion-header>
  <ion-content class="assets">
    <ion-list>
      <ion-item-divider>
          <ul>
            <li>Original: Embedding uploaded file as image tag.
            <li>Scaled: Embedding scaled variant as img tag
            <li>Linked: Embedding image as link to the stored entry
          </ul>
      </ion-item-divider>
      <ion-item *ngFor="let i of assets; let _in = index;">
        <ion-thumbnail item-start>
          <img src="{{i.Thumbnail}}">
        </ion-thumbnail>
        <ion-label stacked>Caption</ion-label>
        <ion-input autocapitalize=off type="text" (ngModelChange)="changeCaption()" [(ngModel)]="i.Captions[0]"></ion-input>
        <button ion-button item-end (click)="addEditor(i, false, false, _in)">Linked</button>
        <button ion-button item-end (click)="addEditor(i, true, true)">Original</button>
        <button ion-button item-end (click)="addEditor(i, true, false)">Scaled</button>
        <button ion-button color="danger" item-end (click)="delete(_in)">Delete</button>
      </ion-item>
    </ion-list>
  </ion-content>
  <ion-footer padding>
    <input class="custom-file-input" type="file" (change)="loadImageFromDevice($event)" id="file-input"  accept="image/png, image/jpeg, application/pdf">
  </ion-footer>
  `,
  providers: [
    // FileTransfer,
    // File,
    // FileTransferObject
  ]
})
export class PopoverEditor {
  i: any;
  assets: any;
  timeout: any;
  api: any;

      
  constructor(
    public viewCtrl: ViewController,
    private navParams: NavParams,
    //private transfer: FileTransfer, 
    //private file: File
   ) {
     this.timeout = [];
     this.assets = [];
  }

  dismiss() {
    this.viewCtrl.dismiss();
  }

  async delete(i) {
    this.api.showLoadingCtrl('Deletion in Progress');
    let _assets = await this.api._call('/assets',false,{id: this.i.id, mode: 'delete', assets: this.assets, delete: i},true)
    let _del = this.assets.splice(i,1);
    this.api.hideLoadingCtrl();
  }

  changeCaption() {
    if (this.timeout.caption !== null) {
      clearTimeout(this.timeout.caption);
    }
    this.timeout.caption = setTimeout(() => {
      this.updateData();
    }, 1000);
  }

  async loadImageFromDevice(event) {
    this.api.showLoadingCtrl('Upload in Progress');
    const reader = new FileReader();
    const file = event.target.files[0];
    reader.readAsDataURL(file);
    reader.onload = async () => { // note using fat arrow function here if we intend to point at current Class context.
      await this.api._call('/assets',false,{id: this.i.id, binary: reader.result, size: file.size, type: file.type, name: file.name, mode: 'post'},true)
      let _assets = await this.api._call('/assets',false,{id: this.i.id, mode: 'get'},true)
      if (_assets.length) {
        this.assets = _assets
      }
      this.api.hideLoadingCtrl();
    };
  }

  addEditor(element, isImage, original, anchorIndex) {
    original = original || false;
    isImage  = isImage  || false;
    anchorIndex = anchorIndex || false;
    this.viewCtrl.dismiss({element: element, isImage: isImage, original: original, anchorIndex: 1 + (anchorIndex || 0), fieldName: 'Attachements '});
  }

  /*upload() {
    const fileTransfer: FileTransferObject = this.transfer.create();
    let _file = "";
    let _upload_api = "/upload"

    let _options: FileUploadOptions = {
      fileKey: 'ionicfile',
      fileName: 'ionicfile', 
      chunkedMode: false,
      mimeType: "image/jpeg",
      headers: {}
    }
    
    fileTransfer.upload(_file, _upload_api, _options).then((entry) => {
      console.log('upload complete - refresh');
      this.loadData();
    }, (error) => {
      console.log('download error');
    });
  }*/

  async updateData() {
    let _assets = await this.api._call('/assets',false,{id: this.i.id, mode: 'update', assets: this.assets},true)
    console.log(_assets);
  }

  async loadData() {
    let _assets = await this.api._call('/assets',false,{id: this.i.id, mode: 'get'},true)
    if (_assets.length) {
      this.assets = _assets
    }
  }

  ngOnInit() {
    this.i = this.navParams.data.data;
    this.api = this.navParams.data.api;
    console.log(this.i)
    this.loadData();
    /*    
    this.i:
    body: "# Mensch und Maschine↵↵Was geschieht im Grenzbereiches zwischen Mensch und Computer? Wer beeinflusst wen – der Computer den Menschen…"
    component: function(viewCtrl, navParams)
    id: 3138
    issue: "7"
    moddate: 0
    modified: 0
    name: "01 Persönliche Arbeiten / Background"
    opts: {showBackdrop: true, enableBackdropDismiss: true}
    sort: 0
    status: true
    syncId: "a914f501-d5a0-c1f3-b3dd-fa4ed7c2436d"
    title: "Was bisher geschah"*/

    // Step 1: Load Assets 

  }
}