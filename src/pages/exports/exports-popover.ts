import { Component } from '@angular/core';
import { NavParams, ViewController } from 'ionic-angular';
import { DomSanitizer } from '@angular/platform-browser';


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
    <iframe [src]="cleanURL(i.Data)"></iframe>
  </ion-content>
  <ion-footer>
    <ion-toolbar>
      <ion-buttons start>
        <a ion-button primary [href]="cleanURL(i.Data)" target="_blank">Download</a>
      </ion-buttons>
    </ion-toolbar>
  </ion-footer>
  `
})
export class PopoverPage {
  i: any;
  constructor(
    public viewCtrl: ViewController,
    private navParams: NavParams,
    public sanitizer : DomSanitizer
   ) {
    this.sanitizer = sanitizer;
  }
  ngOnInit() {
    this.i = this.navParams.data;
    console.log(this.i);
  }
  cleanURL(oldURL : string){
    return this.sanitizer.bypassSecurityTrustResourceUrl(oldURL);
  }
  dismiss() {
    this.viewCtrl.dismiss();
  }
}