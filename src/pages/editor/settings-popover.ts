import { Component } from '@angular/core';
import { NavParams, ViewController } from 'ionic-angular';


@Component({
  template: `
  <ion-header>
    <ion-navbar>
      <ion-buttons start>
        <button ion-button (click)="dismiss()">Close</button>
      </ion-buttons>
      <ion-title>Document Settings</ion-title>
    </ion-navbar>
  </ion-header>
  <ion-content>
    <ion-item-group>
        <ion-item-divider color="danger">
            Settings might not be implemented in all export templates
        </ion-item-divider>
        <ion-item-divider color="light">Language Settings</ion-item-divider>
        <ion-item *ngFor="let s of schema.language;">
            <ion-label>{{s[1]}}</ion-label>
            <ion-toggle [(ngModel)]="values.settings[s[0]]"></ion-toggle>
        </ion-item>
    </ion-item-group>
    <ion-item-group>
        <ion-item-divider color="light">Layout Settings</ion-item-divider>
        <ion-item *ngFor="let s of schema.layout;">
            <ion-label>{{s[1]}}</ion-label>
            <ion-toggle [(ngModel)]="values.settings[s[0]]"></ion-toggle>
        </ion-item>
    </ion-item-group>
    <ion-item-group>
        <ion-item-divider color="light">Font Settings</ion-item-divider>
        <ion-item *ngFor="let s of schema.font;">
            <ion-label>{{s[1]}}</ion-label>
            <ion-toggle [(ngModel)]="values.settings[s[0]]"></ion-toggle>
        </ion-item>
    </ion-item-group>
    <ion-item-group>
      <ion-item-divider color="light">Image Handling</ion-item-divider>
      <ion-item *ngFor="let s of schema.image;">
          <ion-label>{{s[1]}}</ion-label>
          <ion-toggle [(ngModel)]="values.settings[s[0]]"></ion-toggle>
      </ion-item>
  </ion-item-group>
  </ion-content>
  `,
})


export class PopoverSettings {
  values: any;
  schema: any;
  
      
  constructor(
    public viewCtrl: ViewController,
    private navParams: NavParams,
   ) {
       this.schema = {
           "language" : [
                ["french"    , "French Hyphenation"],
                ["english"   , "English Hyphenation"],
                ["italian"   , "Italian Hyphenation"]
            ],
            "layout": [
                ["newpage"   , "Start on Blank Page"],
                ["hidetitle" , "Hide Title, add to ToC"],
                ["hidetoc"   , "Hide in ToC"],
                ["wide"      , "Wide"],
                ["small"     , "Small"],
            ],
            "font": [
                ["grotesk"   , "Option 1: Grotesk"],
                ["antiqua"   , "Option 2: Antiqua"],
                ["smallfont" , "Option 3: Small"],
                ["largefont" , "Option 4: Large"],
            ],
            "image": [
                ["size1"   , "Option 1: Small"],
                ["size2"   , "Option 2: Medium"],
                ["size3"   , "Option 3: Large"]
            ]
        };
  }

  dismiss() {
    this.navParams.data.api.change();
    this.viewCtrl.dismiss();
  }


  ngOnInit() {
    this.values = this.navParams.data.data;
    this.values.settings = this.values.settings || {}
  }
}