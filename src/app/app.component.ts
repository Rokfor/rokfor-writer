import { Component, ViewChild } from '@angular/core';
import { Nav, Platform, Events, ToastController } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';
import { Settings } from '../pages/settings/settings';
import { Editor } from '../pages/editor/editor';
import { Book } from '../pages/book/book';
import { Exports } from '../pages/exports/exports';
import { PopoverPage } from '../pages/exports/exports-popover';
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
  pages: Array<{title: string, component: any, icon: string}>;
  electron: any;

  constructor(
    public  platform:     Platform,
    private api:          Api,
    private statusBar:    StatusBar,
    private splashScreen: SplashScreen,
            events:       Events,
    public  toastCtrl:    ToastController
  ) {
    this.events = events;
    this.initializeApp();
    this.electron = electron;
    // used for an example of ngFor and navigation
    this.pages = [
      { title: 'Settings', component: Settings, icon: 'settings' },
      { title: 'Books',   component: Book, icon: 'book' },
      { title: 'Editor',   component: Editor, icon: 'document' },
      { title: 'Export',   component: Exports, icon: 'download' }    
    ];
  }

  initializeApp() {

    // let self = this;

    if (ipcRenderer) {
      ipcRenderer.on('main:ipc', (event, message) => {
        if (message === 'leave-full-screen') {
          this.toggleFs(false);
        }
        if (message === 'enter-full-screen') {
          this.toggleFs(true);
        }
        if (this.nav.getActive().name === "Editor") {
          if (message === 'next-document') {
            if (this.nav.getActive().instance.slider.isEnd()) return;
            this.nav.getActive().instance.slider.slideNext();
          }
          if (message === 'previous-document') {
            if (this.nav.getActive().instance.slider.isBeginning()) return;
            this.nav.getActive().instance.slider.slidePrev();
          }
          if (message === 'save-document') {
            this.nav.getActive().instance.api.change();
          }
          if (message === 'new-document') {
            this.nav.getActive().instance.addPage();
          }
          if (message === 'delete-document') {
            this.nav.getActive().instance.deletePage();
          }        
          if (message === 'print-document') {
            this.nav.getActive().instance.printPage();
          }
          if (message === 'set-title' || message === 'set-identifier') {
            this.nav.getActive().instance.openModal(message);
          }
        }
        if (message === 'export-data') {
          ipcRenderer.send('master:ipc:export', this.api.data[this.api.current.page])
        }
      })
      this.events.subscribe('export:saveattachment', (data) => {
        ipcRenderer.send('master:ipc:saveattachment', data)
      })
    }


    this.events.subscribe('export:started', (data) => {
      this.api.exportRunning = true;
      let toast = this.toastCtrl.create({
          message: `Started export for «${this.api.current.issue_options.Name}»`,
          duration: 3000,
          position: 'top',
          showCloseButton: true
      });
      toast.present();
    });
    
    this.events.subscribe('export:ready', (data) => {
      let self = this;
      if (this.api.exportRunning === true) {
        let toast = this.toastCtrl.create({
          message: `Document ${data.Id} is generated and ready in the exports section.`,
          duration: 3000,
          position: 'top',
          showCloseButton: true
        });
        toast.present();
        self.api.exportRunning = false
      }
    });

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
    this.nav.setRoot(page.component);
  }

  async openEditor(page) {
    // Reset the content nav to have just this page
    // we wouldn't want the back button to show in this scenario
    
    if (this.nav.getActive().name !== "Editor") {
      await this.nav.setRoot(Editor);
    }
     
    this.events.publish('page:change', page);
    
  }

  reorderPages(indexes) {
    this.api.reorder(indexes);
  }

  deletePage(item) {
    this.api.delete(item);
  }



}
