import {Injectable} from "@angular/core";
import 'rxjs/Rx';
import { reorderArray, Platform, Events, LoadingController, AlertController } from 'ionic-angular';
import { Http, Headers } from '@angular/http';
import PouchDB from 'pouchdb';
import { DomSanitizer } from '@angular/platform-browser';
import {parse} from "@retorquere/bibtex-parser";
import tidy from 'bibtex-tidy';

// @ts-ignore
import {parseBibFile, normalizeFieldValue} from "bibtex";

interface _dataset {
    _attachements: any;
    name:     string;
    title:    string;
    body:     string;
    id:       number;
    sort:     number;
    moddate:  number;
    modified: number;
    issue:    number;
    status:   boolean;
    syncId:   string;
    settings: any;
};

interface _pouch {
  credentials : any;
  settings    : any;
  data        : any;
  issues      : any;
  data_sync   : any;
  issues_sync : any;
  issues_rep  : any;
};

interface _state {
  busy        : number;
  initialized : boolean;
  message     : string;
  logged_in   : boolean;
  on_device   : boolean;
  fullscreen  : boolean;
};

interface _active {
  page        : number;
  issue       : number;
  issue_options: any;
  exports     : any;    
}

interface _credentials {
  user        : string;
  key         : string; 
  server      : string;
  group       : string; 
}

interface _debouncers {
  book        : any;
}


interface _editorMarks {
  attachements: any[]
  bibTex: any[]
  marks: any[]
}


@Injectable()

export class Api {
  events: Events;

  timeout: _debouncers = {
    book: false
  }

  editorMarks: _editorMarks = {
    attachements: [],
    marks: [],
    bibTex: []
  }

  state: _state = {
    busy        : 0,
    initialized : false,
    message     : "",
    logged_in   : false,
    on_device   : false,
    fullscreen  : false
  };
  
  current: _active  = {
    page          : 0,
    issue         : null,
    issue_options : {},
    exports       : {}
  };
  
  pouch: _pouch = {
    credentials : null,
    settings    : null,
    data        : null,
    issues      : null,
    data_sync   : null,
    issues_sync : null,
    issues_rep  : null
  };

  issueoptions: any = [
    "ShortTitle",
    "InsideTitle",
    "Subtitle",
    "Author",
    "AuthorShort",
    "ISBN",
    "Imprint",
    "Blurb",
    "Preface",
    "Postface",
    "Thanks",
    "PrefaceTitle",
    "PostfaceTitle",
    "Copyright",
    "CoverURL",
    "SeriesNumber",
    "CoverColor",
    "TextColor",
    "Language",
    "Literature",
    "Published",
    "ForceLiteraturePrint",
    "CoverAsset",
    "ForceAltImages",
    "LogoAsset",
    "AboutTitle",
    "About",
    "Draft",
    "Bibtex",
    "extra",
    "BookType",
    "SeriesNumberInteger"
  ];

  data: Array < _dataset > = [];
  issues: any;
  loading: any = null;
  credentials: _credentials = {
    user:   "",
    key:  "",
    server: "",
    group: ""
  };
  dbsettings: any = {
    size: 250,
    auto_compaction: true,
    adapter: 'idb'
  };
  helpers: any = {

    /* 
      * Overwrites a document, if not existing, creates a new one 
      */

    _pouchsave: function(db, document, data) {
      return new Promise((resolve, reject) => {
        db.get(document)
        .then(function(doc) {
          db.put({
            _id: document,
            _rev: doc._rev,
            data: data
          }).then((response) => {
            resolve(true);
          }).catch((err) => {
            reject(err);
          });
        })
        .catch(function (err) {
          db.put({
            _id: document,
            data: data
          })
          .then((response) => {
            resolve(true);
          })
          .catch((err)=>{
            reject(err);
          })
        });
      });
    },
    _pouchcreate: function(db, _adapter) {
      _adapter = _adapter || 'idb';
      return new Promise((resolve, reject) => {
        let _dbsettings: any = {
          size: 250,
          auto_compaction: true,
          adapter: _adapter
        };
        let _db = new PouchDB(db, _dbsettings);
        setTimeout(() => {
          if (_db)
            resolve(_db);
          else
            reject(false);
        }, 100);
      })
    },
    _syncsettings: function(_this) {
      return {
        live: true,
        retry: true,
        auth: {
          username: _this.credentials.user,
          password: _this.credentials.key
        }
      };
    },
    _replicatesettings: function(_this) {
      return {
        auth: {
          username: _this.credentials.user,
          password: _this.credentials.key
        }
      };
    }
  }

  min_server: Array < number > = [1,1,0];
  exportRunning: any;
  online: boolean;

  bibtexErrors: any = []

  constructor (
      platform: Platform,
      events: Events,
      public loadingCtrl: LoadingController,
      public alert: AlertController,
      private http: Http,
      private sanitizer : DomSanitizer,
  ) {
      this.http = http;
      this.events = events;
      this.state.on_device = platform.is('cordova');
      this.sanitizer = sanitizer;

      if (this.state.on_device) {
        this.dbsettings.adapter = null;
      }
      
      this.pouch.credentials = new PouchDB('rfWriter-credentials', this.dbsettings);
      this.pouch.data = [];
      this.exportRunning = false;
      this.initialize();
      this.events.subscribe('sync:contribution', function(e){
        console.log(e);
        if (e === 'change') {
          this.hideLoadingCtrl();
        }
        if (e === 'paused') {
          try {
            const doc = this.getCurrentData();
            if (doc) {
              this.trackReferences(doc);
              this.trackAttachements(doc);
            }
          } catch (err) {
            console.warn(err)
          }
        }
      }.bind(this))
      this.online = navigator.onLine;
      window.addEventListener('offline', () => {
       this.online = false; 
       console.log("offline")
      });
      window.addEventListener('online', () => {
        this.online = true;
        console.log("online")
      });
  }

  showLoadingCtrl(msg) {
    if (this.loading == null) {
      this.loading = this.loadingCtrl.create({content: msg});
      this.loading.present();
    }
    else {
      this.loading.setContent(msg);
    }
  }

  hideLoadingCtrl() {
    if (this.loading) {
      this.loading.dismiss();
      this.loading = null;
    }
  }


  showAlert(title, message, cb) {
    cb = cb || function(){};
    let _confirm = this.alert.create({
      title: title,
      message: message,
      buttons: [{
        text: 'OK',
        handler: () => {
          cb;
        },
      }],
    });
    _confirm.present();
  }

  lintBibTex(bibTexString: string) {
    this.bibtexErrors = []
    let bibTexParsed = []
    try {
      let _raw = parseBibFile(bibTexString).entries_raw;
      let _bt = _raw.map((e) => {
        let _f = `${e.getFieldAsString("title")}`;
        return ({value: e._id,  label: `${e._id}: ${_f.substr(0, 30)}`})
      });
      // @ts-ignore
      bibTexParsed = _bt.sort((a:any, b:any) => (a.value.localeCompare(b.value)))
    } catch (error) {
      // Step One: Bibtex Tidy
      try {
        tidy.tidy(bibTexString);
      }
      catch (err) {
        this.bibtexErrors.push({
          source: err.message
        })
      }
      // Step Two: parse Bibtec 
      var _validate
      try {
        _validate = parse(bibTexString);
      } catch (err) {
        this.bibtexErrors.push({source: err.message})
      }
      if (_validate?.errors?.length > 0) {
        this.bibtexErrors = [
          ... this.bibtexErrors,
          ... _validate.errors
        ]
      }
    }
    return bibTexParsed;
  }

  updateBibTex() {
    console.log('update bibtex')
    let _index = this.issueoptions.findIndex((i:string) => i === 'Literature');
    let _indexBibtex = this.issueoptions.findIndex((i:string) => i === 'Bibtex');
    
    
    
        
    let _doProcess = _indexBibtex !== -1 && !this.current.issue_options.Options[_indexBibtex].value
   
    if (_index !== -1 && _doProcess) {
      // @ts-ignore
      this.editorMarks.bibTex = this.lintBibTex(this.current.issue_options.Options[_index].value);
    }
    else {
      console.log('skip processing')
      // @ts-ignore    
      this.editorMarks.bibTex = [];    
    }
  }

  /*
   * INITIALIZE
   *
   * Creates Pouch Databases according to the current user
   * returns if no user is active
   * 
   */

  async initialize() {
    let self = this;
    this.showLoadingCtrl("Initializing Credential Database");
    try {
      let _c = await this.pouch.credentials.get('credentials');
      this.credentials = _c.data;
    } catch(err) {
      console.log(err);
    }
    if (!this.credentials.user) {
      this.hideLoadingCtrl();
      return;
    }

    /*
     * Settings Database: Containing current state
     */

    this.showLoadingCtrl("Initializing Settings Database");
    try {
      this.pouch.settings = await this.helpers._pouchcreate(`rfWriter-settings-${this.credentials.user}`, self.dbsettings.adapter);
    } catch (err) {
      console.log(err);
      this.hideLoadingCtrl();
      return;
    }
    


    /*
     * Issues Database: Contains Id's of accessible issues
     */

    this.showLoadingCtrl("Initializing Issues Database");
    try {
      this.pouch.issues = await this.helpers._pouchcreate(`rfWriter-issues-${this.credentials.user}`, self.dbsettings.adapter);  
    } catch (err) {
      this.hideLoadingCtrl();
      return;      
    }

    /* Create Databases and Copy Configuration into issue_options */
    let syncIssueWithDataOption = async function(_issue) {
      try {
        let _options = await self.pouch.data[_issue.Id].get(`contribution-${_issue.Id}-options`);
        _issue.Name = _options.data.Name;
        _issue.Options = _options.data.Options;
      } catch (err) {
        //console.log('could not load options...')
      }

      try {
        let _options = await self.pouch.data[_issue.Id].get(`contribution-${_issue.Id}-exports`);
        _issue.Exports = _options.data;
      } catch (err) {
        //console.log('could not load exports...')
      }


      if (_issue.Id == self.current.issue) {
        self.current.issue_options = {
          Name: _issue.Name,
          Id: _issue.Id,
          Options: _issue.Options || []
        }
        for (var _i = self.issueoptions.length - 1; _i >= 0; _i--) {
          self.current.issue_options.Options[_i] = {
            key: self.issueoptions[_i],
            value: self.current.issue_options.Options[_i] && self.current.issue_options.Options[_i].value !== undefined
                        ? self.current.issue_options.Options[_i].value
                        : ""
          };
        }
        console.log(self.current.issue_options)
      }
    }

    let syncIssue = function(_issue) {
      return new Promise(async (resolve, reject) => {
        try {
          self.pouch.data[_issue.Id].replicate.from(`${self.credentials.server}/db/issue-${_issue.Id}`, self.helpers._replicatesettings(self))
          .on('complete', function(info) { 
            try {
              syncIssueWithDataOption(_issue);
              //console.log(`Replicated: ${self.credentials.server}/db/issue-${_issue.Id}`)
            } catch (err) {
              console.log(err);
            }
            resolve(true);
          })
          .on('error', function(err){
            try {
              syncIssueWithDataOption(_issue);
              //console.log(`Replicated: ${self.credentials.server}/db/issue-${_issue.Id}`)
            } catch (err) {
              console.log(err);
            }
            reject(false);
          });
        } catch (err) {
          console.log(err);
          reject(false);
        }
      });
    }

    let configureissues = async function(removedupes) {
      removedupes = removedupes || false;
      if (removedupes === true) {
        console.log('check for duplicates');
      }
      return new Promise(async (resolve, reject) => {
        try {
          let _i = await self.pouch.issues.get('issues');
          //console.log(_i.data);
          self.issues = _i.data;
        } catch (err) {
          reject(false);
        }

        let _counter = 0;
        try {
          let _i = self.issues.Issues.length
          while (_i--) {
            let i = self.issues.Issues[_i];
            // Create pouch db if no db is existing
            let _html = `<p>Initial Data Sync</p>
            <h4>
              <div style="width: 100%; height: 0.5em; position: relative; padding: 0px; background: rgba(0,0,0,0.1);">
                <div style="width: ${100/self.issues.Issues.length*++_counter}%; height: 1em; position: absolute; left: 0px; top: 0px; height: 0.5em; background: rgba(0,0,0,0.1);"></div>
              </div>
            </h4>`;

            self.showLoadingCtrl(self.sanitizer.bypassSecurityTrustHtml(_html));

            if (self.pouch.data[i.Id] === undefined) {
              try {
                self.pouch.data[i.Id] = await self.helpers._pouchcreate(`rfWriter-data-${i.Id}`, self.dbsettings.adapter);  
                await syncIssue(i);
              } catch (err) {
                self.hideLoadingCtrl();
                reject(false);
              }
            } else {
              if (removedupes === true) {
                console.log(`${i.Id} is a duplicate.`);
                self.issues.Issues.splice(_i, 1);
              }
            }
          }
        } catch (err) {
          //console.log(err);
          self.hideLoadingCtrl();
          reject(false);
        }
        self.hideLoadingCtrl();
        resolve(true);
      })
    }


  
    /* Live Syncing */

    let syncing = async function() {
      //console.log("syncing…")
      self.pouch.issues_sync = self.pouch.issues.sync(`${self.credentials.server}/db/rf-${self.credentials.user}`, self.helpers._syncsettings(self))
      .on('change',   function (info)  {
        console.log(`----> sync issue change ${info.direction}`);
        if (info.direction === "pull" ) {
          try {
            configureissues(false);
            self.updateBibTex();
          } catch (err) {
            console.log(err);
          }

        }
      })
      .on('active',   function ()     {console.log('----> sync issue active'); self.state.logged_in = true;})
      .on('denied',   function (err)  {console.log('----> sync issue denied'); self.state.logged_in = false;})
      .on('error',    function (err)  {console.log('----> sync issue error'); self.state.logged_in = false;})
      .on('complete', function (info) {console.log("----> sync issue complete/destroyed");})      
      
      
      try {
        await configureissues(true);
      } catch (err) {
        console.log(err);
      }

      self.hideLoadingCtrl();

      try {
        await self.activateIssue();
      } catch (err) {
        console.log(err);
      }
    }

    /* Start Replication: One-time/One-off for starters */

    try {
      this.pouch.issues.replicate.from(`${this.credentials.server}/db/rf-${this.credentials.user}`, this.helpers._replicatesettings(this))
      .on('complete', function(info) { 
        self.state.logged_in = true;
        syncing();
      })
      .on('error', function(err){
        self.state.logged_in = false;
        syncing();
      });
    } catch (err) {
      console.log(err);
    }

  }

  /*
   * Sets current issue based on settings
   * If no current issue, activate first in list
   */

  async activateIssue() {

    return new Promise(async (resolve, reject) => {
      this.editorMarks.marks = [];
      this.editorMarks.attachements = [];    

      this.showLoadingCtrl("Activating Issues");

      if (this.issues == undefined) {
        this.hideLoadingCtrl();
        reject("Issues undefined");
      }
      //if (this.activationinprogress == true) {
      //  this.hideLoadingCtrl();        
      // resolve("Activation in Progress..");
      //}
      
      //this.activationinprogress = true;
      
      //console.log('Activate Issue Start', this.current.issue, this.issues);

      // Create Local Data Entry and return first issue if no default and no id

      if (this.current.issue == null) {

        try {
          let _c = await this.pouch.settings.get('current_issue');  
          this.current.issue = _c.data * 1;
          //console.log(`Default: ${this.current.issue}`);
        } catch(err) {
          try {
            this.current.issue = this.issues.Issues[0].Id;  
          } catch (err) {
            reject("Issues undefined");
          }
          //console.log(`Fallback: ${this.current.issue}`);
        }
      }

      // Update local database if id parameter is passed

      try {
        await this.helpers._pouchsave(this.pouch.settings, 'current_issue', this.current.issue);  
      } catch (err) {
        //console.log('_pouchsave', err, this.pouch.settings, 'current_issue', this.current.issue);
      }

      try {
        await this.activateData();  
      } catch (err) {
        console.log('activateData', err);
      }
      //console.log("there")
      //this.activationinprogress = false;
      this.hideLoadingCtrl();
      this.updateBibTex();
      resolve(true);

    });

  }

  trackReferences(doc) {
    console.log(`tracking marks ${doc.id}`)
    this.editorMarks.marks = this.editorMarks.marks || [];    
    let element: any;
    const regex = /:mark\["(.*?)"\]/g;
    // Always clean own marks
    this.editorMarks.marks = this.editorMarks.marks.filter(element => element.doc !== doc.id);
    while(element = regex.exec(doc.body)) {
      if (this.editorMarks.marks.filter(x => x.value === element[1]).length === 0) {
        this.editorMarks.marks.push({value: element[1],  label: element[1], doc: doc.id});  
      }
    };
  }

  trackAttachements(doc) {




/*
let _assets = await this.api._call('/assets',false,{id: id, mode: 'get'},true)
        if (_assets.length) {
            let _previewAsset = _assets[index - 1];
            _previewAsset._id = index - 1;
            if (_previewAsset.Thumbnail) {
              this.previewAsset = _previewAsset;          
            } else {
              throw('not found...')
            }
        }
        */

    console.log(`tracking attachements ${doc.id}`)
    this.editorMarks.attachements = this.editorMarks.attachements || [];    

    /* Only called if attachements are empty... */
    if (doc._attachements == undefined) {
      this._call('/assets',false,{id: doc.id, mode: 'get'},true).then(async d => {
        doc._attachements = d
        console.log('---> initially updated attachement in couch/pouch')
        await this.dbStore(doc);
      })
    }

    let element: any;
    const regex = /\{\{Attachements:(.*?)\}\}/g;
    // Always clean own marks
    this.editorMarks.attachements = this.editorMarks.attachements.filter(element => element.doc !== doc.id);
    while(element = regex.exec(doc.body)) {
      let _name = `${doc.id}-${doc.name}-${element[1]}`;
      let _thumbnail = false
      try {
        _thumbnail = doc._attachements[element[1] - 1].Thumbnail
      } catch (e) {
        _thumbnail = false
      }
      if (this.editorMarks.attachements.filter(x => x.value === _name).length === 0) {
        this.editorMarks.attachements.push({value: _name,  label: `${doc.title}<b>Attachement ${element[1]} in ${doc.name}</b>`, doc: doc.id, thumbnail: _thumbnail});  
      }
    };
  }  

  /* 
   * Loads data for the current issue, attaches a sync to it
   *
   */

  activateData() {
    return new Promise(async (resolve, reject) => {
      // Return if no issue is active
    
      if (this.current.issue == undefined || !this.current.issue) {
        console.log(`current issue failed: ${this.current.issue}`)
        reject(false);
      }
        

      this.showLoadingCtrl("Syncing active Issue");
      let self = this;

      // Loading Data from Local Database
      // Init: set to true for initial load, false on feed changes

      let _localload = function(init) {
        console.log("Localload");
        init = init || false;

        return new Promise(async (resolve, reject) => {

          try {
            self.data = [];
            let _result = await self.pouch.data[self.current.issue].allDocs({
              include_docs: true,
              attachments: false,
              //binary: true, // Returns Files as Blobs, without as base64 string
              startkey: `contribution-${self.current.issue}`,
              endkey: `contribution-${self.current.issue}\uffff`
            });
            _result.rows.sort(function (a, b) {
               if (a.doc.data != null && b.doc.data != null && a.doc.data.sort && b.doc.data.sort)
                  return a.doc.data.sort - b.doc.data.sort;
               else
                  return 0;
            });
            _result.rows.forEach((d) => {

              if (d.doc._id === `contribution-${self.current.issue}-exports`) {

                // console.log(d);
                
                /* Set Current Issue */

                self.current.exports = d.doc || self.current.exports;
                self.current.exports.FilesArray = [];

                if (d.doc.Status == 'Complete') {
                  for (let _file in d.doc.File) {
                    //console.log(d.doc._attachments[_file + '.pdf']);
                    
                    //let _data = "";
                    //let _mime = "";
                    //try {
                    //  _data = d.doc._attachments[_file + '.pdf'].data;
                    //  _mime = d.doc._attachments[_file + '.pdf'].content_type;
                    //} catch (err) {
                    //  console.log("no attachement/mime");
                    //}

                    self.current.exports.FilesArray.push({
                      "Name": _file,
                      "Status": d.doc.Status || 'Error',
                      "Id": d.doc.Id,
                      "Url" : d.doc.File[_file] || "",
                      "Stats" : d.doc.Pages[_file] || [],
                      //"Raw": _data,
                      //"Data": `data:${_mime};base64,${_data}`
                    })
                  }
                }
                self.events.publish('export:ready', self.current.exports);
              } 
              else {
                if (d.doc.data) {
                  if (d.doc._id === `contribution-${self.current.issue}-options`) {
                    
                    /* Set Current Issue */

                    self.current.issue_options.Id = d.doc.data.Id || self.current.issue_options.Id;
                    self.current.issue_options.Name = d.doc.data.Name || self.current.issue_options.Name;
                    self.current.issue_options.Options = d.doc.data.Options || self.current.issue_options.Options;

                    /* Parse Options for completeness */

                    for (var _i = self.issueoptions.length - 1; _i >= 0; _i--) {
                      self.current.issue_options.Options[_i] = {
                        key: self.issueoptions[_i],
                        value: self.current.issue_options.Options[_i] && self.current.issue_options.Options[_i].value !== undefined
                          ? self.current.issue_options.Options[_i].value
                          : ""
                      };
                    }

                    console.log(self.current.issue_options)

                    /* Copy into issues Database */

                    if (self.issues.Issues.length && self.current.issue) {
                      self.issues.Issues.forEach((i) => {
                        if (i.Id == self.current.issue) {
                          i.Name    = self.current.issue_options.Name;
                          i.Options = self.current.issue_options.Options;
                        }
                      })
                    }
                  }
                  else {
                    self.trackReferences(d.doc.data);
                    self.trackAttachements(d.doc.data);
                    self.data.push(d.doc.data);
                  }
                }
              }
            });
            self.data.sort(function (a, b) {
              return a.sort - b.sort;
            });
            self.state.initialized = true;
            try {
              if (self.current.page !== undefined) {
                self.events.publish('page:change', self.current.page);
              }
            } catch (err) {
              console.log('self.current.page not defined');
            }
            
            resolve(true);
          } catch(err) {
            console.log("ERROR SYNCING DATA", err);
            reject(false);
          }
        });
      }

      // live syncer - attach after one time syncer
      let _syncer = function() {
        console.log("_START SYNCER_");
        try {
          self.pouch.data_sync.cancel();
        } catch (err) {
          console.log("nothing to cancel!")
        }
        try {
          self.pouch.data_sync = self.pouch.data[self.current.issue].sync(`${self.credentials.server}/db/issue-${self.current.issue}`, self.helpers._syncsettings(self))
          .on('change', async function (info) {
            self.state.busy = 1;
            if (info.direction === "pull" ) {
              try {
                await _localload(false);    
                self.events.publish('sync:contribution', 'change');
              } catch (err) {
                console.log(err)
                self.events.publish('sync:contribution', 'change');
              }
            }
          })
          .on('paused',   async function (err)  {
            self.state.busy = 0;
            self.events.publish('sync:contribution', 'paused');
          })
          .on('error', function (err) {
            console.log(err)
            self.events.publish('sync:contribution', 'error');
          })
          .on('active',   function ()     {self.events.publish('sync:contribution', 'active');})
          .on('denied',   function ()     {self.events.publish('sync:contribution', 'denied');})
          .on('complete', function ()     {self.events.publish('sync:contribution', 'complete');});
        } catch (err){
          console.log(err);
          self.events.publish('sync:contribution', 'noconnection');
        }
      }
      
      
      console.log("attach syncing");

      try {
        await _localload(true);
        _syncer();
        resolve(true);  
      } catch(err) {
        console.log(err)
        reject(false);
      }

      // attach syncing
      /*try {
        try {
          if (this.pouch.issues_rep !== null) this.pouch.issues_rep.cancel();
        } catch (err) {
          console.log("nothing to cancel!")
        }
        this.pouch.issues_rep =  this.pouch.data[this.current.issue].replicate.from(`${this.credentials.server}/db/issue-${this.current.issue}`, this.helpers._replicatesettings(this)).then(async function (result) {
          try {
            await _localload(true);
            _syncer();
          } catch(err) {
            console.log(err)
          }
          resolve(true);  
        }).catch(function (err) {
          console.log(err);
          reject(false);
        });
      }
      catch (err) {
        console.log(err);
        reject(false);
      }*/

    });
  }

  async destroyDB() {
    if (this.pouch.issues_sync && typeof this.pouch.issues_sync.cancel === "function") {
      this.pouch.issues_sync.cancel();
      this.pouch.issues_sync = null;
    }
    if (this.pouch.data_sync && typeof this.pouch.data_sync.cancel === "function") {
      this.pouch.data_sync.cancel();
      this.pouch.data_sync = null;
    }
    try {
      await this.pouch.issues.destroy();  
      console.log("issues destroyed");
    } catch (err) {
      console.log("issues not found");
    }
    try {
      await this.pouch.credentials.destroy();
      console.log("credentials destroyed");
    } catch (err) {
      console.log("credentials not found");
    }   
    try {
      await this.pouch.settings.destroy();
      console.log("settings destroyed");
    } catch (err) {
      console.log("settings not found");
    }   
    if (this.pouch.data != undefined && this.pouch.data.length) {
      for (let k = 0; k < this.pouch.data.length; k++) {
        let d = this.pouch.data[k];
        if (d && typeof d.destroy === "function") {
          try {
            await d.destroy();
            console.log("data destroyed");
          } catch (err) {
            console.log("data not found");
          }   
        }
      }
    }
    this.pouch.settings = null;
    this.pouch.issues = null;
    this.pouch.credentials = null;
    this.pouch.data = [];
    this.issues = null;
    this.state.initialized = false;
    this.hideLoadingCtrl();
  }

  /*
   * Store Issue Info in Meta-Contribution and issue database
   */

  async dbIssuesStore() {
    try {
      await this.helpers._pouchsave(this.pouch.data[this.current.issue], `contribution-${this.current.issue}-options`, this.current.issue_options);  
      this.issues.Issues.forEach((i) => {if (i.Id == this.current.issue) {i.Name = this.current.issue_options.Name;}})
      try {
        await this.helpers._pouchsave(this.pouch.issues, `issues`, this.issues);
      } catch (err) {
        console.log(err);
      }
    } catch (err) {
      console.log(err);
    }
  }

  /**
  *
  *  Store Documents
  *
  **/

  async dbStore(data:any) {
    let document = `contribution-${this.current.issue}-${data.syncId}`;
    if (!this.current.issue) {
      return;
    }
    try {
      await this.helpers._pouchsave(this.pouch.data[this.current.issue], document, data);  
    } catch (err) {
      console.log(err)
    }
  }

  change() {
    if (this.state.initialized === false) return;
    if (this.data[this.current.page] === undefined) return;
    this.data[this.current.page].modified = 0;
    this.dbStore(this.data[this.current.page]);
    //console.log('Local Store Doc Complete', this.current.page, this.data[this.current.page]);
  }

  reorder(indexes){
    if (this.state.initialized === false) return;
    this.data = reorderArray(this.data, indexes);
    this.data.forEach((e,i) => {
      if (e.sort != i) {
        e.sort = i;
        this.dbStore(e);
      }
    })
  }

  delete(item) {
    let _self = this;
    if (this.state.initialized === false) return;
    let _confirm = this.alert.create({
      title: "Delete Entry",
      message: `Are you sure you want to delete entry<br><b>${this.data[item].title}</b><br><b>${this.data[item].name}</b>? 
                <br>Data will be permanently lost.`,
      buttons: [
        {
          text: 'Cancel',
          handler: data => {
            return
          }
        },
        {
          text: 'Delete',
          handler: data => {
            // Move Page back before delete if on the last page
            if (this.current.page == this.data.length - 1 && this.current.page > 0) {
              this.current.page--;
              this.events.publish('page:change', this.current.page);
            }
            let _delete = this.data.splice(item, 1);
            this.pouch.data[this.current.issue].get(`contribution-${this.current.issue}-${_delete[0].syncId}`).then(function (doc) {
              console.log(`Deleted ${_delete[0].syncId} from DB`);
              return _self.pouch.data[_self.current.issue].put({
                _id: doc._id,
                _rev: doc._rev,
                _deleted: true,
                data: doc.data.id
              })
            });            
          }
        }
      ]
    });
    _confirm.present();    
  }

  add(position: number) {
    let _data:_dataset = {
      name: 'rf001',
      title: 'Empty Title',
      body: "Write Here",
      id: -1,
      sort: 0,
      moddate: 0,
      modified: 0,
      status: false,
      issue: this.current.issue,
      syncId: this.guid(),
      settings: {},
      _attachements: {}
    };
    if (this.online) {
      this.showLoadingCtrl("Adding new Entry");
    }
    this.dbStore(_data);
    this.data.splice(position, 0, _data);
    this.data.forEach((e,i) => {
      if (e.sort != i) {
        e.sort = i;
        this.dbStore(e);
       }
    })
    this.setCurrent(position);
    this.events.publish('page:change', position);
  }

  dataMigration(id?: number) {
    let _check = false;
    id = id || this.current.page;
    if (this.data[this.current.page].status === undefined) {
      this.data[this.current.page].status = false;
      _check = true;
    }
    if (_check === true) {
      console.log(`data migration needed: ${id}`);
      this.change();
    }
  }

  setCurrent(id:number) {
    if (this.state.initialized === false) return;
    console.log("Updating Current Set ", id);
    this.current.page = id;
    this.dataMigration();
  }

  getCurrentData() {
    return this.data[this.current.page];
  }

  getCurrent() {
    return this.current.page;
  }

  async checkUrl() {
    let self = this;
    return new Promise(async (resolve, reject) => {
      try {
        let _res = await self.http.get(self.credentials.server).toPromise();
        if (_res.ok === true && _res.json().application === "Rokfor Writer Server") {
          let _v = _res.json().version.split(".");
          if (parseInt(_v[0]) >= this.min_server[0] && parseInt(_v[1]) >= this.min_server[1] && parseInt(_v[0]) >= this.min_server[2])
            resolve(true);
          else  
            reject(`Server Version mismatch: ${this.min_server[0]}.${this.min_server[1]}.${this.min_server[2]} required.`);
        }
        else {
          reject("Server connection failed. Server probably down.");
        }
      } catch (err) {
        reject("Server connection failed. Connection required for initial login.")
      }
      
      

    });
  }

  async logIn() {
    this.state.initialized = false;
    this.showLoadingCtrl("Logging in. Network connection required.");
    try {
      await this.checkUrl();
    } catch (err) {
      this.showAlert("Server Connection Failed", err, null);
      this.hideLoadingCtrl();
      return;
    }
    if (this.pouch.credentials == null) {
      this.pouch.credentials = await this.helpers._pouchcreate('rfWriter-credentials', this.dbsettings.adapter);
    }
    await this.helpers._pouchsave(this.pouch.credentials, 'credentials', this.credentials);
    this.initialize();
  }

  logOut() {
    this.showLoadingCtrl("Logging out");
    this.credentials = {user: "", key: "", server: "", group: ""};
    this.helpers._pouchsave(this.pouch.credentials, 'credentials', this.credentials);
    this.issues = false;
    this.current = {
      page          : 0,
      issue         : null,
      issue_options : {},
      exports       : {}
    }
    this.state.initialized = false;
    this.state.logged_in = false;
    this.data = [];
    this.destroyDB();
  }

  guid() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
      s4() + '-' + s4() + s4() + s4();
  }

  bookStore() {
    if (this.timeout.book !== null) {
      clearTimeout(this.timeout.book);
    }
    this.timeout.book = setTimeout(() => {
      this.dbIssuesStore();
      this.updateBibTex();
      console.log(`Issues Stored`);
    }, 1000);


  }

  async _call(url, message, postdata, returnResult) {
    postdata = postdata || {};
    returnResult = returnResult || false;
    try {
      let _headers = new Headers({'Content-Type': 'application/json'});
      let _res = await this.http.post(
        this.credentials.server + url, 
        JSON.stringify({
          credentials: this.credentials,
          data: postdata}),
          {headers: _headers}).toPromise();
      if (returnResult===true) {
        return _res.json();
      }
      else {
        if (_res.ok === true && _res.json().state === "ok") {
          this.showAlert("OK", message, null);
        }
        if (_res.json().state === "error") {
          this.showAlert("Error", _res.json().message, null);
        }        
      }
    } catch (err) {
      if (returnResult===true) {
        return false;
      }
      else {
        console.log(err);
        this.showAlert(`Error ${err.status||""}`, `${err.statusText||""}<br>${err.url||""}`, null);        
      }
    }
  }

}
