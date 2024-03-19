import { Component } from "@angular/core";
import { Events, NavParams, ViewController } from "ionic-angular";

@Component({
  template: `
    <ion-header>
      <ion-navbar>
        <ion-buttons start>
          <button ion-button (click)="dismiss()">SAVE</button>
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
        <ion-item *ngFor="let s of schema.language">
          <ion-label>{{ s[1] }}</ion-label>
          <ion-toggle
            checked="values.settings[s[0]]"
            [(ngModel)]="values.settings[s[0]]"
          ></ion-toggle>
        </ion-item>
      </ion-item-group>
      <ion-item-group>
        <ion-item-divider color="light">Layout Settings</ion-item-divider>
        <ion-item *ngFor="let s of schema.layout">
          <ion-icon
            *ngIf="s[2]"
            item-start
            name="information-circle"
            class="tooltip-icon"
            [attr.data-tooltip]="s[2]"
          ></ion-icon>         
          <ion-label>{{ s[1] }}</ion-label>
          <ion-toggle
            checked="values.settings[s[0]]"
            [(ngModel)]="values.settings[s[0]]"
          ></ion-toggle>
        </ion-item>
      </ion-item-group>
      <ion-item-group>
        <ion-item-divider color="light">Font Settings</ion-item-divider>
        <ion-item *ngFor="let s of schema.font">
          <ion-icon
            *ngIf="s[2]"
            item-start
            name="information-circle"
            class="tooltip-icon"
            [attr.data-tooltip]="s[2]"
          ></ion-icon>         
          <ion-label>{{ s[1] }}</ion-label>
          <ion-toggle
            checked="values.settings[s[0]]"
            [(ngModel)]="values.settings[s[0]]"
          ></ion-toggle>
        </ion-item>
      </ion-item-group>
      <ion-item-group>
        <ion-item-divider color="light">Image Options</ion-item-divider>
        <ion-item *ngFor="let s of schema.image">
          <ion-icon
            *ngIf="s[2]"
            item-start
            name="information-circle"
            class="tooltip-icon"
            [attr.data-tooltip]="s[2]"
          ></ion-icon>         
          <ion-label>{{ s[1] }}</ion-label>
          <ion-toggle
            checked="values.settings[s[0]]"
            [(ngModel)]="values.settings[s[0]]"
          ></ion-toggle>
        </ion-item>
      </ion-item-group>
      <ion-item-group>
        <ion-item-divider color="light">Meta Info</ion-item-divider>
        <ion-item>
          <ion-label>{{ schema.meta[0][1] }}</ion-label>
          <ion-input
            autocapitalize="off"
            placeholder="FirstName LastName"
            [(ngModel)]="values.settings[schema.meta[0][0]]"
          ></ion-input>
        </ion-item>
        <ion-item>
          <ion-label>{{ schema.meta[1][1] }}</ion-label>
          <ion-input
            autocapitalize="off"
            placeholder="FirstName LastName"
            [(ngModel)]="values.settings[schema.meta[1][0]]"
          ></ion-input>
        </ion-item>
        <ion-item>
          <ion-label>{{ schema.meta[2][1] }}</ion-label>
          <ion-textarea
            autoresize
            placeholder="Alternative Title with new Lines"
            [(ngModel)]="values.settings[schema.meta[2][0]]"
          ></ion-textarea>
        </ion-item>
        <ion-item>
          <ion-label>{{ schema.meta[5][1] }}</ion-label>
          <ion-input
            autocapitalize="off"
            placeholder="Bibliography (DOI)"
            [(ngModel)]="values.settings[schema.meta[5][0]]"
          ></ion-input>
        </ion-item>
        <ion-item>
          <ion-label>{{ schema.meta[6][1] }}</ion-label>
          <ion-input
            autocapitalize="off"
            placeholder="Download Link"
            [(ngModel)]="values.settings[schema.meta[6][0]]"
          ></ion-input>
        </ion-item>        
        <ion-item>
          <ion-label>{{ schema.meta[3][1] }}</ion-label>
          <ion-toggle
            checked="values.settings[schema.meta[3][0]]"
            [(ngModel)]="values.settings[schema.meta[3][0]]"
          ></ion-toggle>
        </ion-item>
        <ion-item>
          <ion-label>{{ schema.meta[4][1] }}</ion-label>
          <ion-toggle
            checked="values.settings[schema.meta[4][0]]"
            [(ngModel)]="values.settings[schema.meta[4][0]]"
          ></ion-toggle>
        </ion-item>
      </ion-item-group>
    </ion-content>
  `,
})
export class PopoverSettings {
  values: any;
  schema: any;

  constructor(
    events: Events,
    public viewCtrl: ViewController,
    private navParams: NavParams
  ) {
    this.schema = {
      language: [
        ["french", "French Hyphenation"],
        ["english", "English Hyphenation"],
        ["italian", "Italian Hyphenation"],
      ],
      layout: [
        ["newpage", "Start on Blank Page"],
        ["hidetitle", "Hide Title, add to ToC"],
        ["hidetoc", "Hide in ToC"],
        ["wide", "Wide"],
        ["small", "Small"],
        ["noheader", "Supress Header"],
        ["nofooter", "Supress Footer"],
        ["alternate", "Alternate Layout"],
        ["compact", "Compact Layout"],
        ["ispart", "Use as Part in ToC", "Enabling this option raises the level of this entry in the table of contents to 'Part'. Keep in mind that a single entry on 'Part' level changes the ToC for the entire book."],
        ["alphanumbering", "Use alphabetic list numbering", "Sets the enumeration style to alphabetic (a,b,c). Default: Numeric (1,2,3)"],
      ],
      font: [
        ["grotesk", "Option 1: Grotesk"],
        ["antiqua", "Option 2: Antiqua"],
        ["smallfont", "Option 3: Small"],
        ["largefont", "Option 4: Large"],
      ],
      image: [
        ["size1", "Full Page Images"],
        ["size2", "Full Bleed Images"],
        ["size3", "Double Page Images"],
        ["nocaptiondefault", "Default Placement for Images without Captions", "By default, images without captions are placed as full page images. Enabling this option will place images without captions the same way as images with captions."],
        ["noadjacent", "Place Single Images on extra Page", "By default, single (not adjacent) images are placed inline as floating elements. Enabling this option places single images on extra pages."],
      ],
      meta: [
        ["author", "Autor"],
        ["keywords", "Keywords"],
        ["alttitle", "Alt. Title"],
        ["hideweb", "Hide on Web"],
        ["extra", "Enable Extra Links"],
        ["doi", "Bibliography"],
        ["download", "Download"],
      ],
    };

    events.subscribe("page:change:complete", (page) => {
      this.values =
        this.navParams.data.api.data[this.navParams.data.api.getCurrent()];
    });
  }

  dismiss() {
    this.navParams.data.api.change();
    this.viewCtrl.dismiss();
  }

  ngOnInit() {
    this.values = this.navParams.data.data;
    this.values.settings = this.values.settings || {};
  }
}
