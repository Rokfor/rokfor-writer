
import { Component, ViewChild } from '@angular/core';
import { Printer, PrintOptions } from '@ionic-native/printer';
import { Platform, NavController, Slides, Events, AlertController, LoadingController, ModalController } from 'ionic-angular';
import { ProsemirrorModule } from 'ng2-prosemirror';
import { Api } from '../../services/rfapi.component';
import { PopoverEditor } from './editor-popover';
import { PopoverSettings } from './settings-popover';

//import 'codemirror/mode/markdown/markdown.js';
//import 'codemirror/addon/scroll/simplescrollbars.js';
//import 'codemirror/addon/fold/foldcode.js';
//import 'codemirror/addon/fold/foldgutter.js';
//import 'codemirror/addon/fold/markdown-fold.js';
import {Converter} from "showdown/dist/showdown";

@Component({
  selector: 'page-editor',
  templateUrl: 'editor.html',
  providers: [Printer]
})

export class Editor {
  service: any;
  content: any;
  mySlideOptions: any;
  initialSlide: number = 0;
  initialized: boolean = false;

  afterSaveCallback: any;
  confirm: any;
  timeout_change: any;
  findString: any;  

  /*cm_options: any = {
    viewportMargin: 10,
    mode: 'markdown',
    lineNumbers: false,
    theme: "default",
    inputStyle: "textarea",
    lineWrapping: true,
    scrollbarStyle: 'overlay',
    foldGutter: true,
    gutters: ["CodeMirror-foldgutter"]
  };
*/

  @ViewChild('mySlider') slider: Slides;
  // @ts-ignore
  @ViewChild('myProsemirror') prosemirror:ProsemirrorModule;

  constructor(
    public navCtrl: NavController,
    public api:Api,
    public events: Events,
    public alert: AlertController,
    public loadingCtrl: LoadingController,
    public platform: Platform,
    private modalCtrl: ModalController,
    public printer: Printer
  ) {
    var self = this;

    //self.cm_options.cursorBlinkRate = self.platform.is('core') ? "500" : -1;

    events.subscribe('page:change', (page) => {
      console.log("got page change");
      self.slider.slideTo(page);
      /*
      if (self.slider.getSlider() !== undefined && typeof self.slider.slideTo === "function") {
        setTimeout(() => {
          console.log('done')
          self.slider.slideTo(page);
        }, 250);
      }*/
    });

    events.subscribe('page:redraw', (page) => {
      console.log("got page redraw");
      self.slider.slideTo(self.slider.getActiveIndex(), 0, false)
      /*
      console.log(self.slider);
      if (self.slider.getSlider() !== undefined) {
        setTimeout(() => {
          let s = self.slider.getSlider();
          //s.update();
          self.slider.slideTo(self.slider.getActiveIndex(), 0, false);
        }, 250);
      }*/
    });

    //console.log("Initialize Slide ", self.initialSlide);
    //if (self.initialized && self.slider) {
    //  self.slider.slideTo(self.initialSlide, 0);
    //}
    self.mySlideOptions = {
      direction: "vertical",
      onlyExternal: true,
      slidesPerView: 1,
      runCallbacksOnInit: false,
      preventClicksPropagation: false,
      preventClicks: false,
      initialSlide: self.api.getCurrent(),
      onInit: (slides: any) => {
        self.initialized = true;
      }
    };
  }

  trackByFn(index, i) {
    return i.syncId;
  }
 
  showOptions(data) {
    console.log(this, data, this.prosemirror);
    let modal = this.modalCtrl.create(PopoverSettings, {api: this.api, data: data}, {showBackdrop: true});
    modal.present();
  }

  showUpload(data) {
    console.log('opening modal for document ', data.id);
    let modal = this.modalCtrl.create(PopoverEditor, {api: this.api, data: data}, {showBackdrop: true});
    modal.present();
    modal.onDidDismiss(d => {
      if (d !== undefined) {
        // @ts-ignore
        this.prosemirror.insertAttachement(d)
      }
    });
  }

  openModal(mode) {

    var _title, _message, _placeholder, _data, _value;

    var self = this;

    if (mode === "set-title") {
      _title = "Title";
      _placeholder = this.api.data[this.api.getCurrent()].title;
      _value = _placeholder != 'Empty Title' ? _placeholder : false;
      _data = "title";
      _message = "Set Document Title";
    }
    if (mode === "set-identifier") {
      _title = "ID";
      _placeholder = this.api.data[this.api.getCurrent()].name;
      _data = "name";
      _value = _placeholder != 'rf001' ? _placeholder : false;
      _message = "Set Document Identifier";
    }

    let _confirm = this.alert.create({
      title: _title,
      message: _message,
      inputs: [
        {
          name: _title,
          placeholder: _placeholder,
          value: _value
        },
      ],
      buttons: [
        {
          text: 'Cancel',
          handler: data => {
            console.log('Cancel clicked');
          }
        },
        {
          text: 'Save',
          handler: data => {
            console.log('Saved clicked', data);
            self.api.data[self.api.getCurrent()][_data] = data[_title];
            self.api.change();
          }
        }
      ]
    });
    _confirm.present();
  }

  ngAfterViewInit() {
    this.initialized = true;
    this.slider.onlyExternal = true;
    this.slider.paginationType = "fraction";
    this.slider.simulateTouch = false;
    this.slider.touchEventsTarget = "container";
    this.slider.keyboardControl = false;
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
    if (this.initialized && this.api.data && this.api.data.length > 0) {
      this.api.change();
    }
    return new Promise((resolve, reject) => {
      let _confirm = this.alert.create({
        title: 'Unsafed Changes',
        message: 'Leaving the editor might cause data loss.',
        buttons: [{
          text: 'OK',
          handler: () => {
            resolve(true);
          },
        }],
      });
      if (this.api.data && this.api.data.length > 0 && this.api.data[this.api.getCurrent()].modified == 1) {
        _confirm.present();
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

  _checkunsafed(cb) {
    try {
      if (this.api.data[this.api.getCurrent()].modified == 1) {
        this.afterSaveCallback = cb;
        this.confirm = this.loadingCtrl.create({content: 'Saving Changes'})
        this.confirm.present();
      }
      else {
        this.afterSaveCallback = null;
        cb(this);
      }
    } catch (err) {
      console.log(err);
    }
  }

  next() {
    this._checkunsafed(function(t){t.slider.slideNext();});
  }

  prev() {
    this._checkunsafed(function(t){t.slider.slidePrev();});
  }


  change() {
    this.api.change();
    if (this.afterSaveCallback) {
      this.afterSaveCallback(this);
      this.afterSaveCallback = null;
      this.confirm.dismiss();
    }
  }

  changeStatus(e) {
    console.log(e);
  }

  changeDebounce() {
    if (this.timeout_change !== null) {
      clearTimeout(this.timeout_change);
    }
    this.api.data[this.api.getCurrent()].modified = 1;
    this.timeout_change = setTimeout(() => {
      this.change();
    }, 1000);
  }

  slideDidChange() {
    if (!this.initialized) return false;
  }

  addPage() {
    if (!this.initialized) return false;
    let index = this.api.data.length == 0 ? 0 : this.slider.getActiveIndex() + 1;
    this.api.add(index);
    console.log("Page Added")
  }

  printPage() {
    const converter = new Converter();
    converter.setOption('simpleLineBreaks', true);
    var self  = this;
    var _print = '<!DOCTYPE html><html><head>  '
               + '<link href="build/print.css" rel="stylesheet" media="print">'
               + '</head><body class="print">'
               + '<div class="title">' + converter.makeHtml(self.api.data[self.api.getCurrent()].title) + '</div>'
               + '<div class="body">' + converter.makeHtml(self.api.data[self.api.getCurrent()].body) + '</div>'
               + '</html>';

    /* Cordova Air Print */

    if (self.platform.is('cordova')) {
      this.printer.isAvailable().then(
        () => {
        let options: PrintOptions = {
             name: self.api.data[self.api.getCurrent()].title,
             duplex: true,
             landscape: false,
             grayscale: true
         };
         this.printer.print(_print, options).then(
          () => {console.log("Printing succeeded");},
          () => {console.log("No Printer Available");}
         );
       },
       () => {console.log("No Printer Available");}
     );
    }
    else {

      /* Browser Print */

      if (!window.frames["print-frame"]) {
        var elm = document.createElement('iframe');
        elm.setAttribute('id', 'print-frame');
        elm.setAttribute('name', 'print-frame');
        elm.setAttribute('style', 'display: none;');
        document.body.appendChild(elm);
      }

      var _frame = <HTMLIFrameElement>document.getElementById('print-frame');
      var _doc;
      if (_frame.contentDocument) { // DOM
          _doc = _frame.contentDocument;
      } else if (_frame.contentWindow) { // IE win
          _doc = _frame.contentWindow.document;
      } else {
          _doc = false;
      }
      

      if (_doc !== false) {
        _doc.write(_print);
        _doc.close();
        if (window.navigator.userAgent.indexOf ("MSIE") > 0) {
            _frame.contentWindow.document.execCommand('print', false, null);
        } else {
            _frame.contentWindow.focus();
            _frame.contentWindow.print();
        }
      }
    }
  }

  selectAll(event) {
    if (!this.initialized) return false;
    event.target.select();
  }

  wordcount(str) {
    return str.split(/[^\s]+/).length;
  }

  showInfo() {
    let _message = `Rokfor Id: ${this.api.data[this.api.getCurrent()].id}<br>Characters: ${this.api.data[this.api.getCurrent()].body.length}<br>Words: ${this.wordcount(this.api.data[this.api.getCurrent()].body)}`;
    let _confirm = this.alert.create({
      title: "Document Statistics",
      message: _message,
      buttons: [
        {
          text: 'Ok',
          handler: data => {
            console.log('Cancel clicked');
          }
        }
      ]
    });
    _confirm.present();
  }

  search(a) {
    console.log(a);
    let _confirm = this.alert.create({
      title: "Search",
      message: "Search Term",
      inputs: [
        {
          name: "SearchTerm",
          value: this.findString ? this.findString : ""
        },
      ],
      buttons: [
        {
          text: 'Clear',
          handler: data => {
            console.log('Cancel clicked');
            this.findString = false;
          }
        },
        {
          text: 'Search',
          handler: data => {
            console.log('Saved clicked', data);
            this.findString = data.SearchTerm;
          }
        }
      ]
    });
    _confirm.present();
  }

  deletePage() {
    this.api.delete(this.api.getCurrent());
  }


}
