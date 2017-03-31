import { Component, ViewChild } from '@angular/core';
import { Printer, PrintOptions } from 'ionic-native';
import { Platform, NavController, LoadingController, Slides, Events, AlertController } from 'ionic-angular';
import { Api } from '../../services/rfapi.component';
import 'codemirror/mode/markdown/markdown.js';
import 'codemirror/addon/scroll/simplescrollbars.js';
import 'codemirror/addon/fold/foldcode.js';
import 'codemirror/addon/fold/foldgutter.js';
import 'codemirror/addon/fold/markdown-fold.js';
import {Converter} from "showdown/dist/showdown";

@Component({
  selector: 'page-editor',
  templateUrl: 'editor.html'
})

export class Editor {
  service: any;
  content: any;
  mySlideOptions: any;
  initialSlide: number = 0;
  initialized: boolean = false;
  //ctrl: any;
  loading: any;

  cm_options: any = {
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


  @ViewChild('mySlider') slider: Slides;

  constructor(
    public navCtrl: NavController,
    public api:Api,
    public loadingCtrl: LoadingController,
    public events: Events,
    public alert: AlertController,
    public platform: Platform,
  ) {
    var _this = this;

    _this.cm_options.cursorBlinkRate = _this.platform.is('core') ? "500" : -1;


    _this.loading = this.loadingCtrl.create({
      content: "Please wait..."
    });
    _this.loading.present();
    //this.ctrl = new FormControl();

    events.subscribe('page:change', (page) => {
      console.log("got page change");
      _this.slider.slideTo(page);
      /*
      if (_this.slider.getSlider() !== undefined && typeof _this.slider.slideTo === "function") {
        setTimeout(() => {
          console.log('done')
          _this.slider.slideTo(page);
        }, 250);
      }*/
    });

    events.subscribe('page:redraw', (page) => {
      console.log("got page redraw");
      _this.slider.slideTo(_this.slider.getActiveIndex(), 0, false)
      /*
      console.log(_this.slider);
      if (_this.slider.getSlider() !== undefined) {
        setTimeout(() => {
          let s = _this.slider.getSlider();
          //s.update();
          _this.slider.slideTo(_this.slider.getActiveIndex(), 0, false);
        }, 250);
      }*/
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
        _this.loading.dismiss();
        _this.initialized = true;
      }
    };
  }

  trackByFn(index, i) {
    return i.syncId;
  }

  openModal(mode) {

    var _title, _message, _placeholder, _data;

    var _this = this;

    if (mode === "set-title") {
      _title = "Title";
      _placeholder = this.api.data[this.api.current].title;
      _data = "title";
      _message = "Set Document Title";
    }
    if (mode === "set-identifier") {
      _title = "ID";
      _placeholder = this.api.data[this.api.current].name;
      _data = "name";
      _message = "Set Document Identifier";
    }

    let confirm = this.alert.create({
      title: _title,
      message: _message,
      inputs: [
        {
          name: _title,
          placeholder: _placeholder
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
            _this.api.data[_this.api.current][_data] = data[_title];
            _this.api.change();
          }
        }
      ]
    });
    confirm.present();
  }

  ngAfterViewInit() {
    this.loading.dismiss();
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
      if (this.api.data && this.api.data.length > 0 && this.api.data[this.api.current].modified == 1) {
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
    let index = this.api.data.length == 0 ? 0 : this.slider.getActiveIndex() + 1;
    this.api.add(index).then((d) => {
      console.log("Page Added")
    });
  }

  printPage() {
    const converter = new Converter();
    converter.setOption('simpleLineBreaks', true);
    var _this  = this;
    var _print = '<!DOCTYPE html><html><head>  '
               + '<link href="build/print.css" rel="stylesheet" media="print">'
               + '</head><body class="print">'
               + '<div class="title">' + converter.makeHtml(_this.api.data[_this.api.current].title) + '</div>'
               + '<div class="body">' + converter.makeHtml(_this.api.data[_this.api.current].body) + '</div>'
               + '</html>';

    /* Cordova Air Print */

    if (_this.platform.is('cordova')) {
      Printer.isAvailable().then(
        () => {
        let options: PrintOptions = {
             name: _this.api.data[_this.api.current].title,
             duplex: true,
             landscape: false,
             grayscale: true
         };
         Printer.print(_print, options).then(
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

}
