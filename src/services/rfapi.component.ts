import {Component, Injectable, NgZone, ApplicationRef} from "@angular/core";
import {Http, Headers, RequestOptions, URLSearchParams} from "@angular/http";
import 'rxjs/Rx';
import { reorderArray, Platform, Events } from 'ionic-angular';
//import { Issue } from './issues';
import PouchDB from 'pouchdb';


interface dataset {
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

@Injectable()

export class Api {
    http: Http;
    storage:  any = {};
    credentialsdb: any;
    current: number = 0;
    jwt: boolean = false;
    getOptions: any;
    postOptions: any;
    issues: any;
    Issue: any;
    current_issue: number = 0;
    debounce: any = null;
    debounceBookStore: any = null;
    initialized: any = false;
    onDevice: boolean;
    zone: NgZone;
    events: Events;
    sync: any;
    fullscreen: boolean = false;
    dbsettings: any = {
      size: 50,
      auto_compaction: true
    };

    issueoptions: any = [
      "ShortTitle",
      "InsideTitle",
      "Subtitle",
      "Author",
      "AuthorShort",
      "ImprintTitle",
      "Imprint",
      "PrefaceTitle",
      "Preface"
    ];


    data: Array < dataset > = [];

    credentials: {user: string, rwkey: string, server: string} = {
      user:   "",
      rwkey:  "",
      server: ""
    };


    constructor (
      http:Http,
      platform: Platform,
      zone: NgZone,
      events: Events,
      public applicationRef : ApplicationRef
    ) {
      this.http = http;
      this.events = events;
      this.onDevice = platform.is('cordova');
      this.zone = zone;
      this.credentialsdb = new PouchDB('rfWriter-credentials', this.dbsettings)
      this.initialize();
  }

  destroyDB() {


    this.storage.issues.destroy().then(function () {
      console.log("issues destroyed")
    }).catch(function (err) {
      console.log("issues not found")
    })
    this.credentialsdb.destroy().then(function () {
      console.log("credentials destroyed")
    }).catch(function (err) {
      console.log("credentials not found")
    })
    this.storage.settings.destroy().then(function () {
      console.log("settings destroyed")
    }).catch(function (err) {
      console.log("settings not found")
    })

    for (let k = 0; k < this.storage.data.length; k++) {
      let d = this.storage.data[k];
      if (d && typeof d.destroy === "function") {
        d.destroy().then(function () {
          console.log("data destroyed")
        }).catch(function (err) {
          console.log("data not found")
        })
      }
    }

    this.storage = {};
    this.data = [];
    this.credentialsdb = false;



  }

  initialize() {
    console.log("Initializing API");
    this.current = 0;
    this.sync = {
      contributions: []
    };
    this.credentialsdb.get('credentials').then((credentials) => {
      if (credentials && credentials.data) {
        this.credentials = credentials.data;

        this.storage = {
          issues      : new PouchDB(`rfWriter-issues-${this.credentials.user}`, this.dbsettings),
          settings    : new PouchDB(`rfWriter-settings-${this.credentials.user}`, this.dbsettings),
          data        : []
        };

        console.log(`Local DB:\n- rfWriter-issues-${this.credentials.user}\n- rfWriter-settings-${this.credentials.user}\n- rfWriter-data-${this.credentials.user}`);

        this.syncIssues().then((success) => {
          this.dbIssuesGet('issues').then((issues_offline) => {
            this.issues = issues_offline || false;
            this.storage.settings.get('current_issue').then((current_issue) => {
              console.log("--------> current issue:", current_issue);
              this.current_issue = current_issue.data ||
                                  (this.issues === false ? false : this.issues.Issues[0].Id);
              this.loadData(this.current_issue).then((success) => {
                console.log("... Data Loaded");
                this.syncData().then(()=>{
                  console.log("... Data Synced");
                })
              });
            }).catch((error) => {
              this.current_issue = this.issues === false ? false : this.issues.Issues[0].Id;
              this.loadData(this.current_issue).then((success) => {
                console.log("... Data Loaded");
                this.syncData().then(()=>{
                  console.log("... Data Synced");
                })
              });
              console.log("---NO CURRENT ISSUE---", error);
            });
          })
        });
      }
      else {
        this.initialized = false;
      }
    }).catch((error) => {
      console.log("---NO CREDENTIALS---", error);
    });
  }

  resolveIssue() {
    this.issues.Issues.forEach((i) => {
      if (i.Id == this.current_issue) {
        this.Issue = i;
        this.Issue.Options = this.Issue.Options || [];
        for (var i = this.issueoptions.length - 1; i >= 0; i--) {
          if (this.Issue.Options[i] == null) {
            this.Issue.Options[i] = {key: this.issueoptions[i],value:""};
          }
        }
        console.log(this.Issue);
      }
    })
  }

  loadData(issue:number): Promise<any> {
    if (this.storage.data[issue] === undefined) {
      this.storage.data[issue] = new PouchDB(`rfWriter-data-${issue}`, this.dbsettings);
    }
    this.resolveIssue();
    return new Promise(resolve => {
      this.dbGet(issue).then((local_data) => {
        this.data = local_data || [];
        //this.dbIssuesGet('current').then((d) => {
        //  console.log("- loading current page");
        //  this.current = d || this.current;
          this.initialized = true;
          this.events.publish('page:change', this.current);
          resolve(true);
        //});
      })
    })
  }

  syncIssues(): Promise<any> {
      var self = this;
      return new Promise(resolve => {
        this.sync.issues = this.storage.issues.sync(`${this.credentials.server}/rf-${this.credentials.user}`, {
          live: true,
          retry: true,
          continuous: true,
          auth: {
            username: self.credentials.user,
            password: self.credentials.rwkey
          }
        }).on('change', function (info) {
          // handle change
          if (info.direction === "pull") {
            console.log('GOT ISSUES SYNC');
            info.change.docs.forEach((d) => {
                if (d._id === "issues"){
                  console.log("Sync Issues", d.data, self);
                  self.issues = d.data;
                  console.log(`Current Issue: ${self.current_issue}`)
                }
            });
            self.zone.run(() => {});
            resolve(true);
          }
        })
        .on('paused',   function (err)  {self.jwt = true; console.log("----> paused"); resolve(true);})
        .on('active',   function ()     {self.jwt = true; console.log("----> active"); resolve(true);})
        .on('denied',   function (err)  {self.jwt = false; console.log("----> denied"); resolve(false);})
        .on('complete', function (info) {console.log("----> complete"); resolve(true);})
        .on('error',    function (err)  {self.jwt = false; console.log("----> error");  resolve(false);});
      });
    }

    syncData(): Promise<any> {

      this.sync.contributions = this.sync.contributions || [];

      var self = this;
      return new Promise(resolve => {
        if (this.storage.data[this.current_issue] === undefined || !this.current_issue){
          console.log("Cannot Sync: No Storage Engine")
          resolve(false);
          return;
        }
        if (this.sync.contributions[this.current_issue]) {
          console.log("Syncing Set up for this issue")
          resolve(true);
          return;
        }

        console.log(`setting up sync data for issue ${this.current_issue}`)
        this.sync.contributions[this.current_issue] = this.storage.data[this.current_issue].sync(`${this.credentials.server}/issue-${this.current_issue}`, {
          live: true,
          retry: true,
          continuous: true,
          auth: {
            username: self.credentials.user,
            password: self.credentials.rwkey
          }
        }).on('change', function (info) {
          // handle change

          //console.log(info)

          if (info.direction === "pull" ) {
            let fullSync = false;
            let reSort = false;

            console.log(info.change.docs, self.data);

            info.change.docs.forEach((d) => {
              let needsUpdate = true;

              for (let k = 0; k < self.data.length; k++) {
                let ld = self.data[k];
                //console.log(k, d, ld);
                if (d._id.indexOf(ld.syncId) !== -1) {
                  if (d._deleted === true) {
                    console.log(`add ${k} to delete array`, ld);
                    self.data.splice(k, 1);
                    self.data.forEach((e,i) => {
                      if (e.sort != i) {
                        e.sort = i;
                      }
                    })
                  }
                  else {
                    console.log(`GOT DATA SYNC ---> ${ld.syncId}`, d.data);
                    self.data[k] = d.data;
                    needsUpdate = false;
                    if (ld.sort != d.data.sort) {
                      reSort = true;
                    }
                  }
                }
              }
              if (needsUpdate) fullSync = true;
            });


            if (fullSync) {
              console.log(`FULL SYNC NEEDED`);
              self.loadData(self.current_issue);
            }
            else if (reSort) {
              console.log(`RESORT NEEDED`);
              self.data.sort(function (a, b) {
                return a.sort - b.sort;
              });
            }
            self.zone.run(() => {});
            resolve(true);
          }
        })
        .on('paused',   function (err)  {console.log("----> sync data paused"); resolve(true);})
        .on('active',   function ()     {console.log("----> sync data active"); resolve(true);})
        .on('denied',   function (err)  {console.log("----> sync data denied", err); resolve(false);})
        .on('complete', function (info) {console.log("----> sync data complete"); resolve(true);})
        .on('error',    function (err)  {console.log("----> sync data error", err); resolve(false);})
        .catch((err) => {
          console.log(err);
          resolve(false);
        });
      });
    }

    dbIssuesStore(document:string, data:any): Promise<any> {
      let self = this;
      return new Promise(resolve => {
        self.storage.issues.get(document)
        .then(function(doc) {
          self.storage.issues.put({
            _id: document,
            _rev: doc._rev,
            data: data
          }).then((response) => {
            resolve(true);
          }).catch((err) => {
            resolve(false);
          });
        })
        .catch(function (err) {
          self.storage.issues.put({
            _id: document,
            data: data
          })
          .then((response) => {
            resolve(true);
          })
          .catch((err)=>{
            resolve(false);
          })
        });
      });
    }

    dbIssuesGet(document:string): Promise<any> {
      var self = this;
      return new Promise(resolve => {
        self.storage.issues.get(document).then(function(doc) {
          resolve(doc.data);
        }).catch(function (err) {
          self.storage.issues.put({
            _id: document,
            data: false
          }).then(function(doc) {
            resolve(false);
          });
        });
      });
    }

   /**
    *
    *  Store Documents
    *
    **/

    dbStore(issue:number, data:any): Promise<any> {
      let self = this;
      let document = `contribution-${issue}-${data.syncId}`;
      return new Promise(resolve => {
        if (!this.current_issue) {
          resolve(false);
          return;
        }
        self.storage.data[issue].get(document)
        .then(function(doc) {
          self.storage.data[issue].put({
            _id: document,
            _rev: doc._rev,
            data: data
          }).then((response) => {
            resolve(true);
          }).catch((err) => {
            resolve(false);
          });
        })
        .catch(function (err) {
          self.storage.data[issue].put({
            _id: document,
            data: data
          })
          .then((response) => {
            resolve(true);
          })
          .catch((err)=>{
            resolve(false);
          })
        });
      });
    }

    /**
     *
     *  Bulk Load Documents - on Init and Issue change
     *
     **/

    dbGet(issue:number): Promise<any> {
      var self = this;
      return new Promise(resolve => {
        console.log(`ok - here we go. trying to read all contributions starting with: contribution-${issue}`);

        self.storage.data[issue].allDocs({
          include_docs: true,
          attachments: true,
          startkey: `contribution-${issue}`,
          endkey: `contribution-${issue}\uffff`
        }).then(function (result) {
          let _data = [];
          result.rows.sort(function (a, b) {
            if (a.doc.data != null && b.doc.data != null && a.doc.data.sort && b.doc.data.sort)
              return a.doc.data.sort - b.doc.data.sort;
            else
              return 0;
          });
          result.rows.forEach((d) => {
            if (d.doc.data) {
              _data.push(d.doc.data);
            }
          })
          //console.log(result.rows);
          resolve(_data);
        }).catch(function (err) {
          console.log(err);
        });
      });
    }

    changeIssue() {
      var self = this;
      self.resolveIssue();
      return new Promise(resolve => {
        self.storage.settings.get('current_issue')
        .then(function(doc) {
          self.storage.settings.put({
            _id: 'current_issue',
            _rev: doc._rev,
            data: self.current_issue
          }).then((response) => {
            self.setCurrent(0);
            self.loadData(self.current_issue).then(()=>{
              console.log("Switched to " + self.current_issue);
              self.syncData().then(()=>{
                console.log("Data Synced");
                resolve(true);
              })
            })
          }).catch((err) => {
            resolve(false);
          });
        })
        .catch(function (err) {
          self.storage.settings.put({
            _id: 'current_issue',
            data: self.current_issue
          })
          .then((response) => {
            self.setCurrent(0);
            self.loadData(self.current_issue).then(()=>{
              console.log("Switched to " + self.current_issue);
              self.syncData().then(()=>{
                console.log("Data Synced");
                resolve(true);
              })
            })
          })
          .catch((err)=>{
            resolve(false);
          })
        });
      });
    }

    changeDebounce() {
      if (this.debounce !== null) {
        clearTimeout(this.debounce);
      }
      this.debounce = setTimeout(() => {
        this.change();
      }, 1000);
    }


    change() {
      if (this.initialized === false) return;
      if (this.data[this.current] === undefined) return;
      this.data[this.current].modified = 0;
      this.dbStore(this.current_issue, this.data[this.current]);
      console.log('Local Store Doc Complete', this.current, this.data[this.current]);
    }

    reorder(indexes){
      if (this.initialized === false) return;
      this.data = reorderArray(this.data, indexes);
      this.data.forEach((e,i) => {
        if (e.sort != i) {
          e.sort = i;
          this.dbStore(this.current_issue, e);
        }
      })
    }

    delete(item) {
      if (this.initialized === false) return;

      // Move Page back before delete if on the last page
      if (this.current == this.data.length - 1 && this.current > 0) {
        this.current--;
        this.events.publish('page:change', this.current);
      }

      let _delete = this.data.splice(item, 1);
      let _doc = `contribution-${this.current_issue}-${_delete[0].syncId}`;
      let self = this;
      console.log(`Deleting: ${_doc}`);

      this.storage.data[this.current_issue].get(_doc).then(function (doc) {
        console.log(`Deleted ${_delete[0].syncId} from DB`);
        /*self.data.forEach((e,i) => {
          if (e.sort != i) {
            e.sort = i;
            self.dbStore(self.current_issue, e);
          }
        })*/
        return self.storage.data[self.current_issue].put({
          _id: doc._id,
          _rev: doc._rev,
          _deleted: true,
          data: doc.data.id
        })
        //return self.storage.data.remove(doc);
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
        issue: this.current_issue,
        syncId: this.guid(),
      };
      let self = this;
      return new Promise(resolve => {
        this.dbStore(this.current_issue, _data).then((d) => {
          self.data.splice(position, 0, _data);
          self.data.forEach((e,i) => {
            if (e.sort != i) {
              e.sort = i;
              this.dbStore(this.current_issue, e);
            }
          })
          self.setCurrent(position);
          setTimeout(() => {
            this.applicationRef.tick();
            setTimeout(() => {
              self.events.publish('page:change', position);
            }, 250);
          }, 250);
          resolve(true);
        });
      });
    }

    setCurrent(id:number) {
      if (this.initialized === false) return;
      console.log("Updating Current Set ", id);
      this.current = id;
    }

    getCurrentData() {
      return this.data[this.current];
    }

    getCurrent() {
      return this.current;
    }

    /* Called if settings changed */
    storeCredentials() {
      var self = this;
      console.log(this.credentials);
      return new Promise(resolve => {
        self.credentialsdb.get('credentials')
        .then(function(doc) {
          self.credentialsdb.put({
            _id: 'credentials',
            _rev: doc._rev,
            data: self.credentials
          }).then((response) => {
            resolve(true);
          }).catch((err) => {
            resolve(false);
          });
        })
        .catch(function (err) {
          self.credentialsdb.put({
            _id: 'credentials',
            data: self.credentials
          })
          .then((response) => {
            resolve(true);
          })
          .catch((err)=>{
            resolve(false);
          })
        });
      });
    }

    logIn() {
      var self = this;
      if (!this.credentialsdb) {
        this.credentialsdb = new PouchDB('rfWriter-credentials', this.dbsettings)
      }
      this.storeCredentials().then((response) => {
        /*self.syncIssues();
        self.syncData();*/
        if (response === true) {
          if (!self.initialized) {
            self.initialize();
            setTimeout(function() {
                window.location.reload();
            }, 2000);
          }
        }
      }).catch((err) => {
        console.log(err)
      });
    }

    logOut() {
      this.jwt = false;
      if (this.sync) {
        if (this.sync.issues && typeof this.sync.issues.cancel === "function") {
          this.sync.issues.cancel(); // whenever you want to cancel
        }
        for (let i = 0; i < this.sync.contributions.length; i++) {
          if (this.sync.contributions[i] && typeof this.sync.contributions[i].cancel === "function") {
            this.sync.contributions[i].cancel();
          }
        }
        this.sync = {
          contributions: []
        };
      }
      this.issues = false;
      this.initialized = false;
      this.credentials = {user: "", rwkey: "", server: ""};
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
      if (this.debounceBookStore !== null) {
        clearTimeout(this.debounceBookStore);
      }
      this.debounceBookStore = setTimeout(() => {
        console.log(`Init Issue Storing...`);
        this.dbIssuesStore('issues', this.issues).then((e) => {
          console.log(`Issues Stored: ${e}`);
        })
      }, 1000);


    }
}
