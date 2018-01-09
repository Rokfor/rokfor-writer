import { Component, ViewChild } from '@angular/core';
import { Nav, Platform, Events } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';
import { Settings } from '../pages/settings/settings';
import { Editor } from '../pages/editor/editor';
import { Book } from '../pages/book/book';
import { Api } from '../services/rfapi.component';


declare var ipcRenderer: any;
declare var electron: any;


@Component({
  templateUrl: 'app.html',
  providers: [
    StatusBar,
    SplashScreen,
    Api
  ]
})



export class MyApp {
  @ViewChild(Nav) nav: Nav;


  rootPage: any = Editor;
  events: any;
  editor: any = false;
  pages: Array<{title: string, component: any, icon: string}>;
  electron: any;

  constructor(
    public  platform:     Platform,
    private api:          Api,
    private statusBar:    StatusBar,
    private splashScreen: SplashScreen,
            events:       Events
  ) {
    this.events = events;
    this.initializeApp();
    this.electron = electron;
    // used for an example of ngFor and navigation
    this.pages = [
      { title: 'Settings', component: Settings, icon: 'settings' },
      { title: 'Book',   component: Book, icon: 'book' },
      { title: 'Editor',   component: Editor, icon: 'document' }
    ];
  }

  initializeApp() {

    //let self = this;

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
          ipcRenderer.send('master:ipc:export', this.api.data[this.api.current.page])
        }


      })
    }


    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();
    });
  }

  toggleFs(mode) {

    this.api.state.fullscreen = mode || !this.api.state.fullscreen;

    /* Electron: Setting the local fullscreen flag after ipc callback in construtor */
    if (electron) {
      var window = electron.remote.getCurrentWindow();
      window.setFullScreen(this.api.state.fullscreen);
    }

    this.events.publish('page:redraw');

  }

  openPage(page) {
    // Reset the content nav to have just this page
    // we wouldn't want the back button to show in this scenario
    var self = this;
    this.nav.setRoot(page.component).then(function(e){
      if (self.nav.getActive().name === "Editor") {
        self.editor = self.nav.getActive().instance;
      }
      else {
        self.editor = false;
      }
    });
  }

  openEditor(page) {
    // Reset the content nav to have just this page
    // we wouldn't want the back button to show in this scenario
    var self = this;
    if (this.nav.getActive().name === "Editor") {
      this.events.publish('page:change', page);
    }
    else {
      //this.nav.setRoot(Editor, {page: page});
      this.nav.setRoot(Editor).then(function(e){
        self.events.publish('page:change', page);
        self.editor = self.nav.getActive().instance;
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
