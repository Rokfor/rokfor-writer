import { Component } from '@angular/core';
import { NavParams, ViewController } from 'ionic-angular';




@Component({
  selector: 'image-popover',
  template: `
  <ion-header>
    <ion-navbar>
      <ion-buttons start>
        <button ion-button (click)="dismiss()">Close</button>
      </ion-buttons>    
      <ion-title>Attachement {{ navParams.data.previewAsset._id }}</ion-title>
    </ion-navbar>
  </ion-header>
  <ion-content>
    <img style="width: 100%; height: auto;" src="{{ navParams.data.previewAsset.Resized[2] }}">
    <div padding>{{ navParams.data.previewAsset.Captions[0] }}</div>
  </ion-content>
  `
})
export class ImagePopover {

  constructor(
    private navParams: NavParams,
    public viewCtrl: ViewController
  ) {
    console.log(this.navParams);
  }

  dismiss() {
    this.viewCtrl.dismiss();
  }
}