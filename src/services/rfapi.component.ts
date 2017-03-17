import {Network} from "ionic-native";
import {Component, Injectable, NgZone, ApplicationRef} from "@angular/core";
import {Http, Headers, RequestOptions, URLSearchParams} from "@angular/http";
import {Observable} from 'rxjs/Observable';
import {Subject} from 'rxjs/Subject';
import 'rxjs/Rx';
import { reorderArray, Platform, Events } from 'ionic-angular';
import {observable, autorun} from "mobx";
import { Issue } from './issues';
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

declare function emit (val: any);

@Injectable()

export class Api {
    http: any;
    storage:  any = {};
    credentialsdb: any;
    current: number = 0;
    jwt: boolean = false;
    getOptions: any;
    postOptions: any;
    issues: any;
    current_issue: number = 0;
    initialized: any = false;
    onDevice: boolean;
    zone: any;
    events: any;
    sync: any;
    fullscreen: boolean = false;
    dbsettings: any = {
      size: 50,
      auto_compaction: true
    };


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
      this.credentialsdb = new PouchDB('rfWriter-credentials', this.dbsettings)
      this.current = 0;
      this.onDevice = platform.is('cordova');
      this.zone = zone;
      this.sync = {};
      this.initialize();
  }

  initialize() {
    console.log("Initializing API");
    this.credentialsdb.get('credentials').then((credentials) => {
      if (credentials && credentials.data) {
        this.credentials = credentials.data;

        this.storage = {
          issues      : new PouchDB(`rfWriter-issues-${this.credentials.user}`, this.dbsettings),
          settings    : new PouchDB(`rfWriter-settings-${this.credentials.user}`, this.dbsettings),
          data        : new PouchDB(`rfWriter-data-${this.credentials.user}`, this.dbsettings)
        };

        console.log(`Local DB:\n- rfWriter-issues-${this.credentials.user}\n- rfWriter-settings-${this.credentials.user}\n- rfWriter-data-${this.credentials.user}`);

        this.syncIssues().then((success) => {
          this.syncData().then((success) => {
            this.dbIssuesGet('issues').then((issues_offline) => {
              this.issues = issues_offline || false;
              this.storage.settings.get('current_issue').then((current_issue) => {

                console.log("--------> current issue:", current_issue);

                this.current_issue = current_issue.data ||
                                    (this.issues === false ? false : this.issues.Issues[0].Id);
                /* Loading Local Data */
                this.loadData(this.current_issue);
              }).catch((error) => {
                this.current_issue = this.issues === false ? false : this.issues.Issues[0].Id;
                this.loadData(this.current_issue);
                console.log("---NO CURRENT ISSUE---", error);
              });
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

  loadData(issue:number) {
    this.dbGet(issue).then((local_data) => {
      this.data = local_data || [];
      //this.dbIssuesGet('current').then((d) => {
      //  console.log("- loading current page");
      //  this.current = d || this.current;
        this.initialized = true;
        this.events.publish('page:change', this.current);
      //});
    })
  }

  syncIssues(): Promise<any> {
      var __this = this;
      return new Promise(resolve => {
        this.sync.issues = this.storage.issues.sync(`${this.credentials.server}/rf-${this.credentials.user}`, {
          live: true,
          retry: true,
          continuous: true,
          auth: {
            username: __this.credentials.user,
            password: __this.credentials.rwkey
          }
        }).on('change', function (info) {
          // handle change
          if (info.direction === "pull") {
            console.log('GOT ISSUES SYNC');

            info.change.docs.forEach((d) => {

                /*
                 Keys in the Database
                 credentials
                 current
                 current_issue
                 issues
                */


                if (d._id === "issues"){
                  console.log("Sync Issues", d.data, __this);
                  __this.issues = d.data;
                }
            });
            __this.zone.run(() => {});
            resolve(true);
          }
        })
        .on('paused',   function (err)  {__this.jwt = true; console.log("----> paused"); resolve(true);})
        .on('active',   function ()     {__this.jwt = true; console.log("----> active"); resolve(true);})
        .on('denied',   function (err)  {__this.jwt = false; console.log("----> denied"); resolve(false);})
        .on('complete', function (info) {console.log("----> complete"); resolve(true);})
        .on('error',    function (err)  {__this.jwt = false; console.log("----> error");  resolve(false);});
      });
    }

    syncData(): Promise<any> {
      var __this = this;
      return new Promise(resolve => {
        console.log(`setting up sync data for issue ${this.current_issue}`)
        this.sync.contributions = this.storage.data.sync(`${this.credentials.server}/data-${this.credentials.user}`, {
          live: true,
          retry: true,
          continuous: true,
          auth: {
            username: __this.credentials.user,
            password: __this.credentials.rwkey
          }
        }).on('change', function (info) {
          // handle change

          //console.log(info)

          if (info.direction === "pull" ) {
            let fullSync = false;
            let reSort = false;

            console.log(info.change.docs, __this.data);

            info.change.docs.forEach((d) => {
              let needsUpdate = true;

              for (let k = 0; k < __this.data.length; k++) {
                let ld = __this.data[k];
                console.log(k, d, ld);
                if (d._id.indexOf(ld.syncId) !== -1) {
                  if (d._deleted === true) {
                    console.log(`add ${k} to delete array`, ld);
                    __this.data.splice(k, 1);
                    __this.data.forEach((e,i) => {
                      if (e.sort != i) {
                        e.sort = i;
                      }
                    })
                  }
                  else {
                    console.log(`GOT DATA SYNC ---> ${ld.syncId}`, d.data);
                    __this.data[k] = d.data;
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
              __this.loadData(__this.current_issue);
            }
            else if (reSort) {
              console.log(`RESORT NEEDED`);
              __this.data.sort(function (a, b) {
                return a.sort - b.sort;
              });
            }
            __this.zone.run(() => {});
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
      let __this = this;
      return new Promise(resolve => {
        __this.storage.issues.get(document)
        .then(function(doc) {
          __this.storage.issues.put({
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
          __this.storage.issues.put({
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
      var __this = this;
      return new Promise(resolve => {
        __this.storage.issues.get(document).then(function(doc) {
          resolve(doc.data);
        }).catch(function (err) {
          __this.storage.issues.put({
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
      let __this = this;
      let document = `contribution-${issue}-${data.syncId}`;
      return new Promise(resolve => {
        if (!this.current_issue) {
          resolve(false);
          return;
        }
        __this.storage.data.get(document)
        .then(function(doc) {
          __this.storage.data.put({
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
          __this.storage.data.put({
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
      var __this = this;
      return new Promise(resolve => {
        console.log(`ok - here we go. trying to read all contributions starting with: contribution-${issue}`);

        __this.storage.data.allDocs({
          include_docs: true,
          attachments: true,
          startkey: `contribution-${issue}`,
          endkey: `contribution-${issue}\uffff`
        }).then(function (result) {
          let _data = [];
          result.rows.sort(function (a, b) {
            return a.doc.data.sort - b.doc.data.sort;
          });
          result.rows.forEach((d) => {
            _data.push(d.doc.data);
          })
          //console.log(result.rows);
          resolve(_data);
        }).catch(function (err) {
          console.log(err);
        });
      });
    }

    changeIssue() {
        var __this = this;
        return new Promise(resolve => {
          __this.storage.settings.get('current_issue')
          .then(function(doc) {
            __this.storage.settings.put({
              _id: 'current_issue',
              _rev: doc._rev,
              data: __this.current_issue
            }).then((response) => {
              console.log("Switched to " + __this.current_issue);
              __this.setCurrent(0);
              __this.loadData(__this.current_issue);
              resolve(true);
            }).catch((err) => {
              resolve(false);
            });
          })
          .catch(function (err) {
            __this.storage.settings.put({
              _id: 'current_issue',
              data: __this.current_issue
            })
            .then((response) => {
              console.log("Switched to " + __this.current_issue);
              __this.setCurrent(0);
              __this.loadData(__this.current_issue);
              resolve(true);
            })
            .catch((err)=>{
              resolve(false);
            })
          });
        });
    }

    change() {
      if (this.initialized === false) return;
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
      let __this = this;
      console.log(`Deleting: ${_doc}`);

      this.storage.data.get(_doc).then(function (doc) {
        console.log(`Deleted ${_delete[0].syncId} from DB`);
        /*__this.data.forEach((e,i) => {
          if (e.sort != i) {
            e.sort = i;
            __this.dbStore(__this.current_issue, e);
          }
        })*/
        return __this.storage.data.put({
          _id: doc._id,
          _rev: doc._rev,
          _deleted: true,
          data: doc.data.id
        })
        //return __this.storage.data.remove(doc);
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
      let __this = this;
      return new Promise(resolve => {
        this.dbStore(this.current_issue, _data).then((d) => {
          __this.data.splice(position, 0, _data);
          __this.data.forEach((e,i) => {
            if (e.sort != i) {
              e.sort = i;
              this.dbStore(this.current_issue, e);
            }
          })
          __this.setCurrent(position);
          setTimeout(() => {
            this.applicationRef.tick();
            setTimeout(() => {
              __this.events.publish('page:change', position);
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
      var __this = this;
      console.log(this.credentials);
      return new Promise(resolve => {
        __this.credentialsdb.get('credentials')
        .then(function(doc) {
          __this.credentialsdb.put({
            _id: 'credentials',
            _rev: doc._rev,
            data: __this.credentials
          }).then((response) => {
            if (!this.initialized) {
              this.initialize();
            }
            resolve(true);
          }).catch((err) => {
            resolve(false);
          });
        })
        .catch(function (err) {
          __this.credentialsdb.put({
            _id: 'credentials',
            data: __this.credentials
          })
          .then((response) => {
            if (!this.initialized) {
              this.initialize();
            }
            resolve(true);
          })
          .catch((err)=>{
            resolve(false);
          })
        });
      });
    }

    logIn() {
      var _this = this;
      this.storeCredentials().then((response) => {
        /*_this.syncIssues();
        _this.syncData();*/
        _this.initialize();
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
        if (this.sync.contributions && typeof this.sync.contributions.cancel === "function") {
          this.sync.contributions.cancel();
        }
        this.sync = {};
      }
      this.storage = {};
      this.issues = false;
      this.data = [];
      this.initialized = false;
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
}
