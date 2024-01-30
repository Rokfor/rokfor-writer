import { Component } from '@angular/core';
import { NavParams, ViewController } from 'ionic-angular';




@Component({
  selector: 'markdown-popover',
  template: `
  <ion-header>
    <ion-navbar>
      <ion-buttons start>
        <button ion-button (click)="dismiss()">Save</button>
      </ion-buttons>    
      <ion-title>{{ navParams.data.label }}</ion-title>
    </ion-navbar>
  </ion-header>
  <ion-content>
    <prosemirror
    class="ProseMirror-wide"
    item-content
    [(data)]="navParams.data.value" 
    [(editorMarks)]="api.editorMarks"
    ></prosemirror>
  </ion-content>
  `
})
export class MarkdownPopover {
  api: any;

  constructor(
    private navParams: NavParams,
    public viewCtrl: ViewController
  ) {
  }

  ngOnInit() {
    this.api = this.navParams.data.api;
  }

  dismiss() {
    this.viewCtrl.dismiss(this.navParams.data.value);
  }
}