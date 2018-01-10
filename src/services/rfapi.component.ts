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
  firstrun    : boolean;
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
      firstrun    : false,
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
      auto_compaction: true
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
              reject(false);
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
              reject(false);
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
    this.pouch.settings = await this.helpers._pouchcreate(`rfWriter-settings-${this.credentials.user}`);


    /*
     * Issues Database: Contains Id's of accessible issues
     */

    this.showLoadingCtrl("Initializing Issues Database");
    this.pouch.issues = await this.helpers._pouchcreate(`rfWriter-issues-${this.credentials.user}`);
    this.showLoadingCtrl("Initialized Issues Database");
    this.pouch.issues_sync = this.pouch.issues.sync(`${this.credentials.server}/rf-${this.credentials.user}`, this.helpers._syncsettings(this))
    .on('change', function (info) {
      if (info.direction === "pull") {
        /*info.change.docs.forEach((d) => {
          console.log("Syncing issues...", d)
          if (d._id === "issues"){
            self.issues = d.data;
          }
        });*/
        self.showLoadingCtrl("Syncing Issues");
      }
    })
    .on('paused',   async function (err)  {
      self.hideLoadingCtrl();
      console.log('----> sync issue paused', err); 
      self.state.logged_in = true; 
      if (self.current.issue == null) {
        try {
          let _i = await self.pouch.issues.get('issues');
          self.issues = _i.data;
          self.activateIssue();
        } catch (err) {
          console.log(err);
        }
      }
    })
    .on('active',   function ()     {console.log('----> sync issue active'); self.state.logged_in = true;})
    .on('denied',   function (err)  {console.log('----> sync issue denied'); self.state.logged_in = false; self.hideLoadingCtrl();})
    .on('error',    function (err)  {console.log('----> sync issue error'); self.state.logged_in = false; self.hideLoadingCtrl();})
    .on('complete', function (info) {console.log("----> sync issue complete/destroyed");})


    try {
      let _i = await this.pouch.issues.get('issues');
      this.issues = _i.data;
      this.activateIssue();
    } catch (err) {
      console.log(err);
    }


  }




  /*
   * Sets current issue based on settings
   * If no current issue, activate first in list
   */

  async activateIssue() {

    if (this.issues == undefined) {
      console.log("Issues undefined")
      return;
    }

    console.log('Activate Issue Start', this.current.issue, this.issues);

    // Create Local Data Entry and return first issue if no default and no id

    if (this.current.issue == null) {

      try {
        let _c = await this.pouch.settings.get('current_issue');  
        this.current.issue = _c.data;
      } catch(err) {
        this.current.issue = this.issues.Issues[0].Id;
      }
    }

    // Update local database if id parameter is passed

    let _found = false;
    this.issues.Issues.forEach((i) => {if (i.Id == this.current.issue) {
      _found = true;
      this.current.issue_options = {
        Name: i.Name,
        Id: i.Id,
        Options: []
      }
      for (var _i = this.issueoptions.length - 1; _i >= 0; _i--) {
        this.current.issue_options.Options[_i] = {key: this.issueoptions[_i],value:""};
      }
    }})

    if (_found) {
      await this.helpers._pouchsave(this.pouch.settings, 'current_issue', this.current.issue);
      this.activateData();
    }
    else {
      console.log("Issue not known")
    }
  }

  /* 
   * Loads data for the current issue, attaches a sync to it
   *
   */

  async activateData() {

    // Return if no issue is active
    
    if (this.current.issue == undefined || !this.current.issue)
      return;

    this.showLoadingCtrl("Initial Data Sync");
    let self = this;
    this.state.firstrun = true;


    // Create pouch db if no db is existing

    if (this.pouch.data[this.current.issue] === undefined) {
      console.log(`Create new DB rfWriter-data-${this.current.issue}`);
      try {
        this.pouch.data[this.current.issue] = await this.helpers._pouchcreate(`rfWriter-data-${this.current.issue}`);  
      } catch (err) {
         console.log("error creating datadb")
      }
      
    }

    let _localload = async function(_this) {
      if (_this.state.firstrun == false) {
        return;
      }
      try {
        _this.data = [];
        let _result = await _this.pouch.data[_this.current.issue].allDocs({
          include_docs: true,
          attachments: true,
          startkey: `contribution-${_this.current.issue}`,
          endkey: `contribution-${_this.current.issue}\uffff`
        });
        _result.rows.sort(function (a, b) {
           if (a.doc.data != null && b.doc.data != null && a.doc.data.sort && b.doc.data.sort)
              return a.doc.data.sort - b.doc.data.sort;
           else
              return 0;
        });
        _result.rows.forEach((d) => {
          if (d.doc.data) {
            if (d.doc._id === `contribution-${_this.current.issue}-options`) {
              
              _this.current.issue_options.Id = d.doc.data.Id || _this.current.issue_options.Id;
              _this.current.issue_options.Name = d.doc.data.Name || _this.current.issue_options.Name;
              _this.current.issue_options.Options = d.doc.data.Options || _this.current.issue_options.Options;


              if (_this.issues.Issues.length && _this.current.issue) {
                _this.issues.Issues.forEach((i) => {
                  if (i.Id == _this.current.issue) {
                    i.Name    = _this.current.issue_options.Name;
                    i.Options = _this.current.issue_options.Options;
                  }
                })
              }
            }
            else {
              _this.data.push(d.doc.data);
            }
          }
        });
        _this.data.sort(function (a, b) {
          return a.sort - b.sort;
        });
        _this.state.initialized = true;
        _this.state.firstrun = false;
        _this.events.publish('page:change', _this.current.page);
      } catch(err) {
        _this.state.firstrun = false;
        console.log("ERROR SYNCING DATA", err);
      }
    }

    // detach syncing

    try {
      this.pouch.data_sync.cancel();
    } catch (err) {
      console.log("nothing to cancel!", err)
    }

    // attach syncing
    try {
      this.pouch.data_sync = this.pouch.data[this.current.issue].sync(`${this.credentials.server}/issue-${this.current.issue}`, this.helpers._syncsettings(this))
      .on('change', function (info) {
        if (info.direction === "pull" ) {
          // This enables a one time _localload
          self.state.firstrun = true;
        }
      })
      .on('paused',   function (err)  {
        console.log("----> sync data paused"); 
        self.state.busy = 0;
        self.hideLoadingCtrl();
        try {
          _localload(self);  
        } catch (err) {
          console.log("ERRRR")
        }
        
      })
      .on('active',   function (info) {
        console.log("----> sync data active", info);
        self.state.busy = 1;
      })
      .on('denied',   function (err)  {console.log("----> sync data denied", err); self.hideLoadingCtrl();})
      .on('complete', function (info) {console.log("----> sync data complete/destroyed");})
      .on('error',    function (err)  {console.log("----> sync data error", err); self.hideLoadingCtrl();});
    } catch (err){
      console.log(err);
    }

    //_localload(this);
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
    await this.helpers._pouchsave(this.pouch.data[this.current.issue], `contribution-${this.current.issue}-options`, this.current.issue_options);
    this.issues.Issues.forEach((i) => {if (i.Id == this.current.issue) {i.Name = this.current.issue_options.Name;}})
    await this.helpers._pouchsave(this.pouch.issues, `issues`, this.issues);
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
