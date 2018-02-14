import { Component } from '@angular/core';
import { NavParams, ViewController, Events } from 'ionic-angular';
import { DomSanitizer } from '@angular/platform-browser';

declare var electron: any;

@Component({
  template: `
  <ion-header>
    <ion-navbar>
      <ion-buttons start>
        <button ion-button (click)="dismiss()">Close</button>
      </ion-buttons>
      <ion-title>{{i.Name}}</ion-title>
    </ion-navbar>
  </ion-header>
  <ion-content class="reader">
    <iframe id="pdfviewer"></iframe>
  </ion-content>
  <ion-footer>
    <ion-toolbar>
      <ion-buttons start>
        <a *ngIf="!electron" ion-button primary [href]="cleanURL(i.Url)" target="_blank">Download</a>
        <button *ngIf="electron" ion-button  color="primary" clear icon-start (click)="export(i.Raw)">
          <ion-icon name="folder"></ion-icon>
          Save
        </button>
      </ion-buttons>
    </ion-toolbar>
  </ion-footer>
  `
})
export class PopoverPage {
  i: any;
  electron: any;
  events: Events;
  constructor(
    public viewCtrl: ViewController,
    private navParams: NavParams,
    public sanitizer : DomSanitizer,
    public event: Events
   ) {
    this.sanitizer = sanitizer;
    this.electron  = electron; 
    this.events = event;
  }
  ngOnInit() {
    this.i = this.navParams.data;
    (<HTMLImageElement>document.getElementById("pdfviewer")).src = this.i.Data;
    console.log(this.i);
  }
  cleanURL(oldURL : string){
    return this.sanitizer.bypassSecurityTrustResourceUrl(oldURL);
  }
  dismiss() {
    this.viewCtrl.dismiss();
  }
  export(data) {
    this.events.publish('export:saveattachment', data);
  }
}