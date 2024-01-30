import { Component } from '@angular/core';
import { NavParams, ViewController } from 'ionic-angular';
//import { FileTransfer, FileUploadOptions, FileTransferObject } from '@ionic-native/file-transfer';
//import { File } from '@ionic-native/file';

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
  <ion-content class="assets card-background-page">

    <ion-card *ngFor="let i of assets; let _in = index;">
      <div class="assets-flex">
        <ion-card-content>
          <img src="{{i.Resized[1]}}">
          <img class="alternateImg" *ngIf="i.AttachementsAlternate" src="{{i.AttachementsAlternate.Thumbnail}}">
          <ion-label stacked>Alternative Image Variant (Web)</ion-label>
          <button ion-button outline small round [disabled]="!i.AttachementsAlternate" color="danger" item-end (click)="delete(_in, true)">Delete</button>        
          <input class="custom-variant-input" type="file" (change)="loadImageFromDevice($event, _in, true)" id="file-input"  accept="image/png, image/jpeg, application/pdf">
        </ion-card-content>
        <ion-card-content>
          <ion-label stacked>Caption</ion-label>
          <ion-textarea autoresize autocapitalize=off type="text" (ionChange)="changeCaption()" [(ngModel)]="i.Captions[0]"></ion-textarea>
          <ion-label stacked>Copyright</ion-label>
          <ion-textarea autoresize autocapitalize=off type="text" (ionChange)="changeCaption()" [(ngModel)]="i.Captions[1]"></ion-textarea>
          <ion-label stacked>Alternate Caption (Web)</ion-label>
          <ion-textarea autoresize autocapitalize=off type="text" (ionChange)="changeCaption()" [(ngModel)]="i.Captions[3]"></ion-textarea>
        </ion-card-content>
      </div>
      <ion-row padding>
        <ion-col>
          <button ion-button item-end (click)="addEditor(i, false, false, _in)">Responsive</button>
        </ion-col>
        <ion-col>
          <button ion-button item-end (click)="addEditor(i, true, true)">Original</button>
        </ion-col>
        <ion-col>
          <button ion-button item-end (click)="addEditor(i, true, false)">Resized</button>
        </ion-col>
        <ion-col>
          <button ion-button color="danger" item-end (click)="delete(_in)">Delete</button>        
        </ion-col>
        <ion-col>
          <input class="custom-replace-input" type="file" (change)="loadImageFromDevice($event, _in)" id="file-input"  accept="image/png, image/jpeg, application/pdf">
        </ion-col>

      </ion-row>
    </ion-card>

    <ion-card>
      <ion-card-content>
        <ion-card-title>
          Guidelines
        </ion-card-title>
        <p>
          <b>Responsive</b> Responsive data: probably original file in print and resized variant on the web.
        </p>
        <p>
          <b>Original</b> Use uploaded file directly as image tag.
        </p>
        <p>
          <b>Resized</b> Use resized and jpg variant as image tag.
        </p>
        <p>
          Whereas <b>original</b> and <b>resized</b> both 
          add a <code>&lt;img&gt;</code> Tag, <b>responsive</b> adds a 
          custom <code>{{attachement}}</code> node which needs to be prepared by the backend 
          or the generator and cannot be shown directly in the markdown document.
        </p>
      </ion-card-content>
    </ion-card>

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

  async delete(i, variant = false) {
    this.api.showLoadingCtrl('Deletion in Progress');
    await this.api._call('/assets',false,{id: this.i.id, mode: 'delete', assets: this.assets, delete: i, variant: variant},true)
    if (variant === false) {
      this.assets.splice(i,1);
    } else {
      let _assets = await this.api._call('/assets',false,{id: this.i.id, mode: 'get'},true)
      if (_assets.length) {
        this.assets = _assets
      }
    }
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

  async loadImageFromDevice(event, i = false, variant = false) {
    this.api.showLoadingCtrl('Upload in Progress');
    const reader = new FileReader();
    const file = event.target.files[0];
    reader.readAsDataURL(file);
    reader.onload = async () => { // note using fat arrow function here if we intend to point at current Class context.
      await this.api._call('/assets',false,{id: this.i.id, binary: reader.result, size: file.size, type: file.type, name: file.name, mode: 'post', index: i, variant: variant},true)
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
    this.viewCtrl.dismiss({element: element, isImage: isImage, original: original, anchorIndex: 1 + (anchorIndex || 0), fieldName: 'Attachements'});
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