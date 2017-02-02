import { Component, ViewChild } from '@angular/core';
import { Nav, Platform, Events } from 'ionic-angular';
import { StatusBar, Splashscreen } from 'ionic-native';
import { Settings } from '../pages/settings/settings';
import { Editor } from '../pages/editor/editor';
import { Api } from '../services/rfapi.component';

@Component({
  templateUrl: 'app.html',
  providers: [Api]
})
export class MyApp {
  @ViewChild(Nav) nav: Nav;


  rootPage: any = Editor;
  events: any;
  pages: Array<{title: string, component: any, icon: string}>;

  constructor(public platform: Platform, private api:Api, events: Events) {
    this.events = events;
    this.initializeApp();

    // used for an example of ngFor and navigation
    this.pages = [
      { title: 'Settings', component: Settings, icon: 'settings' },
      { title: 'Editor',   component: Editor, icon: 'document' }
    ];
  }

  initializeApp() {
    this.platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      StatusBar.styleDefault();
      Splashscreen.hide();
    });
  }

  openPage(page) {
    // Reset the content nav to have just this page
    // we wouldn't want the back button to show in this scenario
    this.nav.setRoot(page.component);
  }

  openEditor(page) {
    // Reset the content nav to have just this page
    // we wouldn't want the back button to show in this scenario
    var _this = this;
    if (this.nav.getActive().name === "Editor") {
      this.events.publish('page:change', page);
    }
    else {
      //this.nav.setRoot(Editor, {page: page});
      this.nav.setRoot(Editor).then(function(){
        _this.events.publish('page:change', page);  
      });
    }
  }

  reorderPages(indexes) {
    this.api.reorder(indexes);
  }

  deletePage(item) {
    this.api.delete(item);
  }

}
