import { Component, ViewChild } from '@angular/core';
import { NavParams, ViewController, Events } from 'ionic-angular';
import { DomSanitizer } from '@angular/platform-browser';
import { PdfViewerComponent } from 'ng2-pdf-viewer';

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
    <div class="scroll-content">
      <pdf-viewer [src]="pdfSrc" 
      [render-text]="true"
      [show-all]="true"
      [zoom]="zoom"
      [original-size]="true"
      (after-load-complete)="loadComplete($event)"
      style="display: block; background-color: #666;"
      ></pdf-viewer>
    </div>
  </ion-content>
  <ion-footer>
    <ion-toolbar class="btn-wrapper">
      <ion-buttons float-start>
        <a ion-button primary>
          {{page}}/{{pages}}
        </a>
      </ion-buttons>
      <ion-title>
        <button ion-button color="primary" clear icon-start (click)="skip('up')">
          <ion-icon name="arrow-down"></ion-icon>
        </button>
        <button ion-button color="primary" clear icon-start (click)="skip('down')">
          <ion-icon name="arrow-up"></ion-icon>  
        </button>
        <button ion-button color="primary" clear icon-start (click)="scale(0.1)">
          <ion-icon name="add"></ion-icon>
        </button>
        <button ion-button color="primary" clear icon-start (click)="scale(-0.1)">
          <ion-icon name="remove"></ion-icon>
        </button>
      </ion-title>
      <ion-buttons end>
        <a *ngIf="!electron" ion-button primary [href]="cleanURL(i.Url)" target="_blank">Download</a>
        <button *ngIf="electron" ion-button  color="primary" clear icon-start (click)="export()">
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
  pdfSrc: any;
  pages: any;
  page: 1;
  zoom: 1.0;

  @ViewChild(PdfViewerComponent) private pdfComponent: PdfViewerComponent;
      
  constructor(
    public viewCtrl: ViewController,
    private navParams: NavParams,
    public sanitizer : DomSanitizer,
    public event: Events
   ) {
    this.sanitizer = sanitizer;
    this.electron  = electron; 
    this.events = event;
    this.pages = 0;
    this.zoom = 1.0;
    this.page = 1;
  }

  scale(v) {
    this.zoom += v;
  }

  loadComplete(pdf) {
    console.log(pdf)
    this.pages = pdf.pdfInfo.numPages
  }

  cleanURL(oldURL : string){
    return this.sanitizer.bypassSecurityTrustResourceUrl(oldURL);
  }
  dismiss() {
    this.viewCtrl.dismiss();
  }
  export() {
    this.events.publish('export:saveattachment', this.i.Url);
  }

  skip(dir) {
    if (dir=="up") {
      this.page<this.pages?this.page++:this.page=1
    }
    else {   
      this.page>2?this.page--:this.page=this.pages
    }
    this.pdfComponent.pdfViewer.scrollPageIntoView({
      pageNumber: this.page
    });
  }

  ngOnInit() {
    this.i = this.navParams.data;
    this.i.secureUrl = this.cleanURL(this.i.Url);
    this.pdfSrc = this.i.Url;
}





}