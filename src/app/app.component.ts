import { Component, ViewChild, NgZone } from '@angular/core';
import { Nav, Platform, Events, ToastController, LoadingController } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';
import { Settings } from '../pages/settings/settings';
import { Editor } from '../pages/editor/editor';
import { Book } from '../pages/book/book';
import { Exports } from '../pages/exports/exports';
import { Api } from '../services/rfapi.component';
import { DomSanitizer } from '@angular/platform-browser';
//import { NullInjector } from '@angular/core/src/di/injector';


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
    public  toastCtrl:    ToastController,
    public  loadingCtrl:  LoadingController,
    private zone:         NgZone,
    private sanitizer:    DomSanitizer,

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
      
      let loading = null;

      ipcRenderer.on('progress:ipc', (event, message) => {
        message = message * 1 > 100 ? 100 : message * 1;
        let _html = this.sanitizer.bypassSecurityTrustHtml(`
          <p>Download update</p>
          <h4>
          <div style="width: 100%; height: 0.5em; position: relative; padding: 0px; background: rgba(0,0,0,0.1);">
            <div style="width: ${message}%; height: 1em; position: absolute; left: 0px; top: 0px; height: 0.5em; background: rgba(0,0,0,0.1);"></div>
          </div>
          </h4>
        `);
        if (loading === null) {
          loading = this.loadingCtrl.create({
            content: <string>_html,
            spinner: "crescent"
          });
          loading.present();
        }
        else {
          // Update Conent in the next cycle - seems a bug in ionic3:
          // occuring if another item (alert/toast etc.) is dismissed
          // content will not be updated automatically
          this.zone.run(() => {
            loading.setContent(_html);
          });
        }        
        if (message * 1 > 99 && loading !== null) {
          loading.dismiss();
          loading = null;
        }
      });

      ipcRenderer.on('update:ipc', (event, message) => {
        let toast = this.toastCtrl.create({
          message: message,
          duration: 3000,
          position: 'top',
          showCloseButton: true
        });
        toast.present();
      });
      ipcRenderer.on('main:ipc', (event, message) => {
        console.log(event, message)
        if (message === 'leave-full-screen') {
          this.toggleFs(false);
        }
        if (message === 'enter-full-screen') {
          this.toggleFs(true);
        }
        if (this.nav.getActive().name === "Editor") {
          if (message === 'next-document' && this.nav.getActive().instance.api.getCurrent() < this.nav.getActive().instance.api.data.length - 1) {
            this.zone.run(() => {
              this.nav.getActive().instance.api.current.page++;
            });
          }
          if (message === 'previous-document' && this.nav.getActive().instance.api.getCurrent() > 0) {
            this.zone.run(() => {
              this.nav.getActive().instance.api.current.page--;
            });
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
      this.events.subscribe('export:saveattachment', (url) => {
        ipcRenderer.send('master:ipc:saveattachment', url)
        let toast = this.toastCtrl.create({
          message: `Download started: ${url}`,
          duration: 3000,
          position: 'top'
        });
        toast.present();
      })
      ipcRenderer.on('store:ipc:downloadfinished', (event, message) => {
        let toast = this.toastCtrl.create({
            message: `File stored: ${message}`,
            duration: 3000,
            position: 'top'
        });
        toast.present();
      });  
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
      if (this.api.exportRunning === true) {
        let toast = this.toastCtrl.create({
          message: `Document ${data.Id} is generated and ready in the exports section.`,
          duration: 3000,
          position: 'top',
          showCloseButton: true
        });
        toast.present();
        this.api.exportRunning = false
      }
    });

    this.events.subscribe('report:bug', (data) => {
      let toast = this.toastCtrl.create({
        message: data,
        duration: 3000,
        position: 'top',
        showCloseButton: true
      });
      toast.present();
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
