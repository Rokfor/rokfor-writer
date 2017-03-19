import { Component, ViewChild } from '@angular/core';
import { Nav, Platform, Events } from 'ionic-angular';
import { StatusBar, Splashscreen } from 'ionic-native';
import { Settings } from '../pages/settings/settings';
import { Editor } from '../pages/editor/editor';
import { Book } from '../pages/book/book';
import { Api } from '../services/rfapi.component';

declare var ipcRenderer: any;
declare var electron: any;


@Component({
  templateUrl: 'app.html',
  providers: [Api]
})
export class MyApp {
  @ViewChild(Nav) nav: Nav;


  rootPage: any = Editor;
  events: any;
  editor: any = false;
  pages: Array<{title: string, component: any, icon: string}>;

  constructor(
    public platform: Platform,
    private api:Api,
    events: Events
  ) {
    this.events = events;
    this.initializeApp();


    // used for an example of ngFor and navigation
    this.pages = [
      { title: 'Settings', component: Settings, icon: 'settings' },
      { title: 'Book',   component: Book, icon: 'book' },
      { title: 'Editor',   component: Editor, icon: 'document' }
    ];
  }

  initializeApp() {

    //let _this = this;

    if (ipcRenderer) {
      ipcRenderer.on('main:ipc', (event, message) => {
        if (message === 'leave-full-screen') {
          this.toggleFs(false);
        }
        if (message === 'enter-full-screen') {
          this.toggleFs(true);
        }

        if (message === 'next-document') {
          if (!this.editor) return;
          if (this.editor.slider.isEnd()) return;
          this.editor.slider.slideNext();
        }
        if (message === 'previous-document') {
          if (!this.editor) return;
          if (this.editor.slider.isBeginning()) return;
          this.editor.slider.slidePrev();
        }
        if (message === 'save-document') {
          if (!this.editor) return;
          this.editor.api.change();
        }
        if (message === 'new-document') {
          if (!this.editor) return;
          this.editor.addPage();
        }
        if (message === 'print-document') {
          if (!this.editor) return;
          this.editor.printPage();
        }
        if (message === 'set-title' || message === 'set-identifier') {
          if (!this.editor) return;
          this.editor.openModal(message);
        }
        if (message === 'export-data') {
          ipcRenderer.send('master:ipc:export', this.api.data[this.api.current])
        }


      })
    }


    this.platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      StatusBar.styleDefault();
      Splashscreen.hide();
      if (this.nav.getActive().name === "Editor") {
        this.editor = this.nav.getActive().instance;
      }
    });
  }

  toggleFs(mode) {

    this.api.fullscreen = mode || !this.api.fullscreen;

    /* Electron: Setting the local fullscreen flag after ipc callback in construtor */
    if (electron) {
      var window = electron.remote.getCurrentWindow();
      window.setFullScreen(this.api.fullscreen);
    }

    this.events.publish('page:redraw');

  }

  openPage(page) {
    // Reset the content nav to have just this page
    // we wouldn't want the back button to show in this scenario
    var _this = this;
    this.nav.setRoot(page.component).then(function(e){
      if (_this.nav.getActive().name === "Editor") {
        _this.editor = _this.nav.getActive().instance;
      }
      else {
        _this.editor = false;
      }
    });
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
      this.nav.setRoot(Editor).then(function(e){
        _this.events.publish('page:change', page);
        _this.editor = _this.nav.getActive().instance;
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
