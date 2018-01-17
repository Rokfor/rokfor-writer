import {Injectable} from "@angular/core";
import 'rxjs/Rx';
import { reorderArray, Platform, Events, LoadingController } from 'ionic-angular';
import PouchDB from 'pouchdb';


interface _dataset {
    name:     string;
    title:    string;
    body:     string;
    id:       number;
    sort:     number;
    moddate:  number;
    modified: number;
    issue:    number;
    syncId:   string;
};

interface _pouch {
  credentials : any;
  settings    : any;
  data        : any;
  issues      : any;
  data_sync   : any;
  issues_sync : any;
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
}

interface _credentials {
  user        : string;
  key         : string; 
  server      : string; 
}

interface _debouncers {
  change      : any;
  book        : any;
}


@Injectable()

export class Api {
    events: Events;

    timeout: _debouncers = {
      change: false,
      book: false
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
      issue_options : {}
    };
    
    pouch: _pouch = {
      credentials : null,
      settings    : null,
      data        : null,
      issues      : null,
      data_sync   : null,
      issues_sync : null
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
      "Preface"
    ];
    data: Array < _dataset > = [];
    issues: any;
    loading: any = null;
    credentials: _credentials = {
      user:   "",
      key:  "",
      server: ""
    };
    dbsettings: any = {
      size: 50,
      auto_compaction: true,
      adapter: 'websql'
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
      _pouchcreate: function(db) {
        return new Promise((resolve, reject) => {
          let _dbsettings: any = {
            size: 50,
            auto_compaction: true
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


    constructor (
      platform: Platform,
      events: Events,
      public loadingCtrl: LoadingController,

    ) {
      this.events = events;
      this.state.on_device = platform.is('cordova');
      this.pouch.credentials = new PouchDB('rfWriter-credentials', this.dbsettings);
      this.pouch.data = [];
      this.initialize();
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
      this.pouch.settings = await this.helpers._pouchcreate(`rfWriter-settings-${this.credentials.user}`);
    } catch (err) {
      this.hideLoadingCtrl();
      return;
    }
    


    /*
     * Issues Database: Contains Id's of accessible issues
     */

    this.showLoadingCtrl("Initializing Issues Database");
    try {
      this.pouch.issues = await this.helpers._pouchcreate(`rfWriter-issues-${this.credentials.user}`);  
    } catch (err) {
      this.hideLoadingCtrl();
      return;      
    }


    /* Create Databases and Copy Configuration into issue_options */
    let syncIssueWithDataOption = async function(_issue) {
      try {
        let _options = await self.pouch.data[_issue.Id].get(`contribution-${_issue.Id}-options`);
        console.log(_options);
        _issue.Name = _options.data.Name;
        _issue.Options = _options.data.Options;
      } catch (err) {
        console.log('could not load options...')
      }


      if (_issue.Id == self.current.issue) {
        self.current.issue_options = {
          Name: _issue.Name,
          Id: _issue.Id,
          Options: _issue.Options || []
        }
        for (var _i = self.issueoptions.length - 1; _i >= 0; _i--) {
          self.current.issue_options.Options[_i] = self.current.issue_options.Options[_i] || {key: self.issueoptions[_i],value:""};
        }
      }
    }

    let syncIssue = function(_issue) {
      return new Promise(async (resolve, reject) => {
        self.pouch.data[_issue.Id].replicate.from(`${self.credentials.server}/issue-${_issue.Id}`, self.helpers._replicatesettings(self))
        .on('complete', function(info) { 
          syncIssueWithDataOption(_issue);
          resolve(true);
        })
        .on('error', function(err){
          syncIssueWithDataOption(_issue);
          reject(false);
        });
      });
    }

    let configureissues = async function() {
      return new Promise(async (resolve, reject) => {
        try {
          let _i = await self.pouch.issues.get('issues');
          self.issues = _i.data;
          console.log(self.issues);
        } catch (err) {
          reject(false);
        }

        let _counter = 0;

        for (let i of self.issues.Issues) {

          // Create pouch db if no db is existing

          if (self.pouch.data[i.Id] === undefined) {
            self.showLoadingCtrl(`<p>Create database</p><h4>${++_counter} of ${self.issues.Issues.length}</h4>`);
            try {
              self.pouch.data[i.Id] = await self.helpers._pouchcreate(`rfWriter-data-${i.Id}`);  
            } catch (err) {
              self.hideLoadingCtrl();
              reject(false);
            }
          }

          try {
            syncIssue(i);
          } catch (err) {
            console.log(err);
          }
        }
        resolve(true);
      })
    }


  
    /* Live Syncing */

    let syncing = async function() {
      
      self.pouch.issues_sync = self.pouch.issues.sync(`${self.credentials.server}/rf-${self.credentials.user}`, self.helpers._syncsettings(self))
      .on('change',   function (info)  {
        if (info.direction === "pull" ) {
          configureissues();
        }
      })
      .on('active',   function ()     {console.log('----> sync issue active'); self.state.logged_in = true;})
      .on('denied',   function (err)  {console.log('----> sync issue denied'); self.state.logged_in = false;})
      .on('error',    function (err)  {console.log('----> sync issue error'); self.state.logged_in = false;})
      .on('complete', function (info) {console.log("----> sync issue complete/destroyed");})      
      
      
      try {
        await configureissues();
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

    this.pouch.issues.replicate.from(`${this.credentials.server}/rf-${this.credentials.user}`, this.helpers._replicatesettings(this))
    .on('complete', function(info) { 
      self.state.logged_in = true;
      syncing();
    })
    .on('error', function(err){
      self.state.logged_in = false;
      syncing();
    });

  }




  /*
   * Sets current issue based on settings
   * If no current issue, activate first in list
   */

  async activateIssue() {

    return new Promise(async (resolve, reject) => {

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
      
      console.log('Activate Issue Start', this.current.issue, this.issues);

      // Create Local Data Entry and return first issue if no default and no id

      if (this.current.issue == null) {

        try {
          let _c = await this.pouch.settings.get('current_issue');  
          this.current.issue = _c.data * 1;
          console.log(`Default: ${this.current.issue}`);
        } catch(err) {
          this.current.issue = this.issues.Issues[0].Id;
          console.log(`Fallback: ${this.current.issue}`);
        }
      }

      // Update local database if id parameter is passed

      try {
        await this.helpers._pouchsave(this.pouch.settings, 'current_issue', this.current.issue);  
      } catch (err) {
        console.log('_pouchsave', err, this.pouch.settings, 'current_issue', this.current.issue);
      }

      try {
        await this.activateData();  
      } catch (err) {
        console.log('activateData', err);
      }
      //console.log("there")
      //this.activationinprogress = false;
      this.hideLoadingCtrl();
      resolve(true);

    });

  }

  /* 
   * Loads data for the current issue, attaches a sync to it
   *
   */

  activateData() {
    return new Promise(async (resolve, reject) => {
      // Return if no issue is active
    
      if (this.current.issue == undefined || !this.current.issue)
        reject(false);

      this.showLoadingCtrl("Initial Data Sync");
      let self = this;

      let _localload = function() {
        

        return new Promise(async (resolve, reject) => {

          try {
            self.data = [];
            let _result = await self.pouch.data[self.current.issue].allDocs({
              include_docs: true,
              attachments: true,
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
              if (d.doc.data) {
                if (d.doc._id === `contribution-${self.current.issue}-options`) {
                  
                  self.current.issue_options.Id = d.doc.data.Id || self.current.issue_options.Id;
                  self.current.issue_options.Name = d.doc.data.Name || self.current.issue_options.Name;
                  self.current.issue_options.Options = d.doc.data.Options || self.current.issue_options.Options;


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
                  self.data.push(d.doc.data);
                }
              }
            });
            self.data.sort(function (a, b) {
              return a.sort - b.sort;
            });
            self.state.initialized = true;
            self.events.publish('page:change', self.current.page);
            resolve(true);
          } catch(err) {
            console.log("ERROR SYNCING DATA", err);
            reject(false);
          }
        });
      }

      // detach syncing

      
      
       try {
        this.pouch.data_sync.cancel();
      } catch (err) {
        console.log("nothing to cancel!")
      }

      // attach syncing
      
      this.pouch.data[this.current.issue].replicate.from(`${this.credentials.server}/issue-${this.current.issue}`, this.helpers._replicatesettings(this))
      .on('complete', async function(info) { 
        try {
          await _localload()
        } catch(err) {
          console.log(err)
        }
      })
      .on('error', async function(err){
        try {
          await _localload()
        } catch(err) {
          console.log(err)
        }
      });
      
      try {
        this.pouch.data_sync = this.pouch.data[this.current.issue].sync(`${this.credentials.server}/issue-${this.current.issue}`, this.helpers._syncsettings(this))
        .on('change', async function (info) {
          self.state.busy = 1;
          if (info.direction === "pull" ) {
            try {
              await _localload();    
            } catch (err) {
              console.log(err)
            }
          }
        })
        .on('paused',   async function (err)  {
          self.state.busy = 0;
        });
      } catch (err){
        reject(err);
      }
      resolve(true);

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
      /*try {
        await this.helpers._pouchsave(this.pouch.issues, `issues`, this.issues);
      } catch (err) {
        console.log(err);
      }*/
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
      console.log("saving...", document, data)
      await this.helpers._pouchsave(this.pouch.data[this.current.issue], document, data);  
    } catch (err) {
      console.log(err)
    }
  }

  changeDebounce() {
    if (this.timeout.change !== null) {
      clearTimeout(this.timeout.change);
    }
    this.timeout.change = setTimeout(() => {
      this.change();
    }, 1000);
  }


  change() {
    if (this.state.initialized === false) return;
    if (this.data[this.current.page] === undefined) return;
    this.data[this.current.page].modified = 0;
    this.dbStore(this.data[this.current.page]);
    console.log('Local Store Doc Complete', this.current.page, this.data[this.current.page]);
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

  add(position: number) {
    let _data = {
      name: 'rf001',
      title: 'Empty Title',
      body: "Write Here",
      id: -1,
      sort: 0,
      moddate: 0,
      modified: 0,
      issue: this.current.issue,
      syncId: this.guid(),
    };
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

  setCurrent(id:number) {
    if (this.state.initialized === false) return;
    console.log("Updating Current Set ", id);
    this.current.page = id;
  }

  getCurrentData() {
    return this.data[this.current.page];
  }

  getCurrent() {
    return this.current.page;
  }

  async logIn() {
    this.state.initialized = false;
    this.showLoadingCtrl("Logging in. Network connection required.");
    if (this.pouch.credentials == null) {
      this.pouch.credentials = await this.helpers._pouchcreate('rfWriter-credentials');
    }
    await this.helpers._pouchsave(this.pouch.credentials, 'credentials', this.credentials);
    this.initialize();
  }

  logOut() {
    this.showLoadingCtrl("Logging out");
    this.credentials = {user: "", key: "", server: ""};
    this.helpers._pouchsave(this.pouch.credentials, 'credentials', this.credentials);
    this.issues = false;
    this.current = {
      page          : 0,
      issue         : null,
      issue_options : {}
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
        console.log(`Issues Stored`);
      }, 1000);


    }
  }
