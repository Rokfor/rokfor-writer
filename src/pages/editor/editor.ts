import { Component, NgZone, ViewChild } from '@angular/core';
//import { FormControl } from '@angular/forms';
import { NavController, LoadingController, Slides, Events, AlertController } from 'ionic-angular';
import { Api } from '../../services/rfapi.component';
import 'codemirror/mode/markdown/markdown.js';
import 'codemirror/addon/scroll/simplescrollbars.js';
import 'codemirror/addon/fold/foldcode.js';
import 'codemirror/addon/fold/foldgutter.js';
import 'codemirror/addon/fold/markdown-fold.js';

declare var ipcRenderer: any;
declare var electron: any;

@Component({
  selector: 'page-editor',
  templateUrl: 'editor.html'
})

export class Editor {
  service: any;
  content: any;
  fullscreen: boolean = false;
  mySlideOptions: any;
  initialSlide: number = 0;
  initialized: boolean = false;
  //ctrl: any;

  cm_options: any = {
    viewportMargin: 10,
    mode: 'markdown',
    lineNumbers: false,
    theme: "default",
    lineWrapping: true,
    scrollbarStyle: 'overlay',
    foldGutter: true,
    gutters: ["CodeMirror-foldgutter"]
  };


  @ViewChild('mySlider') slider: Slides;

  constructor(
    public navCtrl: NavController,
    public api:Api,
    public loadingCtrl: LoadingController,
    public events: Events,
    public zone: NgZone,
    public alert: AlertController,
  ) {
    var _this = this;
    let loading = this.loadingCtrl.create({
      content: "Please wait..."
    });
    loading.present();
    //this.ctrl = new FormControl();
    if (ipcRenderer) {
      ipcRenderer.on('main:ipc', (event, message) => {
        if (message === 'leave-full-screen') {
          _this.fullscreen = false;
          zone.run(() => {});
        }
        if (message === 'enter-full-screen') {
          _this.fullscreen = true;
          zone.run(() => {});
        }
        if (message === 'next-document' && !_this.slider.isEnd()) {
          _this.slider.slideNext();
        }
        if (message === 'previous-document' && !_this.slider.isBeginning()) {
          _this.slider.slidePrev();
        }
        if (message === 'save-document') {
          _this.api.change();
        }
        if (message === 'new-document') {
          _this.addPage();
        }
      })
    }


    events.subscribe('page:change', (page) => {
      console.log("got page change");
      if (_this.slider.getSlider() !== undefined && typeof _this.slider.slideTo === "function") {
        setTimeout(() => {
          console.log('done')
          _this.slider.slideTo(page);
        }, 250);
      }
    });
    //console.log("Initialize Slide ", _this.initialSlide);
    //if (_this.initialized && _this.slider) {
    //  _this.slider.slideTo(_this.initialSlide, 0);
    //}
    _this.mySlideOptions = {
      direction: "vertical",
      onlyExternal: true,
      slidesPerView: 1,
      runCallbacksOnInit: false,
      preventClicksPropagation: false,
      preventClicks: false,
      initialSlide: _this.api.getCurrent(),
      onInit: (slides: any) => {
        loading.dismiss();
        _this.initialized = true;
      }
    };
  }

/*
  ngAfterViewChecked() {
    if (this && this.slider && this.slider.getSlider() !== undefined && typeof this.slider.slideTo === "function") {
      if (Number(this.slider.getActiveIndex()) !== this.api.getCurrent()) {
        console.log("Manual Update needed...")
        //this.slider.slideTo(this.api.getCurrent())
      }
    }
  }
*/
  ionViewDidLoad() {

  }

  ionViewCanLeave(): Promise<boolean> {
    if (this.initialized && this.api.data.length > 0) {
      this.api.change();
    }
    return new Promise((resolve, reject) => {
      let confirm = this.alert.create({
        title: 'Unsafed Changes',
        message: 'Leaving the editor might cause data loss.',
        buttons: [{
          text: 'OK',
          handler: () => {
            resolve(true);
          },
        }],
      });
      if (this.api.data.length > 0 && this.api.data[this.api.current].modified == 1) {
        confirm.present();
      }
      else {
        resolve(true);
      }
    })
  }


  slideWillChange() {
    if (!this.initialized) return false;
    this.api.setCurrent(this.slider.getActiveIndex());
  }

  slideDidChange() {
    if (!this.initialized) return false;
  }

  addPage() {
    if (!this.initialized) return false;
    this.api.add(this.slider.getActiveIndex() + 1).then((d) => {
      console.log("Page Added")
    });
  }

  selectAll(event) {
    if (!this.initialized) return false;
    event.target.select();
  }

  toggleFs() {
    /* Electron: Setting the local fullscreen flag after ipc callback in construtor */
    if (electron) {
      var window = electron.remote.getCurrentWindow();
      window.setFullScreen(!this.fullscreen);
    }
    /* Browser, Cordova: Just toggeling the flag */
    else {
      this.fullscreen = !this.fullscreen;
    }
  }

  wordcount(str) {
    return str.split(/[^\s]+/).length;
  }

}
