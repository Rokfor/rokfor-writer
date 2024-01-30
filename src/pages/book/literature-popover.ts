import { Component } from '@angular/core';
import { NavParams, ViewController } from 'ionic-angular';





@Component({
  selector: 'literature-popover',
  template: `
  <ion-header>
    <ion-navbar>
      <ion-buttons start>
        <button ion-button (click)="dismiss()" [disabled]="this.api.bibtexErrors.length > 0">Save</button>
      </ion-buttons>    
      <ion-title>
        Literature
      </ion-title>
    </ion-navbar>
  </ion-header>
  <ion-content>
    <codemirror
      *ngIf="api.current.issue_options.Options[28].value"
      [config]="{lineNumbers: true, viewportMargin: 0}"
      [(ngModel)]="api.current.issue_options.Options[19].value"
      (change)="api.lintBibTex(api.current.issue_options.Options[19].value)">
    </codemirror>       
    <prosemirror
      class="ProseMirror-wide"
      *ngIf="!api.current.issue_options.Options[28].value"
      [(data)]="api.current.issue_options.Options[19].value" 
      [(editorMarks)]="api.editorMarks"
      ></prosemirror>
    <div class="bibtex-error"  *ngIf="api.bibtexErrors?.length > 0">
      <pre color="danger"  *ngFor="let i of api.bibtexErrors">{{i.line ? "Line: " : ""}}{{i.line}}{{i.line ? "\n" : ""}}{{i.column ? "Column: " : ""}}{{i.column}}{{i.column ? "\n" : ""}}{{i.message}}{{i.message ? "\n" : ""}}{{i.source?.trim()}}
      </pre>
    </div>
  </ion-content>
  <ion-footer>
    <ion-toolbar>
        <ion-label>
            Enable BibLatex
        </ion-label>
        <ion-buttons end>
            <ion-toggle (ionChange)="toggleBibLatex()" checked="api.current.issue_options.Options[28].value" [(ngModel)]="api.current.issue_options.Options[28].value"></ion-toggle>    
        </ion-buttons>
    </ion-toolbar>  
  </ion-footer>
  `
})

/*
  <ion-item>
  </ion-item>        

*/
export class LiteraturePopover {
    api: any;

  constructor(
    private navParams: NavParams,
    public viewCtrl: ViewController
  ) {
    console.log(this.api)
  }

  dismiss() {
    this.api.bookStore()
    this.viewCtrl.dismiss()
  }

  toggleBibLatex() {
    if (this.api.current.issue_options.Options[28].value == true) {
        this.api.lintBibTex(this.api.current.issue_options.Options[19].value)
    } else {
        this.api.bibtexErrors = [];
    }
  }

  ngOnInit() {
    this.api = this.navParams.data.api;
  }
}